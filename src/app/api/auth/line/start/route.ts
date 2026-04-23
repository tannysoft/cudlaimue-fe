import { NextRequest, NextResponse } from "next/server";
import { lineAuthUrl } from "@/lib/auth/line";
import { signResourceToken } from "@/lib/crypto";
import { newId } from "@/lib/utils";

/**
 * LINE OAuth kickoff. We used to stash `{state, nonce, next}` in a cookie and
 * compare on callback, but Safari on iOS drops the cookie across the OAuth
 * redirect chain (ITP / bounce-tracking protection), producing a
 * `state_missing` error for users who came in via the LINE chat share sheet.
 *
 * Stateless alternative: pack `{nonce, next}` into a signed JWT and use it
 * AS the OAuth `state` parameter. LINE round-trips `state` back to the
 * callback, where we verify the signature — no cookie required, same CSRF
 * guarantee (tampered or replayed state → signature fails).
 */
export async function GET(req: NextRequest) {
  const next = req.nextUrl.searchParams.get("next") ?? "/account";
  const nonce = newId("nc");
  const state = await signResourceToken({ nonce, next }, 600);

  const redirectUri = `${new URL(req.url).origin}/api/auth/line/callback`;
  return NextResponse.redirect(lineAuthUrl(state, redirectUri, nonce));
}
