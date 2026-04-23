import Link from "next/link";
import { and, desc, eq, like, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { ProductCard } from "@/components/shop/product-card";
import { OwnedProductsProvider } from "@/components/shop/owned-products-provider";
import { TaxonomyPager } from "@/components/articles/taxonomy-pager";

const PER_PAGE = 12;

/**
 * Shared product-archive renderer for product-category and product-tag URLs.
 * Filters the `products` table by a JSON-array membership match on either
 * `categories` or `tags`, mimicking the WooCommerce archive UX.
 *
 * Storage quirk: categories/tags live as a JSON array string on each product
 * (e.g. `'["ฟอนต์น่ารัก","ลายมือ"]'`), so we use a `LIKE '%"slug"%'` probe
 * rather than JSON functions. Works for the small product catalog; revisit
 * if we ever cross ~10k products.
 */
export async function ProductArchive({
  kind,
  slug,
  page,
}: {
  kind: "category" | "tag";
  slug: string;
  page: number;
}) {
  const column = kind === "category" ? products.categories : products.tags;
  const probe = `%${jsonQuoteEscape(slug)}%`;
  const baseHref = `/product-${kind}/${encodeURIComponent(slug)}`;

  const where = and(eq(products.isPublished, true), like(column, probe));

  const [list, countRows] = await Promise.all([
    db()
      .select()
      .from(products)
      .where(where)
      .orderBy(desc(products.sortOrder), desc(products.createdAt))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE),
    db()
      .select({ n: sql<number>`count(*)` })
      .from(products)
      .where(where),
  ]);
  const total = Number(countRows[0]?.n ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  // Guard against page-out-of-range — if the URL says /page/99 but we only
  // have 2 pages, drop to an empty state instead of showing nothing weird.
  const outOfRange = page > totalPages && total > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-6">
        <nav className="text-xs text-ink/50 mb-2">
          <Link href="/" className="hover:text-peach-600">
            หน้าแรก
          </Link>{" "}
          /{" "}
          <span>
            {kind === "category" ? "หมวดสินค้า" : "แท็กสินค้า"}
          </span>
        </nav>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-600 font-bold">
          {kind === "category" ? "หมวดหมู่" : "แท็ก"}:{" "}
          <span className="text-peach-600">{slug}</span>
        </h1>
        <p className="text-ink/60 mt-1 text-sm">
          พบ {total} รายการ
          {page > 1 ? ` · หน้า ${page} / ${totalPages}` : ""}
        </p>
      </header>

      {list.length === 0 || outOfRange ? (
        <div className="rounded-2xl border border-dashed border-peach-200 py-16 text-center text-ink/50">
          ยังไม่มีสินค้าใน{kind === "category" ? "หมวดนี้" : "แท็กนี้"}{" "}
          <Link href="/" className="ml-1 text-peach-600 hover:underline">
            กลับหน้าแรก
          </Link>
        </div>
      ) : (
        <>
          <OwnedProductsProvider productIds={list.map((p) => p.id)}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {list.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  aspect={productAspect(p.type)}
                />
              ))}
            </div>
          </OwnedProductsProvider>
          <TaxonomyPager
            baseHref={baseHref}
            page={page}
            totalPages={totalPages}
          />
        </>
      )}
    </div>
  );
}

function productAspect(type: string): "landscape" | "portrait" | "square" {
  if (type === "font") return "square";
  if (type === "ebook" || type === "template") return "portrait";
  return "landscape";
}

/** Escape `"` and `\` for a JSON-embedded LIKE probe. */
function jsonQuoteEscape(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
