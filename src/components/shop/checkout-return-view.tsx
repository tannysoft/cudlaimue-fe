"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, QrCode, Clock, RefreshCcw, AlertTriangle, AlertCircle } from "lucide-react";
import { formatTHB } from "@/lib/utils";

/**
 * Post-checkout view: shows the PromptPay QR while the order is pending,
 * then swaps to a success state when the webhook (or our polling fallback)
 * marks the order paid. Expired QRs show a friendly retry prompt.
 */
export function CheckoutReturnView({
  orderId,
  initialStatus,
  totalSatang,
  paymentQrUrl,
  paymentExpiresAt,
}: {
  orderId: string;
  initialStatus: string;
  totalSatang: number;
  paymentQrUrl: string | null;
  paymentExpiresAt: number | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Poll status every 3s while pending. Backs off + stops on paid/failed.
  useEffect(() => {
    if (status !== "pending") return;
    let cancelled = false;
    async function tick() {
      try {
        const r = await fetch(`/api/orders/${orderId}/status`, {
          cache: "no-store",
        });
        if (!r.ok) return;
        const d = (await r.json()) as { status: string };
        if (cancelled) return;
        setStatus(d.status);
      } catch {
        // Swallow — next tick will retry.
      } finally {
        if (!cancelled) timerRef.current = setTimeout(tick, 3000);
      }
    }
    timerRef.current = setTimeout(tick, 3000);
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [status, orderId]);

  // Tick the "expires in" countdown every second
  useEffect(() => {
    if (status !== "pending" || !paymentExpiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status, paymentExpiresAt]);

  async function manualRefresh() {
    setRefreshing(true);
    try {
      const r = await fetch(`/api/orders/${orderId}/status`, { cache: "no-store" });
      const d = (await r.json()) as { status: string };
      setStatus(d.status);
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }

  const paid = status === "paid";
  const failed = /^(failed|cancelled|refunded)$/i.test(status);
  const expired =
    !paid && paymentExpiresAt != null && paymentExpiresAt < now;
  const remainingMs = paymentExpiresAt ? Math.max(0, paymentExpiresAt - now) : 0;
  const mm = String(Math.floor(remainingMs / 60_000)).padStart(2, "0");
  const ss = String(Math.floor((remainingMs % 60_000) / 1000)).padStart(2, "0");
  const urgent = paymentExpiresAt != null && remainingMs > 0 && remainingMs < 60_000;

  if (paid) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto w-20 h-20 rounded-full bg-teal-500 flex items-center justify-center">
          <Check className="w-10 h-10 text-white" strokeWidth={3} />
        </div>
        <h1 className="mt-6 font-[family-name:var(--font-display)] text-2xl font-bold text-teal-700">
          ชำระเงินสำเร็จ — ขอบคุณค่ะ
        </h1>
        <p className="mt-2 text-ink/70">
          คำสั่งซื้อ #{orderId.slice(-10)} • {formatTHB(totalSatang)}
        </p>
        <div className="mt-6 flex flex-col gap-2 items-center">
          <Link
            href="/account/library"
            className="rounded-full bg-peach-500 text-white px-5 py-2.5 hover:bg-peach-600 transition"
          >
            ไปยังไฟล์ดาวน์โหลดของฉัน
          </Link>
          <Link href="/account/orders" className="text-peach-600 hover:underline text-sm">
            ดูประวัติคำสั่งซื้อ
          </Link>
        </div>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto w-20 h-20 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10" />
        </div>
        <h1 className="mt-6 font-[family-name:var(--font-display)] text-2xl font-bold text-red-700">
          การชำระเงินไม่สำเร็จ
        </h1>
        <p className="mt-2 text-ink/70">
          คำสั่งซื้อ #{orderId.slice(-10)} • {formatTHB(totalSatang)}
        </p>
        <div className="mt-6">
          <Link
            href="/cart"
            className="inline-flex items-center gap-1.5 rounded-full bg-peach-500 text-white px-5 py-2.5 hover:bg-peach-600 transition"
          >
            กลับไปตะกร้า
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      {expired ? (
        <div className="rounded-3xl bg-white border border-red-100 p-8 text-center shadow-sm">
          <div className="mx-auto w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="mt-4 font-[family-name:var(--font-display)] text-xl font-bold text-red-700">
            QR Code หมดอายุแล้ว
          </h3>
          <p className="mt-1.5 text-sm text-ink/60">
            กรุณากลับไปตะกร้าเพื่อสร้าง QR ใหม่
          </p>
          <Link
            href="/cart"
            className="mt-5 inline-flex rounded-full bg-peach-500 text-white px-5 py-2.5 hover:bg-peach-600 text-sm transition"
          >
            กลับไปตะกร้า
          </Link>
        </div>
      ) : paymentQrUrl ? (
        <>
          {/* Prominent warning — don't leave the page */}
          <div className="mb-4 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900 leading-relaxed">
              <strong>อย่าปิดหรือออกจากหน้านี้</strong>{" "}
              จนกว่าจะชำระเงินสำเร็จ — ระบบจะอัปเดตสถานะอัตโนมัติหลังโอนเงิน
            </div>
          </div>

          {/* Countdown banner — prominent, color changes when urgent */}
          {paymentExpiresAt && (
            <div
              className={`mb-4 rounded-2xl border px-4 py-3 flex items-center justify-between transition-colors ${
                urgent
                  ? "bg-red-50 border-red-200"
                  : "bg-white border-peach-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock
                  className={`w-5 h-5 ${
                    urgent ? "text-red-600 animate-pulse" : "text-peach-600"
                  }`}
                />
                <span className="text-sm text-ink/70">QR หมดอายุใน</span>
              </div>
              <span
                className={`font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums leading-none ${
                  urgent ? "text-red-600" : "text-peach-700"
                }`}
              >
                {mm}:{ss}
              </span>
            </div>
          )}

          {/* Receipt-like QR card with PromptPay branding on top */}
          <div className="relative rounded-3xl bg-white shadow-lg shadow-peach-100/50 overflow-hidden">
            {/* PromptPay blue header */}
            <div className="bg-[#00417F] text-white px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PromptPayLogo />
                <span className="font-semibold text-sm tracking-wide">PromptPay</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-white/70">Thai QR</span>
            </div>

            {/* Merchant + amount band */}
            <div className="px-6 pt-5 pb-3 text-center border-b border-dashed border-peach-200">
              <div className="text-[11px] uppercase tracking-[0.18em] text-ink/40">
                คัดลายมือ
              </div>
              <div className="mt-1.5 font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-teal-800">
                {formatTHB(totalSatang)}
              </div>
              <div className="mt-1 text-[11px] text-ink/50 font-mono">
                Ref · {orderId.slice(-10)}
              </div>
            </div>

            {/* QR with corner markers */}
            <div className="relative px-6 py-5 bg-gradient-to-b from-white to-cream/40">
              <div className="relative mx-auto w-[220px] h-[220px]">
                {/* Corner frame markers */}
                <span className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-peach-400 rounded-tl-lg" />
                <span className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-peach-400 rounded-tr-lg" />
                <span className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-peach-400 rounded-bl-lg" />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-peach-400 rounded-br-lg" />
                <div className="relative w-full h-full bg-white overflow-hidden p-2">
                  {/*
                    Beam's QR ships with a generous quiet zone. Scale the
                    <img> up a touch so the outer whitespace slides off,
                    while keeping a 3px container inset so scanners still
                    see enough margin around the finder patterns.
                  */}
                  <Image
                    src={paymentQrUrl}
                    alt="QR PromptPay"
                    fill
                    sizes="220px"
                    className="object-contain scale-[1.12]"
                    unoptimized
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Live status + manual refresh */}
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/70 border border-peach-100 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-ink/70">
              <div className="relative flex items-center justify-center w-2.5 h-2.5">
                <span className="absolute inline-flex w-full h-full rounded-full bg-teal-400 opacity-75 animate-ping" />
                <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-teal-500" />
              </div>
              <span>รอการยืนยันจากธนาคาร</span>
            </div>
            <button
              onClick={manualRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1 text-xs text-peach-700 hover:text-peach-800 disabled:opacity-60"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              ตรวจสอบ
            </button>
          </div>

          {/* Steps — condensed */}
          <div className="mt-4 rounded-2xl bg-white border border-peach-100 px-5 py-4">
            <div className="text-xs uppercase tracking-wider text-ink/50 font-semibold mb-2">
              วิธีชำระเงิน
            </div>
            <ol className="space-y-2">
              {[
                "เปิดแอปธนาคาร แตะ “สแกน”",
                "สแกน QR ด้านบน ตรวจยอดให้ตรง",
                "ยืนยันโอน รอระบบอัปเดตอัตโนมัติ",
              ].map((step, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-ink/75">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-peach-100 text-peach-700 text-[11px] font-bold shrink-0">
                    {i + 1}
                  </span>
                  <span className="leading-snug">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </>
      ) : (
        <div className="rounded-3xl bg-white border border-peach-100 p-10 text-center shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-peach-100 text-peach-600 flex items-center justify-center">
            <QrCode className="w-6 h-6" />
          </div>
          <div className="mt-4 animate-pulse text-ink/60">กำลังยืนยันการชำระเงิน…</div>
          <p className="mt-2 text-xs text-ink/50">
            ระบบจะอัปเดตสถานะเมื่อได้รับการยืนยันจากธนาคาร
          </p>
        </div>
      )}
    </div>
  );
}

function PromptPayLogo() {
  return (
    <Image
      src="/brand/promptpay.png"
      alt="PromptPay"
      width={28}
      height={28}
      className="w-7 h-7 object-contain"
    />
  );
}
