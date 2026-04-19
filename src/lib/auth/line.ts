import "server-only";
import { env } from "../cf";

const LINE_AUTH = "https://access.line.me/oauth2/v2.1/authorize";
const LINE_TOKEN = "https://api.line.me/oauth2/v2.1/token";
const LINE_VERIFY = "https://api.line.me/oauth2/v2.1/verify";
const LINE_PROFILE = "https://api.line.me/v2/profile";

export function lineAuthUrl(state: string, redirectUri: string, nonce: string) {
  const e = env();
  const p = new URLSearchParams({
    response_type: "code",
    client_id: e.LINE_LOGIN_CHANNEL_ID,
    redirect_uri: redirectUri,
    state,
    scope: "profile openid email",
    nonce,
    bot_prompt: "normal",
  });
  return `${LINE_AUTH}?${p.toString()}`;
}

export async function exchangeLineCode(code: string, redirectUri: string) {
  const e = env();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: e.LINE_LOGIN_CHANNEL_ID,
    client_secret: e.LINE_LOGIN_CHANNEL_SECRET,
  });
  const r = await fetch(LINE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`LINE token exchange failed: ${r.status} ${text.slice(0, 400)}`);
  }
  return (await r.json()) as {
    access_token: string;
    id_token: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
    token_type: string;
  };
}

/** Verify a LIFF access token and get the user profile. */
export async function verifyLiffAccessToken(token: string) {
  const e = env();
  const verify = await fetch(`${LINE_VERIFY}?access_token=${encodeURIComponent(token)}`);
  if (!verify.ok) throw new Error(`LIFF verify failed: ${verify.status}`);
  const v = (await verify.json()) as { client_id: string; expires_in: number; scope: string };
  if (v.client_id !== e.LINE_LOGIN_CHANNEL_ID) {
    throw new Error("LIFF token client_id mismatch");
  }
  const prof = await fetch(LINE_PROFILE, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!prof.ok) throw new Error(`LINE profile failed: ${prof.status}`);
  return (await prof.json()) as {
    userId: string;
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
  };
}
