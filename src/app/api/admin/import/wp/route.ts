import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { products, adminAudit } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { wcListAllProducts, wcGetProduct } from "@/lib/wp/woo";
import { r2Put, R2Paths } from "@/lib/r2";
import { newId, now, slugify } from "@/lib/utils";

/**
 * GET  → list WC products side-by-side with what's already in D1 (so the
 *         admin UI can show "new" vs "already imported" state).
 * POST → body { ids: number[], type: "font"|"ebook" } → imports each.
 */

export async function GET() {
  const admin = await requireAdmin();
  try {
    const wc = await wcListAllProducts();
    const existing = await db()
      .select({ slug: products.slug })
      .from(products);
    const existingSlugs = new Set(existing.map((p) => p.slug));
    void admin;
    return NextResponse.json({
      count: wc.length,
      products: wc.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        regular_price: p.regular_price,
        sale_price: p.sale_price,
        image: p.images?.[0]?.src ?? null,
        downloadable: p.downloadable,
        downloadCount: p.downloads?.length ?? 0,
        categories: p.categories.map((c) => c.name),
        alreadyImported: existingSlugs.has(slugify(p.slug)),
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

const ImportSchema = z.object({
  ids: z.array(z.number().int()).min(1).max(50),
  type: z.enum(["font", "ebook", "template"]).default("font"),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  const body = ImportSchema.parse(await req.json());

  const results: Array<{
    wcId: number;
    localId?: string;
    slug?: string;
    status: "imported" | "skipped" | "failed" | "imported_partial";
    reason?: string;
    fileErrors?: string[]; // surfaced per-file failures so admin can retry
    wcDownloadable?: boolean;
    wcDownloadCount?: number;
  }> = [];

  // Pre-load existing slugs once (tiny table ~200 rows) so the per-product
  // dedup check is in-memory instead of a SELECT per iteration.
  const existingSlugRows = await db().select({ slug: products.slug }).from(products);
  const takenSlugs = new Set(existingSlugRows.map((r) => r.slug));

  for (const wcId of body.ids) {
    try {
      const p = await wcGetProduct(wcId);
      const slug = slugify(p.slug || p.name);
      if (takenSlugs.has(slug)) {
        results.push({ wcId, slug, status: "skipped", reason: "slug_exists" });
        continue;
      }
      takenSlugs.add(slug);

      const priceSatang = Math.round(parseFloat(p.price || p.regular_price || "0") * 100);
      const compareAt =
        p.sale_price && p.regular_price && p.sale_price !== p.regular_price
          ? Math.round(parseFloat(p.regular_price) * 100)
          : null;

      const id = newId("prd");
      const ts = now();

      // Create the DB row first — we'll backfill media keys after upload.
      // Map WC `short_description` → our `description` (keep as HTML for the
      // rich-editor display). If the long `description` also has content,
      // append it below with a horizontal divider so both make it across.
      const combinedDesc = [p.short_description, p.description]
        .map((s) => (s ?? "").trim())
        .filter(Boolean)
        .join("\n<hr />\n");
      await db().insert(products).values({
        id,
        type: body.type,
        slug,
        name: p.name,
        tagline: null,
        description: combinedDesc || null,
        priceSatang,
        compareAtPriceSatang: compareAt,
        tags: JSON.stringify(p.tags?.map((t) => t.name) ?? []),
        categories: JSON.stringify(p.categories?.map((c) => c.name) ?? []),
        sourceWcId: p.id,
        isPublished: true,
        isFeatured: p.featured,
        sortOrder: 0,
        createdAt: ts,
        updatedAt: ts,
      });

      // Upload cover image
      const cover = p.images?.[0];
      let coverKey: string | null = null;
      if (cover?.src) {
        try {
          const ext = guessExt(cover.src, "jpg");
          const key = R2Paths.productCover(id, ext);
          const buf = await fetchBytes(cover.src);
          await r2Put(key, buf, { contentType: guessMime(ext) });
          coverKey = key;
        } catch (err) {
          console.warn("cover upload failed", wcId, err);
        }
      }

      // Upload additional images as gallery previews
      const previewKeys: string[] = [];
      for (let i = 1; i < Math.min(p.images?.length ?? 0, 9); i++) {
        const img = p.images[i];
        try {
          const ext = guessExt(img.src, "jpg");
          const key = `products/${id}/preview-${newId("pv")}.${ext}`;
          const buf = await fetchBytes(img.src);
          await r2Put(key, buf, { contentType: guessMime(ext) });
          previewKeys.push(key);
        } catch (err) {
          console.warn("preview upload failed", wcId, err);
        }
      }

      // Upload ALL downloadable files. WC allows multiple (e.g. planner with
      // Daily/Weekly/Monthly PDFs). For ebooks we still only take the first
      // because the rasterize pipeline expects a single source.pdf.
      let fileKey: string | null = null;
      let fileName: string | null = null;
      let fileSize: number | null = null;
      const files: Array<{ key: string; name: string; size: number }> = [];
      const fileErrors: string[] = [];
      const dls = (p.downloads ?? []).filter((d) => !!d.file);
      for (let i = 0; i < dls.length; i++) {
        const dl = dls[i];
        try {
          const origName = dl.name || filenameFromUrl(dl.file) || slug;
          const ext = (origName.split(".").pop() || "").toLowerCase();

          let name: string;
          let key: string;
          if (body.type === "font") {
            const validFontExt = ["ttf", "otf", "woff", "woff2", "zip"].includes(ext);
            name = validFontExt ? origName : `${slug}-${i + 1}.ttf`;
            key = R2Paths.fontFile(id, name);
          } else if (body.type === "template") {
            const validTplExt = [
              "zip", "rar", "7z",
              "psd", "ai", "eps", "pdf",
              "pptx", "docx", "xlsx",
              "fig", "xd", "sketch", "indd",
              "key", "pages", "numbers",
              "png", "jpg", "jpeg", "webp", "gif", "svg", "tif", "tiff", "avif",
            ].includes(ext);
            name = validTplExt ? origName : `${slug}-${i + 1}.zip`;
            key = R2Paths.templateFile(id, name);
          } else {
            if (i > 0) break; // Ebook: only take first PDF
            name = `${slug}.pdf`;
            key = R2Paths.ebookSource(id);
          }

          const buf = await fetchWcBytes(dl.file);
          await r2Put(key, buf, { contentType: pickContentType(name) });
          files.push({ key, name, size: buf.byteLength });
          if (i === 0) {
            fileKey = key;
            fileName = name;
            fileSize = buf.byteLength;
          }
        } catch (err) {
          fileErrors.push(`${dl.file}: ${String(err).slice(0, 200)}`);
        }
      }

      if (coverKey || fileKey || files.length > 0 || previewKeys.length > 0) {
        await db()
          .update(products)
          .set({
            coverImageKey: coverKey,
            fileKey,
            fileName,
            fileSize,
            files: files.length > 0 ? JSON.stringify(files) : null,
            previewImageKeys: previewKeys.length > 0 ? JSON.stringify(previewKeys) : null,
            updatedAt: now(),
          })
          .where(eq(products.id, id));
      }

      await db().insert(adminAudit).values({
        id: newId("au"),
        adminId: admin.id,
        action: "product.import_wc",
        target: id,
        payload: JSON.stringify({ wcId, slug, type: body.type, hasFile: !!fileKey }),
        createdAt: now(),
      });

      // "imported_partial" = row created + cover OK but expected files missed
      // (either WC has no downloads, or all file fetches failed). Admin can
      // retry the files alone via the "ดึงไฟล์จาก WP ใหม่" button on the
      // product editor page.
      const expectedFiles = dls.length;
      const uploadedFiles = files.length;
      const partial = expectedFiles === 0 || uploadedFiles < expectedFiles;
      results.push({
        wcId,
        localId: id,
        slug,
        status: partial ? "imported_partial" : "imported",
        fileErrors: fileErrors.length ? fileErrors : undefined,
        wcDownloadable: p.downloadable,
        wcDownloadCount: expectedFiles,
      });
    } catch (err) {
      results.push({ wcId, status: "failed", reason: String(err) });
    }
  }

  return NextResponse.json({ results });
  // silence linter for unused
  void inArray;
}

async function fetchBytes(url: string): Promise<ArrayBuffer> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${url} ${r.status}`);
  return r.arrayBuffer();
}

/**
 * Fetch a file from WC — tries plain first, then retries with Basic auth in
 * case the file URL is behind WC's download protection. Detects HTML error
 * pages returned with 200 status (common auth gate behavior) and empty
 * bodies, so silent failures become loud.
 */
async function fetchWcBytes(url: string): Promise<ArrayBuffer> {
  const { env } = await import("@/lib/cf");
  const doFetch = (withAuth: boolean) => {
    const headers: Record<string, string> = {
      "User-Agent": "cudlaimue-migrate/1.0",
    };
    if (withAuth) {
      const e = env();
      if (e.WC_CONSUMER_KEY && e.WC_CONSUMER_SECRET) {
        headers.Authorization = `Basic ${btoa(
          `${e.WC_CONSUMER_KEY}:${e.WC_CONSUMER_SECRET}`,
        )}`;
      }
    }
    return fetch(url, { headers, redirect: "follow" });
  };
  let r = await doFetch(false);
  if (!r.ok && (r.status === 401 || r.status === 403)) r = await doFetch(true);
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);
  const ct = r.headers.get("content-type") ?? "";
  const buf = await r.arrayBuffer();
  if (buf.byteLength === 0) throw new Error(`empty response from ${url}`);
  if (ct.includes("text/html") || isHtmlPrefix(buf)) {
    throw new Error(`server returned HTML instead of binary for ${url}`);
  }
  return buf;
}

function isHtmlPrefix(buf: ArrayBuffer): boolean {
  const prefix = new Uint8Array(buf, 0, Math.min(64, buf.byteLength));
  const s = new TextDecoder().decode(prefix).trim().toLowerCase();
  return s.startsWith("<!doctype html") || s.startsWith("<html");
}

function pickContentType(name: string): string {
  const ext = (name.split(".").pop() || "").toLowerCase();
  const map: Record<string, string> = {
    ttf: "font/ttf",
    otf: "font/otf",
    woff: "font/woff",
    woff2: "font/woff2",
    zip: "application/zip",
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  return map[ext] ?? "application/octet-stream";
}

function guessExt(url: string, fallback: string): string {
  const m = url.match(/\.([a-z0-9]{2,5})(?:\?|#|$)/i);
  return (m?.[1] ?? fallback).toLowerCase();
}

function guessMime(ext: string): string {
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
  };
  return map[ext] ?? "application/octet-stream";
}

function filenameFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const n = u.pathname.split("/").filter(Boolean).pop();
    return n ?? null;
  } catch {
    return null;
  }
}

