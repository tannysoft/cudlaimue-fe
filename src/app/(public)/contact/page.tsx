import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import { Mail, MessageCircle, Clock, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "ติดต่อสอบถาม",
  description:
    "มีคำถามเกี่ยวกับฟอนต์ อีบุ๊ก หรือเทมเพลตของคัดลายมือ? ทักเราผ่าน LINE หรืออีเมลได้เลย สแกน QR ด้านล่างเพื่อเข้า LINE Official Account @cudlaimue",
  alternates: { canonical: "/contact" },
};

const LINE_OA_URL = "https://line.me/R/ti/p/@595tsawy";
const LINE_HANDLE = "@cudlaimue";
const EMAIL = "cudlaimue@gmail.com";

/**
 * QR is generated as an inline SVG on the server. Rendering cost is a few ms
 * per request and the markup compresses well, so we skip caching to keep the
 * code simple. If the page ever becomes a hot path we can hoist this into a
 * module-level `cache()` call.
 */
async function lineQrSvg(): Promise<string> {
  return QRCode.toString(LINE_OA_URL, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: {
      dark: "#0e5a5a", // teal-700 — matches brand
      light: "#ffffff",
    },
  });
}

export default async function ContactPage() {
  const qrSvg = await lineQrSvg();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:py-16">
      <header className="text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-peach-600 font-semibold">
          Contact
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl md:text-5xl text-teal-700 font-extrabold leading-tight">
          ติดต่อสอบถาม
        </h1>
        <p className="mt-4 text-ink/70 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
          มีคำถามเกี่ยวกับฟอนต์ อีบุ๊ก เทมเพลต หรือการสั่งซื้อ?
          ทักเราผ่าน LINE ได้สะดวกที่สุด ตอบเร็วในเวลาทำการ
        </p>
      </header>

      <div className="mt-10 grid gap-6 md:grid-cols-2 items-stretch">
        <div className="bg-white border border-peach-100 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col items-center justify-center">
          <div
            className="w-full max-w-[260px] aspect-square [&>svg]:w-full [&>svg]:h-full"
            aria-label={`LINE QR code สำหรับเพิ่มเพื่อน ${LINE_HANDLE}`}
            role="img"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <p className="mt-4 text-center text-sm text-ink/60">
            สแกนด้วยแอป LINE เพื่อเพิ่มเพื่อน
          </p>
          <p className="text-center text-xs text-ink/40 mt-1">{LINE_HANDLE}</p>
        </div>

        <div className="space-y-4">
          <a
            href={LINE_OA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-4 rounded-2xl bg-[#06C755]/10 hover:bg-[#06C755]/15 border border-[#06C755]/20 p-5 transition"
          >
            <div className="w-11 h-11 rounded-xl bg-[#06C755] text-white flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-ink/90">LINE Official</h3>
                <ExternalLink className="w-3.5 h-3.5 text-ink/40 group-hover:text-[#06C755] transition" />
              </div>
              <p className="text-sm text-ink/60 mt-0.5">
                ช่องทางหลัก — ถามตอบเร็วที่สุด แนะนำฟอนต์/ติดตามสถานะคำสั่งซื้อ
              </p>
              <p className="text-sm font-mono text-[#06C755] mt-1.5">
                {LINE_HANDLE}
              </p>
            </div>
          </a>

          <a
            href={`mailto:${EMAIL}`}
            className="group flex items-start gap-4 rounded-2xl bg-white border border-peach-100 hover:border-peach-300 hover:bg-peach-50/40 p-5 transition"
          >
            <div className="w-11 h-11 rounded-xl bg-peach-100 text-peach-600 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-ink/90">อีเมล</h3>
              <p className="text-sm text-ink/60 mt-0.5">
                สำหรับงานลิขสิทธิ์ ใบกำกับภาษี หรือติดต่อเชิงธุรกิจ
              </p>
              <p className="text-sm font-mono text-peach-600 mt-1.5 break-all">
                {EMAIL}
              </p>
            </div>
          </a>

          <div className="flex items-start gap-4 rounded-2xl bg-cream/60 border border-peach-100 p-5">
            <div className="w-11 h-11 rounded-xl bg-white text-teal-600 border border-peach-100 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-ink/90">เวลาทำการ</h3>
              <p className="text-sm text-ink/60 mt-0.5 leading-relaxed">
                จันทร์ – ศุกร์ เวลา 9:00 – 18:00 น. นอกเวลาทำการจะตอบกลับภายในวันทำการถัดไป
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center text-sm text-ink/50">
        ก่อนติดต่อสอบถาม ลองดูที่{" "}
        <Link href="/articles" className="text-peach-600 hover:underline">
          บทความช่วยเหลือ
        </Link>{" "}
        ก่อนนะคะ อาจมีคำตอบอยู่แล้ว
      </div>
    </div>
  );
}
