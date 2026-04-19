import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { coupons, type Coupon } from "@/lib/db/schema";
import { now } from "@/lib/utils";

/**
 * Coupon validation + discount calculation.
 *
 * Used by both:
 *   - public POST /api/coupons/validate — preview the discount on the cart
 *   - server checkout flow — re-validate before persisting the order
 *
 * Codes are stored uppercase in the DB; lookups normalize to uppercase too.
 */

export type CouponItem = {
  productId: string;
  priceSatang: number;
  qty: number;
};

export type ValidateResult =
  | { valid: true; coupon: Coupon; discountSatang: number }
  | { valid: false; message: string; code?: string };

export async function validateCoupon(
  rawCode: string,
  subtotalSatang: number,
  items?: CouponItem[],
): Promise<ValidateResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { valid: false, message: "กรอกโค้ดส่วนลด" };
  if (subtotalSatang <= 0) return { valid: false, message: "ตะกร้าว่างเปล่า" };

  const rows = await db()
    .select()
    .from(coupons)
    .where(eq(coupons.code, code))
    .limit(1);
  if (!rows.length) return { valid: false, message: "ไม่พบโค้ดนี้ในระบบ", code };

  const c = rows[0];
  if (!c.isActive) return { valid: false, message: "โค้ดนี้ถูกปิดใช้งาน", code };

  if (c.expiresAt && c.expiresAt < now()) {
    return { valid: false, message: "โค้ดหมดอายุแล้ว", code };
  }

  if (c.maxUses != null && c.usedCount >= c.maxUses) {
    return { valid: false, message: "โค้ดถูกใช้ครบจำนวนแล้ว", code };
  }

  // Per-product restriction — discount applies only to matching items.
  // If the client didn't send items, we fall back to the full subtotal
  // (e.g. public /validate preview called without cart context). The
  // authoritative check happens at checkout where items are always known.
  const allowed = parseProductIds(c.productIds);
  let eligibleSubtotal = subtotalSatang;
  if (allowed && items && items.length) {
    const set = new Set(allowed);
    eligibleSubtotal = items
      .filter((i) => set.has(i.productId))
      .reduce((s, i) => s + i.priceSatang * i.qty, 0);
    if (eligibleSubtotal <= 0) {
      return {
        valid: false,
        message: "ไม่มีสินค้าที่ใช้โค้ดนี้ได้",
        code,
      };
    }
  }

  if (c.minSubtotalSatang && eligibleSubtotal < c.minSubtotalSatang) {
    const min = (c.minSubtotalSatang / 100).toLocaleString("th-TH");
    return {
      valid: false,
      message: `ใช้ได้เมื่อยอดสั่งซื้อขั้นต่ำ ${min} บาท`,
      code,
    };
  }

  const discountSatang = computeDiscount(c, eligibleSubtotal);
  return { valid: true, coupon: c, discountSatang };
}

function parseProductIds(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return null;
    const ids = arr.filter((x): x is string => typeof x === "string" && x.length > 0);
    return ids.length ? ids : null;
  } catch {
    return null;
  }
}

export function computeDiscount(c: Coupon, subtotalSatang: number): number {
  if (c.type === "percent") {
    // value is 1..100
    return Math.floor((subtotalSatang * c.value) / 100);
  }
  // fixed: value is in satang; never let discount exceed subtotal
  return Math.min(subtotalSatang, c.value);
}

/**
 * Increment `used_count` by 1 for the given coupon id. Best-effort: if the
 * coupon was deleted between validate and apply we just skip silently.
 */
export async function incrementCouponUsage(couponId: string): Promise<void> {
  await db()
    .update(coupons)
    .set({ usedCount: (await currentUsedCount(couponId)) + 1, updatedAt: now() })
    .where(eq(coupons.id, couponId));
}

async function currentUsedCount(id: string): Promise<number> {
  const rows = await db()
    .select({ n: coupons.usedCount })
    .from(coupons)
    .where(eq(coupons.id, id))
    .limit(1);
  return rows[0]?.n ?? 0;
}
