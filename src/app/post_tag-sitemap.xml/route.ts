import { wpListTags } from "@/lib/wp/client";
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
    const tags = await wpListTags();
    urls = tags.map((t) => ({
      loc: `${origin}/tag/${t.slug}`,
      changefreq: "weekly",
      priority: 0.4,
    }));
  } catch {
    // WP offline — empty sitemap is still valid
  }
  return xmlResponse(renderUrlset(urls));
}
