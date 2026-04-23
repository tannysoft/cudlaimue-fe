import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  products,
  orderItems,
  entitlements,
  adminAudit,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { env } from "@/lib/cf";
import { newId, now } from "@/lib/utils";

/**
 * Delete a product. Refuses if any order_items still reference it — deleting
 * would orphan order history and break the customer's library. Admins should
 * unpublish instead in that case.
 *
 * Side effects when the delete proceeds:
 *   - remove every R2 object under `products/{id}/` (cover, previews)
 *   - remove the per-type asset prefix (`fonts/{id}/`, `ebooks/{id}/`,
 *     `templates/{id}/` — covers source files, rasterized pages, watermark cache)
 *   - delete entitlements rows (safe here: blocked path above already ensured
 *     no paid orders reference the product)
 *
 * download_logs rows are intentionally left behind — analytics history
 * outlives the product.
 */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  const { id } = await ctx.params;

  const rows = await db().select().from(products).where(eq(products.id, id)).limit(1);
  const p = rows[0];
  if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [{ n: orderRefs }] = await db()
    .select({ n: sql<number>`count(*)` })
    .from(orderItems)
    .where(eq(orderItems.productId, id));
  if (Number(orderRefs) > 0) {
    return NextResponse.json(
      {
        error: "has_orders",
        message: `ไม่สามารถลบได้ มี ${orderRefs} ออเดอร์อ้างถึงสินค้านี้อยู่ — ปิดการเผยแพร่แทนการลบ`,
      },
      { status: 409 },
    );
  }

  const { R2 } = env();
  const prefixes = [`products/${id}/`];
  if (p.type === "font") prefixes.push(`fonts/${id}/`);
  if (p.type === "ebook") prefixes.push(`ebooks/${id}/`);
  if (p.type === "template") prefixes.push(`templates/${id}/`);

  let r2Deleted = 0;
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

  await db().delete(entitlements).where(eq(entitlements.productId, id));
  await db().delete(products).where(eq(products.id, id));

  await db().insert(adminAudit).values({
    id: newId("au"),
    adminId: admin.id,
    action: "product.delete",
    target: id,
    payload: JSON.stringify({
      name: p.name,
      slug: p.slug,
      type: p.type,
      r2Deleted,
    }),
    createdAt: now(),
  });

  return NextResponse.json({ ok: true, r2Deleted });
}
