"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, X, ShoppingBag, ArrowRight } from "lucide-react";
import type { CartAddedDetail } from "@/lib/cart-client";

const AUTO_DISMISS_MS = 6000;

/**
 * Global "added to cart" toast. Mounted once at the layout level.
 *
 * Listens for the `cudlaimue:cart-added` window event (fired from
 * `addToCart()` in cart-client.ts) and slides in a small card that asks the
 * user whether to checkout now or keep shopping. Auto-dismisses after a few
 * seconds; pause on hover so a slow reader doesn't lose the dialog.
 */
export function CartToast() {
  const [item, setItem] = useState<CartAddedDetail | null>(null);
  const [visible, setVisible] = useState(false);
  const dismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveredRef = useRef(false);

  useEffect(() => {
    function onAdded(e: Event) {
      const detail = (e as CustomEvent<CartAddedDetail>).detail;
      if (!detail) return;
      setItem(detail);
      // Paint once with `visible=false` so the "from" state registers, then
      // flip to true on the next frame — otherwise the transition is skipped
      // because the element mounts already in its final state.
      setVisible(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      arm();
    }
    window.addEventListener("cudlaimue:cart-added", onAdded);
    return () => window.removeEventListener("cudlaimue:cart-added", onAdded);
  }, []);

  function arm() {
    if (dismissRef.current) clearTimeout(dismissRef.current);
    dismissRef.current = setTimeout(() => {
      if (!hoveredRef.current) close();
      else arm(); // re-check later if still hovering
    }, AUTO_DISMISS_MS);
  }

  function close() {
    setVisible(false);
    // Keep `item` mounted briefly so the slide-out animation has data to render.
    setTimeout(() => setItem(null), 220);
    if (dismissRef.current) clearTimeout(dismissRef.current);
  }

  if (!item) return null;

  const cover = item.coverImageKey ? `/api/assets/${item.coverImageKey}` : null;

  return (
    <div
      className={`fixed z-50 right-4 bottom-4 sm:right-6 sm:bottom-6 max-w-[calc(100vw-2rem)] w-[360px] transition-all duration-300 ease-[cubic-bezier(0.22,1.61,0.36,1)] will-change-transform ${
        visible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-6 scale-95 pointer-events-none"
      }`}
      role="status"
      aria-live="polite"
      onMouseEnter={() => {
        hoveredRef.current = true;
      }}
      onMouseLeave={() => {
        hoveredRef.current = false;
      }}
    >
      <div className="bg-white rounded-2xl border border-peach-100 shadow-lg overflow-hidden">
        <div className="px-4 pt-4 pb-3 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wider font-semibold text-teal-600">
              เพิ่มลงตะกร้าแล้ว
            </div>
            {item.name && (
              <div className="mt-0.5 font-[family-name:var(--font-display)] text-base text-teal-800 line-clamp-2 leading-snug">
                {item.name}
              </div>
            )}
          </div>
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt=""
              className="w-12 h-12 rounded-lg object-cover bg-cream shrink-0"
            />
          )}
          <button
            type="button"
            onClick={close}
            aria-label="ปิด"
            className="text-ink/40 hover:text-ink/70 -mt-1 -mr-1 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 pb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={close}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-peach-200 bg-white hover:border-peach-400 hover:bg-peach-50 text-peach-700 text-sm font-medium px-3 py-2 transition"
          >
            <ShoppingBag className="w-3.5 h-3.5" /> เลือกซื้อต่อ
          </button>
          <Link
            href="/cart"
            onClick={close}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-peach-500 hover:bg-peach-600 text-white text-sm font-semibold px-3 py-2 shadow-sm transition"
          >
            ดูตะกร้า <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
