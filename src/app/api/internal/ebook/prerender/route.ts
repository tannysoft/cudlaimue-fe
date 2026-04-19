import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { env } from "@/lib/cf";
import { hmacSha256Hex, timingSafeEqual } from "@/lib/crypto";
import { prerenderEbookPages } from "@/lib/ebook-watermark";

/**
 * Internal background-render endpoint. Fired after a paid order so every
 * page of every bought ebook is baked into R2 before the customer opens
 * them.
 *
 * Auth: HMAC-SHA256 of `prerender:{productId}:{orderId}` using
 * `SESSION_SECRET`. External callers can't craft a valid token.
 *
 * Renders ALL pages of the ebook in one puppeteer browser session (saves
 * ~2s of cold-start per page vs launching a browser per page).
 */

const Schema = z.object({
  productId: z.string().min(1),
  orderId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const got = req.headers.get("x-internal-token") ?? "";
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { productId, orderId } = parsed.data;

  const expected = await hmacSha256Hex(
    env().SESSION_SECRET,
    `prerender:${productId}:${orderId}`,
  );
  if (!timingSafeEqual(got, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const rows = await db()
      .select({ id: products.id, type: products.type, pageCount: products.pageCount })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    const p = rows[0];
    if (!p || p.type !== "ebook") {
      return NextResponse.json({ error: "not_ebook" }, { status: 400 });
    }
    const pageCount = p.pageCount ?? 0;
    if (!pageCount) {
      return NextResponse.json({ ok: true, rendered: 0, skipped: 0, note: "no_pages" });
    }
    const pageNumbers = Array.from({ length: pageCount }, (_, i) => i + 1);
    const r = await prerenderEbookPages({
      productId,
      orderIdShort: orderId.slice(-10),
      pageNumbers,
    });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e).slice(0, 300) },
      { status: 500 },
    );
  }
}
