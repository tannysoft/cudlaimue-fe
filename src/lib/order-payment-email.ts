import "server-only";
import { env } from "@/lib/cf";
import { sendEmail } from "@/lib/email";
import { renderPaymentSuccessEmail } from "@/lib/email/payment-success";

type OrderRow = {
  id: string;
  customerEmail: string | null;
  customerName: string | null;
  subtotalSatang: number;
  discountSatang: number;
  couponCode: string | null;
  totalSatang: number;
};

type ItemRow = {
  productNameSnapshot: string;
  quantity: number;
  priceSatang: number;
};

const DEDUPE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * Send the "payment received" email for an order, once. Uses KV as a sticky
 * flag so duplicate webhook + polling paths don't produce duplicate emails.
 */
export async function sendPaymentSuccessEmail(args: {
  order: OrderRow;
  items: ItemRow[];
  origin: string;
}): Promise<void> {
  const to = args.order.customerEmail?.trim();
  if (!to) return;

  const e = env();
  const dedupeKey = `email:payment-success:${args.order.id}`;
  if (await e.KV.get(dedupeKey)) return;

  const { subject, html, text } = renderPaymentSuccessEmail({
    customerName: args.order.customerName,
    orderId: args.order.id,
    subtotalSatang: args.order.subtotalSatang,
    discountSatang: args.order.discountSatang,
    couponCode: args.order.couponCode,
    totalSatang: args.order.totalSatang,
    items: args.items.map((it) => ({
      name: it.productNameSnapshot,
      quantity: it.quantity,
      priceSatang: it.priceSatang,
    })),
    origin: args.origin,
    customerEmail: to,
  });

  await sendEmail({
    to,
    toName: args.order.customerName ?? undefined,
    subject,
    html,
    text,
  });

  await e.KV.put(dedupeKey, "1", { expirationTtl: DEDUPE_TTL_SECONDS });
}
