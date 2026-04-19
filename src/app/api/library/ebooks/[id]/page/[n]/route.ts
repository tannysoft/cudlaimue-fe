import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { entitlements, products, downloadLogs } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { renderWatermarkedEbookPage } from "@/lib/ebook-watermark";
import { newId, now } from "@/lib/utils";

/**
 * Secure per-page ebook viewer endpoint. Delegates the render-and-cache
 * pipeline to `renderWatermarkedEbookPage` so the background prerender
 * trigger produces byte-identical PNGs.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; n: string }> },
) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id, n } = await ctx.params;
  const pageNum = Math.max(1, Math.min(9999, Number(n)));
  if (!Number.isFinite(pageNum)) return new Response("Bad page", { status: 400 });

  const rows = await db()
    .select({ p: products, ent: entitlements })
    .from(entitlements)
    .innerJoin(products, eq(products.id, entitlements.productId))
    .where(and(eq(entitlements.userId, user.id), eq(entitlements.productId, id)))
    .limit(1);
  if (!rows.length) return new Response("Forbidden", { status: 403 });
  const { p, ent } = rows[0];
  if (p.type !== "ebook") return new Response("Not an ebook", { status: 404 });

  let result: Awaited<ReturnType<typeof renderWatermarkedEbookPage>>;
  try {
    result = await renderWatermarkedEbookPage({
      productId: p.id,
      orderIdShort: ent.orderId.slice(-10),
      pageNum,
    });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }

  // Fire-and-forget log
  db()
    .insert(downloadLogs)
    .values({
      id: newId("dl"),
      userId: user.id,
      productId: p.id,
      action: "ebook_page_view",
      page: pageNum,
      ip: req.headers.get("cf-connecting-ip") ?? null,
      userAgent: req.headers.get("user-agent") ?? null,
      createdAt: now(),
    })
    .catch(() => {});

  return new Response(result.image, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
      "Content-Length": String(result.image.byteLength),
      "X-Cudlaimue-Cache": result.cached ? "HIT" : "MISS",
      "X-Cudlaimue-Page": String(pageNum),
    },
  });
}
