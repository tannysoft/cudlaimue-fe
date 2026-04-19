import "server-only";
import { env } from "./cf";
import { hmacSha256Hex } from "./crypto";

/**
 * Fire-and-forget background render for every (ebook, order) pair. One
 * fetch per ebook (not per page) — the recipient endpoint opens a single
 * browser session and rasterizes ALL pages of that ebook in one go.
 *
 * Pass `ctx.waitUntil` from the Cloudflare context so Workers keeps the
 * outgoing fetches alive after the parent request returns. Failures are
 * swallowed: the customer-facing reader will fall back to lazy render.
 */
export async function triggerEbookPrerender(
  waitUntil: (p: Promise<unknown>) => void,
  origin: string,
  items: Array<{ productId: string; orderId: string }>,
): Promise<void> {
  if (items.length === 0) return;
  const secret = env().SESSION_SECRET;
  for (const { productId, orderId } of items) {
    const token = await hmacSha256Hex(secret, `prerender:${productId}:${orderId}`);
    waitUntil(
      fetch(`${origin}/api/internal/ebook/prerender`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Token": token,
        },
        body: JSON.stringify({ productId, orderId }),
      }).catch(() => {
        // best-effort — lazy render will cover gaps
      }),
    );
  }
}
