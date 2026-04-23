import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { and, count, desc, eq, sql } from "drizzle-orm";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Shield,
  Ban,
  CalendarDays,
  ShoppingBag,
  BookOpenCheck,
  Type,
  BookOpen,
  Truck,
  KeyRound,
} from "lucide-react";
import { db } from "@/lib/db";
import { users, orders, orderItems, entitlements, products } from "@/lib/db/schema";
import { formatTHB, initial } from "@/lib/utils";
import { thaiProvinceName, countryName } from "@/lib/thai-provinces";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userRow = await db().select().from(users).where(eq(users.id, id)).limit(1);
  if (!userRow.length) return notFound();
  const u = userRow[0];

  const [orderRows, entRows, spentRow] = await Promise.all([
    db()
      .select({ o: orders })
      .from(orders)
      .where(eq(orders.userId, id))
      .orderBy(desc(orders.createdAt)),
    db()
      .select({ e: entitlements, p: products })
      .from(entitlements)
      .innerJoin(products, eq(products.id, entitlements.productId))
      .where(eq(entitlements.userId, id))
      .orderBy(desc(entitlements.grantedAt)),
    db()
      .select({ s: sql<number>`coalesce(sum(${orders.totalSatang}), 0)` })
      .from(orders)
      .where(and(eq(orders.userId, id), eq(orders.status, "paid"))),
  ]);

  // Fetch all order items for these orders in one query
  const orderIds = orderRows.map((r) => r.o.id);
  const items = orderIds.length
    ? await db()
        .select({ oi: orderItems, p: products })
        .from(orderItems)
        .leftJoin(products, eq(products.id, orderItems.productId))
        .where(
          sql`${orderItems.orderId} IN (${sql.join(
            orderIds.map((id) => sql`${id}`),
            sql.raw(","),
          )})`,
        )
    : [];
  const itemsByOrder = new Map<string, typeof items>();
  for (const it of items) {
    const list = itemsByOrder.get(it.oi.orderId) ?? [];
    list.push(it);
    itemsByOrder.set(it.oi.orderId, list);
  }

  const paidCount = orderRows.filter((r) => r.o.status === "paid").length;
  const totalSpent = Number(spentRow[0]?.s ?? 0);
  const fontEntitlements = entRows.filter((e) => e.p.type === "font");
  const ebookEntitlements = entRows.filter((e) => e.p.type === "ebook");

  const billing = parseJson<Record<string, string>>(u.billingAddress);
  const shipping = parseJson<Record<string, string>>(u.shippingAddress);

  return (
    <div>
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 text-sm text-ink/60 hover:text-peach-600 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> กลับไปรายการผู้ใช้
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-4 md:gap-6 items-start">
        {/* LEFT — profile card */}
        <aside className="bg-white rounded-2xl border border-peach-100 p-4 sm:p-6 lg:sticky lg:top-6">
          <div className="flex items-center gap-3">
            {u.avatarUrl ? (
              <Image
                src={u.avatarUrl}
                alt=""
                width={56}
                height={56}
                className="rounded-full w-12 h-12 sm:w-14 sm:h-14 shrink-0"
                unoptimized
              />
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-full bg-gradient-to-br from-peach-400 to-peach-600 text-white flex items-center justify-center text-lg sm:text-xl font-semibold leading-none">
                {initial(u.displayName ?? u.email)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-teal-800 truncate">
                {u.displayName ?? "—"}
              </div>
              <div className="text-xs text-ink/50 truncate">{u.email ?? "ไม่มีอีเมล"}</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {u.role === "admin" ? (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-peach-500 text-white rounded-full px-2 py-0.5">
                    <Shield className="w-3 h-3" /> admin
                  </span>
                ) : (
                  <span className="text-[10px] bg-ink/10 text-ink/60 rounded-full px-2 py-0.5">
                    user
                  </span>
                )}
                {u.isBanned && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-700 rounded-full px-2 py-0.5">
                    <Ban className="w-3 h-3" /> ถูกแบน
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm">
            <InfoRow icon={<Mail className="w-4 h-4" />} label="อีเมล" value={u.email ?? "—"} />
            <InfoRow icon={<Phone className="w-4 h-4" />} label="เบอร์" value={u.phone ?? "—"} />
            <InfoRow
              icon={<span className="text-xs font-bold">ID</span>}
              label="User ID"
              value={<span className="font-mono text-xs break-all">{u.id}</span>}
            />
            <InfoRow
              icon={<CalendarDays className="w-4 h-4" />}
              label="สมัครเมื่อ"
              value={new Date(u.createdAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
            />
            <InfoRow
              icon={<CalendarDays className="w-4 h-4" />}
              label="อัปเดตล่าสุด"
              value={new Date(u.updatedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
            />
            <InfoRow
              icon={<span className="text-[#06C755] text-xs font-bold">L</span>}
              label="LINE ID"
              value={
                u.lineUserId ? (
                  <span className="font-mono text-xs break-all">{u.lineUserId}</span>
                ) : (
                  <span className="text-ink/40">—</span>
                )
              }
            />
            <InfoRow
              icon={<span className="text-xs font-bold text-ink/40">WC</span>}
              label="WP Customer ID"
              value={
                u.sourceWcId ? (
                  <span className="font-mono text-xs">#{u.sourceWcId}</span>
                ) : (
                  <span className="text-ink/40">—</span>
                )
              }
            />
            <InfoRow
              icon={<KeyRound className="w-3.5 h-3.5" />}
              label="การเข้าสู่ระบบ"
              value={
                <div className="flex flex-wrap gap-1">
                  {u.passwordHash && (
                    <span className="text-[10px] bg-ink/10 text-ink/70 rounded-full px-2 py-0.5">
                      email + password
                    </span>
                  )}
                  {u.lineUserId && (
                    <span className="text-[10px] bg-[#06C755]/10 text-[#06C755] rounded-full px-2 py-0.5 font-medium">
                      LINE
                    </span>
                  )}
                  {!u.passwordHash && !u.lineUserId && (
                    <span className="text-[10px] text-ink/40">—</span>
                  )}
                </div>
              }
            />
          </div>

          {billing && (
            <div className="mt-5 pt-5 border-t border-peach-100">
              <div className="flex items-center gap-2 text-xs font-medium text-ink/60 mb-2">
                <MapPin className="w-3.5 h-3.5" /> ที่อยู่จัดส่งใบเสร็จ (billing)
              </div>
              <div className="text-sm text-ink/80 leading-relaxed">
                {(billing.first_name || billing.last_name) && (
                  <div className="font-medium">
                    {billing.first_name} {billing.last_name}
                    {billing.company && <span className="text-ink/50"> · {billing.company}</span>}
                  </div>
                )}
                {formatAddress(billing)}
              </div>
            </div>
          )}
          {shipping && JSON.stringify(shipping) !== JSON.stringify(billing) && (
            <div className="mt-5 pt-5 border-t border-peach-100">
              <div className="flex items-center gap-2 text-xs font-medium text-ink/60 mb-2">
                <Truck className="w-3.5 h-3.5" /> ที่อยู่จัดส่ง (shipping)
              </div>
              <div className="text-sm text-ink/80 leading-relaxed">
                {(shipping.first_name || shipping.last_name) && (
                  <div className="font-medium">
                    {shipping.first_name} {shipping.last_name}
                  </div>
                )}
                {formatAddress(shipping)}
              </div>
            </div>
          )}

          <div className="mt-5 pt-5 border-t border-peach-100 grid grid-cols-2 gap-3">
            <Stat label="คำสั่งซื้อ" value={orderRows.length} sub={`จ่ายแล้ว ${paidCount}`} />
            <Stat label="ใช้จ่ายรวม" value={formatTHB(totalSpent)} />
          </div>
        </aside>

        {/* RIGHT — entitlements + orders */}
        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-peach-100 overflow-hidden">
            <header className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-peach-100 flex items-center gap-2">
              <BookOpenCheck className="w-4 h-4 text-peach-500" />
              <h2 className="font-semibold text-teal-700">
                ไฟล์ดาวน์โหลด ({entRows.length})
              </h2>
            </header>
            {entRows.length === 0 ? (
              <div className="py-10 text-center text-ink/40 text-sm">
                ยังไม่มีไฟล์ดาวน์โหลด
              </div>
            ) : (
              <div className="divide-y divide-peach-100">
                {fontEntitlements.length > 0 && (
                  <EntitlementGroup
                    icon={<Type className="w-4 h-4 text-peach-500" />}
                    title={`ฟอนต์ · ${fontEntitlements.length} รายการ`}
                    rows={fontEntitlements}
                  />
                )}
                {ebookEntitlements.length > 0 && (
                  <EntitlementGroup
                    icon={<BookOpen className="w-4 h-4 text-teal-500" />}
                    title={`อีบุ๊ก · ${ebookEntitlements.length} รายการ`}
                    rows={ebookEntitlements}
                  />
                )}
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-peach-100 overflow-hidden">
            <header className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-peach-100 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-teal-600" />
              <h2 className="font-semibold text-teal-700">
                ประวัติการสั่งซื้อ ({orderRows.length})
              </h2>
            </header>
            {orderRows.length === 0 ? (
              <div className="py-10 text-center text-ink/40 text-sm">
                ผู้ใช้นี้ยังไม่เคยสั่งซื้อ
              </div>
            ) : (
              <ul className="divide-y divide-peach-100">
                {orderRows.map(({ o }) => {
                  const its = itemsByOrder.get(o.id) ?? [];
                  return (
                    <li key={o.id} className="px-4 sm:px-5 py-3.5 sm:py-4">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <div className="font-mono text-xs text-ink/60">
                          #{o.id.slice(-10)}
                        </div>
                        <OrderStatusPill status={o.status} />
                        <div className="text-xs text-ink/50">
                          {new Date(o.createdAt).toLocaleString("th-TH", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </div>
                        <div className="ml-auto text-sm font-semibold text-teal-700 whitespace-nowrap">
                          {formatTHB(o.totalSatang)}
                        </div>
                      </div>
                      {its.length > 0 && (
                        <ul className="mt-2 text-sm text-ink/70 space-y-1.5">
                          {its.map(({ oi, p }) => (
                            <li
                              key={oi.id}
                              className="flex items-start gap-2"
                            >
                              <span className="text-ink/30 leading-6">•</span>
                              <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
                                {p ? (
                                  <Link
                                    href={`/admin/products/${p.id}`}
                                    className="hover:text-peach-600 break-words"
                                  >
                                    {oi.productNameSnapshot}
                                  </Link>
                                ) : (
                                  <span className="break-words">
                                    {oi.productNameSnapshot}
                                  </span>
                                )}
                                <span
                                  className={`text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 whitespace-nowrap ${
                                    oi.productType === "font"
                                      ? "bg-peach-100 text-peach-700"
                                      : "bg-teal-100 text-teal-700"
                                  }`}
                                >
                                  {oi.productType}
                                </span>
                              </div>
                              <span className="text-xs text-ink/50 whitespace-nowrap leading-6">
                                {formatTHB(oi.priceSatang)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-5 h-5 rounded-md bg-peach-50 text-peach-600 flex items-center justify-center shrink-0 mt-0.5 [&>svg]:w-3 [&>svg]:h-3 [&>span]:text-[9px]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-ink/40 uppercase tracking-wider">{label}</div>
        <div className="text-sm text-ink/80 break-words">{value}</div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div>
      <div className="text-[11px] text-ink/40 uppercase tracking-wider">{label}</div>
      <div className="text-lg font-bold text-teal-800 leading-none mt-1">{value}</div>
      {sub && <div className="text-[11px] text-ink/50 mt-0.5">{sub}</div>}
    </div>
  );
}

function OrderStatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-teal-500 text-white",
    pending: "bg-peach-200 text-peach-800",
    failed: "bg-red-100 text-red-700",
    cancelled: "bg-ink/10 text-ink/60",
    refunded: "bg-ink/20 text-ink/70",
  };
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
        map[status] ?? "bg-ink/10 text-ink/60"
      }`}
    >
      {status}
    </span>
  );
}

function EntitlementGroup({
  icon,
  title,
  rows,
}: {
  icon: React.ReactNode;
  title: string;
  rows: Array<{
    e: typeof entitlements.$inferSelect;
    p: typeof products.$inferSelect;
  }>;
}) {
  return (
    <div>
      <div className="px-4 sm:px-5 py-2.5 bg-[#fcf8f1] text-xs font-medium text-ink/60 flex items-center gap-2">
        {icon}
        {title}
      </div>
      <ul className="divide-y divide-peach-50">
        {rows.map(({ e, p }) => (
          <li key={e.id} className="px-4 sm:px-5 py-3 flex items-center gap-3 hover:bg-peach-50/40 transition">
            <div className="relative w-10 h-10 rounded-lg bg-cream overflow-hidden shrink-0">
              {p.coverImageKey && (
                <Image src={`/api/assets/${p.coverImageKey}`} alt="" fill className="object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <Link
                href={`/admin/products/${p.id}`}
                className="font-medium text-teal-800 hover:text-peach-600 truncate block"
              >
                {p.name}
              </Link>
              <div className="text-[11px] text-ink/50 truncate">
                ได้รับเมื่อ {new Date(e.grantedAt).toLocaleDateString("th-TH")}
              </div>
            </div>
            <div className="text-sm text-peach-600 font-medium whitespace-nowrap shrink-0">{formatTHB(p.priceSatang)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function formatAddress(a: Record<string, string>): string {
  const parts = [
    a.address_1,
    a.address_2,
    a.city,
    thaiProvinceName(a.state),
    a.postcode,
    countryName(a.country),
  ].filter((x) => x && x.trim());
  return parts.join(", ") || "—";
}
