import { notFound } from "next/navigation";
import { ProductArchive } from "@/components/shop/product-archive";
import { paginatedArchiveMetadata } from "@/lib/seo";

export const revalidate = 120;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; num: string }>;
}) {
  const { slug, num } = await params;
  const name = decodeURIComponent(slug);
  const page = Number(num) || 1;
  return paginatedArchiveMetadata({
    title: `สินค้าหมวด ${name}`,
    description: `รวมสินค้าในหมวดหมู่ ${name} จากคัดลายมือ`,
    basePath: `/product-category/${slug}`,
    page,
  });
}

export default async function ProductCategoryPaginated({
  params,
}: {
  params: Promise<{ slug: string; num: string }>;
}) {
  const { slug, num } = await params;
  const page = Number(num);
  if (!Number.isFinite(page) || page < 2) return notFound();
  return <ProductArchive kind="category" slug={decodeURIComponent(slug)} page={page} />;
}
