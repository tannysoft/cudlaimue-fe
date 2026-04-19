import { wpListCategories } from "@/lib/wp/client";
import {
  renderUrlset,
  siteOrigin,
  xmlResponse,
  type SitemapUrl,
} from "@/lib/sitemap";

export const dynamic = "force-dynamic";

export async function GET() {
  const origin = siteOrigin();
  let urls: SitemapUrl[] = [];
  try {
    const cats = await wpListCategories();
    urls = cats.map((c) => ({
      loc: `${origin}/category/${c.slug}`,
      changefreq: "weekly",
      priority: 0.5,
    }));
  } catch {
    // WP offline — empty sitemap is still valid
  }
  return xmlResponse(renderUrlset(urls));
}
