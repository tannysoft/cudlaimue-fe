import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Download, Receipt } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";

export const metadata = { title: "บัญชีของฉัน" };

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login?next=/account");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center gap-3 sm:gap-4">
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt=""
            width={64}
            height={64}
            className="rounded-full shrink-0 w-12 h-12 sm:w-16 sm:h-16 object-cover"
            unoptimized
          />
        ) : (
          <div className="shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-peach-200 flex items-center justify-center text-peach-700 text-xl sm:text-2xl">
            {(user.displayName ?? "U")[0]}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-[family-name:var(--font-display)] text-lg sm:text-2xl text-teal-600 font-bold truncate">
            สวัสดี {user.displayName ?? "คุณผู้ใช้"}
          </h1>
          <p className="text-xs sm:text-sm text-ink/60 truncate">{user.email ?? "เข้าสู่ระบบด้วย LINE"}</p>
        </div>
        <form action="/api/auth/logout" method="POST" className="ml-auto shrink-0">
          <button className="text-sm text-ink/50 hover:text-red-500 whitespace-nowrap">ออกจากระบบ</button>
        </form>
      </div>

      <div className="mt-8 grid md:grid-cols-2 gap-4">
        <Link
          href="/account/library"
          className="rounded-2xl bg-white border border-peach-100 p-6 hover:shadow-md transition"
        >
          <div className="w-12 h-12 rounded-xl bg-peach-100 text-peach-600 flex items-center justify-center">
            <Download className="w-6 h-6" />
          </div>
          <h3 className="font-[family-name:var(--font-display)] text-xl text-teal-600 mt-3">ไฟล์ดาวน์โหลด</h3>
          <p className="text-sm text-ink/60 mt-1">ดาวน์โหลดฟอนต์ และอ่านอีบุ๊กที่สั่งซื้อ</p>
        </Link>
        <Link
          href="/account/orders"
          className="rounded-2xl bg-white border border-peach-100 p-6 hover:shadow-md transition"
        >
          <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
          <h3 className="font-[family-name:var(--font-display)] text-xl text-teal-600 mt-3">ประวัติการสั่งซื้อ</h3>
          <p className="text-sm text-ink/60 mt-1">รายการใบเสร็จและสถานะทั้งหมด</p>
        </Link>
      </div>
    </div>
  );
}
