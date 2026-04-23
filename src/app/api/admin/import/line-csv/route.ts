import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, adminAudit } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { newId, now, rewriteWpAvatarDomain, stripWpThumbSize } from "@/lib/utils";

/**
 * Apply LINE user id + avatar to existing users via CSV.
 *
 * Accepted column aliases (case-insensitive, spaces → `_`):
 *   LINE id:   line_user_id | identifier | lineuserid | line_id
 *   WP user:   id | wp_user_id | user_id | wp_id
 *   Email:     email | user_email
 *   Provider:  type | provider       (if present, only rows = "line" are used)
 *   Avatar:    avatar_url | picture | image | profile_image_url
 *   Name:      display_name | name | username
 *
 * Matching priority (first hit wins):
 *   1) WP user id  → users.sourceWcId (set during WC customers import)
 *   2) email       → users.email
 *
 * Scales to large CSVs (thousands of rows) by:
 *   - Scanning only candidate users via chunked IN queries (not SELECT *)
 *   - Batching UPDATEs through db.batch([...]) so each chunk is 1 subrequest
 */

const LINE_ID_COLS = ["line_user_id", "identifier", "lineuserid", "line_id"];
const WP_ID_COLS = ["id", "wp_user_id", "user_id", "wp_id"];
const EMAIL_COLS = ["email", "user_email"];
const TYPE_COLS = ["type", "provider"];
const AVATAR_COLS = ["avatar_url", "picture", "image", "profile_image_url"];
const NAME_COLS = ["display_name", "name", "username"];

