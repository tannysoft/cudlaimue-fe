import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateCoupon } from "@/lib/coupon";

/**
 * Public coupon validation — used by the cart UI to preview the discount
 * without committing anything. Returns either the discount amount or a
 * human-readable error message.
 *
 * No-auth on purpose so guests can also see their potential discount before
 * logging in. Rate limit is upstream (CF Worker default).
 */

const Schema = z.object({
  code: z.string().min(1).max(64),
  subtotalSatang: z.number().int().nonnegative(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        priceSatang: z.number().int().nonnegative(),
        qty: z.number().int().positive(),
      }),
    )
    .optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { code, subtotalSatang, items } = parsed.data;
  const r = await validateCoupon(code, subtotalSatang, items);
  if (!r.valid) {
    return NextResponse.json(
      { valid: false, message: r.message, code: r.code ?? code },
      { status: 200 }, // soft fail — UI shows the message inline
    );
  }
  return NextResponse.json({
    valid: true,
    code: r.coupon.code,
    type: r.coupon.type,
    value: r.coupon.value,
    discountSatang: r.discountSatang,
  });
}
