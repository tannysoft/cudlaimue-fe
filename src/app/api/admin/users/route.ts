import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, adminAudit } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { newId, now } from "@/lib/utils";

const CreateSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(80),
  password: z.string().min(8).max(200),
  role: z.enum(["admin", "user"]).default("admin"),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  const body = CreateSchema.parse(await req.json());

  const dup = await db().select().from(users).where(eq(users.email, body.email)).limit(1);
  if (dup.length) {
    return NextResponse.json({ error: "email_in_use" }, { status: 409 });
  }

  const id = newId("usr");
  const ts = now();
  await db().insert(users).values({
    id,
    email: body.email,
    displayName: body.displayName,
    passwordHash: await hashPassword(body.password),
    role: body.role,
    createdAt: ts,
    updatedAt: ts,
  });
  await db().insert(adminAudit).values({
    id: newId("au"),
    adminId: admin.id,
    action: "user.create",
    target: id,
    payload: JSON.stringify({ email: body.email, role: body.role }),
    createdAt: ts,
  });

  return NextResponse.json({ id });
}
