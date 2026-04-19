"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { initial } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  FileText,
  LogOut,
  Plus,
  Download,
  Settings,
  Ticket,
} from "lucide-react";

const nav = [
  { href: "/admin", label: "แดชบอร์ด", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "สินค้า", icon: Package },
  { href: "/admin/orders", label: "คำสั่งซื้อ", icon: ShoppingBag },
  { href: "/admin/coupons", label: "คูปองส่วนลด", icon: Ticket },
  { href: "/admin/users", label: "ผู้ใช้", icon: Users },
  { href: "/admin/articles", label: "บทความ", icon: FileText },
  { href: "/admin/import", label: "นำเข้าจาก WP", icon: Download },
  { href: "/admin/settings", label: "ตั้งค่า", icon: Settings },
];

export function AdminSidebar({
  user,
}: {
  user: { displayName: string; email: string; avatarUrl: string | null };
}) {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 sticky top-0 h-screen border-r border-peach-100 bg-white">
      <div className="px-5 py-5 border-b border-peach-100">
        <Link href="/admin" className="flex items-center gap-2.5">
          <Image
            src="/brand/logo.png"
            alt=""
            width={36}
            height={36}
            className="rounded-full"
          />
          <div>
            <div className="font-[family-name:var(--font-display)] text-lg text-teal-700 leading-none">
              คัดลายมือ
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-peach-600 mt-1">
              Admin console
            </div>
          </div>
        </Link>
      </div>

      <div className="px-3 py-4 flex-1 overflow-y-auto">
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 bg-peach-500 hover:bg-peach-600 text-white rounded-xl px-3 py-2.5 text-sm font-medium transition mb-4 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          เพิ่มสินค้าใหม่
        </Link>

        <div className="text-[10px] uppercase tracking-[0.18em] text-ink/40 px-3 mb-2">
          จัดการ
        </div>
        <nav className="flex flex-col gap-0.5">
          {nav.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-peach-100 text-peach-700 font-medium"
                    : "text-ink/70 hover:bg-peach-50 hover:text-ink"
                }`}
              >
                <item.icon
                  className={`w-4 h-4 ${active ? "text-peach-600" : "text-ink/40 group-hover:text-peach-500"}`}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-peach-100 p-4">
        <div className="flex items-center gap-3">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt=""
              width={36}
              height={36}
              className="rounded-full"
              unoptimized
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-teal-500 text-white flex items-center justify-center font-semibold">
              {initial(user.displayName)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{user.displayName}</div>
            <div className="text-xs text-ink/50 truncate">{user.email}</div>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              aria-label="ออกจากระบบ"
              className="p-1.5 rounded-lg text-ink/50 hover:text-red-500 hover:bg-red-50 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
