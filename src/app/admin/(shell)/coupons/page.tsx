import Link from "next/link";
import { desc } from "drizzle-orm";
import { Plus, Ticket, Pencil } from "lucide-react";
import { db } from "@/lib/db";
import { coupons } from "@/lib/db/schema";
import { formatTHB } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "คูปองส่วนลด" };

export default async function AdminCouponsPage() {
  const list = await db().select().from(coupons).orderBy(desc(coupons.createdAt));

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-800 font-bold">
            คูปองส่วนลด
          </h1>
          <p className="text-ink/60 text-sm mt-1">
            ทั้งหมด {list.length} โค้ด · ลูกค้ากรอกตอน checkout เพื่อรับส่วนลด
          </p>
        </div>
        <Link
          href="/admin/coupons/new"
          className="inline-flex items-center gap-2 bg-peach-500 hover:bg-peach-600 text-white rounded-full px-5 py-2.5 text-sm font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" /> เพิ่มคูปอง
        </Link>
      </header>

      <div className="bg-white rounded-2xl border border-peach-100 overflow-hidden">
        {list.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-peach-100 text-peach-600 flex items-center justify-center mx-auto">
              <Ticket className="w-6 h-6" />
            </div>
            <div className="mt-4 font-medium text-ink/70">ยังไม่มีคูปอง</div>
            <p className="text-sm text-ink/50 mt-1">สร้างโค้ดส่วนลดแรกของร้าน</p>
            <Link
              href="/admin/coupons/new"
              className="mt-4 inline-flex items-center gap-1.5 bg-peach-500 hover:bg-peach-600 text-white rounded-full px-4 py-2 text-sm"
            >
              <Plus className="w-4 h-4" /> เพิ่มคูปอง
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-ink/50 border-b border-peach-100 bg-[#fcf8f1]">
                <th className="text-left px-5 py-3 font-medium">โค้ด</th>
                <th className="text-left px-4 py-3 font-medium">ส่วนลด</th>
                <th className="text-left px-4 py-3 font-medium">ขั้นต่ำ</th>
                <th className="text-left px-4 py-3 font-medium">การใช้งาน</th>
                <th className="text-left px-4 py-3 font-medium">หมดอายุ</th>
                <th className="text-left px-4 py-3 font-medium">สถานะ</th>
                <th className="w-20 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-peach-100 last:border-0 hover:bg-peach-50/60 transition"
                >
                  <td className="px-5 py-3 font-mono font-semibold text-teal-800">
                    {c.code}
                  </td>
                  <td className="px-4 py-3 font-medium text-peach-700">
                    {c.type === "percent" ? `${c.value}%` : formatTHB(c.value)}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink/60">
                    {c.minSubtotalSatang
                      ? formatTHB(c.minSubtotalSatang)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink/60">
                    {c.usedCount}
                    {c.maxUses != null ? ` / ${c.maxUses}` : ""}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink/60 whitespace-nowrap">
                    {c.expiresAt
                      ? new Date(c.expiresAt).toLocaleDateString("th-TH")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c.isActive ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-teal-100 text-teal-700 rounded-full px-2 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />{" "}
                        เปิด
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs bg-ink/10 text-ink/60 rounded-full px-2 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-ink/30" />{" "}
                        ปิด
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/coupons/${c.id}`}
                      className="inline-flex items-center gap-1 text-ink/60 hover:text-peach-600 text-sm"
                    >
                      <Pencil className="w-3.5 h-3.5" /> แก้ไข
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
