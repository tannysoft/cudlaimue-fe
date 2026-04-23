import { wpListArticles } from "@/lib/wp/client";
import {
  renderUrlset,
  siteOrigin,
  xmlResponse,
  type SitemapUrl,
} from "@/lib/sitemap";

export const dynamic = "force-dynamic";

/**
 * WP articles. Pulls up to 10 pages × 100 posts (1000) — above that we'd
 * need to split into paginated sub-sitemaps (post-sitemap1.xml, etc.) like
 * RankMath does. Cudlaimue isn't there yet.
 */
export async function GET() {
  const origin = siteOrigin();
  const urls: SitemapUrl[] = [];
  for (let page = 1; page <= 10; page++) {
    try {
      const { posts, totalPages } = await wpListArticles({ page, perPage: 100 });
      for (const p of posts) {
        urls.push({
          loc: `${origin}/${p.slug}`,
          lastmod: p.modified ?? p.date,
          changefreq: "monthly",
          priority: 0.6,
        });
      }
      if (page >= totalPages) break;
    } catch {
      break;
    }
  }
  return xmlResponse(renderUrlset(urls));
}
