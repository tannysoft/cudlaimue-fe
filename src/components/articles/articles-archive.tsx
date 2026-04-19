import Link from "next/link";
import { wpListArticles } from "@/lib/wp/client";
import { ArticleCard } from "@/components/articles/article-card";
import { TaxonomyPager } from "@/components/articles/taxonomy-pager";

/**
 * Shared renderer for the main articles index — used by both `/articles`
 * (page 1) and `/articles/page/[num]` (paginated).
 */
export async function ArticlesArchive({ page }: { page: number }) {
  let posts: Awaited<ReturnType<typeof wpListArticles>>["posts"] = [];
  let totalPages = 1;
  try {
    const r = await wpListArticles({ page, perPage: 12 });
    posts = r.posts;
    totalPages = r.totalPages;
  } catch {
    // empty
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-600 font-bold">
            บทความ
          </h1>
          <p className="text-ink/60 mt-1">
            เรื่องเล่า แรงบันดาลใจ และเคล็ดลับจากคัดลายมือ
            {page > 1 ? ` · หน้า ${page} / ${totalPages}` : ""}
          </p>
        </div>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/category"
            className="inline-flex items-center gap-1.5 rounded-full border border-peach-200 bg-white hover:border-peach-400 hover:bg-peach-50 text-peach-700 font-medium px-3.5 py-1.5 transition"
          >
            หมวดหมู่
          </Link>
          <Link
            href="/tag"
            className="inline-flex items-center gap-1.5 rounded-full border border-peach-200 bg-white hover:border-peach-400 hover:bg-peach-50 text-peach-700 font-medium px-3.5 py-1.5 transition"
          >
            แท็ก
          </Link>
        </nav>
      </header>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-peach-200 py-16 text-center text-ink/50">
          ยังไม่มีบทความ
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-5">
            {posts.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
          <TaxonomyPager baseHref="/articles" page={page} totalPages={totalPages} />
        </>
      )}
    </div>
  );
}
