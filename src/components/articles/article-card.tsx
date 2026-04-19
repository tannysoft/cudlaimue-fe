import Link from "next/link";
import Image from "next/image";
import { extractArticleTerms, stripWpHtml, type WPArticle } from "@/lib/wp/client";

export function ArticleCard({ article }: { article: WPArticle }) {
  const cover = article._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
  const coverAlt =
    article._embedded?.["wp:featuredmedia"]?.[0]?.alt_text ??
    stripWpHtml(article.title.rendered);
  const author = article._embedded?.author?.[0]?.name;
  const { categories } = extractArticleTerms(article);
  const primaryCat = categories[0];
  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group rounded-2xl bg-white border border-peach-100 overflow-hidden hover:shadow-md transition block"
    >
      <div className="relative aspect-[16/10] bg-cream">
        {cover && (
          <Image
            src={cover}
            alt={coverAlt}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover group-hover:scale-[1.02] transition"
            unoptimized
          />
        )}
        {primaryCat && (
          <span className="absolute top-3 left-3 inline-flex items-center rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold text-peach-700">
            {primaryCat.name}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3
          className="font-[family-name:var(--font-display)] text-lg text-teal-600 font-bold leading-snug line-clamp-2"
          dangerouslySetInnerHTML={{ __html: article.title.rendered }}
        />
        <p className="mt-2 text-sm text-ink/60 line-clamp-3">
          {stripWpHtml(article.excerpt.rendered)}
        </p>
        <div className="mt-3 flex items-center justify-between text-xs text-ink/40">
          <span>{author ?? "คัดลายมือ"}</span>
          <span>{new Date(article.date).toLocaleDateString("th-TH")}</span>
        </div>
      </div>
    </Link>
  );
}
