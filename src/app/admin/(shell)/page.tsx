import Link from "next/link";
import { count, desc, eq, sql } from "drizzle-orm";
import {
  TrendingUp,
  Package,
  ShoppingBag,
  Users as UsersIcon,
  CreditCard,
  BookOpen,
  ArrowUpRight,
} from "lucide-react";
import { db } from "@/lib/db";
import { orders, users, products, entitlements } from "@/lib/db/schema";
import { formatTHB, initial } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [userCount, prodCount, paidOrders, revenue, entCount, recentOrders] = await Promise.all([
    db().select({ n: count() }).from(users).then((r) => r[0]?.n ?? 0),
    db().select({ n: count() }).from(products).then((r) => r[0]?.n ?? 0),
    db().select({ n: count() }).from(orders).where(eq(orders.status, "paid")).then((r) => r[0]?.n ?? 0),
    db()
      .select({ s: sql<number>`coalesce(sum(${orders.totalSatang}), 0)` })
      .from(orders)
      .where(eq(orders.status, "paid"))
      .then((r) => Number(r[0]?.s ?? 0)),
    db().select({ n: count() }).from(entitlements).then((r) => r[0]?.n ?? 0),
    db()
      .select({ o: orders, u: users })
      .from(orders)
      .leftJoin(users, eq(users.id, orders.userId))
      .orderBy(desc(orders.createdAt))
      .limit(6),
  ]);

  const stats: Stat[] = [
    { label: "รายได้รวม", value: formatTHB(revenue), icon: CreditCard, accent: "teal" },
    { label: "คำสั่งซื้อสำเร็จ", value: paidOrders.toString(), icon: ShoppingBag, accent: "peach" },
    { label: "สินค้าในระบบ", value: prodCount.toString(), icon: Package, accent: "teal" },
    { label: "สมาชิก", value: userCount.toString(), icon: UsersIcon, accent: "peach" },
    { label: "สิทธิ์การใช้งาน", value: entCount.toString(), icon: BookOpen, accent: "teal" },
  ];

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-800 font-bold">
            สวัสดีตอน{getGreeting()}
          </h1>
          <p className="text-ink/60 text-sm mt-1">
            ภาพรวมของร้านคัดลายมือ ณ วันที่ {new Date().toLocaleDateString("th-TH", { dateStyle: "long" })}
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white rounded-full px-5 py-2.5 text-sm font-medium shadow-sm"
        >
          <TrendingUp className="w-4 h-4" /> เริ่มเพิ่มสินค้า
        </Link>
      </header>

      <section className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </section>

      <section className="mt-10 grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-peach-100 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-teal-700">คำสั่งซื้อล่าสุด</h3>
            <Link
              href="/admin/orders"
              className="text-sm text-peach-600 hover:underline inline-flex items-center gap-1"
            >
              ดูทั้งหมด <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="mt-4 divide-y divide-peach-100">
            {recentOrders.length === 0 ? (
              <div className="py-10 text-center text-ink/40 text-sm">ยังไม่มีคำสั่งซื้อ</div>
            ) : (
              recentOrders.map(({ o, u }) => (
                <div key={o.id} className="py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-peach-100 text-peach-700 flex items-center justify-center text-xs font-semibold">
                    {initial(u?.displayName ?? u?.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {u?.displayName ?? u?.email ?? o.customerEmail ?? "ลูกค้า"}
                    </div>
                    <div className="text-xs text-ink/50 font-mono">#{o.id.slice(-10)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-teal-700">{formatTHB(o.totalSatang)}</div>
                    <StatusPill status={o.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-peach-100 p-5">
          <h3 className="font-semibold text-teal-700">ทางลัด</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <QuickLink href="/admin/products/new" icon={Package} label="เพิ่มสินค้า" />
            <QuickLink href="/admin/orders" icon={ShoppingBag} label="คำสั่งซื้อ" />
            <QuickLink href="/admin/users" icon={UsersIcon} label="ผู้ใช้" />
            <QuickLink href="/admin/articles" icon={BookOpen} label="บทความ" />
          </div>
        </div>
      </section>
    </div>
  );
}

type Stat = {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: "peach" | "teal";
};

function StatCard({ label, value, icon: Icon, accent }: Stat) {
  const ring = accent === "peach" ? "bg-peach-100 text-peach-700" : "bg-teal-100 text-teal-700";
  return (
    <div className="bg-white rounded-2xl border border-peach-100 p-5 hover:shadow-sm transition">
      <div className={`w-10 h-10 rounded-xl ${ring} flex items-center justify-center`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="mt-4 text-2xl font-bold text-teal-800 leading-none">{value}</div>
      <div className="mt-1.5 text-sm text-ink/60">{label}</div>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-peach-100 hover:border-peach-300 hover:bg-peach-50 p-4 transition flex flex-col gap-2"
    >
      <Icon className="w-5 h-5 text-ink/50 group-hover:text-peach-600 transition" />
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "paid"
      ? "bg-teal-500 text-white"
      : status === "pending"
      ? "bg-peach-200 text-peach-800"
      : "bg-ink/10 text-ink/60";
  return (
    <span className={`inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {status}
    </span>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "เช้า";
  if (h < 17) return "บ่าย";
  return "ค่ำ";
}
