import Link from "next/link";
import { BookOpen, Download, Check } from "lucide-react";

/**
 * Replaces the "Add to cart" CTA on cards/detail pages when the current
 * user already owns the product. The link target depends on type:
 *   - ebook    → /read/{id}             (in-browser viewer)
 *   - font     → /account/library       (download from library)
 *   - template → /account/library       (download from library)
 */
export function OwnedAction({
  productId,
  type,
  size = "sm",
}: {
  productId: string;
  type: string;
  size?: "sm" | "md";
}) {
  const isEbook = type === "ebook";
  const href = isEbook ? `/read/${productId}` : `/account/library`;
  const label = isEbook ? "อ่าน" : "ดาวน์โหลด";
  const Icon = isEbook ? BookOpen : Download;

  const sizeCls =
    size === "md"
      ? "px-5 py-2 text-sm gap-2"
      : "px-3 py-1.5 text-sm gap-1";

  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-full bg-teal-500 hover:bg-teal-600 text-white transition ${sizeCls}`}
      aria-label={`${label} (มีในไฟล์ดาวน์โหลดแล้ว)`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </Link>
  );
}

/**
 * Smaller "ซื้อแล้ว" pill — for places where the action button isn't
 * appropriate (e.g. tight tables) but we still want to signal ownership.
 */
export function OwnedPill() {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-teal-100 text-teal-700 rounded-full px-2 py-0.5">
      <Check className="w-3 h-3" /> ซื้อแล้ว
    </span>
  );
}
