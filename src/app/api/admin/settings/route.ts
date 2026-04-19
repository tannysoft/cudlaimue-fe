import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { getSiteSettings, updateSiteSettings } from "@/lib/site-settings";

export async function GET() {
  await requireAdmin();
  const s = await getSiteSettings();
  return NextResponse.json(s);
}

const PatchSchema = z.object({
  heroImageKey: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  await requireAdmin();
  const body = PatchSchema.parse(await req.json());
  const next = await updateSiteSettings(body);
  return NextResponse.json(next);
}
