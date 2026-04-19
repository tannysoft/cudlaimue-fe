import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { wpGetArticleBySlug, extractArticleTerms } from "@/lib/wp/client";
import {
  articleJsonLd,
  articleMetadata,
  jsonLdString,
  stripHtml,
} from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const a = await wpGetArticleBySlug(slug).catch(() => null);
  if (!a) return { title: "ไม่พบบทความ" };
  return articleMetadata({
    title: stripHtml(a.title.rendered, 110),
    slug: a.slug,
    excerpt: stripHtml(a.excerpt.rendered, 160),
    coverImageUrl: a._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null,
    publishedAt: a.date,
    modifiedAt: a.modified,
    authorName: a._embedded?.author?.[0]?.name,
  });
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await wpGetArticleBySlug(slug).catch(() => null);
  if (!a) return notFound();
  const cover = a._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
  const author = a._embedded?.author?.[0];
  const { categories, tags } = extractArticleTerms(a);
  const plainTitle = stripHtml(a.title.rendered, 110);
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdString(
            articleJsonLd({
              title: plainTitle,
              slug: a.slug,
              excerpt: stripHtml(a.excerpt.rendered, 160),
              coverImageUrl: cover ?? null,
              publishedAt: a.date,
              modifiedAt: a.modified,
              authorName: author?.name,
            }),
          ),
        }}
      />
      <Link
        href="/articles"
        className="inline-flex items-center gap-1.5 rounded-full border border-peach-200 bg-white hover:border-peach-400 hover:bg-peach-50 text-ink/70 hover:text-peach-700 text-xs font-medium px-3 py-1.5 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> บทความทั้งหมด
      </Link>
      {categories.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="inline-flex items-center text-[11px] uppercase tracking-wider font-semibold bg-peach-100 hover:bg-peach-200 text-peach-700 rounded-full px-2.5 py-0.5 transition"
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}
      <h1
        className="mt-3 font-[family-name:var(--font-display)] text-3xl md:text-4xl text-teal-700 font-extrabold leading-tight"
        dangerouslySetInnerHTML={{ __html: a.title.rendered }}
      />
      <div className="mt-3 text-sm text-ink/50 flex items-center gap-3">
        {author?.avatar_urls?.["48"] && (
          <Image
            src={author.avatar_urls["48"]}
            alt={author.name ?? "ผู้เขียน"}
            width={24}
            height={24}
            className="rounded-full"
            unoptimized
          />
        )}
        <span>{author?.name ?? "คัดลายมือ"}</span>
        <span>•</span>
        <span>{new Date(a.date).toLocaleDateString("th-TH", { dateStyle: "long" })}</span>
      </div>
      {cover && (
        <div className="mt-6 relative aspect-[16/9] rounded-2xl overflow-hidden bg-cream border border-peach-100">
          <Image src={cover} alt={plainTitle} fill className="object-cover" unoptimized />
        </div>
      )}
      <div
        className="prose prose-cudlaimue mt-8 max-w-none"
        dangerouslySetInnerHTML={{ __html: a.content.rendered }}
      />
      {tags.length > 0 && (
        <div className="mt-10 pt-6 border-t border-peach-100">
          <div className="text-xs uppercase tracking-wider text-ink/50 mb-2">Tags</div>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <Link
                key={t.slug}
                href={`/tag/${t.slug}`}
                className="text-sm text-ink/70 bg-cream/80 hover:bg-peach-100 hover:text-peach-700 rounded-full px-3 py-1 transition"
              >
                #{t.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
