import { NextRequest } from "next/server";
import { r2Get } from "@/lib/r2";


/**
 * Public asset proxy for product covers/previews + site-wide images (hero,
 * branding). NEVER serves `ebooks/*` or `fonts/*` file payloads — those
 * routes require entitlement checks.
 */
const PUBLIC_PREFIXES = ["products/", "site/"];

export async function GET(_req: NextRequest, ctx: { params: Promise<{ key: string[] }> }) {
  const { key } = await ctx.params;
  const joined = key.join("/");
  if (!PUBLIC_PREFIXES.some((p) => joined.startsWith(p))) {
    return new Response("Forbidden", { status: 403 });
  }
  const obj = await r2Get(joined);
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(obj.body as ReadableStream, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Length": String(obj.size),
    },
  });
}
