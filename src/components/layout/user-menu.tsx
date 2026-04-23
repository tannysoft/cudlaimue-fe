"use client";
import Link from "next/link";
import Image from "next/image";
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from "@headlessui/react";
import {
  LayoutDashboard,
  BookOpenCheck,
  ShoppingBag,
  LogOut,
  ChevronDown,
  User as UserIcon,
} from "lucide-react";
import { Fragment } from "react";

export function UserMenu({
  user,
}: {
  user: {
    displayName: string | null;
    email: string | null;
    avatarUrl: string | null;
    role: string;
  };
}) {
  const name = user.displayName ?? "บัญชีของฉัน";
  const initial = (name || "U").trim().charAt(0).toUpperCase();

  return (
    <Menu as="div" className="relative">
      <MenuButton className="group flex items-center justify-center sm:justify-start sm:gap-2 rounded-full w-10 h-10 sm:w-auto sm:h-10 shrink-0 overflow-hidden sm:overflow-visible transition sm:bg-white sm:border sm:border-peach-200 sm:pl-1 sm:pr-3 sm:hover:border-peach-400 sm:hover:bg-peach-50/60">
        <Avatar avatarUrl={user.avatarUrl} initial={initial} />
        <span className="hidden sm:inline text-sm text-ink/80 max-w-32 truncate">{name}</span>
        <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-ink/40 group-data-[open]:rotate-180 transition" />
      </MenuButton>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95 -translate-y-1"
        enterTo="transform opacity-100 scale-100 translate-y-0"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems
          anchor={{ to: "bottom end", gap: 8 }}
          className="w-64 rounded-2xl bg-white border border-peach-100 shadow-xl p-1.5 z-50 focus:outline-none"
        >
          <div className="px-3 py-3 border-b border-peach-100">
            <div className="flex items-center gap-3">
              <Avatar avatarUrl={user.avatarUrl} initial={initial} size="lg" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-ink/90 truncate">{name}</div>
                {user.email && (
                  <div className="text-xs text-ink/50 truncate">{user.email}</div>
                )}
              </div>
            </div>
          </div>

          <div className="py-1">
            {user.role === "admin" && (
              <Item href="/admin" icon={<LayoutDashboard className="w-4 h-4" />}>
                แดชบอร์ดแอดมิน
              </Item>
            )}
            <Item href="/account" icon={<UserIcon className="w-4 h-4" />}>
              บัญชีของฉัน
            </Item>
            <Item href="/account/library" icon={<BookOpenCheck className="w-4 h-4" />}>
              ไฟล์ดาวน์โหลด
            </Item>
            <Item href="/account/orders" icon={<ShoppingBag className="w-4 h-4" />}>
              ประวัติการสั่งซื้อ
            </Item>
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
      </Transition>
    </Menu>
  );
}

function Avatar({
  avatarUrl,
  initial,
  size = "sm",
}: {
  avatarUrl: string | null;
  initial: string;
  size?: "sm" | "lg";
}) {
  const cls =
    size === "sm"
      ? "w-10 h-10 sm:w-8 sm:h-8 text-sm sm:text-xs"
      : "w-10 h-10 text-sm";
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={40}
        height={40}
        className={`block rounded-full object-cover shrink-0 ${
          size === "sm" ? "w-10 h-10 sm:w-8 sm:h-8" : "w-10 h-10"
        }`}
        unoptimized
      />
    );
  }
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-peach-400 to-peach-600 text-white font-semibold leading-none ${cls}`}
    >
      {initial}
    </span>
  );
}

function Item({
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
