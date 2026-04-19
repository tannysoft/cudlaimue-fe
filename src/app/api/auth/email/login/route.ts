import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  next: z.string().optional(),
  from: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const parsed = Schema.safeParse(Object.fromEntries(form.entries()));
  // Use the current request's origin so dev/preview/prod all redirect to the
  // host the user is actually on (localhost, workers.dev, or cudlaimue.com).
  const origin = new URL(req.url).origin;
  const referer = req.headers.get("referer") ?? "";
  const loginPath =
    parsed.data?.from ||
    (referer.includes("/admin/login") ? "/admin/login" : "/auth/login");

  if (!parsed.success) {
    return NextResponse.redirect(`${origin}${loginPath}?error=invalid`, { status: 303 });
  }
  const { email, password, next } = parsed.data;
  const rows = await db().select().from(users).where(eq(users.email, email)).limit(1);
  const u = rows[0];
  if (!u || !u.passwordHash || u.isBanned) {
    return NextResponse.redirect(`${origin}${loginPath}?error=invalid_credentials`, { status: 303 });
  }
  const ok = await verifyPassword(password, u.passwordHash);
  if (!ok) {
    return NextResponse.redirect(`${origin}${loginPath}?error=invalid_credentials`, { status: 303 });
  }
  await createSession(u.id, {
    ip: req.headers.get("cf-connecting-ip") ?? undefined,
    ua: req.headers.get("user-agent") ?? undefined,
  });
  const dest = u.role === "admin" ? "/admin" : next || "/account";
  return NextResponse.redirect(`${origin}${dest}`, { status: 303 });
}
