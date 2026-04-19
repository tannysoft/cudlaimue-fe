import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { entitlements } from "./db/schema";

/**
 * Resolve which product IDs the given user already owns (i.e. has an
 * `entitlements` row for) out of a candidate set. Used by listing/detail
 * pages so the "เพิ่มลงตะกร้า" button can swap to a "ดาวน์โหลด/อ่าน" CTA.
 *
 * Returns an empty Set when there's no logged-in user — guests never own
 * anything. Skip the DB hop entirely in that case.
 */
export async function getOwnedProductIds(
  userId: string | null | undefined,
  productIds: string[],
): Promise<Set<string>> {
  if (!userId || productIds.length === 0) return new Set();
  const rows = await db()
    .select({ productId: entitlements.productId })
    .from(entitlements)
    .where(
      and(
        eq(entitlements.userId, userId),
        inArray(entitlements.productId, productIds),
      ),
    );
  return new Set(rows.map((r) => r.productId));
}
