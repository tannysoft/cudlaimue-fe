import { notFound } from "next/navigation";
import { wpGetTagBySlug } from "@/lib/wp/client";
import { TagArchive } from "@/components/articles/tag-archive";
import { paginatedArchiveMetadata } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; num: string }>;
}) {
  const { slug, num } = await params;
  const tag = await wpGetTagBySlug(slug).catch(() => null);
  return paginatedArchiveMetadata({
    title: tag ? `บทความแท็ก #${tag.name}` : "บทความ",
    description: tag?.description,
    basePath: `/tag/${slug}`,
    page: Number(num) || 1,
  });
}

export default async function TagArchivePaginatedPage({
  params,
}: {
  params: Promise<{ slug: string; num: string }>;
}) {
  const { slug, num } = await params;
  const page = Number(num);
  if (!Number.isInteger(page) || page < 2) return notFound();
  return <TagArchive slug={slug} page={page} />;
}
