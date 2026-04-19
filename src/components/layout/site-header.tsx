"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Download } from "lucide-react";
import type { User } from "@/lib/db/schema";
import { CartButton } from "./cart-button";
import { UserMenu } from "./user-menu";

export function SiteHeader({
  user,
  hasLibrary = false,
}: {
  user: User | null;
  hasLibrary?: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-300 ${
        scrolled
          ? "bg-cream/90 backdrop-blur border-b border-peach-100"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/brand/logo.png"
            alt="คัดลายมือ"
            width={40}
            height={40}
            className="rounded-full"
            priority
          />
          <span className="font-[family-name:var(--font-display)] text-xl text-peach-600 font-bold hidden sm:inline">
            คัดลายมือ
          </span>
        </Link>

        <nav className="flex items-center gap-4 text-sm text-ink/80">
          <Link href="/fonts" className="hover:text-peach-600">ฟอนต์</Link>
          <Link href="/templates" className="hover:text-peach-600">เทมเพลต</Link>
          <Link href="/ebooks" className="hover:text-peach-600">อีบุ๊ก</Link>
          <Link href="/articles" className="hover:text-peach-600">บทความ</Link>
          <Link
            href="/category/howto-install-font"
            className="hover:text-peach-600"
          >
            วิธีติดตั้ง
          </Link>
          <a
            href="https://line.me/R/ti/p/@595tsawy"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-peach-600"
          >
            ติดต่อสอบถาม
          </a>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <CartButton />
          {hasLibrary && (
            <Link
              href="/account/library"
              className="inline-flex items-center gap-1.5 rounded-full bg-teal-500 hover:bg-teal-600 text-white px-3 sm:px-4 h-10 text-sm font-medium shadow-sm transition"
              title="ไฟล์ดาวน์โหลดของฉัน"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">ไฟล์ของฉัน</span>
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
              className="inline-flex items-center gap-2 rounded-full px-4 h-10 bg-peach-500 text-white text-sm hover:bg-peach-600"
            >
              เข้าสู่ระบบ
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
