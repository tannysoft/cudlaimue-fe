import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { wcGetCustomer } from "@/lib/wp/woo";
import { extractNextendLine } from "@/lib/wp/nextend";

/**
 * Debug endpoint — dumps the raw WC customer meta_data so the admin can
 * eyeball the actual key names used by Nextend Social Login (or other LINE
 * plugins) in their install. Also runs the extractor and returns what we
 * matched, so mismatches are obvious.
 *
 *   GET /api/admin/import/wp/customers/123/meta
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await ctx.params;
  const wcId = Number(id);
  if (!Number.isFinite(wcId)) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }
  try {
    const c = await wcGetCustomer(wcId);
    const extracted = extractNextendLine(c.meta_data);
    return NextResponse.json({
      id: c.id,
      email: c.email,
      name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim(),
      meta_count: c.meta_data?.length ?? 0,
      meta_keys: (c.meta_data ?? []).map((m) => m.key),
      meta_data: c.meta_data ?? [],
      extracted,
      avatar_url: c.avatar_url,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
