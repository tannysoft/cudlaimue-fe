import { NextRequest, NextResponse } from "next/server";
import { eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  products,
  orders,
  orderItems,
  entitlements,
  users,
  carts,
  downloadLogs,
  sessions,
  adminAudit,
  coupons,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { env } from "@/lib/cf";
import { newId, now } from "@/lib/utils";

/**
 * Wipe data that came from WooCommerce migration. `scope` picks which
 * resources to delete — default is products only for back-compat.
 *
 *   ?scope=products  (default)
 *   ?scope=customers
 *   ?scope=orders
 *   ?scope=all       — orders → customers → products (respecting deps)
 *
 * All IN(...) queries are chunked to 80 values to stay under D1's
 * SQLITE_MAX_VARIABLE_NUMBER limit (~100).
 */

type Scope = "products" | "customers" | "orders" | "coupons" | "all";
const CHUNK = 80;

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  const scope = (new URL(req.url).searchParams.get("scope") ?? "products") as Scope;

  const summary: Record<string, number> = {};

  try {
    if (scope === "orders" || scope === "all") {
      summary.ordersDeleted = await clearImportedOrders();
    }
    if (scope === "customers" || scope === "all") {
      summary.customersDeleted = await clearImportedCustomers();
    }
    if (scope === "coupons" || scope === "all") {
      summary.couponsDeleted = await clearAllCoupons();
    }
    if (scope === "products" || scope === "all") {
      const r = await clearImportedProducts();
      summary.productsDeleted = r.products;
      summary.r2FilesDeleted = r.r2;
      if (r.error) {
        return NextResponse.json({ error: r.error, message: r.message, summary }, { status: 409 });
      }
    }
  } catch (e) {
    return NextResponse.json(
      { error: "clear_failed", message: String(e).slice(0, 300), summary },
      { status: 500 },
    );
  }

  await db().insert(adminAudit).values({
    id: newId("au"),
    adminId: admin.id,
    action: "import.clear",
    target: scope,
    payload: JSON.stringify(summary),
    createdAt: now(),
  });

  return NextResponse.json({ ok: true, scope, ...summary });
}

async function clearImportedOrders(): Promise<number> {
  const imported = await db()
    .select({ id: orders.id })
    .from(orders)
    .where(isNotNull(orders.sourceWcId));
  if (imported.length === 0) return 0;
  const ids = imported.map((o) => o.id);
  await chunkedDelete(entitlements, entitlements.orderId, ids);
  await chunkedDelete(orders, orders.id, ids); // order_items cascades
  return ids.length;
}

async function clearImportedCustomers(): Promise<number> {
  const imported = await db()
    .select({ id: users.id })
    .from(users)
    .where(isNotNull(users.sourceWcId));
  if (imported.length === 0) return 0;
  const ids = imported.map((u) => u.id);

  // Chunked lookup of which users still have orders (we preserve those).
  const blocked = new Set<string>();
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const rows = await db()
      .select({ uid: orders.userId })
      .from(orders)
      .where(inArray(orders.userId, slice));
    for (const r of rows) blocked.add(r.uid);
  }
  const safe = ids.filter((id) => !blocked.has(id));
  if (safe.length === 0) return 0;

  await chunkedDelete(entitlements, entitlements.userId, safe);
  await chunkedDelete(carts, carts.userId, safe);
  await chunkedDelete(downloadLogs, downloadLogs.userId, safe);
  await chunkedDelete(sessions, sessions.userId, safe);
  await chunkedDelete(users, users.id, safe);
  return safe.length;
}

async function clearImportedProducts(): Promise<{
  products: number;
  r2: number;
  error?: string;
  message?: string;
}> {
  const { R2 } = env();
  const imported = await db()
    .select()
    .from(products)
    .where(isNotNull(products.sourceWcId));
  if (imported.length === 0) return { products: 0, r2: 0 };

  const pIds = imported.map((p) => p.id);

  // Chunked check for lingering order_items references.
  let refCount = 0;
  for (let i = 0; i < pIds.length; i += CHUNK) {
    const slice = pIds.slice(i, i + CHUNK);
    const r = await db()
      .select({ n: sql<number>`count(*)` })
      .from(orderItems)
      .where(inArray(orderItems.productId, slice));
    refCount += Number(r[0]?.n ?? 0);
  }
  if (refCount > 0) {
    return {
      products: 0,
      r2: 0,
      error: "has_orders",
      message: `มี ${refCount} รายการใน order_items อ้างถึงสินค้า — ล้าง orders ก่อน หรือใช้ scope=all`,
    };
  }

  // Delete R2 objects per-product (list+delete loop already handles batching).
  let r2Deleted = 0;
  for (const p of imported) {
    const prefixes = [`products/${p.id}/`];
    if (p.type === "font") prefixes.push(`fonts/${p.id}/`);
    if (p.type === "ebook") prefixes.push(`ebooks/${p.id}/`);
    if (p.type === "template") prefixes.push(`templates/${p.id}/`);
    for (const prefix of prefixes) {
      let cursor: string | undefined;
      do {
        const listed = await R2.list({ prefix, cursor });
        const keys = listed.objects.map((o) => o.key);
        if (keys.length > 0) {
          await R2.delete(keys);
          r2Deleted += keys.length;
        }
        cursor = listed.truncated ? listed.cursor : undefined;
      } while (cursor);
    }
  }

  await chunkedDelete(entitlements, entitlements.productId, pIds);
  await chunkedDelete(products, products.id, pIds);
  return { products: imported.length, r2: r2Deleted };
  void eq;
}

/**
 * Wipe ALL coupons. We don't track which were imported (no source_wc_id on
 * coupons), so this clears the whole table — admin should be aware. The
 * confirm dialog spells this out.
 */
async function clearAllCoupons(): Promise<number> {
  const all = await db().select({ id: coupons.id }).from(coupons);
  if (all.length === 0) return 0;
  await db().delete(coupons);
  return all.length;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function chunkedDelete(table: any, col: any, values: string[]) {
  for (let i = 0; i < values.length; i += CHUNK) {
    const slice = values.slice(i, i + CHUNK);
    if (slice.length === 0) continue;
    await db().delete(table).where(inArray(col, slice));
  }
}
