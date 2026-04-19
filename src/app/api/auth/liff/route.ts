import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { verifyLiffAccessToken } from "@/lib/auth/line";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createSession } from "@/lib/auth/session";
import { newId, now } from "@/lib/utils";


/**
 * LIFF login — the LIFF client calls this with its `liff.getAccessToken()`
 * value. We verify with LINE, then either find-or-create the user and issue a
 * first-party session cookie so the rest of the app (including same-origin
 * Library + Read pages) works identically inside and outside LINE.
 */
export async function POST(req: NextRequest) {
  const { accessToken } = (await req.json()) as { accessToken?: string };
  if (!accessToken) return NextResponse.json({ error: "missing_token" }, { status: 400 });

  let profile: Awaited<ReturnType<typeof verifyLiffAccessToken>>;
  try {
    profile = await verifyLiffAccessToken(accessToken);
  } catch (e) {
    return NextResponse.json({ error: "invalid_token", detail: String(e) }, { status: 401 });
  }

  const ts = now();
  const existing = await db()
    .select()
    .from(users)
    .where(eq(users.lineUserId, profile.userId))
    .limit(1);

  let userId: string;
  if (existing.length) {
    userId = existing[0].id;
    await db()
      .update(users)
      .set({
        displayName: profile.displayName ?? existing[0].displayName,
        avatarUrl: profile.pictureUrl ?? existing[0].avatarUrl,
        updatedAt: ts,
      })
      .where(eq(users.id, userId));
  } else {
    userId = newId("usr");
    await db().insert(users).values({
      id: userId,
      lineUserId: profile.userId,
      displayName: profile.displayName,
      avatarUrl: profile.pictureUrl ?? null,
      role: "user",
      createdAt: ts,
      updatedAt: ts,
    });
  }

  await createSession(userId, {
    ip: req.headers.get("cf-connecting-ip") ?? undefined,
    ua: req.headers.get("user-agent") ?? undefined,
  });

  return NextResponse.json({ ok: true, userId });
}
