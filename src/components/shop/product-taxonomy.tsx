import Link from "next/link";

export function ProductTaxonomy({
  categories,
  tags,
}: {
  categories: string[];
  tags: string[];
}) {
  if (categories.length === 0 && tags.length === 0) return null;
  return (
    <div className="mt-5 space-y-3">
      {categories.length > 0 && (
        <TaxonomyRow
          label="หมวดหมู่"
          items={categories}
          hrefBase="/product-category"
          variant="teal"
        />
      )}
      {tags.length > 0 && (
        <TaxonomyRow
          label="แท็ก"
          items={tags}
          hrefBase="/product-tag"
          variant="peach"
        />
      )}
    </div>
  );
}

function TaxonomyRow({
  label,
  items,
  hrefBase,
  variant,
}: {
  label: string;
  items: string[];
  hrefBase: string;
  variant: "peach" | "teal";
}) {
  const cls =
    variant === "teal"
      ? "bg-teal-100 text-teal-700 hover:bg-teal-200"
      : "bg-peach-100 text-peach-700 hover:bg-peach-200";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-ink/50">{label}:</span>
      {items.map((t) => (
        <Link
          key={t}
          href={`${hrefBase}/${encodeURIComponent(t)}`}
          className={`text-xs rounded-full px-2.5 py-1 font-medium transition ${cls}`}
        >
          {t}
        </Link>
      ))}
    </div>
  );
}
