import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Cryptographically-strong random id (URL-safe base62, ~22 chars). */
export function newId(prefix = ""): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const alphabet =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % 62];
  return prefix ? `${prefix}_${out}` : out;
}

/**
 * Format satang → "1,234 บาท" (whole number) or "1,234.50 บาท" (with stang).
 * We avoid the "฿" symbol so prices read more naturally to Thai shoppers.
 */
export function formatTHB(satang: number): string {
  const baht = satang / 100;
  const hasStang = satang % 100 !== 0;
  const formatted = new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: hasStang ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(baht);
  return `${formatted} บาท`;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0E00-\u0E7F]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function now(): number {
  return Date.now();
}

/**
 * Strip WordPress's auto-generated thumbnail-size suffix from an image URL so
 * we keep the full-resolution original:
 *   .../foo-100x100.jpg  →  .../foo.jpg
 *   .../bar-1024x768.webp?v=1 → .../bar.webp?v=1
 */
export function stripWpThumbSize(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace(/-\d+x\d+(\.[a-z0-9]+)(\?.*)?$/i, "$1$2");
}

/**
 * Safe single-character extractor for avatar initials — handles emoji and
 * other multi-byte unicode correctly (string[0] would return half a surrogate
 * pair, which renders differently between Node SSR and browser → hydration
 * mismatch).
 */
export function initial(s: string | null | undefined): string {
  if (!s) return "?";
  const cp = s.codePointAt(0);
  if (cp === undefined) return "?";
  const ch = String.fromCodePoint(cp);
  // Only ASCII letters get uppercased — avoids locale-sensitive surprises.
  return /[a-z]/.test(ch) ? ch.toUpperCase() : ch;
}
