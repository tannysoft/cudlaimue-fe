import { NextRequest, NextResponse } from "next/server";
import { eq, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  orders,
  orderItems,
  entitlements,
  products,
  users,
  adminAudit,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { wcListAllOrders, wcListOrdersPage } from "@/lib/wp/woo";
import { newId, now } from "@/lib/utils";

/**
 * Import WooCommerce orders → `orders` + `order_items` + `entitlements` (for
 * paid/completed orders).
 *
 * Depends on: products + customers having been imported first (we match via
 * `source_wc_id`). Guest orders with no matching customer are attached to a
 * synthetic "imported_guest" user — so paid history + entitlements remain
 * attributable.
 */

export async function GET(req: NextRequest) {
  await requireAdmin();
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1"));
  const perPage = Math.min(
    100,
    Math.max(10, Number(req.nextUrl.searchParams.get("perPage") ?? "25")),
  );
  try {
    const r = await wcListOrdersPage(page, perPage);
    // Only check the 25 WC ids on this page — scanning the whole orders
    // table blows the Worker CPU budget once we have thousands of rows.
    const pageWcIds = r.items.map((o) => o.id);
    const existing = pageWcIds.length
      ? await db()
          .select({ sourceWcId: orders.sourceWcId })
          .from(orders)
          .where(inArray(orders.sourceWcId, pageWcIds))
      : [];
    const importedWcIds = new Set(existing.map((e) => e.sourceWcId));
    return NextResponse.json({
      page: r.page,
      perPage: r.perPage,
      total: r.total,
      totalPages: r.totalPages,
      orders: r.items.map((o) => ({
        id: o.id,
        number: o.number,
        status: o.status,
        total: o.total,
        currency: o.currency,
        customerId: o.customer_id,
        customerEmail: o.billing?.email ?? null,
        customerName: `${o.billing?.first_name ?? ""} ${o.billing?.last_name ?? ""}`.trim(),
        lineItems: o.line_items.length,
        paymentMethod: o.payment_method_title ?? null,
        dateCreated: o.date_created,
        datePaid: o.date_paid ?? null,
        alreadyImported: importedWcIds.has(o.id),
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

const Schema = z.object({
  ids: z.array(z.number().int()).optional(),
  page: z.number().int().min(1).optional(),
  perPage: z.number().int().min(1).max(100).optional(),
});

const PAID_WC_STATUSES = new Set(["completed", "processing"]);

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  const body = Schema.parse(await req.json().catch(() => ({})));

  // Lazy-create a synthetic guest user on-demand for orders with no match.
  let guestUserId: string | null = null;
  async function ensureGuestUser(): Promise<string> {
    if (guestUserId) return guestUserId;
    const existing = await db()
      .select()
      .from(users)
      .where(eq(users.email, "imported-guest@cudlaimue.internal"))
      .limit(1);
    if (existing.length) {
      guestUserId = existing[0].id;
      return guestUserId;
    }
    const id = newId("usr");
    const ts = now();
    await db().insert(users).values({
      id,
      email: "imported-guest@cudlaimue.internal",
      displayName: "Guest (import)",
      role: "user",
      isBanned: true, // can't log in — just holds historical orders
      createdAt: ts,
      updatedAt: ts,
    });
    guestUserId = id;
    return id;
  }

  let list: Awaited<ReturnType<typeof wcListAllOrders>>;
  let totalPages = 1;
  let page = 1;
  if (body.page) {
    const r = await wcListOrdersPage(body.page, body.perPage ?? 50);
    list = r.items;
    totalPages = r.totalPages;
    page = r.page;
  } else {
    list = await wcListAllOrders();
  }
  const wanted = body.ids ? list.filter((o) => body.ids!.includes(o.id)) : list;

  // Pre-load only the rows we could possibly need to match — scanning the
  // whole products / users tables burns the Worker CPU budget past a few
  // thousand rows.
  const needProductWcIds = Array.from(
    new Set(wanted.flatMap((o) => o.line_items.map((li) => li.product_id))),
  );
  const needUserWcIds = Array.from(
    new Set(wanted.map((o) => o.customer_id).filter((x) => x > 0)),
  );
  const needEmails = Array.from(
    new Set(wanted.map((o) => o.billing?.email).filter((e): e is string => !!e)),
  );

  const allProducts = needProductWcIds.length
    ? await db()
        .select({ id: products.id, sourceWcId: products.sourceWcId, type: products.type })
        .from(products)
        .where(inArray(products.sourceWcId, needProductWcIds))
    : [];
  const prodByWcId = new Map(allProducts.map((p) => [p.sourceWcId!, p]));

  const userConditions = [];
  if (needUserWcIds.length) userConditions.push(inArray(users.sourceWcId, needUserWcIds));
  if (needEmails.length) userConditions.push(inArray(users.email, needEmails));
  const allUsers =
    userConditions.length > 0
      ? await db()
          .select({ id: users.id, sourceWcId: users.sourceWcId, email: users.email })
          .from(users)
          .where(or(...userConditions))
      : [];
  const userByWcId = new Map(
    allUsers.filter((u) => u.sourceWcId).map((u) => [u.sourceWcId!, u]),
  );
  const userByEmail = new Map(
    allUsers.filter((u) => u.email).map((u) => [u.email!, u]),
  );

  let imported = 0;
  let skipped = 0;
  let entitlementsCreated = 0;
  const issues: string[] = [];

  for (const o of wanted) {
    try {
      // Dedup
      const exists = await db()
        .select()
        .from(orders)
        .where(eq(orders.sourceWcId, o.id))
        .limit(1);
      if (exists.length) {
        skipped++;
        continue;
      }

      // Match user
      let userId: string | null = null;
      if (o.customer_id && userByWcId.has(o.customer_id)) {
        userId = userByWcId.get(o.customer_id)!.id;
      } else if (o.billing?.email && userByEmail.has(o.billing.email)) {
        userId = userByEmail.get(o.billing.email)!.id;
      } else {
        userId = await ensureGuestUser();
      }

      const total = Math.round(parseFloat(o.total || "0") * 100);
      const isPaid = PAID_WC_STATUSES.has(o.status);

      // Coupon: WC supports multiple coupons per order; we only model one,
      // so take the first code and sum all discount amounts into one figure.
      const couponLines = o.coupon_lines ?? [];
      const firstCoupon = couponLines[0];
      const couponCode = firstCoupon ? firstCoupon.code.toUpperCase() : null;
      const discountSatang = couponLines.reduce((s, c) => {
        const d = parseFloat(c.discount || "0");
        return s + (Number.isFinite(d) ? Math.round(d * 100) : 0);
      }, 0);
      const subtotal = total + discountSatang; // WC's `total` is already net

      const orderId = newId("ord");
      const ts = now();
      await db().insert(orders).values({
        id: orderId,
        userId,
        status: isPaid ? "paid" : o.status === "pending" ? "pending" : o.status,
        currency: o.currency || "THB",
        subtotalSatang: subtotal,
        totalSatang: total,
        customerEmail: o.billing?.email ?? null,
        customerName:
          `${o.billing?.first_name ?? ""} ${o.billing?.last_name ?? ""}`.trim() || null,
        customerPhone: o.billing?.phone ?? null,
        couponCode,
        discountSatang,
        beamStatus: `wc_migrated (${o.payment_method_title ?? o.payment_method ?? "-"})`,
        paidAt: o.date_paid ? Date.parse(o.date_paid) || null : null,
        sourceWcId: o.id,
        createdAt: Date.parse(o.date_created) || ts,
        updatedAt: ts,
      });

      // Line items
      for (const li of o.line_items) {
        const matched = prodByWcId.get(li.product_id);
        if (!matched) {
          issues.push(`order #${o.number} — product ${li.product_id} not imported`);
          continue;
        }
        await db().insert(orderItems).values({
          id: newId("oit"),
          orderId,
          productId: matched.id,
          productType: matched.type,
          productNameSnapshot: li.name,
          priceSatang: Math.round(parseFloat(li.price?.toString() ?? li.total) * 100),
          quantity: li.quantity,
        });

        if (isPaid) {
          try {
            await db().insert(entitlements).values({
              id: newId("ent"),
              userId,
              productId: matched.id,
              orderId,
              grantedAt: ts,
            });
            entitlementsCreated++;
          } catch {
            // UNIQUE constraint: user already owns it → ignore
          }
        }
      }

      imported++;
    } catch (err) {
      issues.push(`order #${o.number}: ${String(err).slice(0, 120)}`);
    }
  }

  await db().insert(adminAudit).values({
    id: newId("au"),
    adminId: admin.id,
    action: "import.orders",
    target: null,
    payload: JSON.stringify({
      imported,
      skipped,
      entitlementsCreated,
      total: wanted.length,
      issues: issues.slice(0, 20),
    }),
    createdAt: now(),
  });

  return NextResponse.json({
    imported,
    skipped,
    entitlementsCreated,
    total: wanted.length,
    issues,
    page,
    totalPages,
  });
}
