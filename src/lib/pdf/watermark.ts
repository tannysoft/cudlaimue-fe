import "server-only";

/**
 * Compose a base page PNG with a per-user watermark overlay, returning SVG.
 *
 * The SVG embeds the base PNG via base64 data-URL and overlays translucent
 * repeated watermark text identifying the current user + render date. We
 * emit plain SVG `<text>` elements and let the browser render them with
 * its own fonts — the file is served as an `<img src=...>` so host-page
 * CSS cannot touch the SVG DOM to strip the watermark.
 *
 * An additional CSS overlay in the viewer provides defense-in-depth.
 */

export interface WatermarkInput {
  basePngBuffer: ArrayBuffer;
  baseWidth: number;
  baseHeight: number;
  label: string; // e.g. "you@example.com · 2026-04-17"
}

export async function renderWatermarkedSvg(input: WatermarkInput): Promise<string> {
  const { baseWidth: w, baseHeight: h, label } = input;
  const b64 = arrayBufferToBase64(input.basePngBuffer);
  const dataUrl = `data:image/png;base64,${b64}`;

  // Sparse, very light, rotated stamps — enough to identify the buyer on a
  // screenshot but practically invisible while reading.
  const rows = 3;
  const cols = 2;
  const cellW = w / cols;
  const cellH = h / rows;
  const fontSize = Math.max(12, Math.round(w * 0.014));
  const safeLabel = escapeXml(label);

  const stamps: string[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = Math.round(cellW * (c + 0.5));
      const cy = Math.round(cellH * (r + 0.5));
      stamps.push(
        `<text x="${cx}" y="${cy}" font-size="${fontSize}" font-weight="400" ` +
          `fill="rgba(31,26,20,0.07)" text-anchor="middle" dominant-baseline="middle" ` +
          `font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" ` +
          `transform="rotate(-25 ${cx} ${cy})">${safeLabel}</text>`,
      );
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<image width="${w}" height="${h}" href="${dataUrl}"/>` +
    stamps.join("") +
    `</svg>`
  );
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case '"':
        return "&quot;";
      case "'":
        return "&apos;";
      default:
        return c;
    }
  });
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
