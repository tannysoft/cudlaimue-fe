import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { sessions, users } from "../db/schema";
import { newId, now } from "../utils";

const COOKIE = "cudlaimue_session";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function createSession(userId: string, meta?: { ip?: string; ua?: string }) {
  const id = newId("sess");
  const expiresAt = now() + TTL_MS;
  await db().insert(sessions).values({
    id,
    userId,
    expiresAt,
    userAgent: meta?.ua ?? null,
    ip: meta?.ip ?? null,
    createdAt: now(),
  });
  const jar = await cookies();
  jar.set(COOKIE, id, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
  return id;
}

export async function destroySession() {
  const jar = await cookies();
  const sid = jar.get(COOKIE)?.value;
  if (sid) {
    await db().delete(sessions).where(eq(sessions.id, sid));
  }
  jar.delete(COOKIE);
}

export async function getSessionUser() {
  const jar = await cookies();
  const sid = jar.get(COOKIE)?.value;
  if (!sid) return null;
  const rows = await db()
    .select({
      s: sessions,
      u: users,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, sid))
    .limit(1);
  if (!rows.length) return null;
  const { s, u } = rows[0];
  if (s.expiresAt < now()) {
    await db().delete(sessions).where(eq(sessions.id, sid));
    return null;
  }
  if (u.isBanned) return null;
  return u;
}

export async function requireUser() {
  const u = await getSessionUser();
  if (!u) throw new Response("Unauthorized", { status: 401 });
  return u;
}

export async function requireAdmin() {
  const u = await getSessionUser();
  if (!u || u.role !== "admin") throw new Response("Forbidden", { status: 403 });
  return u;
}
