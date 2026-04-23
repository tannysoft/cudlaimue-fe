import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { entitlements, products, downloadLogs } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { r2Get } from "@/lib/r2";
import { newId, now } from "@/lib/utils";
import { productFiles } from "@/lib/product-files";
import { verifyResourceToken } from "@/lib/crypto";

type DownloadToken = { sub: string; pid: string; k: string; type: string };

/**
 * Authenticated template download stream. Same pattern as fonts — requires
 * active session + entitlement, logs each download, streams direct from R2.
 *
 *   GET /api/library/templates/{productId}             → first file (default)
 *   GET /api/library/templates/{productId}?file=<key>  → specific file by key
 *   GET …?file=<key>&t=<jwt>                           → 5-min signed URL for
 *                                                        LIFF → system browser
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const wantKey = req.nextUrl.searchParams.get("file");
  const tokenStr = req.nextUrl.searchParams.get("t");

  let userId: string | null = null;
  if (tokenStr) {
    const payload = await verifyResourceToken<DownloadToken>(tokenStr);
    if (
      !payload ||
      payload.type !== "template" ||
      payload.pid !== id ||
      (wantKey && payload.k !== wantKey)
    ) {
      return new Response("Invalid or expired link", { status: 401 });
    }
    userId = payload.sub;
  } else {
    const user = await getSessionUser();
    if (!user) return new Response("Unauthorized", { status: 401 });
    userId = user.id;
  }

  const rows = await db()
    .select({ p: products, ent: entitlements })
    .from(entitlements)
    .innerJoin(products, eq(products.id, entitlements.productId))
    .where(and(eq(entitlements.userId, userId), eq(entitlements.productId, id)))
    .limit(1);
  if (!rows.length) return new Response("Forbidden", { status: 403 });
  const { p } = rows[0];
  if (p.type !== "template") return new Response("Not a template", { status: 404 });

  const all = productFiles(p);
  const target = wantKey ? all.find((f) => f.key === wantKey) : all[0];
  if (!target) return new Response("No file for this template", { status: 404 });

  const obj = await r2Get(target.key);
  if (!obj) return new Response("File missing in R2", { status: 404 });

  db().insert(downloadLogs).values({
    id: newId("dl"),
    userId,
    productId: p.id,
    action: "template_download",
    ip: req.headers.get("cf-connecting-ip") ?? null,
    userAgent: req.headers.get("user-agent") ?? null,
    createdAt: now(),
  }).catch(() => {});

  const filename = target.name;
  return new Response(obj.body as ReadableStream, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control": "private, no-store",
      "Content-Length": String(obj.size),
    },
  });
}
