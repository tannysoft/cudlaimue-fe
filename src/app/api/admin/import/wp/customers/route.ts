import { NextRequest, NextResponse } from "next/server";
import { eq, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, adminAudit } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { wcListCustomersPage, wcListAllCustomers } from "@/lib/wp/woo";
import { extractNextendLine } from "@/lib/wp/nextend";
import { newId, now, rewriteWpAvatarDomain, stripWpThumbSize } from "@/lib/utils";

/**
 * GET  ?page=N&perPage=50  → paginated preview of WC customers
 * POST body { ids?, page?, perPage? }
 *
 * Matching strategy for each WC customer:
 *   1) existing row with the same `sourceWcId`, OR
 *   2) existing row with the same `email`
 *   → if matched, MERGE: only fill fields currently null/empty (never overwrite
 *     existing values). Covers the case where a user signed up via LINE first
 *     (has lineUserId but no phone/address), then admin imports from WC later.
 *   → if not matched, INSERT new row.
 *
 *   `lineUserId` is applied only if it doesn't collide with a different user.
 */

export async function GET(req: NextRequest) {
  await requireAdmin();
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1"));
  const perPage = Math.min(
    100,
    Math.max(10, Number(req.nextUrl.searchParams.get("perPage") ?? "25")),
  );
  try {
    const r = await wcListCustomersPage(page, perPage);
    // Only check this page's 25 WC ids + emails — scanning the whole
    // users table blows the Worker CPU budget once we have thousands.
    const pageWcIds = r.items.map((c) => c.id);
    const pageEmails = r.items.map((c) => c.email).filter((e): e is string => !!e);
    const matchConds = [];
    if (pageWcIds.length) matchConds.push(inArray(users.sourceWcId, pageWcIds));
    if (pageEmails.length) matchConds.push(inArray(users.email, pageEmails));
    const existing = matchConds.length
      ? await db()
          .select({ sourceWcId: users.sourceWcId, email: users.email })
          .from(users)
          .where(or(...matchConds))
      : [];
    const importedWcIds = new Set(existing.map((e) => e.sourceWcId));
    const existingEmails = new Set(existing.map((e) => e.email).filter(Boolean));
    return NextResponse.json({
      page: r.page,
      perPage: r.perPage,
      total: r.total,
      totalPages: r.totalPages,
      customers: r.items.map((c) => {
        const { lineUserId } = extractNextendLine(c.meta_data);
        return {
          id: c.id,
          email: c.email,
          name:
            `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.username || c.email,
          username: c.username,
          phone: c.billing?.phone ?? null,
          hasLine: !!lineUserId,
          createdAt: c.date_created,
          alreadyImported: importedWcIds.has(c.id) || (!!c.email && existingEmails.has(c.email)),
        };
      }),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

const Schema = z.object({
  ids: z.array(z.number().int()).optional(),
  page: z.number().int().min(1).optional(),
  perPage: z.number().int().min(1).max(100).optional(),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  const body = Schema.parse(await req.json().catch(() => ({})));

  let list: Awaited<ReturnType<typeof wcListAllCustomers>>;
  let totalPages = 1;
  let page = 1;

  if (body.page) {
    const r = await wcListCustomersPage(body.page, body.perPage ?? 50);
    list = r.items;
    totalPages = r.totalPages;
    page = r.page;
  } else {
    list = await wcListAllCustomers();
  }

  const wanted = body.ids ? list.filter((c) => body.ids!.includes(c.id)) : list;

  // Only pull existing rows that could possibly collide with this batch —
  // scanning the whole `users` table blows the Worker CPU budget once the
  // table grows past a few thousand rows.
  const incomingEmails = wanted.map((c) => c.email).filter((e): e is string => !!e);
  const incomingWcIds = wanted.map((c) => c.id);
  const incomingLineIds = wanted
    .map((c) => extractNextendLine(c.meta_data).lineUserId)
    .filter((v): v is string => !!v);

  const conditions = [];
  if (incomingEmails.length) conditions.push(inArray(users.email, incomingEmails));
  if (incomingWcIds.length) conditions.push(inArray(users.sourceWcId, incomingWcIds));
  if (incomingLineIds.length) conditions.push(inArray(users.lineUserId, incomingLineIds));

  const existing =
    conditions.length > 0
      ? await db().select().from(users).where(or(...conditions))
      : [];
  const bySource = new Map<number, (typeof existing)[number]>();
  const byEmail = new Map<string, (typeof existing)[number]>();
  const byLine = new Map<string, (typeof existing)[number]>();
  for (const u of existing) {
    if (u.sourceWcId) bySource.set(u.sourceWcId, u);
    if (u.email) byEmail.set(u.email, u);
    if (u.lineUserId) byLine.set(u.lineUserId, u);
  }

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let linkedLine = 0;

  for (const c of wanted) {
    if (!c.email) {
      skipped++;
      continue;
    }
    const { lineUserId, avatarUrl: metaAvatar } = extractNextendLine(c.meta_data);
    const candidateAvatar = rewriteWpAvatarDomain(
      stripWpThumbSize(metaAvatar ?? pickWcAvatar(c.avatar_url)),
    );
    const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.username || c.email;
    const billingJson = hasAddress(c.billing) ? JSON.stringify(c.billing) : null;
    const shippingJson = hasAddress(c.shipping) ? JSON.stringify(c.shipping) : null;
    const phone = c.billing?.phone || null;

    const match = bySource.get(c.id) ?? byEmail.get(c.email);

    if (match) {
      // MERGE — fill only fields currently null/empty on the existing record.
      const updates: Record<string, unknown> = {};
      if (!match.phone && phone) updates.phone = phone;
      if (!match.avatarUrl && candidateAvatar) updates.avatarUrl = candidateAvatar;
      if (!match.displayName && name) updates.displayName = name;
      if (!match.billingAddress && billingJson) updates.billingAddress = billingJson;
      if (!match.shippingAddress && shippingJson) updates.shippingAddress = shippingJson;
      if (!match.sourceWcId) updates.sourceWcId = c.id;
      if (!match.lineUserId && lineUserId) {
        const collides = byLine.get(lineUserId);
        if (!collides || collides.id === match.id) {
          updates.lineUserId = lineUserId;
          byLine.set(lineUserId, { ...match, lineUserId });
          linkedLine++;
        }
      }
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = now();
        await db().update(users).set(updates).where(eq(users.id, match.id));
        const merged = { ...match, ...updates } as typeof match;
        if (merged.sourceWcId) bySource.set(merged.sourceWcId, merged);
        byEmail.set(merged.email!, merged);
        updated++;
      } else {
        skipped++;
      }
      continue;
    }

    // INSERT — brand-new user
    const safeLineId = lineUserId && !byLine.has(lineUserId) ? lineUserId : null;
    const id = newId("usr");
    const ts = now();
    await db().insert(users).values({
      id,
      email: c.email,
      phone,
      lineUserId: safeLineId,
      avatarUrl: candidateAvatar,
      displayName: name,
      role: "user",
      billingAddress: billingJson,
      shippingAddress: shippingJson,
      sourceWcId: c.id,
      createdAt: Date.parse(c.date_created) || ts,
      updatedAt: ts,
    });
    const inserted = {
      id,
      email: c.email,
      phone,
      lineUserId: safeLineId,
      avatarUrl: candidateAvatar,
      displayName: name,
      passwordHash: null,
      role: "user",
      isBanned: false,
      billingAddress: billingJson,
      shippingAddress: shippingJson,
      sourceWcId: c.id,
      createdAt: ts,
      updatedAt: ts,
    } as (typeof existing)[number];
    bySource.set(c.id, inserted);
    byEmail.set(c.email, inserted);
    if (safeLineId) {
      byLine.set(safeLineId, inserted);
      linkedLine++;
    }
    imported++;
  }

  await db().insert(adminAudit).values({
    id: newId("au"),
    adminId: admin.id,
    action: body.page ? "import.customers.page" : "import.customers",
    target: body.page ? `page-${body.page}` : null,
    payload: JSON.stringify({
      imported,
      updated,
      skipped,
      linkedLine,
      page,
      totalPages,
      total: wanted.length,
    }),
    createdAt: now(),
  });

  return NextResponse.json({
    imported,
    updated,
    skipped,
    linkedLine,
    total: wanted.length,
    page,
    totalPages,
  });

  void inArray;
}

function hasAddress(a: unknown): boolean {
  if (!a || typeof a !== "object") return false;
  const obj = a as Record<string, string | undefined>;
  const keys = ["address_1", "address_2", "city", "state", "postcode", "country", "company"];
  return keys.some((k) => (obj[k] ?? "").trim().length > 0);
}

function pickWcAvatar(url: string | undefined): string | null {
  if (!url) return null;
  if (/secure\.gravatar\.com.*d=mm/i.test(url)) return null;
  if (/gravatar\.com\/avatar\/0{10,}/i.test(url)) return null;
  return url;
}
