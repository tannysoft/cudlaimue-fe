import { desc, count, or, like } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { ProductsView } from "@/components/admin/products-view";
import { paginationParams } from "@/components/admin/pager";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const { page, perPage, offset } = paginationParams(sp, 25);
  const q = (sp.q ?? "").trim();
  const pat = `%${q}%`;

  const where = q
    ? or(like(products.name, pat), like(products.slug, pat))
    : undefined;

  const [list, [{ n: total }]] = await Promise.all([
    db()
      .select()
      .from(products)
      .where(where)
      .orderBy(desc(products.createdAt))
      .limit(perPage)
      .offset(offset),
    db().select({ n: count() }).from(products).where(where),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const counts = {
    fonts: list.filter((p) => p.type === "font").length,
    ebooks: list.filter((p) => p.type === "ebook").length,
    templates: list.filter((p) => p.type === "template").length,
  };

  return (
    <ProductsView
      page={page}
      totalPages={totalPages}
      total={total}
      q={q}
      counts={counts}
      products={list.map((p) => ({
        id: p.id,
        type: p.type as "font" | "ebook" | "template",
        slug: p.slug,
        name: p.name,
        coverImageKey: p.coverImageKey,
        priceSatang: p.priceSatang,
        compareAtPriceSatang: p.compareAtPriceSatang,
        isPublished: p.isPublished,
        isFeatured: p.isFeatured,
      }))}
    />
  );
}
