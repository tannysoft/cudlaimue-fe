import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-10 md:mt-20 bg-teal-500 text-white/90">
      <div className="mx-auto max-w-6xl px-4 py-10 grid gap-8 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <Image src="/brand/logo.png" alt="คัดลายมือ" width={48} height={48} className="rounded-full" />
            <span className="font-[family-name:var(--font-display)] text-xl">คัดลายมือ</span>
          </div>
          <p className="mt-3 text-sm text-white/80 leading-relaxed">
            ฟอนต์ลายมือน่ารัก ดิจิทัลอีบุ๊ก และเทมเพลตสำหรับเขียนบันทึก
            — ใช้ได้ทั้งส่วนตัวและเชิงพาณิชย์
          </p>
        </div>

        <div className="text-sm">
          <h4 className="font-semibold mb-3">ร้านค้า</h4>
          <ul className="space-y-1.5 text-white/80">
            <li><Link href="/fonts" className="hover:text-white">ฟอนต์ทั้งหมด</Link></li>
            <li><Link href="/templates" className="hover:text-white">เทมเพลต</Link></li>
            <li><Link href="/ebooks" className="hover:text-white">อีบุ๊ก</Link></li>
            <li><Link href="/articles" className="hover:text-white">บทความ</Link></li>
            <li><Link href="/account" className="hover:text-white">บัญชีของฉัน</Link></li>
          </ul>
        </div>

        <div className="text-sm">
          <h4 className="font-semibold mb-3">ติดต่อ</h4>
          <ul className="space-y-1.5 text-white/80">
            <li>
              Email:{" "}
              <a
                href="mailto:cudlaimue@gmail.com"
                className="hover:text-white underline decoration-white/30 hover:decoration-white underline-offset-2"
              >
                cudlaimue@gmail.com
              </a>
            </li>
            <li>
              LINE:{" "}
              <a
                href="https://line.me/R/ti/p/@595tsawy"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white underline decoration-white/30 hover:decoration-white underline-offset-2"
              >
                @cudlaimue
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-white/60 flex flex-wrap items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} คัดลายมือ. All rights reserved.</span>
          <div className="flex flex-wrap gap-x-4 gap-y-1 justify-end">
            <Link href="/license-agreement" className="hover:text-white">เงื่อนไขการใช้งานฟอนต์</Link>
            <Link href="/refund-policy" className="hover:text-white">นโยบายการคืนเงิน</Link>
            <Link href="/privacy" className="hover:text-white">นโยบายความเป็นส่วนตัว</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
