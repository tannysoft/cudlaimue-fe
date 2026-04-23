import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { entitlements, products } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { productFiles } from "@/lib/product-files";
import { signResourceToken } from "@/lib/crypto";

/**
 * Issues a 5-minute signed token so the buyer can open a download link in the
 * system browser from inside LINE LIFF — LIFF's WebView blocks file downloads,
 * and `liff.openWindow({ external: true })` escapes without session cookies, so
 * the external browser needs an in-URL credential to re-authenticate.
 */

const TTL_SEC = 5 * 60;

const Schema = z.object({
  productId: z.string().min(1),
  fileKey: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const { productId, fileKey } = parsed.data;

  const rows = await db()
    .select({ p: products })
    .from(entitlements)
    .innerJoin(products, eq(products.id, entitlements.productId))
    .where(and(eq(entitlements.userId, user.id), eq(entitlements.productId, productId)))
    .limit(1);
  if (!rows.length) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { p } = rows[0];
  if (p.type !== "font" && p.type !== "template") {
    return NextResponse.json({ error: "Unsupported product type" }, { status: 400 });
  }
  const file = productFiles(p).find((f) => f.key === fileKey);
  if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

  const token = await signResourceToken(
    { sub: user.id, pid: productId, k: fileKey, type: p.type },
    TTL_SEC,
  );
  const base = p.type === "font" ? "/api/library/fonts" : "/api/library/templates";
  const url = `${base}/${encodeURIComponent(productId)}?file=${encodeURIComponent(fileKey)}&t=${encodeURIComponent(token)}`;
  const expiresAt = Date.now() + TTL_SEC * 1000;
  return NextResponse.json({ token, url, expiresAt, ttlSec: TTL_SEC });
}
