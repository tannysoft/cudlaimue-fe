import "server-only";

/**
 * Shared helpers for the RankMath-style multi-file sitemap.
 *
 * Layout:
 *   /sitemap_index.xml           — master index, references everything below
 *   /page-sitemap.xml            — static pages (home, license, refund)
 *   /product-sitemap.xml         — fonts + ebooks + templates
 *   /post-sitemap.xml            — WP articles
 *   /category-sitemap.xml        — WP article categories
 *   /post_tag-sitemap.xml        — WP article tags
 *
 * Each child sitemap is served as `application/xml` and points at the
 * included stylesheet so browsers render a readable table (same trick
 * RankMath uses). Cloudflare/Next cache on revalidate.
 */

export interface SitemapUrl {
  loc: string;
  lastmod?: string; // ISO string
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number; // 0.0..1.0
}

export function siteOrigin(): string {
  // metadataBase fallback chain — matches what root layout uses.
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    "https://cudlaimue.com"
  );
}

export function toIso(ms: number | null | undefined): string | undefined {
  if (!ms) return undefined;
  return new Date(ms).toISOString();
}

export function xmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}

export function renderUrlset(urls: SitemapUrl[]): string {
  const entries = urls
    .map((u) => {
      const parts = [`<loc>${escapeXml(u.loc)}</loc>`];
      if (u.lastmod) parts.push(`<lastmod>${u.lastmod}</lastmod>`);
      if (u.changefreq) parts.push(`<changefreq>${u.changefreq}</changefreq>`);
      if (u.priority != null) parts.push(`<priority>${u.priority.toFixed(1)}</priority>`);
      return `<url>${parts.join("")}</url>`;
    })
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    entries +
    `</urlset>`
  );
}

export function renderIndex(
  items: Array<{ loc: string; lastmod?: string }>,
): string {
  const entries = items
    .map((i) => {
      const parts = [`<loc>${escapeXml(i.loc)}</loc>`];
      if (i.lastmod) parts.push(`<lastmod>${i.lastmod}</lastmod>`);
      return `<sitemap>${parts.join("")}</sitemap>`;
    })
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    entries +
    `</sitemapindex>`
  );
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case '"':
        return "&quot;";
      case "'":
        return "&apos;";
      default:
        return c;
    }
  });
}