const CHUNK = 80; // D1 SQLite ~100 param cap per query

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "missing_file" }, { status: 400 });

    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length === 0) {
      return NextResponse.json({ error: "empty_csv" }, { status: 400 });
    }

    // 1) Extract candidate rows
    type Candidate = {
      lineId: string;
      wpId: number | null;
      email: string | null;
      avatar: string | null;
      name: string | null;
    };
    const candidates: Candidate[] = [];
    let rowsSeen = 0;
    let skippedWrongType = 0;

    for (const row of rows) {
      rowsSeen++;
      const type = pick(row, TYPE_COLS)?.toLowerCase();
      if (type && type !== "line") {
        skippedWrongType++;
        continue;
      }
      const lineId = pick(row, LINE_ID_COLS);
      if (!lineId) continue;

      const wpIdRaw = pick(row, WP_ID_COLS);
      const wpId = wpIdRaw ? Number(wpIdRaw) : NaN;
      const email = pick(row, EMAIL_COLS)?.toLowerCase() ?? null;
      const avatar = rewriteWpAvatarDomain(stripWpThumbSize(pick(row, AVATAR_COLS))) ?? null;
      const name = pick(row, NAME_COLS) ?? null;

      candidates.push({
        lineId,
        wpId: Number.isFinite(wpId) ? wpId : null,
        email,
        avatar: avatar && avatar.startsWith("http") ? avatar : null,
        name,
      });
    }

    // 2) Fetch only matching users (chunked) — not the whole users table
    const allWpIds = Array.from(
      new Set(candidates.map((c) => c.wpId).filter((v): v is number => v != null)),
    );
    const allEmails = Array.from(
      new Set(candidates.map((c) => c.email).filter((v): v is string => !!v)),
    );

    type UserRow = {
      id: string;
      email: string | null;
      sourceWcId: number | null;
      lineUserId: string | null;
      avatarUrl: string | null;
      displayName: string | null;
    };
    const found: UserRow[] = [];

    for (let i = 0; i < allWpIds.length; i += CHUNK) {
      const slice = allWpIds.slice(i, i + CHUNK);
      const rs = await db()
        .select({
          id: users.id,
          email: users.email,
          sourceWcId: users.sourceWcId,
          lineUserId: users.lineUserId,
          avatarUrl: users.avatarUrl,
          displayName: users.displayName,
        })
        .from(users)
        .where(inArray(users.sourceWcId, slice));
      found.push(...rs);
    }
    for (let i = 0; i < allEmails.length; i += CHUNK) {
      const slice = allEmails.slice(i, i + CHUNK);
      const rs = await db()
        .select({
          id: users.id,
          email: users.email,
          sourceWcId: users.sourceWcId,
          lineUserId: users.lineUserId,
          avatarUrl: users.avatarUrl,
          displayName: users.displayName,
        })
        .from(users)
        .where(inArray(users.email, slice));
      found.push(...rs);
    }

    const byId = new Map<string, UserRow>();
    for (const u of found) byId.set(u.id, u);
    const byWp = new Map<number, UserRow>();
    const byEmail = new Map<string, UserRow>();
    for (const u of byId.values()) {
      if (u.sourceWcId != null) byWp.set(u.sourceWcId, u);
      if (u.email) byEmail.set(u.email.toLowerCase(), u);
    }
    const takenLineIds = new Set(
      Array.from(byId.values()).map((u) => u.lineUserId).filter((v): v is string => !!v),
    );

    // 3) Plan updates in-memory
    type Plan = {
      id: string;
      set: Record<string, unknown>;
    };
    const planned: Plan[] = [];
    let matched = 0;
    let skippedNoUser = 0;
    let skippedAlready = 0;
    let skippedCollision = 0;

    for (const c of candidates) {
      const user =
        (c.wpId != null ? byWp.get(c.wpId) : undefined) ??
        (c.email ? byEmail.get(c.email) : undefined);
      if (!user) {
        skippedNoUser++;
        continue;
      }
      matched++;

      if (user.lineUserId) {
        skippedAlready++;
        continue;
      }
      if (takenLineIds.has(c.lineId)) {
        skippedCollision++;
        continue;
      }

      const set: Record<string, unknown> = {
        lineUserId: c.lineId,
        updatedAt: now(),
      };
      if (!user.avatarUrl && c.avatar) set.avatarUrl = c.avatar;
      if (!user.displayName && c.name) set.displayName = c.name;
      planned.push({ id: user.id, set });
      takenLineIds.add(c.lineId);
      // Patch cache so later candidates see this user as already set
      user.lineUserId = c.lineId;
    }

    // 4) Batched UPDATEs — 1 subrequest per chunk instead of per row
    for (let i = 0; i < planned.length; i += CHUNK) {
      const slice = planned.slice(i, i + CHUNK);
      if (slice.length === 0) continue;
      const stmts = slice.map((p) =>
        db().update(users).set(p.set).where(eq(users.id, p.id)),
      );
      // drizzle-d1 exposes batch via unknown type; cast once
      await (db() as unknown as { batch: (s: unknown[]) => Promise<unknown> }).batch(stmts);
    }

    const updated = planned.length;

    await db().insert(adminAudit).values({
      id: newId("au"),
      adminId: admin.id,
      action: "import.line_csv",
      target: null,
      payload: JSON.stringify({
        rows: rowsSeen,
        matched,
        updated,
        skippedNoUser,
        skippedAlready,
        skippedCollision,
        skippedWrongType,
      }),
      createdAt: now(),
    });

    return NextResponse.json({
      rows: rowsSeen,
      matched,
      updated,
      skippedNoUser,
      skippedAlready,
      skippedCollision,
      skippedWrongType,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "line_csv_failed", message: msg }, { status: 500 });
  }
}

function pick(row: Record<string, string>, aliases: string[]): string | undefined {
  for (const a of aliases) {
    const v = row[a];
    if (v != null && String(v).trim() !== "" && String(v).toUpperCase() !== "NULL") {
      return String(v).trim();
    }
  }
  return undefined;
}

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = splitCsvLines(text);
  if (lines.length < 2) return [];
  const headers = splitCsvRow(lines[0]).map((h) =>
    h
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, ""),
  );
  const out: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = splitCsvRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    out.push(row);
  }
  return out;
}

function splitCsvLines(text: string): string[] {
  const lines: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuote && text[i + 1] === '"') {
        cur += '""';
        i++;
      } else {
        inQuote = !inQuote;
        cur += ch;
      }
    } else if ((ch === "\n" || ch === "\r") && !inQuote) {
      if (cur.length > 0) lines.push(cur);
      cur = "";
      if (ch === "\r" && text[i + 1] === "\n") i++;
    } else {
      cur += ch;
    }
  }
  if (cur.length > 0) lines.push(cur);
  return lines;
}

function splitCsvRow(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === "," && !inQuote) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}
