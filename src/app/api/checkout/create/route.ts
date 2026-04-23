import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { db } from "@/lib/db";
import { products, orders, orderItems, entitlements } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { createCharge } from "@/lib/beam/client";
import { validateCoupon, incrementCouponUsage } from "@/lib/coupon";
import { triggerEbookPrerender } from "@/lib/ebook-prerender-trigger";
import { newId, now } from "@/lib/utils";


const Schema = z.object({
  items: z.array(z.object({ productId: z.string(), qty: z.number().int().min(1).max(1) })).min(1),
  couponCode: z.string().max(64).optional(),
  customer: z.object({
    email: z.string().email(),
    phone: z.string().min(8, "phone_required"),
    district: z.string().min(1, "district_required"),
    province: z.string().min(1, "province_required"),
  }),
});

export async function POST(req: NextRequest) {
  try {
    return await handle(req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Surface the real error so the client can render it — otherwise the
    // generic 500 is useless when debugging local dev (missing Beam secret,
    // missing migration, etc).
    console.error("[checkout/create] failed:", e);
    return NextResponse.json(
      { error: "checkout_failed", message: msg },
      { status: 500 },
    );
  }
}

async function handle(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid", detail: parsed.error }, { status: 400 });
  const { items, customer, couponCode } = parsed.data;

  const ids = items.map((i) => i.productId);
  const rows = await db().select().from(products).where(inArray(products.id, ids));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const validated = items.flatMap((i) => {
    const p = byId.get(i.productId);
    if (!p || !p.isPublished) return [];
    return [{ product: p, qty: 1 }];
  });
  if (!validated.length) return NextResponse.json({ error: "no_valid_items" }, { status: 400 });

  const subtotal = validated.reduce((s, v) => s + v.product.priceSatang * v.qty, 0);

  // Re-validate the coupon server-side (don't trust the client-cached
  // discount). Silently drop the coupon if it no longer applies — better
  // UX than failing the whole checkout for one bad code.
  let appliedCouponCode: string | null = null;
  let appliedCouponId: string | null = null;
  let discountSatang = 0;
  if (couponCode) {
    const r = await validateCoupon(
      couponCode,
      subtotal,
      validated.map((v) => ({
        productId: v.product.id,
        priceSatang: v.product.priceSatang,
        qty: v.qty,
      })),
      user.id,
    );
    if (r.valid) {
      appliedCouponCode = r.coupon.code;
      appliedCouponId = r.coupon.id;
      discountSatang = r.discountSatang;
    }
  }
  const total = Math.max(0, subtotal - discountSatang);

  // Customer name no longer collected on the checkout form — fall back to
  // whatever the session user already has (LINE display name / email local).
  const customerName =
    user.displayName?.trim() ||
    user.email?.split("@")[0] ||
    "ลูกค้า";

  const orderId = newId("ord");
  const ts = now();

  await db().insert(orders).values({
    id: orderId,
    userId: user.id,
    status: "pending",
    currency: "THB",
    subtotalSatang: subtotal,
    totalSatang: total,
    customerEmail: customer.email,
    customerName,
    customerPhone: customer.phone,
    customerDistrict: customer.district,
    customerProvince: customer.province,
    couponCode: appliedCouponCode,
    discountSatang,
    createdAt: ts,
    updatedAt: ts,
  });

  // Bump usage counter — best-effort, don't fail checkout if it errors.
  if (appliedCouponId) {
    incrementCouponUsage(appliedCouponId).catch(() => {});
  }

  await db().insert(orderItems).values(
    validated.map((v) => ({
      id: newId("oit"),
      orderId,
      productId: v.product.id,
      productType: v.product.type,
      productNameSnapshot: v.product.name,
      priceSatang: v.product.priceSatang,
      quantity: v.qty,
    })),
  );

  // Derive the public origin from the incoming request — APP_URL env var
  // isn't reliably set across dev/preview/prod, and the request itself is
  // the source of truth for "the URL this user is on".
  const origin = req.nextUrl.origin;

  // ----- Free order short-circuit -----
  // When a coupon discounts the order to 0, skip Beam entirely (Beam rejects
  // 0-amount charges, sometimes with a 502 from their CDN). Mark the order
  // paid in-place + grant entitlements right now, then redirect the browser
  // straight to the success page.
  if (total === 0) {
    await db()
      .update(orders)
      .set({
        status: "paid",
        paidAt: ts,
        beamStatus: "free_coupon",
        updatedAt: now(),
      })
      .where(eq(orders.id, orderId));

    for (const v of validated) {
      try {
        await db().insert(entitlements).values({
          id: newId("ent"),
          userId: user.id,
          productId: v.product.id,
          orderId,
          grantedAt: ts,
        });
      } catch {
        // UNIQUE: user already owns this product → skip
      }
    }

    // Kick off background watermark prerender for ebooks. The recipient
    // endpoint batch-renders ALL pages in one browser session.
    const { ctx } = getCloudflareContext();
    await triggerEbookPrerender(
      ctx.waitUntil.bind(ctx),
      origin,
      validated
        .filter((v) => v.product.type === "ebook")
        .map((v) => ({ productId: v.product.id, orderId })),
    );

    return NextResponse.json({
      orderId,
      paymentUrl: `${origin}/checkout/return?order=${orderId}`,
      chargeId: null,
      free: true,
    });
  }

  const charge = await createCharge({
    amount: total,
    currency: "THB",
    referenceId: orderId,
    description: `คัดลายมือ Order #${orderId}`,
    customer: {
      email: customer.email,
      name: customerName,
      phoneNumber: customer.phone,
    },
    returnUrl: `${origin}/checkout/return?order=${orderId}`,
    metadata: { userId: user.id, orderId },
  });

  // Beam's QR PromptPay response packages the PNG as a base64 string in
  // `encodedImage.imageBase64Encoded` — wrap it as a `data:image/png`
  // URL so the browser can render it in an <img src>. Also grab the
  // matching expiry from the same block.
  const b64 = charge.encodedImage?.imageBase64Encoded ?? null;
  const qrCodeUrl = b64 ? `data:image/png;base64,${b64}` : null;
  const expiryStr = charge.encodedImage?.expiry;
  const expiryTime = expiryStr ? Date.parse(expiryStr) || null : null;

  if (!qrCodeUrl) {
    console.warn(
      "[checkout] Beam charge missing encodedImage — full payload:",
      JSON.stringify(charge).slice(0, 2000),
    );
  }

  await db()
    .update(orders)
    .set({
      beamChargeId: charge.chargeId,
      beamPaymentLinkId: charge.chargeId,
      beamStatus: charge.status ?? "pending",
      paymentQrUrl: qrCodeUrl,
      paymentExpiresAt: expiryTime,
      updatedAt: now(),
    })
    .where(eq(orders.id, orderId));

  // Always redirect to our own /checkout/return — that page renders the QR
  // inline, polls for status, and handles both pending → paid and expiry.
  return NextResponse.json({
    orderId,
    paymentUrl: `${origin}/checkout/return?order=${orderId}`,
    chargeId: charge.chargeId,
  });
}
