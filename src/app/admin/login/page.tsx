import Image from "next/image";
import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";

export const metadata = { title: "Admin Login" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const u = await getSessionUser();
  if (u?.role === "admin") redirect("/admin");
  const sp = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f6efe5] via-cream to-peach-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-16 h-16">
            <Image src="/brand/logo.png" alt="" fill className="rounded-full object-cover shadow-md" />
          </div>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl text-teal-700 font-bold">
            Admin Console
          </h1>
          <p className="text-xs text-ink/50 mt-1">คัดลายมือ — เข้าสู่ระบบผู้ดูแล</p>
        </div>

        <div className="bg-white rounded-2xl border border-peach-100 p-6 shadow-sm">
          <form action="/api/auth/email/login" method="POST" className="space-y-4">
            <input type="hidden" name="next" value="/admin" />
            <input type="hidden" name="from" value="/admin/login" />
            <label className="block">
              <span className="text-xs font-medium text-ink/70">Email</span>
              <input
                required
                type="email"
                name="email"
                autoComplete="email"
                className="mt-1.5 w-full rounded-xl border border-peach-200 bg-cream/40 px-3 py-2.5 text-sm outline-none focus:border-peach-500 focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink/70">Password</span>
              <input
                required
                type="password"
                name="password"
                autoComplete="current-password"
                className="mt-1.5 w-full rounded-xl border border-peach-200 bg-cream/40 px-3 py-2.5 text-sm outline-none focus:border-peach-500 focus:bg-white"
              />
            </label>
            {sp.error && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">
                {sp.error === "invalid_credentials"
                  ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
                  : "ไม่สามารถเข้าสู่ระบบได้ โปรดลองใหม่อีกครั้ง"}
              </div>
            )}
            <button className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-peach-500 hover:bg-peach-600 text-white py-2.5 font-medium text-sm transition shadow-sm">
              <Lock className="w-4 h-4" /> เข้าสู่ระบบ
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-[11px] text-ink/40">
          หากคุณเป็นผู้ใช้ทั่วไป กรุณาเข้าสู่ระบบที่{" "}
          <a href="/auth/login" className="text-peach-600 hover:underline">
            หน้าหลัก
          </a>
        </p>
      </div>
    </div>
  );
}
