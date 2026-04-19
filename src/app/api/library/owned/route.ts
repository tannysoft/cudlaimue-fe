import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { getOwnedProductIds } from "@/lib/entitlements";

/**
 * Returns which of the given product IDs the current session user owns.
 * Used by the storefront to swap the "Add to cart" button → "Download/Read"
 * on cached pages (ISR can't be per-user, so this runs client-side after
 * mount).
 *
 * Auth optional — guests just get an empty `owned` array (no DB hit).
 */

const Schema = z.object({
  productIds: z.array(z.string()).max(200),
});

export async function POST(req: NextRequest) {
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ owned: [] });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ owned: [] });
  const owned = await getOwnedProductIds(user.id, parsed.data.productIds);
  return NextResponse.json({ owned: Array.from(owned) });
}
