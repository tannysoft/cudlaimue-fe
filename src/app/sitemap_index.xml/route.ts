import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { wpListArticles } from "@/lib/wp/client";
import { renderIndex, siteOrigin, toIso, xmlResponse } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

export async function GET() {
  const origin = siteOrigin();

  // Pick the most-recent updatedAt across products so the product-sitemap
  // entry gets a meaningful lastmod. Similar for WP articles (page 1 sorted
  // by date — good enough, saves a full scan).
  const [lastProduct] = await db()
    .select({ updatedAt: products.updatedAt })
    .from(products)
    .orderBy(desc(products.updatedAt))
    .limit(1);

  let articleLastmod: string | undefined;
  try {
    const { posts } = await wpListArticles({ page: 1, perPage: 1 });
    articleLastmod = posts[0]?.modified ?? posts[0]?.date;
  } catch {
    // WP offline — the index can still list the sitemap entry without lastmod.
  }

  const now = new Date().toISOString();

  const items = [
    { loc: `${origin}/page-sitemap.xml`, lastmod: now },
    {
      loc: `${origin}/product-sitemap.xml`,
      lastmod: toIso(lastProduct?.updatedAt) ?? now,
    },
    { loc: `${origin}/post-sitemap.xml`, lastmod: articleLastmod ?? now },
    { loc: `${origin}/category-sitemap.xml`, lastmod: articleLastmod ?? now },
    { loc: `${origin}/post_tag-sitemap.xml`, lastmod: articleLastmod ?? now },
  ];

  return xmlResponse(renderIndex(items));
}
