import { SignJWT, jwtVerify } from "jose";
import { env } from "./cf";

function key() {
  return new TextEncoder().encode(env().SESSION_SECRET);
}

/** Sign a short-lived JWT for secure resource URLs (font download, ebook page) */
export async function signResourceToken(payload: Record<string, unknown>, ttlSec = 300) {
  return new SignJWT(payload as Record<string, string | number | boolean>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSec}s`)
    .sign(key());
}

export async function verifyResourceToken<T = Record<string, unknown>>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, key());
    return payload as T;
  } catch {
    return null;
  }
}

/** HMAC-SHA256 hex digest — used to verify Beamcheckout webhook signatures. */
export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const keyObj = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", keyObj, enc.encode(message));
  return Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time comparison — prevents timing attacks on webhook signatures. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
