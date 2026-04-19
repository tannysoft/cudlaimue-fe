import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Compact pager for the WP-backed taxonomy archive pages (category/tag).
 * Renders nothing when there's only one page.
 */
export function TaxonomyPager({
  baseHref,
  page,
  totalPages,
  max = 10,
}: {
  baseHref: string;
  page: number;
  totalPages: number;
  max?: number;
}) {
  if (totalPages <= 1) return null;
  const items = Array.from({ length: Math.min(totalPages, max) }, (_, i) => i + 1);
  // WP-style pagination: page 1 = clean base URL, page N = `<base>/page/N`
  const link = (n: number) => (n === 1 ? baseHref : `${baseHref}/page/${n}`);

  return (
    <div className="mt-10 flex items-center justify-center gap-1.5 text-sm">
      {page > 1 && (
        <Link
          href={link(page - 1)}
          aria-label="ก่อนหน้า"
          className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-peach-200 bg-white hover:bg-peach-50 text-ink/70 transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
      )}
      {items.map((n) => {
        const active = n === page;
        return (
          <Link
            key={n}
            href={link(n)}
            className={`inline-flex items-center justify-center min-w-9 h-9 px-2 rounded-full transition ${
              active
                ? "bg-peach-500 text-white font-medium"
                : "bg-white border border-peach-200 text-ink/70 hover:bg-peach-50"
            }`}
          >
            {n}
          </Link>
        );
      })}
      {page < totalPages && (
        <Link
          href={link(page + 1)}
          aria-label="ถัดไป"
          className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-peach-200 bg-white hover:bg-peach-50 text-ink/70 transition"
        >
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
