import Image from "next/image";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; detail?: string }>;
}) {
  const user = await getSessionUser();
  const sp = await searchParams;
  const nextUrl = sp.next ?? "/account";
  if (user) redirect(nextUrl);

  const lineHref = `/api/auth/line/start?next=${encodeURIComponent(nextUrl)}`;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-sm border border-peach-100 p-8">
        <div className="flex flex-col items-center">
          <Image
            src="/brand/logo.png"
            alt="คัดลายมือ"
            width={96}
            height={96}
            className="rounded-full shadow"
            priority
          />
          <h1 className="mt-4 text-2xl font-semibold text-teal-600 font-[family-name:var(--font-display)]">
            เข้าสู่ระบบ
          </h1>
          <p className="mt-2 text-sm text-ink/70 text-center">
            เข้าสู่ระบบด้วย LINE เพื่อซื้อฟอนต์ อ่านอีบุ๊ก และเข้าไฟล์ดาวน์โหลดของคุณ
          </p>
        </div>

        <a
          href={lineHref}
          className="mt-8 w-full inline-flex justify-center items-center gap-2 rounded-xl bg-[#06C755] text-white font-medium py-3 hover:bg-[#05b04c] transition"
        >
          <svg viewBox="0 0 48 48" className="w-6 h-6" aria-hidden>
            <path fill="#fff" d="M24 4C12.95 4 4 11.63 4 21.06c0 8.45 7.19 15.54 16.91 16.88.66.14 1.56.43 1.79.99.2.51.13 1.3.07 1.82l-.29 1.75c-.09.51-.42 2 1.75 1.09 2.17-.91 11.69-6.88 15.94-11.78C42.94 28.38 44 24.83 44 21.06 44 11.63 35.05 4 24 4z"/>
            <path fill="#06C755" d="M35.72 24h-3.07v-5.15c0-.37-.3-.67-.67-.67h-.77c-.37 0-.67.3-.67.67v6.67c0 .37.3.67.67.67h4.51c.37 0 .67-.3.67-.67v-.85c0-.37-.3-.67-.67-.67zm-11.5-5.82h-.77c-.37 0-.67.3-.67.67v6.66c0 .37.3.67.67.67h.77c.37 0 .67-.3.67-.67v-6.66c0-.37-.3-.67-.67-.67zm7.45 0h-.77c-.37 0-.67.3-.67.67v3.95l-3.05-4.31a.67.67 0 0 0-.55-.31h-.77c-.37 0-.67.3-.67.67v6.66c0 .37.3.67.67.67h.77c.37 0 .67-.3.67-.67v-3.95l3.06 4.32c.12.17.32.3.54.3h.77c.37 0 .67-.3.67-.67v-6.66c0-.37-.3-.67-.67-.67zm-12.53 0h-4.51c-.37 0-.67.3-.67.67v6.67c0 .37.3.67.67.67h4.51c.37 0 .67-.3.67-.67v-.85c0-.37-.3-.67-.67-.67h-3.07v-.98h3.07c.37 0 .67-.3.67-.67v-.86c0-.37-.3-.67-.67-.67h-3.07v-.99h3.07c.37 0 .67-.3.67-.67v-.85c0-.38-.3-.7-.67-.7z"/>
          </svg>
          <span>เข้าสู่ระบบด้วย LINE</span>
        </a>

        {sp.error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">
            <div>ไม่สามารถเข้าสู่ระบบได้ โปรดลองใหม่อีกครั้ง</div>
            <div className="mt-1 text-[11px] font-mono text-red-700/70 break-all">
              {sp.error}
              {sp.detail ? ` — ${sp.detail}` : ""}
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-ink/40">
          การเข้าสู่ระบบถือว่าคุณยอมรับ{" "}
          <a href="/legal/terms" className="text-peach-600 hover:underline">เงื่อนไขการใช้งาน</a>{" "}
          และ{" "}
          <a href="/privacy" className="text-peach-600 hover:underline">นโยบายความเป็นส่วนตัว</a>
        </p>
      </div>
    </div>
  );
}
