import "server-only";
import { env } from "./cf";

/**
 * Site-wide settings persisted in KV (single JSON blob under `site:settings`).
 *
 * KV reads are ~1ms cached at the edge, so reading every page-render is fine.
 * If we ever need richer schema (per-language, per-locale), promote this to
 * a D1 table — but for a small set of editor-controlled toggles KV is enough.
 */

const KV_KEY = "site:settings";

export interface SiteSettings {
  /** R2 key for the homepage hero background image. */
  heroImageKey?: string | null;
}

const DEFAULTS: SiteSettings = {
  heroImageKey: null,
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const { KV } = env();
  try {
    const raw = await KV.get(KV_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<SiteSettings>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export async function updateSiteSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
  const { KV } = env();
  const current = await getSiteSettings();
  const next = { ...current, ...patch };
  await KV.put(KV_KEY, JSON.stringify(next));
  return next;
}
