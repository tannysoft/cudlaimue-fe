import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import {
  renderUrlset,
  siteOrigin,
  toIso,
  xmlResponse,
  type SitemapUrl,
} from "@/lib/sitemap";

export const dynamic = "force-dynamic";

const TYPE_PATH: Record<string, string> = {
  font: "/fonts",
  ebook: "/ebooks",
  template: "/templates",
};

export async function GET() {
  const origin = siteOrigin();
  const rows = await db()
    .select({
      slug: products.slug,
      type: products.type,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .where(eq(products.isPublished, true))
    .orderBy(desc(products.updatedAt));

  const urls: SitemapUrl[] = rows
    .map((p): SitemapUrl | null => {
      const base = TYPE_PATH[p.type];
      if (!base || !p.slug) return null;
      return {
        loc: `${origin}${base}/${p.slug}`,
        lastmod: toIso(p.updatedAt),
        changefreq: "weekly",
        priority: 0.7,
      };
    })
    .filter((x): x is SitemapUrl => !!x);

  return xmlResponse(renderUrlset(urls));
}
