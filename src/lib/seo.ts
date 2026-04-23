import type { Metadata } from "next";
import { siteOrigin } from "./sitemap";
import { fullUrl } from "./img";

/**
 * SEO helpers — dynamic metadata + JSON-LD builders shared across the public
 * site so every detail page ships consistent title / description / OG / schema
 * data without duplicating boilerplate.
 */

const SITE_NAME = "คัดลายมือ";
const DEFAULT_OG_IMAGE = "/brand/cover.png";
const CURRENCY = "THB";

export function abs(path: string): string {
  if (path.startsWith("http")) return path;
  return `${siteOrigin()}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Strip HTML tags + collapse whitespace. Used to derive plain-text
 *  descriptions from WP content or product rich-text. */
export function stripHtml(html: string, maxLen = 160): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1).trimEnd() + "…";
}

export interface ProductMetaInput {
  name: string;
  tagline?: string | null;
  description?: string | null;
  priceSatang: number;
  coverImageKey?: string | null;
  type: "font" | "ebook" | "template" | string;
  slug: string;
}

const TYPE_LABEL: Record<string, string> = {
  font: "ฟอนต์",
  ebook: "อีบุ๊ก",
  template: "เทมเพลต",
};

const TYPE_PATH: Record<string, string> = {
  font: "/fonts",
  ebook: "/ebooks",
  template: "/templates",
};

export function productMetadata(p: ProductMetaInput): Metadata {
  const label = TYPE_LABEL[p.type] ?? "สินค้า";
  const price = `${(p.priceSatang / 100).toLocaleString("th-TH")} บาท`;
  const descBase = p.tagline?.trim()
    ? p.tagline
    : p.description
      ? stripHtml(p.description)
      : `${label} "${p.name}" จาก ${SITE_NAME} ราคา ${price}`;
  const description = stripHtml(descBase);
  const url = abs(`${TYPE_PATH[p.type] ?? ""}/${p.slug}`);
  const image = p.coverImageKey
    ? abs(fullUrl(p.coverImageKey))
    : abs(DEFAULT_OG_IMAGE);

  return {
    title: p.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: p.name,
      description,
      url,
      siteName: SITE_NAME,
      images: [{ url: image, alt: p.name }],
      locale: "th_TH",
    },
    twitter: {
      card: "summary_large_image",
      title: p.name,
      description,
      images: [image],
    },
  };
}

export function productJsonLd(p: ProductMetaInput): Record<string, unknown> {
  const url = abs(`${TYPE_PATH[p.type] ?? ""}/${p.slug}`);
  const image = p.coverImageKey
    ? abs(fullUrl(p.coverImageKey))
    : abs(DEFAULT_OG_IMAGE);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.tagline ?? (p.description ? stripHtml(p.description) : undefined),
    image,
    url,
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: CURRENCY,
      price: (p.priceSatang / 100).toFixed(2),
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: SITE_NAME },
    },
  };
}

export interface ArticleMetaInput {
  title: string;
  slug: string;
  excerpt?: string;
  coverImageUrl?: string | null;
  publishedAt: string; // ISO
  modifiedAt?: string; // ISO
  authorName?: string;
}

export function articleMetadata(a: ArticleMetaInput): Metadata {
  const description = stripHtml(a.excerpt ?? a.title, 160);
  const url = abs(`/${a.slug}`);
  const image = a.coverImageUrl ?? abs(DEFAULT_OG_IMAGE);
  return {
    title: stripHtml(a.title, 70),
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: stripHtml(a.title, 70),
      description,
      url,
      siteName: SITE_NAME,
      images: [{ url: image, alt: stripHtml(a.title, 70) }],
      locale: "th_TH",
      publishedTime: a.publishedAt,
      modifiedTime: a.modifiedAt,
      authors: a.authorName ? [a.authorName] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: stripHtml(a.title, 70),
      description,
      images: [image],
    },
  };
}

export function articleJsonLd(a: ArticleMetaInput): Record<string, unknown> {
  const url = abs(`/${a.slug}`);
  const image = a.coverImageUrl ?? abs(DEFAULT_OG_IMAGE);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: stripHtml(a.title, 110),
    description: stripHtml(a.excerpt ?? a.title, 160),
    image,
    mainEntityOfPage: url,
    url,
    datePublished: a.publishedAt,
    dateModified: a.modifiedAt ?? a.publishedAt,
    author: {
      "@type": "Person",
      name: a.authorName ?? SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: abs("/brand/logo.png"),
      },
    },
  };
}

export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteOrigin(),
    logo: abs("/brand/logo.png"),
    sameAs: ["https://line.me/R/ti/p/@595tsawy"],
  };
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteOrigin(),
    inLanguage: "th-TH",
  };
}

/** Paginated archive metadata — sets canonical to base URL (no "/page/N")
 *  so Google consolidates signals on the first page without hiding the
 *  paginated ones from indexing. */
export function paginatedArchiveMetadata(opts: {
  title: string;
  description?: string;
  basePath: string; // e.g. "/articles", "/category/foo"
  page: number;
}): Metadata {
  const url = abs(
    opts.page <= 1 ? opts.basePath : `${opts.basePath}/page/${opts.page}`,
  );
  const canonical = abs(opts.basePath);
  const title =
    opts.page <= 1 ? opts.title : `${opts.title} · หน้า ${opts.page}`;
  return {
    title,
    description: opts.description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title,
      description: opts.description,
      url,
      siteName: SITE_NAME,
      locale: "th_TH",
    },
    twitter: {
      card: "summary",
      title,
      description: opts.description,
    },
  };
}

/** Serialize JSON-LD for a <script type="application/ld+json"> tag.
 *  Escapes `</script>` in case user content happens to contain it. */
export function jsonLdString(obj: Record<string, unknown>): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}
