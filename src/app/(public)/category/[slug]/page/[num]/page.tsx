import { notFound } from "next/navigation";
import { wpGetCategoryBySlug } from "@/lib/wp/client";
import { CategoryArchive } from "@/components/articles/category-archive";
import { paginatedArchiveMetadata } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; num: string }>;
}) {
  const { slug, num } = await params;
  const cat = await wpGetCategoryBySlug(slug).catch(() => null);
  return paginatedArchiveMetadata({
    title: cat ? `บทความหมวด ${cat.name}` : "บทความ",
    description: cat?.description,
    basePath: `/category/${slug}`,
    page: Number(num) || 1,
  });
}

export default async function CategoryArchivePaginatedPage({
  params,
}: {
  params: Promise<{ slug: string; num: string }>;
}) {
  const { slug, num } = await params;
  const page = Number(num);
  if (!Number.isInteger(page) || page < 2) return notFound();
  return <CategoryArchive slug={slug} page={page} />;
}
