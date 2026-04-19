import { wpGetTagBySlug } from "@/lib/wp/client";
import { TagArchive } from "@/components/articles/tag-archive";
import { paginatedArchiveMetadata } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tag = await wpGetTagBySlug(slug).catch(() => null);
  return paginatedArchiveMetadata({
    title: tag ? `บทความแท็ก #${tag.name}` : "บทความ",
    description: tag?.description,
    basePath: `/tag/${slug}`,
    page: 1,
  });
}

export default async function TagArchivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <TagArchive slug={slug} page={1} />;
}
