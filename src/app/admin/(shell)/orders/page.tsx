import Link from "next/link";
import { desc, eq, count, sql, or, like } from "drizzle-orm";
import { ShoppingBag } from "lucide-react";
import { db } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";
import { formatTHB, initial } from "@/lib/utils";
import { Pager, paginationParams } from "@/components/admin/pager";
import { SearchBox } from "@/components/admin/search-box";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const { page, perPage, offset } = paginationParams(sp, 25);
  const q = (sp.q ?? "").trim();
  const pat = `%${q}%`;

  const where = q
    ? or(
        like(orders.id, pat),
        like(orders.customerEmail, pat),
        like(orders.customerName, pat),
        like(orders.customerPhone, pat),
      )
    : undefined;

  const [list, [{ n: total }], [{ s: totalPaid }]] = await Promise.all([
    db()
      .select({ o: orders, u: users })
      .from(orders)
      .leftJoin(users, eq(users.id, orders.userId))
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(perPage)
      .offset(offset),
    db().select({ n: count() }).from(orders).where(where),
    db()
      .select({ s: sql<number>`coalesce(sum(${orders.totalSatang}), 0)` })
      .from(orders)
      .where(eq(orders.status, "paid")),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-800 font-bold">
            คำสั่งซื้อ
          </h1>
          <p className="text-ink/60 text-sm mt-1">
            ทั้งหมด {total} รายการ · รายได้สะสม {formatTHB(Number(totalPaid ?? 0))}
          </p>
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-peach-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-peach-100 flex items-center gap-3">
          <SearchBox
            baseHref="/admin/orders"
            q={q}
            placeholder="ค้นหาจากเลขที่ / อีเมล / ชื่อ / เบอร์…"
          />
        </div>
        {list.length === 0 ? (
          <EmptyState q={q} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-ink/50 border-b border-peach-100 bg-[#fcf8f1]">
                <th className="text-left px-5 py-3 font-medium">เลขที่</th>
                <th className="text-left px-4 py-3 font-medium">ลูกค้า</th>
                <th className="text-left px-4 py-3 font-medium">ยอด</th>
                <th className="text-left px-4 py-3 font-medium">สถานะ</th>
                <th className="text-left px-4 py-3 font-medium">Beam</th>
                <th className="text-left px-4 py-3 font-medium">วันที่</th>
              </tr>
            </thead>
            <tbody>
              {list.map(({ o, u }) => (
                <tr
                  key={o.id}
                  className="border-b border-peach-100 last:border-0 hover:bg-peach-50/60 transition"
                >
                  <td className="px-5 py-3 font-mono text-xs text-ink/70">#{o.id.slice(-10)}</td>
                  <td className="px-4 py-3">
                    {u ? (
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="flex items-center gap-2 min-w-0 hover:text-peach-600"
                      >
                        <div className="w-7 h-7 rounded-full bg-peach-100 text-peach-700 flex items-center justify-center text-[10px] font-semibold">
                          {initial(u.displayName ?? u.email ?? o.customerEmail)}
                        </div>
                        <div className="min-w-0 truncate">
                          {u.displayName ?? u.email ?? o.customerEmail ?? "-"}
                        </div>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0 text-ink/50">
                        <div className="w-7 h-7 rounded-full bg-ink/10 text-ink/50 flex items-center justify-center text-[10px] font-semibold">
                          {initial(o.customerEmail)}
                        </div>
                        <div className="min-w-0 truncate">
                          {o.customerEmail ?? "-"}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-teal-700">{formatTHB(o.totalSatang)}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-ink/50">{o.beamStatus ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-ink/50 whitespace-nowrap">
                    {new Date(o.createdAt).toLocaleString("th-TH", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pager
          page={page}
          totalPages={totalPages}
          total={total}
          baseHref="/admin/orders"
          label="รายการ"
          extraParams={{ q }}
        />
      </div>
    </div>
  );
}

function EmptyState({ q }: { q: string }) {
  return (
    <div className="py-20 text-center">
      <div className="w-14 h-14 rounded-full bg-peach-100 text-peach-600 flex items-center justify-center mx-auto">
        <ShoppingBag className="w-6 h-6" />
      </div>
      <div className="mt-4 font-medium text-ink/70">
        {q ? `ไม่พบคำสั่งซื้อที่ตรงกับ "${q}"` : "ยังไม่มีคำสั่งซื้อ"}
      </div>
      {!q && (
        <p className="text-sm text-ink/50 mt-1">
          คำสั่งซื้อจะแสดงที่นี่หลังมีลูกค้าสั่งซื้อผ่าน Beamcheckout
        </p>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-teal-500 text-white",
    pending: "bg-peach-200 text-peach-800",
    failed: "bg-red-100 text-red-700",
    cancelled: "bg-ink/10 text-ink/60",
    refunded: "bg-ink/20 text-ink/70",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        map[status] ?? "bg-ink/10 text-ink/60"
      }`}
    >
      {status}
    </span>
  );
}
