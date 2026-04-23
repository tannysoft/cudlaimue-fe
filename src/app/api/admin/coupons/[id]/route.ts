import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { coupons, adminAudit } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { newId, now } from "@/lib/utils";

const PatchSchema = z.object({
  type: z.enum(["percent", "fixed"]).optional(),
  value: z.number().int().positive().optional(),
  minSubtotalSatang: z.number().int().nonnegative().nullable().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  maxUsesPerUser: z.number().int().positive().nullable().optional(),
  expiresAt: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
  productIds: z.array(z.string()).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const body = PatchSchema.parse(await req.json());
  if (body.type === "percent" && body.value != null && (body.value < 1 || body.value > 100)) {
    return NextResponse.json(
      { error: "invalid_percent", message: "เปอร์เซ็นต์ต้องอยู่ระหว่าง 1-100" },
      { status: 400 },
    );
  }
  const { productIds: rawIds, notes: rawNotes, ...rest } = body;
  const update: Partial<typeof coupons.$inferInsert> = { ...rest, updatedAt: now() };
  if (rawIds !== undefined) {
    update.productIds = rawIds && rawIds.length ? JSON.stringify(rawIds) : null;
  }
  if (rawNotes !== undefined) {
    const trimmed = rawNotes?.trim();
    update.notes = trimmed ? trimmed : null;
  }
  await db().update(coupons).set(update).where(eq(coupons.id, id));
  await db().insert(adminAudit).values({
    id: newId("au"),
    adminId: admin.id,
    action: "coupon.update",
    target: id,
    payload: JSON.stringify(body),
    createdAt: now(),
  });
  return NextResponse.json({ id });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  await db().delete(coupons).where(eq(coupons.id, id));
  await db().insert(adminAudit).values({
    id: newId("au"),
    adminId: admin.id,
    action: "coupon.delete",
    target: id,
    payload: null,
    createdAt: now(),
  });
  return NextResponse.json({ id });
}
