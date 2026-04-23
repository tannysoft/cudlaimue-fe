import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, orderItems, entitlements } from "@/lib/db/schema";
import { triggerEbookPrerender } from "@/lib/ebook-prerender-trigger";
import { newId, now } from "@/lib/utils";

/**
 * Finalize a paid order: grant entitlements for every line item and kick off
 * ebook prerender for any ebooks in the order.
 *
 * Safe to call multiple times for the same order — the unique
 * `(user_id, product_id)` index on `entitlements` blocks duplicates, and we
 * swallow the resulting constraint error per-row.
 *
 * Call sites:
 *   - POST /api/checkout/webhook (primary — Beam → our server)
 *   - GET  /api/orders/[id]/status (polling fallback when webhook is late)
 *   - POST /api/checkout/create (free-coupon fast path)
 *
 * Previously the webhook was the only place that granted entitlements, and
 * it gated on `order.status !== "paid"`. If the polling endpoint raced ahead
 * and flipped the status first, the webhook would then skip granting and
 * the customer saw an empty library.
 */
export async function finalizeOrderPaid(
  orderId: string,
  opts: {
    origin: string;
    waitUntil: (p: Promise<unknown>) => void;
  },
): Promise<void> {
  const rows = await db()
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  const order = rows[0];
  if (!order) return;

  const items = await db()
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));
  const ts = now();

  for (const it of items) {
    try {
      await db().insert(entitlements).values({
        id: newId("ent"),
        userId: order.userId,
        productId: it.productId,
        orderId: order.id,
        grantedAt: ts,
      });
    } catch {
      // Unique (user_id, product_id) already exists — user owns it, move on.
    }
  }

  const ebookIds = items
    .filter((i) => i.productType === "ebook")
    .map((i) => i.productId);
  if (ebookIds.length) {
    await triggerEbookPrerender(
      opts.waitUntil,
      opts.origin,
      ebookIds.map((id) => ({ productId: id, orderId: order.id })),
    );
  }
}
