import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { entitlements, products, downloadLogs } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { r2Get } from "@/lib/r2";
import { newId, now } from "@/lib/utils";

/**
 * Authenticated template download stream. Same pattern as fonts — requires
 * active session + entitlement, logs each download, streams direct from R2.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;

  const rows = await db()
    .select({ p: products, ent: entitlements })
    .from(entitlements)
    .innerJoin(products, eq(products.id, entitlements.productId))
    .where(and(eq(entitlements.userId, user.id), eq(entitlements.productId, id)))
    .limit(1);
  if (!rows.length) return new Response("Forbidden", { status: 403 });
  const { p } = rows[0];
  if (p.type !== "template" || !p.fileKey) {
    return new Response("Not a downloadable template", { status: 404 });
  }

  const obj = await r2Get(p.fileKey);
  if (!obj) return new Response("File not found", { status: 404 });

  db().insert(downloadLogs).values({
    id: newId("dl"),
    userId: user.id,
    productId: p.id,
    action: "template_download",
    ip: req.headers.get("cf-connecting-ip") ?? null,
    userAgent: req.headers.get("user-agent") ?? null,
    createdAt: now(),
  }).catch(() => {});

  const filename = p.fileName ?? `${p.slug}.zip`;
  return new Response(obj.body as ReadableStream, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control": "private, no-store",
      "Content-Length": String(obj.size),
    },
  });
}
