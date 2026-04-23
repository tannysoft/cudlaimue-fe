import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { getCharge } from "@/lib/beam/client";
import { finalizeOrderPaid } from "@/lib/order-finalize";
import { now } from "@/lib/utils";

/**
 * Lightweight polling endpoint for the checkout return page. Returns the
 * current order status. If the order is still pending, also pokes Beam to
 * check whether the webhook just hasn't arrived yet (best-effort; the
 * webhook is the source of truth).
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const rows = await db()
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.userId, user.id)))
    .limit(1);
  const order = rows[0];
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Best-effort sync: if order is still pending and we have a charge id,
  // pull Beam once. Webhook is the authoritative writer; this is just to
  // shorten the "webhook hasn't arrived yet" window on the client.
  if (order.status === "pending" && order.beamChargeId) {
    try {
      const c = await getCharge(order.beamChargeId);
      if (/^(succeeded|paid|completed)$/i.test(c.status)) {
        await db()
          .update(orders)
          .set({ status: "paid", paidAt: now(), beamStatus: c.status, updatedAt: now() })
          .where(eq(orders.id, order.id));

        // Grant entitlements here too — if we only flip status and wait for
        // the webhook, the webhook arrives later with order.status already
        // "paid" and (before this fix) would skip granting. Idempotent.
        const { ctx: cfCtx } = getCloudflareContext();
        await finalizeOrderPaid(order.id, {
          origin: req.nextUrl.origin,
          waitUntil: cfCtx.waitUntil.bind(cfCtx),
        });

        return NextResponse.json({
          status: "paid",
          totalSatang: order.totalSatang,
          paymentQrUrl: order.paymentQrUrl,
          paymentExpiresAt: order.paymentExpiresAt,
        });
      }
    } catch {
      // Ignore — client will poll again in a moment.
    }
  }

  return NextResponse.json({
    status: order.status,
    totalSatang: order.totalSatang,
    paymentQrUrl: order.paymentQrUrl,
    paymentExpiresAt: order.paymentExpiresAt,
  });
}
