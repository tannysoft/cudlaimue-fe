import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { CheckoutReturnView } from "@/components/shop/checkout-return-view";

export const metadata = { title: "สถานะคำสั่งซื้อ" };
export const dynamic = "force-dynamic";

export default async function CheckoutReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");
  const sp = await searchParams;
  const orderId = sp.order;
  if (!orderId) redirect("/account/orders");

  const row = await db()
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, user.id)))
    .limit(1);
  const order = row[0];
  if (!order) redirect("/account/orders");

  return (
    <CheckoutReturnView
      orderId={order.id}
      initialStatus={order.status}
      totalSatang={order.totalSatang}
      paymentQrUrl={order.paymentQrUrl}
      paymentExpiresAt={order.paymentExpiresAt}
    />
  );
}
