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
    title: `สินค้าแท็ก ${name}`,
    description: `รวมสินค้าที่มีแท็ก ${name} จากคัดลายมือ`,
    basePath: `/product-tag/${slug}`,
    page: 1,
  });
}

export default async function ProductTagArchivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ProductArchive kind="tag" slug={decodeURIComponent(slug)} page={1} />;
}
