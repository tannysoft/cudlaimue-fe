import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { env } from "@/lib/cf";
import { hmacSha256Hex, timingSafeEqual } from "@/lib/crypto";
import { finalizeOrderPaid } from "@/lib/order-finalize";
import { now } from "@/lib/utils";


/**
 * Beamcheckout webhook handler.
 * Beam sends `X-Beam-Signature: sha256=<hex>` computed as
 *   HMAC-SHA256(BEAM_WEBHOOK_SECRET, raw_body)
 * We verify with constant-time comparison, then mark the order paid and
 * grant entitlements inside a best-effort sequence.
 *
 * Idempotency: we key off beamChargeId and only flip status `pending → paid`.
 * Duplicate deliveries are safe no-ops.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("x-beam-signature") ?? "";
  const expected = await hmacSha256Hex(env().BEAM_WEBHOOK_SECRET, raw);
  const got = sig.replace(/^sha256=/, "");
  if (!got || !timingSafeEqual(got, expected)) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  const event = JSON.parse(raw) as {
    type: string;
    data: {
      id: string;
      referenceId: string;
      status: string;
      amount: number;
      currency: string;
    };
  };

  if (!event?.data?.id) return new NextResponse("bad payload", { status: 400 });

  const rows = await db().select().from(orders).where(eq(orders.beamChargeId, event.data.id)).limit(1);
  const order = rows[0];
  if (!order) return new NextResponse("unknown order", { status: 404 });

  const paid = /^(succeeded|paid|completed)$/i.test(event.data.status) || event.type === "charge.succeeded";

  await db()
    .update(orders)
    .set({
      beamStatus: event.data.status,
      status: paid ? "paid" : order.status === "pending" ? "pending" : order.status,
      paidAt: paid ? now() : order.paidAt,
      updatedAt: now(),
    })
    .where(eq(orders.id, order.id));

  // Grant entitlements on *every* paid signal — idempotent via the unique
  // (user_id, product_id) index. Previously we gated on `order.status !==
  // "paid"`, which dropped entitlements when the polling endpoint flipped
  // status to paid first.
  if (paid) {
    const { ctx } = getCloudflareContext();
    await finalizeOrderPaid(order.id, {
      origin: req.nextUrl.origin,
      waitUntil: ctx.waitUntil.bind(ctx),
    });
  }

  return NextResponse.json({ ok: true });
}
