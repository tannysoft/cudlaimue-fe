import { env } from "./cf";

/**
 * Thin wrapper around the R2 binding with helpers for signed URLs and private
 * keys. All "private" assets (font .zip, ebook .pdf, rendered pages) are stored
 * here and never exposed directly — served through authenticated routes only.
 */

export async function r2Put(
  key: string,
  body: ReadableStream | ArrayBuffer | Uint8Array | string,
  meta?: { contentType?: string; custom?: Record<string, string> },
) {
  const { R2 } = env();
  await R2.put(key, body as ArrayBuffer, {
    httpMetadata: meta?.contentType ? { contentType: meta.contentType } : undefined,
    customMetadata: meta?.custom,
  });
}

export async function r2Get(key: string) {
  const { R2 } = env();
  return R2.get(key);
}

export async function r2Head(key: string) {
  const { R2 } = env();
  return R2.head(key);
}

export async function r2Delete(key: string) {
  const { R2 } = env();
  return R2.delete(key);
}

/** Path helpers — keep layout consistent across code. */
export const R2Paths = {
  productCover: (productId: string, ext: string) =>
    `products/${productId}/cover.${ext}`,
  productPreview: (productId: string, n: number, ext: string) =>
    `products/${productId}/preview-${n}.${ext}`,
  fontFile: (productId: string, filename: string) =>
    `fonts/${productId}/${filename}`,
  templateFile: (productId: string, filename: string) =>
    `templates/${productId}/${filename}`,
  ebookSource: (productId: string) =>
    `ebooks/${productId}/source.pdf`,
  ebookBasePage: (productId: string, page: number) =>
    `ebooks/${productId}/base/page-${page.toString().padStart(4, "0")}.png`,
  ebookUserPage: (productId: string, userId: string, page: number) =>
    `ebooks/${productId}/user/${userId}/page-${page.toString().padStart(4, "0")}.webp`,
  /**
   * Per-order watermarked ebook page cache. `orderIdShort` = last 10 chars
   * of the internal order id — matches the label shown in the watermark.
   * No date in the key = cache lives forever (saves Browser Rendering
   * quota); tradeoff is we can't tell *when* a leaked copy was rendered.
   */
  ebookWatermarkedPage: (productId: string, orderIdShort: string, page: number) =>
    `ebooks/${productId}/wm/${orderIdShort}/page-${page.toString().padStart(4, "0")}.jpg`,
};
