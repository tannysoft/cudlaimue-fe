import {
  renderUrlset,
  siteOrigin,
  xmlResponse,
  type SitemapUrl,
} from "@/lib/sitemap";

export const dynamic = "force-dynamic";

export async function GET() {
  const origin = siteOrigin();
  const now = new Date().toISOString();

  const urls: SitemapUrl[] = [
    { loc: `${origin}/`, changefreq: "daily", priority: 1.0, lastmod: now },
    { loc: `${origin}/fonts`, changefreq: "daily", priority: 0.9, lastmod: now },
    { loc: `${origin}/ebooks`, changefreq: "daily", priority: 0.9, lastmod: now },
    { loc: `${origin}/templates`, changefreq: "daily", priority: 0.9, lastmod: now },
    { loc: `${origin}/articles`, changefreq: "daily", priority: 0.8, lastmod: now },
    { loc: `${origin}/license-agreement`, changefreq: "monthly", priority: 0.5 },
    { loc: `${origin}/refund-policy`, changefreq: "monthly", priority: 0.5 },
  ];

  return xmlResponse(renderUrlset(urls));
}
