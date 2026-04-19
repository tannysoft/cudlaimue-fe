/**
 * Custom loader for Next.js `<Image>` — routes every request through
 * `/api/image`, which then uses Cloudflare Image Transformations.
 *
 * Next will call this with ({ src, width, quality }) and use the returned URL
 * as the image source. `src` can be either an absolute https URL (remote
 * images like avatars from line-scdn) or a same-origin path (/api/assets/...).
 */
export default function cloudflareImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  const params = new URLSearchParams({ url: src, w: String(width) });
  if (quality) params.set("q", String(quality));
  return `/api/image?${params.toString()}`;
}
