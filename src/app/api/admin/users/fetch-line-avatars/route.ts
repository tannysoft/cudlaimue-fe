import { NextResponse } from "next/server";
import { and, count, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, adminAudit } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { env } from "@/lib/cf";
import { newId, now } from "@/lib/utils";

/**
 * Bulk-fetch LINE avatar + displayName for users who have a `lineUserId` set
 * but no `avatarUrl` yet (typically users migrated via the CSV importer who
 * haven't logged in via LINE on the new site yet).
 *
 * Uses LINE Messaging API `GET /v2/bot/profile/{userId}` — requires the env
 * var `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` pointing to a LINE Messaging
 * channel where the target users have added your OA as a friend. Users who
 * haven't friended the OA will 404 — we log and skip them.
 *
 * Batch-capped at `BATCH_LIMIT` per call to stay within Worker CPU budget.
 * Run repeatedly to clear the backlog.
 */

const LINE_API = "https://api.line.me/v2/bot/profile";
const BATCH_LIMIT = 100;

export async function POST() {
  const admin = await requireAdmin();
  const token = env().LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "missing_token", message: "ตั้งค่า LINE_MESSAGING_CHANNEL_ACCESS_TOKEN ก่อน" },
      { status: 400 },
    );
  }

  const candidates = await db()
    .select({ id: users.id, lineUserId: users.lineUserId, displayName: users.displayName })
    .from(users)
    .where(and(isNotNull(users.lineUserId), isNull(users.avatarUrl)))
    .limit(BATCH_LIMIT);

  let success = 0;
  let notFound = 0;
  let failed = 0;
  const plans: Array<{ id: string; set: Record<string, unknown> }> = [];

  for (const u of candidates) {
    if (!u.lineUserId) continue;
    try {
      const r = await fetch(`${LINE_API}/${encodeURIComponent(u.lineUserId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 404) {
        notFound++;
        continue;
      }
      if (!r.ok) {
        failed++;
        continue;
      }
      const prof = (await r.json()) as {
        displayName?: string;
        pictureUrl?: string;
      };
      const updates: Record<string, unknown> = { updatedAt: now() };
      if (prof.pictureUrl) updates.avatarUrl = prof.pictureUrl;
      if (!u.displayName && prof.displayName) updates.displayName = prof.displayName;
      if (Object.keys(updates).length > 1) {
        plans.push({ id: u.id, set: updates });
      }
      success++;
    } catch {
      failed++;
    }
  }

  // Batch all UPDATEs into a single D1 batch call (1 subrequest per batch,
  // not per row). Chunked at 80 to stay under SQLite's ~100 param cap.
  const CHUNK = 80;
  for (let i = 0; i < plans.length; i += CHUNK) {
    const slice = plans.slice(i, i + CHUNK);
    if (slice.length === 0) continue;
    const stmts = slice.map((p) =>
      db().update(users).set(p.set).where(eq(users.id, p.id)),
    );
    await (db() as unknown as { batch: (s: unknown[]) => Promise<unknown> }).batch(stmts);
  }

  // COUNT instead of SELECT + .length — avoids loading 3000+ rows just to
  // return a number.
  const remainingRow = await db()
    .select({ n: count() })
    .from(users)
    .where(and(isNotNull(users.lineUserId), isNull(users.avatarUrl)));
  const remaining = remainingRow[0]?.n ?? 0;

  await db().insert(adminAudit).values({
    id: newId("au"),
    adminId: admin.id,
    action: "line.fetch_avatars",
    target: null,
    payload: JSON.stringify({
      attempted: candidates.length,
      success,
      notFound,
      failed,
      remaining,
    }),
    createdAt: now(),
  });

  return NextResponse.json({
    attempted: candidates.length,
    success,
    notFound,
    failed,
    remaining,
  });
}
