import { ProductArchive } from "@/components/shop/product-archive";
import { paginatedArchiveMetadata } from "@/lib/seo";

export const revalidate = 120;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const name = decodeURIComponent(slug);
  return paginatedArchiveMetadata({
    title: `สินค้าหมวด ${name}`,
    description: `รวมสินค้าในหมวดหมู่ ${name} จากคัดลายมือ`,
    basePath: `/product-category/${slug}`,
    page: 1,
  });
}

export default async function ProductCategoryArchivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ProductArchive kind="category" slug={decodeURIComponent(slug)} page={1} />;
}
