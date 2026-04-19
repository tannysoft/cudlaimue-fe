import Link from "next/link";
import { Search, X } from "lucide-react";

/**
 * URL-based search input for admin list pages. Submits as a native GET form so
 * there's no client JS overhead — the same `?q=...` becomes the server filter
 * on the next render. If a query is active, shows a clear-filter link back to
 * the bare list view.
 */
export function SearchBox({
  baseHref,
  q,
  placeholder,
}: {
  baseHref: string;
  q: string;
  placeholder: string;
}) {
  return (
    <form method="GET" action={baseHref} className="flex-1 max-w-md">
      <label className="flex items-center gap-2 bg-cream/60 rounded-xl px-3 py-1.5 text-sm focus-within:ring-2 focus-within:ring-peach-300 transition">
        <Search className="w-3.5 h-3.5 text-ink/40 shrink-0" />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink/40 text-sm"
        />
        {q && (
          <Link
            href={baseHref}
            aria-label="ล้างคำค้น"
            className="text-ink/40 hover:text-peach-600"
          >
            <X className="w-3.5 h-3.5" />
          </Link>
        )}
      </label>
    </form>
  );
}
