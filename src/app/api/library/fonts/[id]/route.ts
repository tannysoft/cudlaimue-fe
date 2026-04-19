import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { entitlements, products, downloadLogs } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { r2Get } from "@/lib/r2";
import { newId, now } from "@/lib/utils";
import { productFiles } from "@/lib/product-files";

/**
 * Authenticated font download stream.
 *   GET /api/library/fonts/{productId}         → first file (legacy default)
 *   GET /api/library/fonts/{productId}?file=<key>  → specific file by R2 key
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const wantKey = req.nextUrl.searchParams.get("file");

  const rows = await db()
    .select({ p: products, ent: entitlements })
    .from(entitlements)
    .innerJoin(products, eq(products.id, entitlements.productId))
    .where(and(eq(entitlements.userId, user.id), eq(entitlements.productId, id)))
    .limit(1);
  if (!rows.length) return new Response("Forbidden", { status: 403 });
  const { p } = rows[0];
  if (p.type !== "font") return new Response("Not a font", { status: 404 });

  const all = productFiles(p);
  const target = wantKey ? all.find((f) => f.key === wantKey) : all[0];
  if (!target) return new Response("File not found", { status: 404 });

  const obj = await r2Get(target.key);
  if (!obj) return new Response("File missing in R2", { status: 404 });

  db().insert(downloadLogs).values({
    id: newId("dl"),
    userId: user.id,
    productId: p.id,
    action: "font_download",
    ip: req.headers.get("cf-connecting-ip") ?? null,
    userAgent: req.headers.get("user-agent") ?? null,
    createdAt: now(),
  }).catch(() => {});

  const filename = target.name;
  const contentType =
    obj.httpMetadata?.contentType ??
    (filename.endsWith(".ttf")
      ? "font/ttf"
      : filename.endsWith(".otf")
      ? "font/otf"
      : filename.endsWith(".zip")
      ? "application/zip"
      : "application/octet-stream");
  return new Response(obj.body as ReadableStream, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control": "private, no-store",
      "Content-Length": String(obj.size),
    },
  });
}
