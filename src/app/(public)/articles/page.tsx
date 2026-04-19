import { ArticlesArchive } from "@/components/articles/articles-archive";
import { paginatedArchiveMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata = paginatedArchiveMetadata({
  title: "บทความ",
  basePath: "/articles",
  page: 1,
});

export default function ArticlesPage() {
  return <ArticlesArchive page={1} />;
}
