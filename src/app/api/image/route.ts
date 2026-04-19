import { NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { env } from "@/lib/cf";

/**
 * Image optimization proxy — used by Next's custom image loader. Accepts:
 *   ?url=<same-origin-path-or-https-url>&w=<width>&q=<quality>&f=<format>
 *
 * Fetches the source, pipes it through Cloudflare Image Transformations
 * (Workers binding `IMAGES`), and returns the optimized result with long
 * cache headers. Also populates the Worker Cache API (`caches.default`)
 * explicitly so `*.workers.dev` subdomains — which have no zone-level
 * cache in front of Workers — still serve repeats from cache.
 *
 * Response header `x-cudlaimue-cache: HIT|MISS` lets you verify caching
 * without waiting for `CF-Cache-Status` (which only appears on custom
 * domains).
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const rawUrl = sp.get("url");
  if (!rawUrl) return new Response("missing url", { status: 400 });

  const width = clampNum(sp.get("w"), 1, 3840);
  const quality = clampNum(sp.get("q"), 1, 100) ?? 75;
  const explicitFormat = sp.get("f");

  const origin = new URL(req.url).origin;
  const absUrl = rawUrl.startsWith("http")
    ? rawUrl
    : rawUrl.startsWith("/")
    ? `${origin}${rawUrl}`
    : null;
  if (!absUrl) return new Response("bad url", { status: 400 });

  const accept = req.headers.get("accept") ?? "";
  const wantFormat: "avif" | "webp" | "jpeg" =
    explicitFormat === "avif"
      ? "avif"
      : explicitFormat === "jpeg" || explicitFormat === "jpg"
      ? "jpeg"
      : accept.includes("image/avif")
      ? "avif"
      : accept.includes("image/webp")
      ? "webp"
      : "jpeg";

  // Cache key includes format so AVIF/WebP/JPEG variants are stored
  // independently.
  const cacheKey = new Request(`${req.url}&__v=${wantFormat}`, { method: "GET" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cache: Cache | undefined = (caches as any).default;
  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) {
      const h = new Headers(hit.headers);
      h.set("x-cudlaimue-cache", "HIT");
      return new Response(hit.body, { status: hit.status, headers: h });
    }
  }

  const upstream = await fetch(absUrl);
  if (!upstream.ok || !upstream.body) {
    return new Response("upstream failed", { status: 502 });
  }

  const images = env().IMAGES;
  if (!images) {
    return new Response(upstream.body, {
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  const transformed = await images
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .input(upstream.body as any)
    .transform({ ...(width ? { width } : {}) })
    .output({ format: `image/${wantFormat}`, quality });

  const res = transformed.response();
  const buf = await res.arrayBuffer();

  const headers = new Headers();
  const contentType = res.headers.get("content-type") ?? `image/${wantFormat}`;
  headers.set("Content-Type", contentType);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("x-cudlaimue-cache", "MISS");

  // Store a clean copy in the Worker cache (no debug HIT/MISS header).
  if (cache) {
    const cacheHeaders = new Headers(headers);
    cacheHeaders.delete("x-cudlaimue-cache");
    const { ctx } = getCloudflareContext();
    ctx.waitUntil(
      cache.put(
        cacheKey,
        new Response(buf, { status: 200, headers: cacheHeaders }),
      ),
    );
  }

  return new Response(buf, { status: 200, headers });
}

function clampNum(v: string | null, min: number, max: number): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(min, Math.min(max, Math.round(n)));
}
