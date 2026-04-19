import { redirect } from "next/navigation";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { formatTHB } from "@/lib/utils";

export const metadata = { title: "ประวัติการสั่งซื้อ" };

export default async function OrdersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login?next=/account/orders");

  const list = await db()
    .select()
    .from(orders)
    .where(eq(orders.userId, user.id))
    .orderBy(desc(orders.createdAt))
    .limit(50);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-600 font-bold mb-6">
        ประวัติการสั่งซื้อ
      </h1>
      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-peach-200 py-16 text-center text-ink/50">
          ยังไม่มีคำสั่งซื้อ
        </div>
      ) : (
        <div className="space-y-3">
          {await Promise.all(
            list.map(async (o) => {
              const items = await db()
                .select()
                .from(orderItems)
                .where(eq(orderItems.orderId, o.id));
              const statusColor =
                o.status === "paid"
                  ? "bg-teal-500 text-white"
                  : o.status === "pending"
                  ? "bg-peach-300 text-peach-900"
                  : "bg-ink/10 text-ink/60";
              return (
                <div key={o.id} className="bg-white rounded-xl border border-peach-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono text-sm text-ink/70">#{o.id.slice(-8)}</div>
                      <div className="text-xs text-ink/50">
                        {new Date(o.createdAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-peach-600">{formatTHB(o.totalSatang)}</div>
                      <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full ${statusColor}`}>
                        {o.status}
                      </span>
                    </div>
                  </div>
                  <ul className="mt-3 text-sm text-ink/70 space-y-0.5">
                    {items.map((it) => (
                      <li key={it.id}>
                        • {it.productNameSnapshot}{" "}
                        <span className="text-ink/40">({it.productType})</span>
                      </li>
                    ))}
                  </ul>
                  {o.status === "paid" && (
                    <Link
                      href="/account/library"
                      className="mt-3 inline-block text-sm text-peach-600 hover:underline"
                    >
                      ไปยังไฟล์ดาวน์โหลด →
                    </Link>
                  )}
                </div>
              );
            }),
          )}
        </div>
      )}
    </div>
  );
}
