import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, adminAudit } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { wcGetProduct } from "@/lib/wp/woo";
import { r2Put, R2Paths } from "@/lib/r2";
import { newId, now } from "@/lib/utils";
import { env } from "@/lib/cf";

/**
 * Re-download a product's `downloads[]` from WC and re-upload to R2 under the
 * correct paths for the product's current type. Handy when the initial
 * batch import missed files (e.g. transient 401, WC cache miss, or the
 * admin imported as the wrong type and later corrected it).
 *
 * Response surfaces the raw WC `downloads` + `downloadable` flags so the
 * admin can see WHY a refetch turned up empty — most common cause is the
 * WC product not being marked `downloadable: true` even when files exist
 * in the "Downloadable files" UI.
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  const { id } = await ctx.params;

  const rows = await db().select().from(products).where(eq(products.id, id)).limit(1);
  if (!rows.length) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const p = rows[0];
  if (!p.sourceWcId) {
    return NextResponse.json(
      { error: "no_wc_source", message: "สินค้านี้ไม่ได้ import มาจาก WP" },
      { status: 400 },
    );
  }

  const wc = await wcGetProduct(p.sourceWcId).catch((e) => {
    throw new Error(`WC fetch failed: ${String(e)}`);
  });

  const rawDownloads = wc.downloads ?? [];
  const dls = rawDownloads.filter((d) => !!d.file);

  if (dls.length === 0) {
    return NextResponse.json(
      {
        error: "no_downloads",
        message:
          "WC product ไม่มีไฟล์ใน 'Downloadable files' หรือยังไม่ได้ tick 'Downloadable'",
        wcDownloadable: wc.downloadable,
        wcDownloadsRaw: rawDownloads,
      },
      { status: 400 },
    );
  }

  const slug = p.slug;
  const files: Array<{ key: string; name: string; size: number }> = [];
  let fileKey: string | null = null;
  let fileName: string | null = null;
  let fileSize: number | null = null;
  const errors: Array<{ file: string; error: string }> = [];

  for (let i = 0; i < dls.length; i++) {
    const dl = dls[i];
    try {
      const origName = dl.name || filenameFromUrl(dl.file) || slug;
      const ext = (origName.split(".").pop() || "").toLowerCase();

      let name: string;
      let key: string;
      if (p.type === "ebook") {
        if (i > 0) break; // ebook rasterize expects a single source.pdf
        name = `${slug}.pdf`;
        key = R2Paths.ebookSource(p.id);
      } else if (p.type === "font") {
        const valid = ["ttf", "otf", "woff", "woff2", "zip"].includes(ext);
        name = valid ? origName : `${slug}-${i + 1}.ttf`;
        key = R2Paths.fontFile(p.id, name);
      } else {
        // template
        const valid = [
          "zip", "rar", "7z", "psd", "ai", "eps", "pdf",
          "pptx", "docx", "xlsx", "fig", "xd", "sketch", "indd",
          "key", "pages", "numbers",
          "png", "jpg", "jpeg", "webp", "gif", "svg", "tif", "tiff", "avif",
        ].includes(ext);
        name = valid ? origName : `${slug}-${i + 1}.zip`;
        key = R2Paths.templateFile(p.id, name);
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
      errors.push({ file: dl.file, error: String(err).slice(0, 300) });
    }
  }

  if (files.length > 0) {
    // For ebook, invalidate any previously-rendered base pages so they
    // re-generate from the new source on next view. Deletion is best-effort.
    await db()
      .update(products)
      .set({
        fileKey,
        fileName,
        fileSize,
        files: JSON.stringify(files),
        updatedAt: now(),
      })
      .where(eq(products.id, p.id));
  }

  await db().insert(adminAudit).values({
    id: newId("au"),
    adminId: admin.id,
    action: "product.refetch_wc_files",
    target: p.id,
    payload: JSON.stringify({
      wcId: p.sourceWcId,
      uploaded: files.length,
      errorCount: errors.length,
      firstError: errors[0]?.error ?? null,
    }),
    createdAt: now(),
  });

  return NextResponse.json({
    uploaded: files.length,
    files,
    errors,
    wcDownloadable: wc.downloadable,
    wcDownloadsRaw: rawDownloads,
  });
}

/**
 * Fetch a file from WC — tries plain first, then retries with Basic auth in
 * case the file URL is behind WC's download protection. Detects HTML error
 * pages returned with 200 status (common auth gate behavior).
 */
async function fetchWcBytes(url: string): Promise<ArrayBuffer> {
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
  if (!r.ok && (r.status === 401 || r.status === 403)) {
    r = await doFetch(true);
  }
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);

  const ct = r.headers.get("content-type") ?? "";
  const buf = await r.arrayBuffer();
  if (buf.byteLength === 0) throw new Error(`empty response from ${url}`);
  // Detect HTML error pages returned with 200 (common auth-gate behavior).
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

function filenameFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const n = u.pathname.split("/").filter(Boolean).pop();
    return n ?? null;
  } catch {
    return null;
  }
}
