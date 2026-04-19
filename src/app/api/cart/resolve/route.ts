import { NextRequest, NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";


export async function POST(req: NextRequest) {
  const body = (await req.json()) as { items: Array<{ productId: string; qty: number }> };
  const ids = (body.items ?? []).map((i) => i.productId).filter(Boolean);
  if (!ids.length) return NextResponse.json({ items: [] });
  const rows = await db().select().from(products).where(inArray(products.id, ids));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const items = body.items.map((i) => {
    const p = byId.get(i.productId);
    if (!p || !p.isPublished) {
      return {
        productId: i.productId,
        qty: i.qty,
        name: "สินค้าไม่พร้อมจำหน่าย",
        priceSatang: 0,
        type: "unknown",
        slug: "",
        coverImageKey: null,
        unavailable: true,
      };
    }
    return {
      productId: p.id,
      qty: 1,
      name: p.name,
      priceSatang: p.priceSatang,
      compareAtPriceSatang: p.compareAtPriceSatang ?? null,
      type: p.type,
      slug: p.slug,
      coverImageKey: p.coverImageKey,
    };
  });
  return NextResponse.json({ items });
}
