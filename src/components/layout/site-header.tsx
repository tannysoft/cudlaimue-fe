"use client";
import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { Download, Menu as MenuIcon, X } from "lucide-react";
import type { User } from "@/lib/db/schema";
import { CartButton } from "./cart-button";
import { UserMenu } from "./user-menu";

const NAV_LINKS: { href: string; label: string; external?: boolean }[] = [
  { href: "/fonts", label: "ฟอนต์" },
  { href: "/templates", label: "เทมเพลต" },
  { href: "/ebooks", label: "อีบุ๊ก" },
  { href: "/articles", label: "บทความ" },
  { href: "/category/howto-install-font", label: "วิธีติดตั้ง" },
  {
    href: "https://line.me/R/ti/p/@595tsawy",
    label: "ติดต่อสอบถาม",
    external: true,
  },
];

export function SiteHeader({
  user,
  hasLibrary = false,
}: {
  user: User | null;
  hasLibrary?: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-300 ${
        scrolled
          ? "bg-cream/90 backdrop-blur border-b border-peach-100"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center gap-2 md:gap-6">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="md:hidden -ml-2 inline-flex items-center justify-center w-10 h-10 rounded-full text-ink/70 hover:bg-peach-50 hover:text-peach-600 transition"
          aria-label="เปิดเมนู"
        >
          <MenuIcon className="w-5 h-5" />
        </button>

        <Link href="/" className="flex items-center gap-2 min-w-0">
          <Image
            src="/brand/logo.png"
            alt="คัดลายมือ"
            width={40}
            height={40}
            className="rounded-full shrink-0"
            priority
          />
          <span className="font-[family-name:var(--font-display)] text-xl text-peach-600 font-bold truncate">
            คัดลายมือ
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-4 text-sm text-ink/80">
          {NAV_LINKS.map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-peach-600"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-peach-600"
              >
                {link.label}
              </Link>
            )
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <CartButton />
          {hasLibrary && (
            <Link
              href="/account/library"
              className="inline-flex items-center justify-center md:justify-start md:gap-1.5 rounded-full bg-teal-500 hover:bg-teal-600 text-white w-10 md:w-auto md:px-4 h-10 text-sm font-medium shadow-sm transition"
              title="ไฟล์ดาวน์โหลดของฉัน"
            >
              <Download className="w-5 h-5 md:w-4 md:h-4" />
              <span className="hidden md:inline">ไฟล์ของฉัน</span>
            </Link>
          )}
          {user ? (
            <UserMenu
              user={{
                displayName: user.displayName,
                email: user.email,
                avatarUrl: user.avatarUrl,
                role: user.role,
              }}
            />
          ) : (
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 rounded-full px-3 sm:px-4 h-10 bg-peach-500 text-white text-sm hover:bg-peach-600"
            >
              เข้าสู่ระบบ
            </Link>
          )}
        </div>
      </div>

      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
    </header>
  );
}

function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50 md:hidden">
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
            <DialogPanel className="relative w-[82%] max-w-xs bg-cream shadow-xl flex flex-col">
              <div className="h-16 px-4 flex items-center justify-between border-b border-peach-100">
                <Link
                  href="/"
                  onClick={onClose}
                  className="flex items-center gap-2"
                >
                  <Image
                    src="/brand/logo.png"
                    alt="คัดลายมือ"
                    width={36}
                    height={36}
                    className="rounded-full"
                  />
                  <span className="font-[family-name:var(--font-display)] text-lg text-peach-600 font-bold">
                    คัดลายมือ
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full text-ink/60 hover:bg-peach-50 hover:text-peach-600 transition"
                  aria-label="ปิดเมนู"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto p-3">
                <ul className="flex flex-col gap-0.5">
                  {NAV_LINKS.map((link) => (
                    <li key={link.href}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={onClose}
                          className="block rounded-xl px-3 py-3 text-base text-ink/80 hover:bg-peach-50 hover:text-peach-600 transition"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          onClick={onClose}
                          className="block rounded-xl px-3 py-3 text-base text-ink/80 hover:bg-peach-50 hover:text-peach-600 transition"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>

            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
