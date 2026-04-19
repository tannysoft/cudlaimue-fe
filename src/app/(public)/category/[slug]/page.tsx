import { wpGetCategoryBySlug } from "@/lib/wp/client";
import { CategoryArchive } from "@/components/articles/category-archive";
import { paginatedArchiveMetadata } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cat = await wpGetCategoryBySlug(slug).catch(() => null);
  return paginatedArchiveMetadata({
    title: cat ? `บทความหมวด ${cat.name}` : "บทความ",
    description: cat?.description,
    basePath: `/category/${slug}`,
    page: 1,
  });
}

export default async function CategoryArchivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CategoryArchive slug={slug} page={1} />;
}
