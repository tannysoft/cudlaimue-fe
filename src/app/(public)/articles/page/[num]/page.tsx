import { notFound } from "next/navigation";
import { ArticlesArchive } from "@/components/articles/articles-archive";
import { paginatedArchiveMetadata } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ num: string }>;
}) {
  const { num } = await params;
  return paginatedArchiveMetadata({
    title: "บทความ",
    basePath: "/articles",
    page: Number(num) || 1,
  });
}

export default async function ArticlesPaginatedPage({
  params,
}: {
  params: Promise<{ num: string }>;
}) {
  const { num } = await params;
  const page = Number(num);
  if (!Number.isInteger(page) || page < 2) return notFound();
  return <ArticlesArchive page={page} />;
}
