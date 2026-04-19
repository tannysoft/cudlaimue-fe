import "server-only";
import puppeteer from "@cloudflare/puppeteer";
import { env } from "../cf";

/**
 * Rasterize a PDF to one PNG per page using Cloudflare Browser Rendering
 * via the `BROWSER` binding (configured in wrangler.toml as `[browser]`).
 *
 * We launch a managed Chromium instance, load a tiny HTML page that pulls
 * pdf.js from the public CDN, hand it the PDF bytes as base64, and then
 * call a `window.__renderPage(n)` helper for each page we want. Each call
 * returns a `data:image/png;base64,...` URL we decode to an ArrayBuffer.
 *
 * Upside vs. the REST API surface: the binding auto-auths through the
 * Worker runtime — no `CF_BROWSER_TOKEN` or `CLOUDFLARE_ACCOUNT_ID`
 * secrets needed. Also a single browser session handles all pages
 * instead of one /screenshot request per page.
 *
 * Docs: https://developers.cloudflare.com/browser-rendering/platform/puppeteer/
 */

interface RasterizeOptions {
  pdfBuffer: ArrayBuffer;
  /** 1-indexed list of pages to render; default renders all. */
  pages?: number[];
  /** Image output width, px (default 1400). Higher → sharper & heavier. */
  width?: number;
}

export interface RasterizedPage {
  pageNumber: number;
  png: ArrayBuffer;
}

export async function rasterizePdf(
  opts: RasterizeOptions,
): Promise<RasterizedPage[]> {
  const binding = env().BROWSER;
  if (!binding) {
    throw new Error(
      "BROWSER binding missing — add `[browser] binding = \"BROWSER\"` to wrangler.toml",
    );
  }

  // 1400px wide: sharp on desktop at 100% zoom and mobile retina (logical
  // 700pt × 2 DPR). Heavier than 1000 but the JPEG quality bump makes the
  // sharpness difference worth it for an ebook reader.
  const width = opts.width ?? 1400;
  const b64 = arrayBufferToBase64(opts.pdfBuffer);
  const html = buildLoaderHtml(b64, width);

  // puppeteer.launch typing on the Workers variant is a bit loose; cast the
  // binding through unknown to the shape its .launch() wants.
  const browser = await puppeteer.launch(binding as unknown as Parameters<typeof puppeteer.launch>[0]);
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.waitForFunction(
      "window.__ready === true",
      { timeout: 30_000 },
    );

    const pageCount = (await page.evaluate(
      "window.__pageCount",
    )) as number;
    const wanted =
      opts.pages && opts.pages.length > 0
        ? opts.pages
        : Array.from({ length: pageCount }, (_, i) => i + 1);

    const out: RasterizedPage[] = [];
    for (const n of wanted) {
      const dataUrl = (await page.evaluate(
        `window.__renderPage(${n})`,
      )) as string;
      out.push({ pageNumber: n, png: dataUrlToArrayBuffer(dataUrl) });
    }
    return out;
  } finally {
    await browser.close();
  }
}

function buildLoaderHtml(b64: string, width: number) {
  return `<!doctype html><html><head><meta charset=utf-8>
<style>body{margin:0;background:#fff}canvas{display:block}</style>
</head><body><script type="module">
import * as pdfjs from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.76/pdf.min.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.76/pdf.worker.min.mjs';
const bin = Uint8Array.from(atob("${b64}"), c => c.charCodeAt(0));
const doc = await pdfjs.getDocument({data: bin}).promise;
window.__pageCount = doc.numPages;
window.__renderPage = async (n) => {
  const pg = await doc.getPage(n);
  const vp0 = pg.getViewport({scale:1});
  const scale = ${width} / vp0.width;
  const vp = pg.getViewport({scale});
  const c = document.createElement('canvas');
  c.width = vp.width; c.height = vp.height;
  await pg.render({canvasContext: c.getContext('2d'), viewport: vp}).promise;
  return c.toDataURL('image/png');
};
window.__ready = true;
</script></body></html>`;
}

function dataUrlToArrayBuffer(url: string): ArrayBuffer {
  const i = url.indexOf(",");
  if (i < 0) throw new Error("invalid data url from pdf.js");
  const b64 = url.slice(i + 1);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
  return bytes.buffer;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

/**
 * Render an arbitrary HTML string to an image of the given size. Used by
 * the ebook viewer to "burn" watermark text onto each rendered page.
 *
 * Default output is JPEG quality 92 — ~3-5× smaller than PNG for ebook
 * pages (which are mostly soft illustrations + text), much faster to
 * encode in Chromium, with near-lossless sharpness at 100% zoom.
 *
 * Prefer `rasterizeHtmls` for batches — reusing one browser across
 * multiple pages saves ~2s of cold-start per page.
 */
export async function rasterizeHtmlToImage(
  html: string,
  width: number,
  height: number,
  format: "png" | "jpeg" = "jpeg",
): Promise<ArrayBuffer> {
  const [out] = await rasterizeHtmls([{ html, width, height }], format);
  return out;
}

/**
 * Batch render: open ONE browser, render each input as an image, close.
 * Items can have different sizes; we resize the viewport per render.
 */
export async function rasterizeHtmls(
  items: Array<{ html: string; width: number; height: number }>,
  format: "png" | "jpeg" = "jpeg",
): Promise<ArrayBuffer[]> {
  if (items.length === 0) return [];
  const binding = env().BROWSER;
  if (!binding) throw new Error("BROWSER binding missing");
  const browser = await puppeteer.launch(
    binding as unknown as Parameters<typeof puppeteer.launch>[0],
  );
  try {
    const page = await browser.newPage();
    const out: ArrayBuffer[] = [];
    for (const item of items) {
      await page.setViewport({
        width: item.width,
        height: item.height,
        deviceScaleFactor: 1,
      });
      await page.setContent(item.html, { waitUntil: "networkidle0" });
      const buf = (await page.screenshot({
        type: format,
        quality: format === "jpeg" ? 92 : undefined,
        fullPage: false,
        clip: { x: 0, y: 0, width: item.width, height: item.height, scale: 1 },
        omitBackground: false,
      })) as unknown as Uint8Array;
      out.push(
        buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
      );
    }
    return out;
  } finally {
    await browser.close();
  }
}
