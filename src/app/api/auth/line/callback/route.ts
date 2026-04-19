import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { exchangeLineCode } from "@/lib/auth/line";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createSession } from "@/lib/auth/session";
import { newId, now } from "@/lib/utils";


export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  try {
    return await handleCallback(req, origin);
  } catch (e) {
    console.error("line_callback_error", e);
    const msg = encodeURIComponent(String(e).slice(0, 120));
    return NextResponse.redirect(`${origin}/auth/login?error=callback_failed&detail=${msg}`);
  }
}

async function handleCallback(req: NextRequest, origin: string) {
  const sp = req.nextUrl.searchParams;
  const code = sp.get("code");
  const state = sp.get("state");
  const err = sp.get("error");
  if (err) return NextResponse.redirect(`${origin}/auth/login?error=${err}`);
  if (!code || !state) return NextResponse.redirect(`${origin}/auth/login?error=missing`);

  const jar = await cookies();
  const raw = jar.get("line_oauth_state")?.value;
  jar.delete("line_oauth_state");
  if (!raw) return NextResponse.redirect(`${origin}/auth/login?error=state_missing`);
  const saved = JSON.parse(raw) as { state: string; nonce: string; next: string };
  if (saved.state !== state) return NextResponse.redirect(`${origin}/auth/login?error=state_mismatch`);

  const redirectUri = `${origin}/api/auth/line/callback`;
  const tok = await exchangeLineCode(code, redirectUri);

  // Decode id_token (JWT) — we trust LINE's signature here since we got it
  // over TLS directly from LINE's token endpoint.
  const [, payloadB64] = tok.id_token.split(".");
  const payload = JSON.parse(decodeB64Url(payloadB64)) as {
    sub: string;
    name?: string;
    picture?: string;
    email?: string;
  };

  const ts = now();
  const existing = await db()
    .select()
    .from(users)
    .where(eq(users.lineUserId, payload.sub))
    .limit(1);

  let userId: string;
  if (existing.length) {
    const u = existing[0];
    userId = u.id;
    await db()
      .update(users)
      .set({
        displayName: payload.name ?? u.displayName,
        avatarUrl: payload.picture ?? u.avatarUrl,
        email: u.email ?? payload.email ?? null,
        updatedAt: ts,
      })
      .where(eq(users.id, userId));
  } else {
    userId = newId("usr");
    await db().insert(users).values({
      id: userId,
      lineUserId: payload.sub,
      email: payload.email ?? null,
      displayName: payload.name ?? "ผู้ใช้ LINE",
      avatarUrl: payload.picture ?? null,
      role: "user",
      createdAt: ts,
      updatedAt: ts,
    });
  }

  await createSession(userId, {
    ip: req.headers.get("cf-connecting-ip") ?? undefined,
    ua: req.headers.get("user-agent") ?? undefined,
  });

  return NextResponse.redirect(`${origin}${saved.next || "/account"}`);
}

/**
 * Decode a base64url string (JWT parts are base64url without padding) into a
 * UTF-8 string. `atob` alone returns a binary string, which mangles multi-byte
 * characters like Thai display names.
 */
function decodeB64Url(s: string): string {
  const pad = s.length % 4 === 0 ? 0 : 4 - (s.length % 4);
  const b64 = (s + "====".slice(0, pad)).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
