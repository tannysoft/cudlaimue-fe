import "server-only";
import { env } from "../cf";

/**
 * WordPress REST client — articles are fetched from the existing WP install.
 * We cache with Next's revalidate so Cloudflare edges serve fast.
 */

export interface WPArticle {
  id: number;
  slug: string;
  date: string;
  modified: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  featured_media: number;
  _embedded?: {
    "wp:featuredmedia"?: Array<{ source_url: string; alt_text?: string }>;
    author?: Array<{ name: string; avatar_urls?: Record<string, string> }>;
    "wp:term"?: Array<Array<{ id: number; name: string; slug: string; taxonomy: string }>>;
  };
}

const REVALIDATE_LIST = 300; // 5 min
const REVALIDATE_ITEM = 600; // 10 min

export async function wpListArticles(opts: {
  page?: number;
  perPage?: number;
  search?: string;
  /** Filter by category term ID (lookup with wpGetCategoryBySlug if you have a slug) */
  categoryId?: number;
  /** Filter by tag term ID (lookup with wpGetTagBySlug if you have a slug) */
  tagId?: number;
} = {}) {
  const base = env().WP_API_URL;
  const params = new URLSearchParams({
    _embed: "1",
    per_page: String(opts.perPage ?? 12),
    page: String(opts.page ?? 1),
    ...(opts.search ? { search: opts.search } : {}),
    ...(opts.categoryId ? { categories: String(opts.categoryId) } : {}),
    ...(opts.tagId ? { tags: String(opts.tagId) } : {}),
  });
  const url = `${base}/posts?${params.toString()}`;
  const r = await fetch(url, { next: { revalidate: REVALIDATE_LIST, tags: ["wp:articles"] } });
  if (!r.ok) throw new Error(`WP list failed: ${r.status}`);
  const totalPages = Number(r.headers.get("x-wp-totalpages") ?? "1");
  const total = Number(r.headers.get("x-wp-total") ?? "0");
  const posts = (await r.json()) as WPArticle[];
  return { posts, totalPages, total };
}

// ---------- Taxonomy (categories / tags) ----------

export interface WPTerm {
  id: number;
  name: string;
  slug: string;
  description?: string;
  count: number;
}

async function wpListTerms(taxonomy: "categories" | "tags"): Promise<WPTerm[]> {
  const base = env().WP_API_URL;
  // hide_empty defaults to true on the API which is what we want for the
  // index pages — only show terms that actually have posts.
  const params = new URLSearchParams({ per_page: "100", orderby: "count", order: "desc" });
  const url = `${base}/${taxonomy}?${params.toString()}`;
  const r = await fetch(url, {
    next: { revalidate: REVALIDATE_LIST, tags: [`wp:${taxonomy}`] },
  });
  if (!r.ok) throw new Error(`WP ${taxonomy} list failed: ${r.status}`);
  return (await r.json()) as WPTerm[];
}

export async function wpListCategories() {
  return wpListTerms("categories");
}

export async function wpListTags() {
  return wpListTerms("tags");
}

async function wpGetTermBySlug(
  taxonomy: "categories" | "tags",
  slug: string,
): Promise<WPTerm | null> {
  const base = env().WP_API_URL;
  const url = `${base}/${taxonomy}?slug=${encodeURIComponent(slug)}`;
  const r = await fetch(url, {
    next: { revalidate: REVALIDATE_LIST, tags: [`wp:${taxonomy}:${slug}`] },
  });
  if (!r.ok) return null;
  const arr = (await r.json()) as WPTerm[];
  return arr[0] ?? null;
}

export async function wpGetCategoryBySlug(slug: string) {
  return wpGetTermBySlug("categories", slug);
}

export async function wpGetTagBySlug(slug: string) {
  return wpGetTermBySlug("tags", slug);
}

/**
 * Extract category + tag names from WP's `_embedded["wp:term"]`. The shape
 * is a 2D array where each inner array is one taxonomy (categories, tags,
 * post_tag, etc). Each term has its `taxonomy` field set so we can sort
 * them ourselves regardless of order.
 */
export function extractArticleTerms(a: WPArticle): {
  categories: Array<{ name: string; slug: string }>;
  tags: Array<{ name: string; slug: string }>;
} {
  const groups = a._embedded?.["wp:term"] ?? [];
  const categories: Array<{ name: string; slug: string }> = [];
  const tags: Array<{ name: string; slug: string }> = [];
  for (const group of groups) {
    for (const t of group) {
      if (t.taxonomy === "category") categories.push({ name: t.name, slug: t.slug });
      else if (t.taxonomy === "post_tag") tags.push({ name: t.name, slug: t.slug });
    }
  }
  return { categories, tags };
}

/**
 * Decode common HTML entities that WP excerpts/titles emit (e.g. `&hellip;`
 * for "Read more" excerpts, smart quotes, dashes). Strips tags too.
 *
 * Workers/Node have no DOM helpers so we do this manually — covering the
 * named entities WP actually uses + numeric / hex escapes.
 */
export function stripWpHtml(raw: string): string {
  return decodeEntities(raw.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

const ENTITIES: Record<string, string> = {
  "&hellip;": "…",
  "&nbsp;": " ",
  "&amp;": "&",
  "&quot;": '"',
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&ldquo;": "“",
  "&rdquo;": "”",
  "&lsquo;": "‘",
  "&rsquo;": "’",
  "&mdash;": "—",
  "&ndash;": "–",
  "&copy;": "©",
  "&reg;": "®",
  "&trade;": "™",
};

function decodeEntities(s: string): string {
  let out = s;
  for (const [k, v] of Object.entries(ENTITIES)) {
    if (out.includes(k)) out = out.split(k).join(v);
  }
  // Numeric: &#1234;
  out = out.replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(parseInt(n, 10)));
  // Hex: &#x1F600;
  out = out.replace(/&#x([0-9a-fA-F]+);/g, (_m, n) => String.fromCodePoint(parseInt(n, 16)));
  return out;
}

// ---------- Static WP Pages (license / refund-policy / etc.) ----------

export interface WPPage {
  id: number;
  slug: string;
  title: { rendered: string };
  content: { rendered: string };
  modified: string;
}

export async function wpGetPageBySlug(slug: string): Promise<WPPage | null> {
  const base = env().WP_API_URL;
  const url = `${base}/pages?slug=${encodeURIComponent(slug)}`;
  const r = await fetch(url, {
    next: { revalidate: REVALIDATE_ITEM, tags: [`wp:page:${slug}`] },
  });
  if (!r.ok) return null;
  const arr = (await r.json()) as WPPage[];
  return arr[0] ?? null;
}

export async function wpGetArticleBySlug(slug: string) {
  const base = env().WP_API_URL;
  const url = `${base}/posts?_embed=1&slug=${encodeURIComponent(slug)}`;
  const r = await fetch(url, {
    next: { revalidate: REVALIDATE_ITEM, tags: [`wp:article:${slug}`] },
  });
  if (!r.ok) throw new Error(`WP get failed: ${r.status}`);
  const arr = (await r.json()) as WPArticle[];
  return arr[0] ?? null;
}
