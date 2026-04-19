import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { r2Put, R2Paths } from "@/lib/r2";
import { newId, now } from "@/lib/utils";

/**
 * Admin file upload endpoint. Routes files to R2 based on `kind`:
 *   cover   → products/{id}/cover.{ext}           (public-safe)
 *   preview → products/{id}/preview-{cuid}.{ext}  (public-safe)
 *   file    → fonts/{id}/{filename}               (private, gated by entitlement)
 *              or ebooks/{id}/source.pdf
 *
 * Font files can be `.ttf`, `.otf`, or packaged `.zip` — we detect by
 * extension and pick the right content-type.
 */
export async function POST(req: NextRequest) {
  await requireAdmin();
  const form = await req.formData();
  const kind = String(form.get("kind") ?? "");
  const productId = String(form.get("productId") ?? "");
  const file = form.get("file") as File | null;
  if (!file) {
    return new NextResponse("missing file", { status: 400 });
  }

  const buf = new Uint8Array(await file.arrayBuffer());

  if (kind === "hero") {
    // Site-wide hero background. Single asset, overwritten on each upload.
    // We append a short cache-buster so admins see updates immediately
    // without waiting for browser/edge cache invalidation.
    const ext = extOf(file.name, "jpg");
    const key = `site/hero-${Date.now().toString(36)}.${ext}`;
    await r2Put(key, buf, { contentType: file.type || imageMime(ext) });
    return NextResponse.json({ key });
  }

  if (!productId) {
    return new NextResponse("missing productId", { status: 400 });
  }

  if (kind === "cover") {
    const ext = extOf(file.name, "jpg");
    const key = R2Paths.productCover(productId, ext);
    await r2Put(key, buf, { contentType: file.type || imageMime(ext) });
    return NextResponse.json({ key });
  }

  if (kind === "preview") {
    const ext = extOf(file.name, "jpg");
    // Unique id per preview so re-uploads don't overwrite each other.
    const key = `products/${productId}/preview-${newId("pv")}.${ext}`;
    await r2Put(key, buf, { contentType: file.type || imageMime(ext) });
    return NextResponse.json({ key });
  }

  if (kind === "file") {
    const rows = await db().select().from(products).where(eq(products.id, productId)).limit(1);
    const p = rows[0];
    if (!p) return new NextResponse("product not found", { status: 404 });

    if (p.type === "font") {
      const key = R2Paths.fontFile(productId, file.name);
      await r2Put(key, buf, { contentType: fontMime(file.name) });
      return NextResponse.json({ key });
    }

    if (p.type === "template") {
      const key = R2Paths.templateFile(productId, file.name);
      await r2Put(key, buf, { contentType: templateMime(file.name) });
      return NextResponse.json({ key });
    }

    if (p.type === "ebook") {
      const key = R2Paths.ebookSource(productId);
      await r2Put(key, buf, { contentType: "application/pdf" });
      try {
        const doc = await PDFDocument.load(buf.buffer as ArrayBuffer, { updateMetadata: false });
        await db()
          .update(products)
          .set({ pageCount: doc.getPageCount(), updatedAt: now() })
          .where(eq(products.id, productId));
      } catch {
        // non-fatal — admin can edit pageCount later
      }
      return NextResponse.json({ key });
    }

    return new NextResponse("unknown product type", { status: 400 });
  }

  return new NextResponse("bad kind", { status: 400 });
}

function extOf(name: string, fallback: string): string {
  return (name.split(".").pop() || fallback).toLowerCase();
}

function imageMime(ext: string): string {
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

function fontMime(name: string): string {
  const e = extOf(name, "");
  if (e === "ttf") return "font/ttf";
  if (e === "otf") return "font/otf";
  if (e === "woff") return "font/woff";
  if (e === "woff2") return "font/woff2";
  if (e === "zip") return "application/zip";
  return "application/octet-stream";
}

function templateMime(name: string): string {
  const e = extOf(name, "");
  const map: Record<string, string> = {
    // Archives + design source files
    zip: "application/zip",
    rar: "application/vnd.rar",
    "7z": "application/x-7z-compressed",
    psd: "image/vnd.adobe.photoshop",
    ai: "application/postscript",
    eps: "application/postscript",
    pdf: "application/pdf",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    fig: "application/octet-stream",
    xd: "application/octet-stream",
    sketch: "application/octet-stream",
    indd: "application/octet-stream",
    key: "application/vnd.apple.keynote",
    pages: "application/vnd.apple.pages",
    numbers: "application/vnd.apple.numbers",
    // Raster + vector images (templates can be a single PNG/SVG etc.)
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    tif: "image/tiff",
    tiff: "image/tiff",
    avif: "image/avif",
  };
  return map[e] ?? "application/octet-stream";
}
