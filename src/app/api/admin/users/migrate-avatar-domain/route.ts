import { NextResponse } from "next/server";
import { like, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, adminAudit } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { newId, now } from "@/lib/utils";

/**
 * One-shot migration: rewrite `avatar_url` rows that still point at the old
 * WordPress host (www.cudlaimue.com) to the new CMS host (cms.cudlaimue.com).
 *
 *   https://www.cudlaimue.com/wp-content/uploads/nsl_avatars/abc.jpg
 *     → https://cms.cudlaimue.com/wp-content/uploads/nsl_avatars/abc.jpg
 *
 * Idempotent — re-running after the first pass matches 0 rows.
 */

const OLD_PREFIX = "https://www.cudlaimue.com/wp-content/";
const NEW_PREFIX = "https://cms.cudlaimue.com/wp-content/";

export async function POST() {
  const admin = await requireAdmin();

  const pattern = `${OLD_PREFIX}%`;
  const target = await db()
    .select({ id: users.id })
    .from(users)
    .where(like(users.avatarUrl, pattern));
  const affected = target.length;

  if (affected > 0) {
    await db()
      .update(users)
      .set({
        avatarUrl: sql`replace(${users.avatarUrl}, ${OLD_PREFIX}, ${NEW_PREFIX})`,
        updatedAt: now(),
      })
      .where(like(users.avatarUrl, pattern));
  }

  await db().insert(adminAudit).values({
    id: newId("au"),
    adminId: admin.id,
    action: "users.migrate_avatar_domain",
    target: null,
    payload: JSON.stringify({ affected, from: OLD_PREFIX, to: NEW_PREFIX }),
    createdAt: now(),
  });

  return NextResponse.json({ affected });
}
