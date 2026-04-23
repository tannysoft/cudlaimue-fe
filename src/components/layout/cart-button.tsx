"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";

/**
 * Header cart button. Two visual states:
 *   - empty  → minimal outline icon button (low-emphasis)
 *   - filled → peach pill with icon + item count (high-emphasis CTA)
 *
 * On count increase we pulse briefly so the user notices that an
 * "Add to cart" elsewhere on the page actually landed.
 */
export function CartButton() {
  const [count, setCount] = useState(0);
  const [pulse, setPulse] = useState(false);
  const prevCountRef = useRef(0);

  useEffect(() => {
    function read() {
      try {
        const raw = localStorage.getItem("cudlaimue:cart");
        const arr = raw
          ? (JSON.parse(raw) as Array<{ qty: number }>)
          : [];
        const next = arr.reduce((s, i) => s + (i.qty || 0), 0);
        if (next > prevCountRef.current) setPulse(true);
        prevCountRef.current = next;
        setCount(next);
      } catch {
        setCount(0);
      }
    }
    read();
    const h = () => read();
    window.addEventListener("storage", h);
    window.addEventListener("cudlaimue:cart-updated", h);
    return () => {
      window.removeEventListener("storage", h);
      window.removeEventListener("cudlaimue:cart-updated", h);
    };
  }, []);

  useEffect(() => {
    if (!pulse) return;
    const t = setTimeout(() => setPulse(false), 480);
    return () => clearTimeout(t);
  }, [pulse]);

  if (count === 0) {
    return (
      <Link
        href="/cart"
        aria-label="ตะกร้าสินค้า"
        className="relative inline-flex items-center justify-center sm:justify-start sm:gap-1.5 rounded-full w-10 sm:w-auto sm:px-4 h-10 text-ink/70 hover:text-peach-700 hover:bg-peach-100 transition"
      >
        <ShoppingBag className="w-5 h-5 sm:w-4 sm:h-4" strokeWidth={1.75} />
        <span className="hidden sm:inline text-sm">ตะกร้าสินค้า</span>
      </Link>
    );
  }

  return (
    <Link
      href="/cart"
      aria-label={`ตะกร้าสินค้า (${count} รายการ)`}
      className={`relative inline-flex items-center justify-center sm:justify-start sm:gap-1.5 rounded-full w-10 sm:w-auto sm:px-4 h-10 bg-peach-500 hover:bg-peach-600 text-white text-sm font-medium shadow-sm hover:shadow transition will-change-transform ${
        pulse ? "cart-pulse" : ""
      }`}
    >
      <ShoppingBag className="w-5 h-5 sm:w-4 sm:h-4" strokeWidth={2} />
      <span className="hidden sm:inline">ตะกร้าสินค้า</span>
      <span className="font-[family-name:var(--font-display)] tabular-nums leading-none inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-peach-600 ring-2 ring-cream text-white text-[10px] absolute -top-1 -right-1 sm:static sm:min-w-5 sm:h-5 sm:px-1 sm:bg-white/25 sm:ring-0 sm:text-xs">
        {count}
      </span>
      <style>{`
        @keyframes cudlaimue-cart-pulse {
          0%   { transform: scale(1); }
          35%  { transform: scale(1.12); }
          70%  { transform: scale(0.97); }
          100% { transform: scale(1); }
        }
        .cart-pulse { animation: cudlaimue-cart-pulse 480ms ease-out; }
      `}</style>
    </Link>
  );
}
