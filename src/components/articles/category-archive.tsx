import { notFound } from "next/navigation";
import Link from "next/link";
import { Folder } from "lucide-react";
import { wpGetCategoryBySlug, wpListArticles } from "@/lib/wp/client";
import { ArticleCard } from "@/components/articles/article-card";
import { TaxonomyPager } from "@/components/articles/taxonomy-pager";

/**
 * Shared renderer for category archive pages — used by both `/category/[slug]`
 * (page 1) and `/category/[slug]/page/[num]` (paginated). Centralizing here
 * means the WP fetch / loading / not-found logic stays in one place.
 */
export async function CategoryArchive({
  slug,
  page,
}: {
  slug: string;
  page: number;
}) {
  const cat = await wpGetCategoryBySlug(slug).catch(() => null);
  if (!cat) return notFound();

  let posts: Awaited<ReturnType<typeof wpListArticles>>["posts"] = [];
  let totalPages = 1;
  try {
    const r = await wpListArticles({ page, perPage: 12, categoryId: cat.id });
    posts = r.posts;
    totalPages = r.totalPages;
  } catch {
    // empty
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs text-ink/50">
          <Link href="/articles" className="hover:text-peach-600">
            บทความ
          </Link>
          <span>·</span>
          <Link href="/category" className="hover:text-peach-600">
            หมวดหมู่
          </Link>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-peach-100 text-peach-600 flex items-center justify-center shrink-0">
            <Folder className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-700 font-bold">
              {cat.name}
            </h1>
            <p className="text-sm text-ink/60 mt-0.5">
              {cat.count} บทความ
              {page > 1 ? ` · หน้า ${page} / ${totalPages}` : ""}
            </p>
          </div>
        </div>
        {cat.description && (
          <p
            className="mt-3 text-sm text-ink/70"
            dangerouslySetInnerHTML={{ __html: cat.description }}
          />
        )}
      </header>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-peach-200 py-16 text-center text-ink/50">
          ยังไม่มีบทความในหมวดนี้
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-5">
            {posts.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
          <TaxonomyPager
            baseHref={`/category/${cat.slug}`}
            page={page}
            totalPages={totalPages}
          />
        </>
      )}
    </div>
  );
}
