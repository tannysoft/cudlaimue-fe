/**
 * Image URL helpers — 2 sizes only.
 *
 *   thumbUrl(key)  → 400px WebP/AVIF via Cloudflare Image Transformations
 *                    (/api/image?url=...&w=400). Use for cards, grids, small
 *                    previews — anywhere the rendered size is ≤ ~600px.
 *
 *   fullUrl(key)   → original file direct from R2 (/api/assets/...) with no
 *                    transform. Use for product hero covers, read/viewer,
 *                    download previews — anywhere we want original quality.
 *
 * `key` can be either a same-origin R2 path (`products/abc/cover.jpg`) or a
 * full https URL (external CDN like LINE avatars, WP images). Falls back to
 * the default brand cover if key is empty.
 */

const FALLBACK = "/brand/cover.png";

export function thumbUrl(
  key: string | null | undefined,
  opts: { width?: number; quality?: number } = {},
): string {
  if (!key) return FALLBACK;
  const src = key.startsWith("http") ? key : `/api/assets/${key}`;
  const w = opts.width ?? 400;
  const q = opts.quality ?? 75;
  return `/api/image?url=${encodeURIComponent(src)}&w=${w}&q=${q}`;
}

export function fullUrl(key: string | null | undefined): string {
  if (!key) return FALLBACK;
  if (key.startsWith("http")) return key;
  return `/api/assets/${key}`;
}
