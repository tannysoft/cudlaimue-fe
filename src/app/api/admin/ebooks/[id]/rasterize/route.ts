import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { r2Get, r2Put, R2Paths } from "@/lib/r2";
import { rasterizePdf } from "@/lib/pdf/rasterize";
import { now } from "@/lib/utils";


/**
 * Trigger (or re-run) base-page rasterization for an ebook. Runs inline for
 * the first `INLINE_LIMIT` pages — for very long ebooks we defer the rest to
 * on-demand rasterization during viewing (the viewer endpoint auto-fills a
 * missing base page into R2).
 */
const INLINE_LIMIT = 30;

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await ctx.params;
  const rows = await db().select().from(products).where(eq(products.id, id)).limit(1);
  const p = rows[0];
  if (!p || p.type !== "ebook") return new NextResponse("Not an ebook", { status: 404 });
  const src = await r2Get(R2Paths.ebookSource(id));
  if (!src) return new NextResponse("Source PDF missing", { status: 404 });
  const buf = await src.arrayBuffer();
  const pagesToRender = Math.min(p.pageCount ?? INLINE_LIMIT, INLINE_LIMIT);
  const rendered = await rasterizePdf({
    pdfBuffer: buf,
    pages: Array.from({ length: pagesToRender }, (_, i) => i + 1),
  });
  for (const r of rendered) {
    await r2Put(R2Paths.ebookBasePage(id, r.pageNumber), r.png, {
      contentType: "image/png",
    });
  }
  await db().update(products).set({ updatedAt: now() }).where(eq(products.id, id));
  return NextResponse.json({ ok: true, rendered: rendered.length });
}
