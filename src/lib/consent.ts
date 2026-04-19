/**
 * Client-side consent store for cookie categories.
 *
 * Persisted to localStorage as JSON under `cudlaimue:consent`.
 * Analytics / advertising scripts (GA, Meta Pixel, TikTok Pixel) should
 * check `loadConsent()` before mounting and subscribe to the
 * `cudlaimue:consent-changed` window event so they can load/unload
 * reactively when the user updates their preferences.
 */

const STORAGE_KEY = "cudlaimue:consent";
const CHANGED_EVENT = "cudlaimue:consent-changed";

export type ConsentCategories = "necessary" | "analytics" | "advertising";

export interface Consent {
  necessary: true; // always on — the site can't function without it
  analytics: boolean;
  advertising: boolean;
  updatedAt: number; // unix ms; 0 = user hasn't decided yet
}

export const CONSENT_DEFAULT: Consent = {
  necessary: true,
  analytics: false,
  advertising: false,
  updatedAt: 0,
};

export function loadConsent(): Consent {
  if (typeof window === "undefined") return CONSENT_DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return CONSENT_DEFAULT;
    const parsed = JSON.parse(raw) as Partial<Consent>;
    return {
      necessary: true,
      analytics: !!parsed.analytics,
      advertising: !!parsed.advertising,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
    };
  } catch {
    return CONSENT_DEFAULT;
  }
}

export function saveConsent(next: Omit<Consent, "necessary" | "updatedAt">): Consent {
  const record: Consent = {
    necessary: true,
    analytics: next.analytics,
    advertising: next.advertising,
    updatedAt: Date.now(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    window.dispatchEvent(
      new CustomEvent<Consent>(CHANGED_EVENT, { detail: record }),
    );
  } catch {
    // localStorage blocked — honor the in-memory choice for this session only
  }
  return record;
}

export function hasDecided(c: Consent): boolean {
  return c.updatedAt > 0;
}

/** Subscribe to consent-change events. Returns an unsubscribe fn. */
export function onConsentChanged(cb: (c: Consent) => void): () => void {
  function handler(e: Event) {
    cb((e as CustomEvent<Consent>).detail);
  }
  window.addEventListener(CHANGED_EVENT, handler);
  return () => window.removeEventListener(CHANGED_EVENT, handler);
}
