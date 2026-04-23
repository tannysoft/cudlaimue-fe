import Link from "next/link";
import Image from "next/image";
import { and, count, desc, eq, gte, lt, sql } from "drizzle-orm";
import {
  TrendingUp,
  Package,
  ShoppingBag,
  Users as UsersIcon,
  CreditCard,
  BookOpen,
  ArrowUpRight,
  BarChart3,
  ReceiptText,
} from "lucide-react";
import { db } from "@/lib/db";
import { orders, orderItems, users, products, entitlements } from "@/lib/db/schema";
import { formatTHB, initial } from "@/lib/utils";
import { DateRangeFilter } from "@/components/admin/date-range-filter";
import { thumbUrl } from "@/lib/img";

export const dynamic = "force-dynamic";

type Preset = "today" | "7d" | "30d" | "90d" | "ytd" | "all" | "custom";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    preset?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const sp = await searchParams;
  const range = resolveRange(sp);

  // Orders-scoped conditions: paid AND within range.
  const paidInRange = range.fromTs != null
    ? and(
        eq(orders.status, "paid"),
        gte(orders.paidAt, range.fromTs),
        lt(orders.paidAt, range.toTs!),
      )
    : eq(orders.status, "paid");

  // Same-length "previous period" for delta arrows.
  const prevRange = previousRange(range);
  const paidInPrev = prevRange
    ? and(
        eq(orders.status, "paid"),
        gte(orders.paidAt, prevRange.fromTs),
        lt(orders.paidAt, prevRange.toTs),
      )
    : null;

  const [
    userCount,
    prodCount,
    paidOrders,
    revenue,
    entCount,
    recentOrders,
    topItems,
    prevPaidOrders,
    prevRevenue,
  ] = await Promise.all([
    db().select({ n: count() }).from(users).then((r) => r[0]?.n ?? 0),
    db().select({ n: count() }).from(products).then((r) => r[0]?.n ?? 0),
    db().select({ n: count() }).from(orders).where(paidInRange).then((r) => r[0]?.n ?? 0),
    db()
      .select({ s: sql<number>`coalesce(sum(${orders.totalSatang}), 0)` })
      .from(orders)
      .where(paidInRange)
      .then((r) => Number(r[0]?.s ?? 0)),
    db().select({ n: count() }).from(entitlements).then((r) => r[0]?.n ?? 0),
    db()
      .select({ o: orders, u: users })
      .from(orders)
      .leftJoin(users, eq(users.id, orders.userId))
      .orderBy(desc(orders.createdAt))
      .limit(6),
    // Top items sold (by qty) in range — join order_items → products, filter
    // through paid orders in range via a subquery-style WHERE.
    db()
      .select({
        productId: orderItems.productId,
        name: orderItems.productNameSnapshot,
        productType: orderItems.productType,
        coverImageKey: products.coverImageKey,
        slug: products.slug,
        qty: sql<number>`sum(${orderItems.quantity})`,
        revenue: sql<number>`sum(${orderItems.priceSatang} * ${orderItems.quantity})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .leftJoin(products, eq(products.id, orderItems.productId))
      .where(paidInRange)
      .groupBy(orderItems.productId)
      .orderBy(desc(sql`sum(${orderItems.quantity})`))
      .limit(6),
    paidInPrev
      ? db().select({ n: count() }).from(orders).where(paidInPrev).then((r) => r[0]?.n ?? 0)
      : Promise.resolve(null),
    paidInPrev
      ? db()
          .select({ s: sql<number>`coalesce(sum(${orders.totalSatang}), 0)` })
          .from(orders)
          .where(paidInPrev)
          .then((r) => Number(r[0]?.s ?? 0))
      : Promise.resolve(null),
  ]);

  const revenueDelta = deltaPct(revenue, prevRevenue);
  const paidOrdersDelta = deltaPct(paidOrders, prevPaidOrders);

  const stats: Stat[] = [
    {
      label: "รายได้ในช่วงนี้",
      value: formatTHB(revenue),
      icon: CreditCard,
      accent: "teal",
      delta: revenueDelta,
    },
    {
      label: "คำสั่งซื้อสำเร็จ",
      value: paidOrders.toString(),
      icon: ShoppingBag,
      accent: "peach",
      delta: paidOrdersDelta,
    },
    { label: "สินค้าในระบบ", value: prodCount.toString(), icon: Package, accent: "teal" },
    { label: "สมาชิก", value: userCount.toString(), icon: UsersIcon, accent: "peach" },
    { label: "สิทธิ์การใช้งาน", value: entCount.toString(), icon: BookOpen, accent: "teal" },
  ];

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-800 font-bold">
            สวัสดีตอน{getGreeting()}
          </h1>
          <p className="text-ink/60 text-sm mt-1">
            ภาพรวมของร้านคัดลายมือ · ช่วง {range.label}
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white rounded-full px-5 py-2.5 text-sm font-medium shadow-sm"
        >
          <TrendingUp className="w-4 h-4" /> เริ่มเพิ่มสินค้า
        </Link>
      </header>

      <div className="mb-6">
        <DateRangeFilter
          currentPreset={range.preset}
          currentFrom={range.customFrom}
          currentTo={range.customTo}
        />
      </div>

      <section className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </section>

      <section className="mt-10 grid lg:grid-cols-2 gap-4">
        {/* Recent orders */}
        <div className="bg-white rounded-2xl border border-peach-100 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-teal-700 inline-flex items-center gap-1.5">
              <ReceiptText className="w-4 h-4 text-teal-500" /> คำสั่งซื้อล่าสุด
            </h3>
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

        {/* Top items sold in range */}
        <div className="bg-white rounded-2xl border border-peach-100 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-teal-700 inline-flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-peach-500" /> สินค้าขายดี
            </h3>
            <Link
              href="/admin/products"
              className="text-sm text-peach-600 hover:underline inline-flex items-center gap-1"
            >
              ดูทั้งหมด <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="mt-4 divide-y divide-peach-100">
            {topItems.length === 0 ? (
              <div className="py-10 text-center text-ink/40 text-sm">
                ยังไม่มีสินค้าที่ขายในช่วงนี้
              </div>
            ) : (
              topItems.map((it, idx) => (
                <div key={it.productId} className="py-3 flex items-center gap-3">
                  <div className="w-8 text-center text-sm font-semibold text-peach-600 font-[family-name:var(--font-display)] shrink-0">
                    #{idx + 1}
                  </div>
                  <div className="relative w-10 h-10 rounded-lg bg-cream overflow-hidden shrink-0">
                    {it.coverImageKey && (
                      <Image
                        src={thumbUrl(it.coverImageKey)}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate text-teal-800">
                      {it.name}
                    </div>
                    <div className="text-[11px] text-ink/50 uppercase tracking-wider">
                      {it.productType}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-teal-700">
                      {Number(it.qty)} ชิ้น
                    </div>
                    <div className="text-[11px] text-ink/50 tabular-nums">
                      {formatTHB(Number(it.revenue))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

    </div>
  );
}

// ---------- Date range helpers ----------

type ResolvedRange = {
  preset: Preset;
  fromTs: number | null;
  toTs: number | null;
  customFrom: string | null;
  customTo: string | null;
  label: string;
};

function resolveRange(sp: { preset?: string; from?: string; to?: string }): ResolvedRange {
  const now = new Date();

  if (sp.from && sp.to) {
    const fromD = new Date(`${sp.from}T00:00:00`);
    const toD = new Date(`${sp.to}T23:59:59.999`);
    if (!isNaN(fromD.getTime()) && !isNaN(toD.getTime())) {
      return {
        preset: "custom",
        fromTs: fromD.getTime(),
        toTs: toD.getTime() + 1,
        customFrom: sp.from,
        customTo: sp.to,
        label: `${sp.from} → ${sp.to}`,
      };
    }
  }

  const preset = normalizePreset(sp.preset);

  if (preset === "all") {
    return {
      preset,
      fromTs: null,
      toTs: null,
      customFrom: null,
      customTo: null,
      label: "ทั้งหมด",
    };
  }

  if (preset === "today") {
    const start = startOfDay(now);
    return {
      preset,
      fromTs: start.getTime(),
      toTs: start.getTime() + 86_400_000,
      customFrom: null,
      customTo: null,
      label: "วันนี้",
    };
  }

  if (preset === "ytd") {
    const start = new Date(now.getFullYear(), 0, 1).getTime();
    return {
      preset,
      fromTs: start,
      toTs: now.getTime() + 1,
      customFrom: null,
      customTo: null,
      label: "ตั้งแต่ต้นปี",
    };
  }

  const days = preset === "7d" ? 7 : preset === "90d" ? 90 : 30;
  const fromTs = now.getTime() - days * 86_400_000;
  return {
    preset,
    fromTs,
    toTs: now.getTime() + 1,
    customFrom: null,
    customTo: null,
    label: `${days} วันล่าสุด`,
  };
}

function previousRange(r: ResolvedRange): { fromTs: number; toTs: number } | null {
  if (r.fromTs == null || r.toTs == null) return null;
  const span = r.toTs - r.fromTs;
  return { fromTs: r.fromTs - span, toTs: r.fromTs };
}

function normalizePreset(raw: string | undefined): Preset {
  const valid: Preset[] = ["today", "7d", "30d", "90d", "ytd", "all"];
  if (raw && (valid as string[]).includes(raw)) return raw as Preset;
  return "30d";
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function deltaPct(curr: number, prev: number | null): number | null {
  if (prev == null) return null;
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

// ---------- UI bits ----------

type Stat = {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: "peach" | "teal";
  delta?: number | null;
};

function StatCard({ label, value, icon: Icon, accent, delta }: Stat) {
  const ring = accent === "peach" ? "bg-peach-100 text-peach-700" : "bg-teal-100 text-teal-700";
  const hasDelta = delta != null;
  const up = (delta ?? 0) > 0;
  const flat = delta === 0;
  return (
    <div className="bg-white rounded-2xl border border-peach-100 p-5 hover:shadow-sm transition">
      <div className={`w-10 h-10 rounded-xl ${ring} flex items-center justify-center`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="mt-4 text-2xl font-bold text-teal-800 leading-none">{value}</div>
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className="text-sm text-ink/60">{label}</span>
        {hasDelta && !flat && (
          <span
            className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${
              up ? "bg-teal-50 text-teal-700" : "bg-red-50 text-red-600"
            }`}
          >
            {up ? "▲" : "▼"} {Math.abs(delta!)}%
          </span>
        )}
      </div>
    </div>
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
