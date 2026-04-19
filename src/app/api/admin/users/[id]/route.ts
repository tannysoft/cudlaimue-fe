import { NextRequest, NextResponse } from "next/server";
import { eq, count } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  users,
  orders,
  entitlements,
  carts,
  downloadLogs,
  sessions,
  adminAudit,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { newId, now } from "@/lib/utils";

const PatchSchema = z.object({
  isBanned: z.boolean().optional(),
  role: z.enum(["admin", "user"]).optional(),
  displayName: z.string().min(1).max(80).optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  if (id === admin.id) {
    return NextResponse.json({ error: "cannot_modify_self" }, { status: 400 });
  }
  const body = PatchSchema.parse(await req.json());
  await db()
    .update(users)
    .set({ ...body, updatedAt: now() })
    .where(eq(users.id, id));
  await db().insert(adminAudit).values({
    id: newId("au"),
    adminId: admin.id,
    action: "user.update",
    target: id,
    payload: JSON.stringify(body),
    createdAt: now(),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  if (id === admin.id) {
    return NextResponse.json({ error: "cannot_delete_self" }, { status: 400 });
  }

  // Refuse hard-delete if user has orders — refer them to ban instead so
  // revenue/history stays intact.
  const [{ n: orderCount }] = await db()
    .select({ n: count() })
    .from(orders)
    .where(eq(orders.userId, id));
  if (orderCount > 0) {
    return NextResponse.json(
      { error: "has_orders", message: "ผู้ใช้นี้มีประวัติคำสั่งซื้อ ใช้การ 'แบน' แทนเพื่อรักษาข้อมูลการเงิน" },
      { status: 409 },
    );
  }

  // Clean up dependents that don't auto-cascade.
  await db().delete(entitlements).where(eq(entitlements.userId, id));
  await db().delete(carts).where(eq(carts.userId, id));
  await db().delete(downloadLogs).where(eq(downloadLogs.userId, id));
  // sessions auto-cascades via ON DELETE CASCADE, but double-up for safety.
  await db().delete(sessions).where(eq(sessions.userId, id));
  await db().delete(users).where(eq(users.id, id));

  await db().insert(adminAudit).values({
    id: newId("au"),
    adminId: admin.id,
    action: "user.delete",
    target: id,
    payload: null,
    createdAt: now(),
  });

  return NextResponse.json({ ok: true });
}
