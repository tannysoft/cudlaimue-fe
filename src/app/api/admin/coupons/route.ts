import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { coupons, adminAudit } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { newId, now } from "@/lib/utils";

const CreateSchema = z.object({
  code: z.string().min(1).max(64),
  type: z.enum(["percent", "fixed"]),
  value: z.number().int().positive(),
  minSubtotalSatang: z.number().int().nonnegative().nullable().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  maxUsesPerUser: z.number().int().positive().nullable().optional(),
  expiresAt: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
  productIds: z.array(z.string()).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export async function GET() {
  await requireAdmin();
  const rows = await db().select().from(coupons).orderBy(desc(coupons.createdAt));
  return NextResponse.json({ coupons: rows });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  const body = CreateSchema.parse(await req.json());
  const code = body.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]+$/.test(code)) {
    return NextResponse.json(
      { error: "invalid_code", message: "ใช้ได้เฉพาะ A-Z 0-9 _ -" },
      { status: 400 },
    );
  }
  if (body.type === "percent" && (body.value < 1 || body.value > 100)) {
    return NextResponse.json(
      { error: "invalid_percent", message: "เปอร์เซ็นต์ต้องอยู่ระหว่าง 1-100" },
      { status: 400 },
    );
  }

  const existing = await db()
    .select({ id: coupons.id })
    .from(coupons)
    .where(eq(coupons.code, code))
    .limit(1);
  if (existing.length) {
    return NextResponse.json(
      { error: "duplicate_code", message: "โค้ดนี้มีอยู่แล้ว" },
      { status: 409 },
    );
  }

  const id = newId("cpn");
  const ts = now();
  const productIds =
    body.productIds && body.productIds.length ? JSON.stringify(body.productIds) : null;
  await db().insert(coupons).values({
    id,
    code,
    type: body.type,
    value: body.value,
    minSubtotalSatang: body.minSubtotalSatang ?? null,
    maxUses: body.maxUses ?? null,
    maxUsesPerUser: body.maxUsesPerUser ?? null,
    expiresAt: body.expiresAt ?? null,
    isActive: body.isActive ?? true,
    productIds,
    notes: body.notes?.trim() ? body.notes.trim() : null,
    usedCount: 0,
    createdAt: ts,
    updatedAt: ts,
  });
  await db().insert(adminAudit).values({
    id: newId("au"),
    adminId: admin.id,
    action: "coupon.create",
    target: id,
    payload: JSON.stringify({ code, type: body.type, value: body.value }),
    createdAt: ts,
  });
  return NextResponse.json({ id, code });
}
