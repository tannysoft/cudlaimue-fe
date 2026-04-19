import type { Product } from "./db/schema";

/**
 * Canonical shape of a single downloadable file attached to a product.
 * Products can have many — we store the array as JSON in `products.files`.
 */
export interface ProductFile {
  key: string; // R2 object key
  name: string; // display filename shown to buyer
  size: number | null;
}

/**
 * Resolve a product's downloadable files, preferring the multi-file JSON
 * column and falling back to the legacy single-file fields. Always returns
 * an array (possibly empty).
 */
export function productFiles(p: Pick<Product, "files" | "fileKey" | "fileName" | "fileSize">): ProductFile[] {
  if (p.files) {
    try {
      const arr = JSON.parse(p.files);
      if (Array.isArray(arr)) {
        return arr
          .filter((f) => f && typeof f.key === "string" && f.key)
          .map((f) => ({
            key: String(f.key),
            name: String(f.name ?? f.key.split("/").pop() ?? "file"),
            size: typeof f.size === "number" ? f.size : null,
          }));
      }
    } catch {
      /* fall through */
    }
  }
  if (p.fileKey) {
    return [
      {
        key: p.fileKey,
        name: p.fileName ?? p.fileKey.split("/").pop() ?? "file",
        size: p.fileSize ?? null,
      },
    ];
  }
  return [];
}
