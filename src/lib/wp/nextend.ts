import type { WCMeta } from "./woo";

/**
 * Extract LINE user id + avatar URL from a WooCommerce customer's `meta_data`
 * as written by the Nextend Social Login plugin (and a few common variants).
 *
 * Nextend key scheme (varies by version):
 *   nsl_line_identifier          → raw LINE userId
 *   nsl_line_profile_image_url   → avatar URL
 *   nsl_line_oauth2              → JSON blob { identifier, picture, ... }
 *   _nsl_line_*                  → same keys with private-prefix underscore
 *
 * Older versions and other LINE plugins use dash separators or different
 * suffixes — we match with loose regex so a single importer covers them all.
 */

export interface NextendLineProfile {
  lineUserId: string | null;
  avatarUrl: string | null;
}

export function extractNextendLine(meta: WCMeta[] | undefined): NextendLineProfile {
  if (!meta?.length) return { lineUserId: null, avatarUrl: null };

  const idPatterns = [
    /^nsl[-_]?line[-_]?(identifier|id|userid|user_id|provider_id)$/i,
    /^oa[-_]?social[-_]?login[-_]?user[-_]?line[-_]?id$/i,
    /^line[-_]?(user[-_]?)?id$/i,
  ];
  const avatarPatterns = [
    /^nsl[-_]?line[-_]?(profile[-_]?image(_url)?|avatar|picture)$/i,
    /^line[-_]?(profile[-_]?image|picture|avatar)(_url)?$/i,
    /^wp[-_]user[-_]avatar(_url)?$/i,
  ];
  const oauthPatterns = [/^nsl[-_]?line[-_]?(oauth2?|data|profile)$/i];

  let lineUserId: string | null = null;
  let avatarUrl: string | null = null;

  for (const m of meta) {
    // Strip leading underscore(s) so "_nsl_line_identifier" matches "nsl_line_identifier".
    const key = String(m.key ?? "").replace(/^_+/, "");
    const val = String(m.value ?? "").trim();
    if (!val) continue;

    if (!lineUserId && idPatterns.some((r) => r.test(key))) {
      lineUserId = val;
    }
    if (!avatarUrl && avatarPatterns.some((r) => r.test(key))) {
      if (val.startsWith("http")) avatarUrl = val;
    }
    if ((!lineUserId || !avatarUrl) && oauthPatterns.some((r) => r.test(key))) {
      const parsed = safeJson(val);
      if (parsed && typeof parsed === "object") {
        const obj = parsed as Record<string, unknown>;
        if (!lineUserId) {
          const id =
            (obj.identifier as string | undefined) ??
            (obj.userId as string | undefined) ??
            (obj.user_id as string | undefined) ??
            (obj.id as string | undefined);
          if (typeof id === "string" && id) lineUserId = id;
        }
        if (!avatarUrl) {
          const pic =
            (obj.picture as string | undefined) ??
            (obj.pictureUrl as string | undefined) ??
            (obj.profile_image_url as string | undefined);
          if (typeof pic === "string" && pic.startsWith("http")) avatarUrl = pic;
        }
      }
    }
  }

  return { lineUserId, avatarUrl };
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
