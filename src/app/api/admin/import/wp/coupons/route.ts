import { NextRequest, NextResponse } from "next/server";
import { eq, inArray, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { coupons, products, adminAudit } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import {
  wcListCouponsPage,
  wcListAllCoupons,
  type WCCoupon,
} from "@/lib/wp/woo";
import { newId, now } from "@/lib/utils";

/**
 * Import WooCommerce coupons → our `coupons` table.
 *
 * Mapping rules:
 *   - WC `percent`        → our `percent` (value 1..100)
 *   - WC `fixed_cart`     → our `fixed`   (value in satang)
 *   - WC `fixed_product`  → our `fixed`   (value in satang) — flatten to cart-level
 *   - `minimum_amount`    → `minSubtotalSatang`
 *   - `usage_limit`       → `maxUses`
 *   - `usage_count`       → `usedCount`
 *   - `date_expires`      → `expiresAt` (unix ms)
 *   - `product_ids`       → `productIds` (mapped through `products.sourceWcId`
 *                           to our `prd_xxx` ids; WC ids we never imported
 *                           as products are silently dropped)
 *
 * `excluded_product_ids` and category scoping are NOT carried over — our
 * model only supports an allow-list. Admin can adjust after import.
 *
 * Dedup by code (case-insensitive). If a code already exists in our DB we
 * skip — we never overwrite admin-curated coupons.
 */

async function loadWcProductIdMap(
  wcIds: number[],
): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (wcIds.length === 0) return map;
  const unique = Array.from(new Set(wcIds));
  const rows = await db()
    .select({ id: products.id, wc: products.sourceWcId })
    .from(products)
    .where(inArray(products.sourceWcId, unique));
  for (const r of rows) {
    if (r.wc != null) map.set(r.wc, r.id);
  }
  return map;
}

void isNotNull;

export async function GET(req: NextRequest) {
  await requireAdmin();
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1"));
  const perPage = Math.min(
    100,
    Math.max(10, Number(req.nextUrl.searchParams.get("perPage") ?? "25")),
  );
  try {
    const r = await wcListCouponsPage(page, perPage);
    // Only check this page's codes (uppercase) — full-table scan would
    // burn CPU once we have hundreds.
    const pageCodes = r.items.map((c) => c.code.toUpperCase());
    const existing = pageCodes.length
      ? await db()
          .select({ code: coupons.code })
          .from(coupons)
          .where(inArray(coupons.code, pageCodes))
      : [];
    const existingCodes = new Set(existing.map((e) => e.code));
    return NextResponse.json({
      page: r.page,
      perPage: r.perPage,
      total: r.total,
      totalPages: r.totalPages,
      coupons: r.items.map((c) => {
        const code = c.code.toUpperCase();
        const m = mapToOurs(c);
        return {
          id: c.id,
          code,
          discountLabel: m.type === "percent" ? `${m.value}%` : `${(m.value / 100).toFixed(2)} บาท`,
          minSubtotalLabel: m.minSubtotalSatang
            ? `${(m.minSubtotalSatang / 100).toLocaleString("th-TH")} บาท`
            : "—",
          maxUses: m.maxUses,
          usedCount: c.usage_count,
          expiresAt: m.expiresAt,
          productCount: c.product_ids?.length ?? 0,
          alreadyImported: existingCodes.has(code),
        };
      }),
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

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  const body = Schema.parse(await req.json().catch(() => ({})));

  let list: WCCoupon[];
  let totalPages = 1;
  let page = 1;
  if (body.page) {
    const r = await wcListCouponsPage(body.page, body.perPage ?? 50);
    list = r.items;
    totalPages = r.totalPages;
    page = r.page;
  } else {
    list = await wcListAllCoupons();
  }
  const wanted = body.ids ? list.filter((c) => body.ids!.includes(c.id)) : list;

  // Pre-fetch existing codes for this batch so we skip in-memory.
  const codes = wanted.map((c) => c.code.toUpperCase());
  const existing = codes.length
    ? await db().select({ code: coupons.code }).from(coupons).where(inArray(coupons.code, codes))
    : [];
  const skip = new Set(existing.map((e) => e.code));

  // Build wc-id → prd_xxx map for every WC product referenced in this batch,
  // in one round trip. Coupons whose allow-list resolves to zero of OUR
  // products lose their restriction (treated as unrestricted) — alternative
  // would be importing them as "allow nothing" which is clearly a bug.
  const allWcProductIds = wanted.flatMap((c) => c.product_ids ?? []);
  const idMap = await loadWcProductIdMap(allWcProductIds);

  let imported = 0;
  let skipped = 0;
  const ts = now();

  for (const c of wanted) {
    const code = c.code.toUpperCase();
    if (skip.has(code)) {
      skipped++;
      continue;
    }
    const m = mapToOurs(c);
    if (!m.value || m.value <= 0) {
      skipped++;
      continue;
    }
    const mappedProductIds = (c.product_ids ?? [])
      .map((wcId) => idMap.get(wcId))
      .filter((x): x is string => !!x);
    const productIdsJson = mappedProductIds.length
      ? JSON.stringify(mappedProductIds)
      : null;
    try {
      await db().insert(coupons).values({
        id: newId("cpn"),
        code,
        type: m.type,
        value: m.value,
        minSubtotalSatang: m.minSubtotalSatang,
        maxUses: m.maxUses,
        usedCount: c.usage_count ?? 0,
        expiresAt: m.expiresAt,
        isActive: true,
        productIds: productIdsJson,
        createdAt: Date.parse(c.date_created) || ts,
        updatedAt: ts,
      });
      imported++;
    } catch {
      // race / unique violation — treat as skip
      skipped++;
    }
  }

  await db().insert(adminAudit).values({
    id: newId("au"),
    adminId: admin.id,
    action: "import.coupons",
    target: null,
    payload: JSON.stringify({ imported, skipped, total: wanted.length }),
    createdAt: now(),
  });

  return NextResponse.json({
    imported,
    skipped,
    total: wanted.length,
    page,
    totalPages,
  });
}

interface MappedCoupon {
  type: "percent" | "fixed";
  value: number; // percent: 1..100; fixed: satang
  minSubtotalSatang: number | null;
  maxUses: number | null;
  expiresAt: number | null;
}

function mapToOurs(c: WCCoupon): MappedCoupon {
  const amount = parseFloat(c.amount || "0");
  const type: "percent" | "fixed" = c.discount_type === "percent" ? "percent" : "fixed";
  const value =
    type === "percent"
      ? Math.max(0, Math.min(100, Math.round(amount)))
      : Math.round(amount * 100);
  const minRaw = parseFloat(c.minimum_amount || "0");
  const minSubtotalSatang = minRaw > 0 ? Math.round(minRaw * 100) : null;
  const maxUses = c.usage_limit && c.usage_limit > 0 ? c.usage_limit : null;
  const expiresAt = c.date_expires ? Date.parse(c.date_expires) || null : null;
  return { type, value, minSubtotalSatang, maxUses, expiresAt };
}

// Allow a fresh import after admin clears coupons.
void eq;
