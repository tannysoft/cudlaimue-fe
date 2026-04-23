import Link from "next/link";
import Image from "next/image";
import { BookOpen, LayoutTemplate } from "lucide-react";
import { desc, eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { ProductCard } from "@/components/shop/product-card";
import { OwnedProductsProvider } from "@/components/shop/owned-products-provider";
import { wpListArticles, extractArticleTerms, stripWpHtml, type WPArticle } from "@/lib/wp/client";
import { getSiteSettings } from "@/lib/site-settings";
import { ArrowRight, CalendarDays } from "lucide-react";

export const revalidate = 120;

export default async function HomePage() {
  const [featured, settings] = await Promise.all([
    db()
      .select()
      .from(products)
      .where(and(eq(products.isPublished, true), eq(products.isFeatured, true)))
      .orderBy(desc(products.sortOrder))
      .limit(8),
    getSiteSettings(),
  ]);

  let articles: Awaited<ReturnType<typeof wpListArticles>>["posts"] = [];
  try {
    // 1 featured + up to 4 compact = 5 total
    const r = await wpListArticles({ perPage: 5 });
    articles = r.posts;
  } catch {
    // WP may be temporarily unreachable — render the page without articles.
  }

  const heroBgUrl = settings.heroImageKey ? `/api/assets/${settings.heroImageKey}` : null;

  return (
    <div>
      {/* Hero */}
      {heroBgUrl ? (
        <section className="bg-cream">
          {/*
            Full-bleed banner — extends edge-to-edge across the viewport.
            The negative top margin slides the image up to sit *behind* the
            transparent sticky header (h-16 = 64px). Once the user scrolls
            down a few pixels the header turns opaque and naturally covers
            the part of the image that was peeking through.

            CTA buttons live INSIDE the hero, anchored to the bottom over a
            soft cream-fade scrim so they're legible on any image.
          */}
          <div className="relative w-full aspect-[6/5] sm:aspect-[16/9] md:aspect-[2/1] overflow-hidden -mt-16">
            <Image
              src={heroBgUrl}
              alt="คัดลายมือ — ฟอนต์ลายมือ อีบุ๊ก และเทมเพลต"
              fill
              priority
              sizes="100vw"
              className="object-cover"
              unoptimized
            />
            {/* Bottom scrim for button contrast (cream-fade so it blends
                with the page background below). Desktop only — mobile shows
                buttons directly over the image without a gradient. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-cream via-cream/70 to-transparent hidden md:block" />
            <div className="absolute inset-x-0 bottom-4.5 md:bottom-10 flex flex-wrap gap-3 justify-center px-4 font-[family-name:var(--font-display)]">
              <Link
                href="/fonts"
                className="rounded-full bg-peach-500 hover:bg-peach-600 text-white font-medium px-6 py-2.5 shadow-md hover:shadow-lg transition"
              >
                เลือกฟอนต์
              </Link>
              <Link
                href="/ebooks"
                className="rounded-full bg-white border border-peach-200 hover:border-peach-400 hover:bg-peach-50 text-peach-700 font-medium px-6 py-2.5 shadow-sm transition"
              >
                ดูอีบุ๊ก
              </Link>
              <Link
                href="/templates"
                className="rounded-full bg-white border border-peach-200 hover:border-peach-400 hover:bg-peach-50 text-peach-700 font-medium px-6 py-2.5 shadow-sm transition"
              >
                เทมเพลต
              </Link>
            </div>
          </div>
          <h1 className="sr-only">
            ฟอนต์ลายมือสไตล์มินิมอล อีบุ๊ก และเทมเพลต — เริ่มต้นเพียง 129 บาท
          </h1>
        </section>
      ) : (
        <section className="relative overflow-hidden -mt-16 pt-16">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-teal-700" />
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_20%_20%,#fff_1px,transparent_1px),radial-gradient(circle_at_80%_40%,#fff_1px,transparent_1px),radial-gradient(circle_at_40%_80%,#fff_1px,transparent_1px)] bg-[length:120px_120px,180px_180px,90px_90px]" />
          <div className="relative mx-auto max-w-4xl px-4 py-20 md:py-32 text-center text-white">
            <p className="uppercase tracking-[0.25em] text-xs font-semibold text-white/80">
              คัดลายมือ · Digital Goods
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight">
              ฟอนต์ลายมือ <span className="text-peach-300">น่ารักๆ</span>
              <br />
              และอีบุ๊กที่โดนใจ
            </h1>
            <p className="mt-5 max-w-xl mx-auto text-base md:text-lg text-white/90">
              แหล่งรวมฟอนต์ลายมือสไตล์มินิมอล อีบุ๊ก และเทมเพลต — เริ่มต้นเพียง 129 บาท
              ใช้ได้ทั้งส่วนตัวและเชิงพาณิชย์
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center font-[family-name:var(--font-display)]">
              <Link
                href="/fonts"
                className="rounded-full bg-peach-500 hover:bg-peach-600 text-white font-medium px-6 py-3 shadow-md hover:shadow-lg transition"
              >
                เลือกฟอนต์
              </Link>
              <Link
                href="/ebooks"
                className="rounded-full bg-white/20 hover:bg-white/30 text-white font-medium px-6 py-3 border border-white/40 backdrop-blur-sm transition"
              >
                ดูอีบุ๊ก
              </Link>
              <Link
                href="/templates"
                className="rounded-full bg-white/20 hover:bg-white/30 text-white font-medium px-6 py-3 border border-white/40 backdrop-blur-sm transition"
              >
                เทมเพลต
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Featured products */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10 md:py-16">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl text-teal-600 font-bold">
                สินค้าแนะนำ
              </h2>
              <p className="text-ink/60 mt-1 text-sm">คัดสรรโดยทีม Cudlaimue</p>
            </div>
            <Link href="/fonts" className="text-peach-600 text-sm hover:underline">
              ดูทั้งหมด →
            </Link>
          </div>
          <OwnedProductsProvider productIds={featured.map((p) => p.id)}>
            <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </OwnedProductsProvider>
        </section>
      )}

      {/* Categories strip */}
      <section className="mx-auto max-w-6xl px-4 mt-8 md:mt-6 grid md:grid-cols-3 gap-4 md:gap-6">
        <Link
          href="/fonts"
          className="group relative overflow-hidden rounded-3xl bg-peach-500 text-white p-8 min-h-48 flex items-end hover:shadow-lg transition"
        >
          <div className="relative z-10">
            <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold">ฟอนต์ลายมือ</h3>
            <p className="text-white/90 mt-1">ฟอนต์ลายมือน่ารัก เป็นระเบียบ อ่านง่าย สบายตา ใช้ได้ทั้งส่วนตัวและเชิงพาณิชย์</p>
          </div>
          <div className="absolute -top-6 -right-6 text-[140px] font-bold text-white/10 font-[family-name:var(--font-display)] select-none leading-none">
            Aa
          </div>
        </Link>
        <Link
          href="/ebooks"
          className="group relative overflow-hidden rounded-3xl bg-teal-500 text-white p-8 min-h-48 flex items-end hover:shadow-lg transition"
        >
          <div className="relative z-10">
            <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold">อีบุ๊ก</h3>
            <p className="text-white/90 mt-1">อ่านออนไลน์ทันที ปลอดภัย มีลายน้ำเฉพาะคุณ</p>
          </div>
          <BookOpen className="absolute -top-4 -right-4 w-44 h-44 text-white/10" strokeWidth={1.5} />
        </Link>
        <Link
          href="/templates"
          className="group relative overflow-hidden rounded-3xl bg-amber-500 text-white p-8 min-h-48 flex items-end hover:shadow-lg transition"
        >
          <div className="relative z-10">
            <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold">เทมเพลต</h3>
            <p className="text-white/90 mt-1">Journal Template สำหรับใช้เขียนบันทึก</p>
          </div>
          <LayoutTemplate className="absolute -top-4 -right-4 w-44 h-44 text-white/10" strokeWidth={1.5} />
        </Link>
      </section>

      {/* Articles — magazine layout: 1 hero + N stacked compact */}
      {articles.length > 0 && (
        <section className="relative bg-cream/60 mt-12 md:mt-20 pt-12 md:pt-24 pb-0 md:pb-2">
          {/* Hairline divider above to separate from product strip */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-peach-200 to-transparent" />
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex flex-col items-center text-center mb-8 md:mb-10">
              <span className="text-[11px] uppercase tracking-[0.3em] text-peach-600 font-semibold">
                Journal
              </span>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl md:text-4xl text-teal-700 font-bold">
                บทความล่าสุด
              </h2>
              <div className="mt-3 h-0.5 w-12 bg-peach-300 rounded-full" />
            </div>

            <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
              <FeatureArticleCard article={articles[0]} />
              {articles.length > 1 && (
                <div className="space-y-4">
                  {articles.slice(1, 5).map((a) => (
                    <CompactArticleCard key={a.id} article={a} />
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 md:mt-10 text-center">
              <Link
                href="/articles"
                className="inline-flex items-center gap-1.5 rounded-full border border-peach-200 bg-white hover:border-peach-400 hover:bg-peach-50 text-peach-700 text-sm font-medium px-5 py-2.5 transition"
              >
                อ่านบทความทั้งหมด <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function articleCover(a: WPArticle) {
  return a._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null;
}

function FeatureArticleCard({ article }: { article: WPArticle }) {
  const cover = articleCover(article);
  const coverAlt =
    article._embedded?.["wp:featuredmedia"]?.[0]?.alt_text ??
    stripWpHtml(article.title.rendered);
  const author = article._embedded?.author?.[0]?.name;
  const { categories } = extractArticleTerms(article);
  const primaryCat = categories[0];
  return (
    <Link
      href={`/${article.slug}`}
      className="group block rounded-3xl overflow-hidden bg-white border border-peach-100 hover:shadow-xl hover:border-peach-200 transition"
    >
      <div className="relative aspect-[16/9] bg-cream overflow-hidden">
        {cover && (
          <Image
            src={cover}
            alt={coverAlt}
            fill
            sizes="(max-width: 1024px) 100vw, 700px"
            className="object-cover group-hover:scale-[1.03] transition duration-500"
            unoptimized
          />
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/30 to-transparent" />
        <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-[11px] uppercase tracking-wider font-semibold text-peach-700">
          {primaryCat?.name ?? "Featured"}
        </span>
      </div>
      <div className="p-6 md:p-7">
        <h3
          className="font-[family-name:var(--font-display)] text-2xl md:text-3xl text-teal-700 font-bold leading-tight group-hover:text-peach-600 transition line-clamp-2"
          dangerouslySetInnerHTML={{ __html: article.title.rendered }}
        />
        <p className="mt-3 text-sm text-ink/70 leading-relaxed line-clamp-3">
          {stripWpHtml(article.excerpt.rendered)}
        </p>
        <div className="mt-4 flex items-center gap-3 text-xs text-ink/50">
          <span>{author ?? "คัดลายมือ"}</span>
          <span className="w-1 h-1 rounded-full bg-ink/20" />
          <CalendarDays className="w-3 h-3" />
          <span>
            {new Date(article.date).toLocaleDateString("th-TH", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
      </div>
    </Link>
  );
}

function CompactArticleCard({ article }: { article: WPArticle }) {
  const cover = articleCover(article);
  const coverAlt =
    article._embedded?.["wp:featuredmedia"]?.[0]?.alt_text ??
    stripWpHtml(article.title.rendered);
  const { categories } = extractArticleTerms(article);
  const primaryCat = categories[0];
  return (
    <Link
      href={`/${article.slug}`}
      className="group flex gap-3 rounded-2xl overflow-hidden bg-white border border-peach-100 p-3 hover:shadow-md hover:border-peach-200 transition"
    >
      <div className="relative w-32 sm:w-40 aspect-[4/3] rounded-xl bg-cream overflow-hidden shrink-0">
        {cover && (
          <Image
            src={cover}
            alt={coverAlt}
            fill
            sizes="(max-width: 640px) 128px, 160px"
            className="object-cover group-hover:scale-[1.04] transition duration-500"
            unoptimized
          />
        )}
      </div>
      <div className="flex-1 min-w-0 py-1">
        {primaryCat && (
          <span className="inline-block text-[10px] uppercase tracking-wider font-semibold text-peach-600 mb-1">
            {primaryCat.name}
          </span>
        )}
        <h3
          className="font-[family-name:var(--font-display)] text-base md:text-lg text-teal-700 font-bold leading-snug line-clamp-2 group-hover:text-peach-600 transition"
          dangerouslySetInnerHTML={{ __html: article.title.rendered }}
        />
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink/50">
          <CalendarDays className="w-3 h-3" />
          <span>
            {new Date(article.date).toLocaleDateString("th-TH", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
    </Link>
  );
}
