"use client";
import { Fragment, useState } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import Link from "next/link";
import { X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { saveConsent } from "@/lib/consent";

/**
 * Granular consent modal. Shown when the user clicks "ตั้งค่า" on the
 * cookie banner, or from the footer later on.
 *
 * "ยอมรับทั้งหมด" / "ปฏิเสธทั้งหมด" are convenience shortcuts; the
 * per-category toggles let advanced users pick a middle ground.
 */
export function CookieSettingsModal({
  open,
  initial,
  onClose,
}: {
  open: boolean;
  initial: { analytics: boolean; advertising: boolean };
  onClose: () => void;
}) {
  const [analytics, setAnalytics] = useState(initial.analytics);
  const [advertising, setAdvertising] = useState(initial.advertising);

  function commit(values: { analytics: boolean; advertising: boolean }) {
    saveConsent(values);
    onClose();
  }

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-end sm:items-center justify-center p-3 sm:p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-4 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:scale-95"
            >
              <DialogPanel className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-peach-100 overflow-hidden">
                <div className="flex items-start justify-between px-5 pt-5 pb-3">
                  <DialogTitle className="font-[family-name:var(--font-display)] text-xl text-teal-700 font-bold">
                    ตั้งค่า cookies
                  </DialogTitle>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="ปิด"
                    className="text-ink/40 hover:text-ink/70 -mt-1 -mr-1 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="px-5 pb-3 text-[13px] text-ink/60 leading-relaxed">
                  คุณสามารถเลือกเปิด/ปิด cookies แต่ละหมวดได้ รายละเอียดเพิ่มเติมที่{" "}
                  <Link
                    href="/privacy"
                    className="text-peach-700 hover:underline"
                  >
                    นโยบายความเป็นส่วนตัว
                  </Link>
                </div>

                <div className="border-t border-peach-100 px-5 py-2 divide-y divide-peach-50">
                  <div className="py-3 flex items-start gap-3">
                    <div className="mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent bg-teal-500 opacity-60 cursor-not-allowed">
                      <span
                        aria-hidden
                        className="pointer-events-none inline-block h-5 w-5 translate-x-[22px] rounded-full bg-white shadow"
                      />
                    </div>
                    <div className="text-sm leading-snug flex-1">
                      <div className="font-medium text-ink/90">จำเป็น</div>
                      <div className="text-xs text-ink/50 mt-0.5">
                        สำหรับการเข้าสู่ระบบ ตะกร้าสินค้า และความปลอดภัย — ไม่สามารถปิดได้
                      </div>
                    </div>
                  </div>

                  <Switch
                    checked={analytics}
                    onChange={setAnalytics}
                    label="วิเคราะห์ (Analytics)"
                    description="Google Analytics 4 — ช่วยเราเข้าใจว่าหน้าไหนมีคนสนใจ เพื่อปรับปรุงเนื้อหา"
                  />

                  <Switch
                    checked={advertising}
                    onChange={setAdvertising}
                    label="โฆษณา (Advertising / Retargeting)"
                    description="Meta Pixel (Facebook/Instagram) + TikTok Pixel — ให้เราแสดงโฆษณาสินค้าที่คุณสนใจเมื่อคุณเข้าใช้ Facebook / TikTok"
                  />
                </div>

                <div className="bg-cream/40 px-5 py-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={() => commit({ analytics: false, advertising: false })}
                    className="inline-flex items-center justify-center rounded-full border border-peach-200 bg-white hover:border-peach-400 hover:bg-peach-50 text-ink/70 hover:text-peach-700 text-sm font-medium px-4 py-2 transition"
                  >
                    ปฏิเสธทั้งหมด
                  </button>
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={() => commit({ analytics, advertising })}
                    className="inline-flex items-center justify-center rounded-full border border-peach-300 bg-white hover:border-peach-500 hover:bg-peach-50 text-peach-700 text-sm font-medium px-4 py-2 transition"
                  >
                    บันทึกการตั้งค่า
                  </button>
                  <button
                    type="button"
                    onClick={() => commit({ analytics: true, advertising: true })}
                    className="inline-flex items-center justify-center rounded-full bg-peach-500 hover:bg-peach-600 text-white text-sm font-medium px-5 py-2 shadow-sm transition"
                  >
                    ยอมรับทั้งหมด
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
