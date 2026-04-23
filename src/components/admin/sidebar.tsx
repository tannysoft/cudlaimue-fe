"use client";
import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Dialog,
  DialogPanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
  TransitionChild,
} from "@headlessui/react";
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
  Menu as MenuIcon,
  X,
  Home,
  User as UserIcon,
  BookOpenCheck,
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
        <UserFooter user={user} />
      </div>
    </aside>
  );
}

export function AdminMobileBar({
  user,
}: {
  user: { displayName: string; email: string; avatarUrl: string | null };
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-peach-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        <div className="h-14 px-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="เปิดเมนู"
            className="-ml-1 inline-flex items-center justify-center w-10 h-10 rounded-full text-ink/70 hover:bg-peach-50 hover:text-peach-600 transition"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
          <Link href="/admin" className="flex items-center gap-2 min-w-0">
            <Image
              src="/brand/logo.png"
              alt=""
              width={32}
              height={32}
              className="rounded-full shrink-0"
            />
            <div className="min-w-0">
              <div className="font-[family-name:var(--font-display)] text-base text-teal-700 leading-none truncate">
                คัดลายมือ
              </div>
              <div className="text-[9px] uppercase tracking-[0.18em] text-peach-600 mt-0.5">
                Admin console
              </div>
            </div>
          </Link>
          <div className="ml-auto">
            <ProfileMenu user={user} />
          </div>
        </div>
      </div>

      <Transition show={open} as={Fragment}>
        <Dialog onClose={() => setOpen(false)} className="relative z-50 lg:hidden">
          <TransitionChild
            as={Fragment}
            enter="transition-opacity ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" />
          </TransitionChild>

          <div className="fixed inset-0 flex">
            <TransitionChild
              as={Fragment}
              enter="transition ease-out duration-250"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in duration-200"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <DialogPanel className="relative w-[82%] max-w-xs bg-white shadow-xl flex flex-col">
                <div className="h-14 px-4 flex items-center justify-between border-b border-peach-100">
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 min-w-0"
                  >
                    <Image
                      src="/brand/logo.png"
                      alt=""
                      width={32}
                      height={32}
                      className="rounded-full shrink-0"
                    />
                    <div>
                      <div className="font-[family-name:var(--font-display)] text-base text-teal-700 leading-none">
                        คัดลายมือ
                      </div>
                      <div className="text-[9px] uppercase tracking-[0.18em] text-peach-600 mt-0.5">
                        Admin console
                      </div>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="ปิดเมนู"
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full text-ink/60 hover:bg-peach-50 hover:text-peach-600 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="px-3 py-4 flex-1 overflow-y-auto">
                  <Link
                    href="/admin/products/new"
                    onClick={() => setOpen(false)}
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
                        : pathname === item.href ||
                          pathname.startsWith(item.href + "/");
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                            active
                              ? "bg-peach-100 text-peach-700 font-medium"
                              : "text-ink/70 hover:bg-peach-50 hover:text-ink"
                          }`}
                        >
                          <item.icon
                            className={`w-4 h-4 ${
                              active
                                ? "text-peach-600"
                                : "text-ink/40 group-hover:text-peach-500"
                            }`}
                          />
                          {item.label}
                        </Link>
                      );
                    })}
                  </nav>
                </div>

                <div className="border-t border-peach-100 p-4">
                  <UserFooter user={user} />
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}

function ProfileMenu({
  user,
}: {
  user: { displayName: string; email: string; avatarUrl: string | null };
}) {
  const name = user.displayName || "Admin";
  return (
    <Menu as="div" className="relative">
      <MenuButton className="inline-flex items-center justify-center rounded-full w-8 h-8 transition focus:outline-none focus:ring-2 focus:ring-peach-400/60">
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt=""
            width={32}
            height={32}
            className="rounded-full w-8 h-8"
            unoptimized
          />
        ) : (
          <span className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center text-sm font-semibold leading-none">
            {initial(name)}
          </span>
        )}
      </MenuButton>

      <MenuItems
        anchor={{ to: "bottom end", gap: 8 }}
        className="w-60 rounded-2xl bg-white border border-peach-100 shadow-xl p-1.5 z-50 focus:outline-none"
      >
        <div className="px-3 py-3 border-b border-peach-100">
          <div className="text-sm font-medium text-ink/90 truncate">{name}</div>
          {user.email && (
            <div className="text-xs text-ink/50 truncate">{user.email}</div>
          )}
        </div>

        <div className="py-1">
          <ProfileItem href="/" icon={<Home className="w-4 h-4" />}>
            หน้าเว็บ
          </ProfileItem>
          <ProfileItem href="/account" icon={<UserIcon className="w-4 h-4" />}>
            บัญชีของฉัน
          </ProfileItem>
          <ProfileItem
            href="/account/library"
            icon={<BookOpenCheck className="w-4 h-4" />}
          >
            ไฟล์ดาวน์โหลด
          </ProfileItem>
          <ProfileItem
            href="/account/orders"
            icon={<ShoppingBag className="w-4 h-4" />}
          >
            ประวัติการสั่งซื้อ
          </ProfileItem>
        </div>

        <div className="border-t border-peach-100 pt-1">
          <MenuItem>
            {({ focus }) => (
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
                    focus ? "bg-red-50 text-red-600" : "text-ink/70"
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                  ออกจากระบบ
                </button>
              </form>
            )}
          </MenuItem>
        </div>
      </MenuItems>
    </Menu>
  );
}

function ProfileItem({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <MenuItem>
      {({ focus }) => (
        <Link
          href={href}
          className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
            focus ? "bg-peach-50 text-peach-700" : "text-ink/80"
          }`}
        >
          <span className={focus ? "text-peach-600" : "text-ink/40"}>{icon}</span>
          {children}
        </Link>
      )}
    </MenuItem>
  );
}

function UserFooter({
  user,
}: {
  user: { displayName: string; email: string; avatarUrl: string | null };
}) {
  return (
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
        <div className="w-9 h-9 rounded-full bg-teal-500 text-white flex items-center justify-center font-semibold leading-none">
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
  );
}
