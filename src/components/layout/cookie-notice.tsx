"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, Settings } from "lucide-react";
import {
  hasDecided,
  loadConsent,
  onConsentChanged,
  saveConsent,
  type Consent,
} from "@/lib/consent";
import { CookieSettingsModal } from "./cookie-settings-modal";

/**
 * Cookie consent banner. Two paths:
 *   - "ยอมรับ"   → opt-in to all categories (necessary + analytics + advertising)
 *   - "ตั้งค่า"  → open the settings modal for per-category toggles
 *
 * Only appears for visitors who haven't made a choice yet
 * (`consent.updatedAt === 0`). Re-appears if the consent record is cleared.
 * Listens for `cudlaimue:consent-changed` so dismissing via the modal hides
 * the banner instantly.
 */
export function CookieNotice() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [consent, setConsent] = useState<Consent | null>(null);

  useEffect(() => {
    setMounted(true);
    const current = loadConsent();
    setConsent(current);
    const unsub = onConsentChanged((c) => {
      setConsent(c);
      if (hasDecided(c)) {
        setVisible(false);
        setTimeout(() => setOpen(false), 220);
      }
    });
    if (hasDecided(current)) return unsub;

    // Wait for the page to feel "loaded" before intruding.
    let cancelled = false;
    const show = () => {
      if (cancelled) return;
      setOpen(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) setVisible(true);
        });
      });
    };
    const t = window.setTimeout(show, 1200);
    const onLoad = () => {
      window.clearTimeout(t);
      window.setTimeout(show, 400);
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    return () => {
      cancelled = true;
      window.clearTimeout(t);
      window.removeEventListener("load", onLoad);
      unsub();
    };
  }, []);

  function acceptAll() {
    saveConsent({ analytics: true, advertising: true });
  }

  if (!mounted) return null;

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label="การใช้ cookies"
          className={`fixed bottom-3 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:bottom-4 z-40 sm:w-max sm:max-w-[calc(100vw-2rem)] transition-all duration-300 ease-[cubic-bezier(0.22,1.61,0.36,1)] ${
            visible
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 translate-y-4 scale-95 pointer-events-none"
          }`}
        >
          <div className="relative rounded-2xl px-3 py-2 flex items-center gap-2 bg-white/55 backdrop-blur-2xl backdrop-saturate-150 border border-white/60 shadow-[0_8px_32px_-8px_rgba(31,26,20,0.18),inset_0_1px_0_rgba(255,255,255,0.7)] supports-[backdrop-filter]:bg-white/45">
            {/* Subtle inner highlight — the "liquid" sheen along the top edge */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent"
            />
            <Cookie className="w-4 h-4 text-peach-600 shrink-0" />
            <p className="flex-1 text-[12px] text-ink/80 leading-snug sm:whitespace-nowrap">
              เว็บไซต์ใช้ cookies สำหรับวิเคราะห์และการโฆษณา · ปิดได้ที่ตั้งค่า{" "}
              <Link
                href="/privacy"
                className="text-peach-700 hover:underline"
              >
                อ่านเพิ่มเติม
              </Link>
            </p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              aria-label="ตั้งค่า cookies"
              title="ตั้งค่า cookies"
              className="inline-flex items-center justify-center w-6 h-6 text-ink/50 hover:text-peach-700 shrink-0 transition"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={acceptAll}
              className="inline-flex items-center justify-center h-6 rounded-full bg-peach-500/90 hover:bg-peach-600 text-white text-[11px] font-medium px-3 shrink-0 shadow-[0_2px_8px_-2px_rgba(238,144,80,0.6)] backdrop-blur-sm transition"
            >
              ยอมรับ
            </button>
          </div>
        </div>
      )}

      <CookieSettingsModal
        open={modalOpen}
        initial={{
          analytics: consent?.analytics ?? true,
          advertising: consent?.advertising ?? true,
        }}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
