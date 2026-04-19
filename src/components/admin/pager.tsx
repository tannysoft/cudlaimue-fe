import Link from "next/link";
import { ChevronLeft, ChevronRight, CornerDownLeft } from "lucide-react";

/**
 * URL-based pagination for server-rendered admin tables. Renders a compact
 * page-number strip with "…" gaps, prev/next arrows, and a "jump to page"
 * input that submits via GET → picks up the same `baseHref?page=N` route.
 */
export function Pager({
  page,
  totalPages,
  total,
  baseHref,
  label = "รายการ",
  extraParams,
}: {
  page: number;
  totalPages: number;
  total: number;
  baseHref: string;
  label?: string;
  /** Extra query params to preserve across page links (e.g. search `q`). */
  extraParams?: Record<string, string>;
}) {
  if (totalPages <= 1) return null;
  const items = pageItems(page, totalPages);
  const mkHref = (n: number) => {
    const params = new URLSearchParams();
    params.set("page", String(n));
    for (const [k, v] of Object.entries(extraParams ?? {})) {
      if (v) params.set(k, v);
    }
    return `${baseHref}?${params.toString()}`;
  };
  return (
    <div className="px-5 py-3 border-t border-peach-100 flex items-center justify-between gap-3 flex-wrap text-sm bg-[#fcf8f1]">
      <span className="text-xs text-ink/50 whitespace-nowrap">
        หน้า {page} / {totalPages} · ทั้งหมด {total.toLocaleString("th-TH")} {label}
      </span>
      <div className="inline-flex items-center gap-1 flex-wrap justify-end">
        <Arrow href={page > 1 ? mkHref(page - 1) : null} dir="prev" />
        {items.map((it, i) =>
          it === "ellipsis" ? (
            <span key={`e-${i}`} className="px-2 text-ink/40 select-none">
              …
            </span>
          ) : (
            <PageLink key={it} href={mkHref(it)} active={it === page} label={String(it)} />
          ),
        )}
        <Arrow href={page < totalPages ? mkHref(page + 1) : null} dir="next" />
        <JumpForm baseHref={baseHref} totalPages={totalPages} extraParams={extraParams} />
      </div>
    </div>
  );
}

export function paginationParams(searchParams: { page?: string | string[] }, perPage = 25) {
  const raw = searchParams.page;
  const p = Math.max(1, Number(Array.isArray(raw) ? raw[0] : raw ?? "1") || 1);
  return { page: p, perPage, offset: (p - 1) * perPage };
}

export function pageItems(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set<number>([1, total, current, current - 1, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((n) => set.add(n));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((n) => set.add(n));
  const sorted = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push("ellipsis");
    out.push(sorted[i]);
  }
  return out;
}

function PageLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  if (active) {
    return (
      <span className="inline-flex items-center justify-center min-w-9 h-9 rounded-full bg-peach-500 text-white text-sm font-medium">
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center min-w-9 h-9 rounded-full border border-peach-200 bg-white hover:bg-peach-50 text-ink/70 text-sm transition"
    >
      {label}
    </Link>
  );
}

function Arrow({ href, dir }: { href: string | null; dir: "prev" | "next" }) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  const base = "inline-flex items-center justify-center w-9 h-9 rounded-full border transition";
  if (!href) {
    return (
      <span
        className={`${base} border-peach-100 bg-white/60 text-ink/30 cursor-not-allowed`}
        aria-disabled
      >
        <Icon className="w-4 h-4" />
      </span>
    );
  }
  return (
    <Link
      href={href}
      className={`${base} border-peach-200 bg-white hover:bg-peach-50 text-ink/70`}
      aria-label={dir === "prev" ? "ก่อนหน้า" : "ถัดไป"}
    >
      <Icon className="w-4 h-4" />
    </Link>
  );
}

function JumpForm({
  baseHref,
  totalPages,
  extraParams,
}: {
  baseHref: string;
  totalPages: number;
  extraParams?: Record<string, string>;
}) {
  // Native GET form → browser builds the URL itself, no JS required.
  return (
    <form method="GET" action={baseHref} className="ml-2 inline-flex items-center gap-1">
      {Object.entries(extraParams ?? {}).map(([k, v]) =>
        v ? <input key={k} type="hidden" name={k} value={v} /> : null,
      )}
      <span className="text-xs text-ink/50">ไปหน้า</span>
      <input
        type="number"
        name="page"
        min={1}
        max={totalPages}
        placeholder={String(totalPages)}
        className="w-14 text-center rounded-full border border-peach-200 bg-white px-2 py-1 text-sm outline-none focus:border-peach-500 focus:ring-3 focus:ring-peach-500/15 transition"
      />
      <button
        type="submit"
        aria-label="ไปหน้าที่กำหนด"
        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-peach-500 hover:bg-peach-600 text-white transition"
      >
        <CornerDownLeft className="w-3.5 h-3.5" />
      </button>
    </form>
  );
}
