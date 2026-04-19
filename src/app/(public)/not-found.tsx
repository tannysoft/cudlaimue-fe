import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <Image src="/brand/logo.png" alt="คัดลายมือ" width={96} height={96} className="rounded-full" />
      <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl text-teal-600">
        ไม่พบหน้าที่ค้นหา
      </h1>
      <p className="mt-2 text-ink/60">ลิงก์อาจถูกย้ายหรือหมดอายุไปแล้ว</p>
      <Link href="/" className="mt-6 rounded-full bg-peach-500 hover:bg-peach-600 text-white px-5 py-2">
        กลับหน้าแรก
      </Link>
    </div>
  );
}
