import "server-only";
import { r2Get, r2Put, R2Paths } from "./r2";
import { renderWatermarkedSvg } from "./pdf/watermark";

/**
 * Render + cache a single watermarked ebook page. Returns the JPEG bytes,
 * and is a no-op (just returns the cached bytes) if the page has already
 * been rendered for this (product, order) pair.
 *
 * Shared by the customer-facing reader route AND the internal background
 * prerender trigger so both paths produce identical output.
 */
export async function renderWatermarkedEbookPage(opts: {
  productId: string;
  orderIdShort: string;
  pageNum: number;
}): Promise<{ image: ArrayBuffer; cached: boolean }> {
  const { productId, orderIdShort, pageNum } = opts;
  const wmKey = R2Paths.ebookWatermarkedPage(productId, orderIdShort, pageNum);

  const hit = await r2Get(wmKey);
  if (hit) {
    const buf = await hit.arrayBuffer();
    return { image: buf, cached: true };
  }

  // Need to build it. First ensure we have a base (unwatermarked) page PNG.
  const baseKey = R2Paths.ebookBasePage(productId, pageNum);
  let baseObj = await r2Get(baseKey);
  if (!baseObj) {
    const { rasterizePdf } = await import("./pdf/rasterize");
    const src = await r2Get(R2Paths.ebookSource(productId));
    if (!src) throw new Error(`source PDF missing for ${productId}`);
    const srcBuf = await src.arrayBuffer();
    const pages = await rasterizePdf({ pdfBuffer: srcBuf, pages: [pageNum] });
    const png = pages[0]?.png;
    if (!png) throw new Error(`rasterize failed for ${productId} page ${pageNum}`);
    await r2Put(baseKey, png, { contentType: "image/png" });
    baseObj = await r2Get(baseKey);
    if (!baseObj) throw new Error(`rasterize cache failed for ${productId} page ${pageNum}`);
  }
  const baseBuf = await baseObj.arrayBuffer();
  const { width, height } = readPngSize(baseBuf) ?? { width: 1400, height: 1980 };

  const svg = await renderWatermarkedSvg({
    basePngBuffer: baseBuf,
    baseWidth: width,
    baseHeight: height,
    label: `#${orderIdShort}`,
  });

  // Wrap SVG so Chromium renders a pixel-exact viewport.
  const html =
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<style>html,body{margin:0;padding:0;background:#fff;}svg{display:block}</style>` +
    `</head><body>${svg}</body></html>`;

  const { rasterizeHtmlToImage } = await import("./pdf/rasterize");
  const imageBuf = await rasterizeHtmlToImage(html, width, height, "jpeg");
  await r2Put(wmKey, imageBuf, { contentType: "image/jpeg" });
  return { image: imageBuf, cached: false };
}

function readPngSize(buf: ArrayBuffer): { width: number; height: number } | null {
  const b = new DataView(buf);
  if (b.byteLength < 24) return null;
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < sig.length; i++) if (b.getUint8(i) !== sig[i]) return null;
  return { width: b.getUint32(16), height: b.getUint32(20) };
}

/**
 * Batch-render every uncached page of an ebook for one order. Reuses a
 * single puppeteer browser session across all pages — saves ~2s of browser
 * cold-start per page vs calling `renderWatermarkedEbookPage` N times.
 */
export async function prerenderEbookPages(opts: {
  productId: string;
  orderIdShort: string;
  pageNumbers: number[];
}): Promise<{ rendered: number; skipped: number }> {
  const { productId, orderIdShort, pageNumbers } = opts;

  // 1) Skip pages already cached
  const todo: number[] = [];
  let skipped = 0;
  for (const p of pageNumbers) {
    const hit = await r2Get(R2Paths.ebookWatermarkedPage(productId, orderIdShort, p));
    if (hit) skipped++;
    else todo.push(p);
  }
  if (todo.length === 0) return { rendered: 0, skipped };

  // 2) Rasterize any missing base PNGs in one PDF pass
  const missingBases: number[] = [];
  for (const p of todo) {
    const base = await r2Get(R2Paths.ebookBasePage(productId, p));
    if (!base) missingBases.push(p);
  }
  if (missingBases.length) {
    const { rasterizePdf } = await import("./pdf/rasterize");
    const src = await r2Get(R2Paths.ebookSource(productId));
    if (!src) throw new Error(`source PDF missing for ${productId}`);
    const srcBuf = await src.arrayBuffer();
    const pages = await rasterizePdf({ pdfBuffer: srcBuf, pages: missingBases });
    for (const pg of pages) {
      await r2Put(R2Paths.ebookBasePage(productId, pg.pageNumber), pg.png, {
        contentType: "image/png",
      });
    }
  }

  // 3) Build one HTML payload per page (base PNG + watermark overlay SVG)
  const jobs: Array<{ page: number; html: string; width: number; height: number }> = [];
  for (const p of todo) {
    const baseObj = await r2Get(R2Paths.ebookBasePage(productId, p));
    if (!baseObj) continue;
    const baseBuf = await baseObj.arrayBuffer();
    const { width, height } = readPngSize(baseBuf) ?? { width: 1400, height: 1980 };
    const svg = await renderWatermarkedSvg({
      basePngBuffer: baseBuf,
      baseWidth: width,
      baseHeight: height,
      label: `#${orderIdShort}`,
    });
    const html =
      `<!doctype html><html><head><meta charset="utf-8">` +
      `<style>html,body{margin:0;padding:0;background:#fff;}svg{display:block}</style>` +
      `</head><body>${svg}</body></html>`;
    jobs.push({ page: p, html, width, height });
  }
  if (jobs.length === 0) return { rendered: 0, skipped };

  // 4) Batch rasterize — ONE browser, all pages
  const { rasterizeHtmls } = await import("./pdf/rasterize");
  const images = await rasterizeHtmls(
    jobs.map((j) => ({ html: j.html, width: j.width, height: j.height })),
    "jpeg",
  );

  // 5) Cache each
  for (let i = 0; i < jobs.length; i++) {
    await r2Put(
      R2Paths.ebookWatermarkedPage(productId, orderIdShort, jobs[i].page),
      images[i],
      { contentType: "image/jpeg" },
    );
  }
  return { rendered: jobs.length, skipped };
}
