"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Trash2,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Type,
  BookOpen,
  LayoutTemplate,
  AlertCircle,
  Ticket,
  X,
  Check,
  Loader2,
} from "lucide-react";
import {
  readCart,
  removeFromCart,
  readCoupon,
  applyCoupon,
  clearCoupon,
  type CartItem,
} from "@/lib/cart-client";
import { formatTHB } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

interface ResolvedItem extends CartItem {
  name: string;
  priceSatang: number;
  compareAtPriceSatang: number | null;
  type: string;
  slug: string;
  coverImageKey: string | null;
  unavailable?: boolean;
}

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; chip: string; href: (slug: string) => string }> = {
  font: {
    label: "ฟอนต์",
    icon: <Type className="w-3 h-3" />,
    chip: "bg-peach-100 text-peach-700",
    href: (s) => `/fonts/${s}`,
  },
  ebook: {
    label: "อีบุ๊ก",
    icon: <BookOpen className="w-3 h-3" />,
    chip: "bg-teal-100 text-teal-700",
    href: (s) => `/ebooks/${s}`,
  },
  template: {
    label: "เทมเพลต",
    icon: <LayoutTemplate className="w-3 h-3" />,
    chip: "bg-amber-100 text-amber-700",
    href: (s) => `/templates/${s}`,
  },
};

export function CartClient() {
  const [items, setItems] = useState<ResolvedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const [agreed, setAgreed] = useState(false);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponError, setCouponError] = useState<string | null>(null);

  async function refresh() {
    const cart = readCart();
    if (cart.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    const r = await fetch("/api/cart/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart }),
    });
    const data = (await r.json()) as { items: ResolvedItem[] };
    setItems(data.items);
    setLoading(false);
  }
  useEffect(() => {
    refresh();
    const h = () => refresh();
    window.addEventListener("cudlaimue:cart-updated", h);
    return () => window.removeEventListener("cudlaimue:cart-updated", h);
  }, []);

  // Re-validate the persisted coupon every time the cart subtotal changes —
  // a min-subtotal coupon may stop applying if the user removes an item.
  const subtotal = items.reduce((s, i) => s + i.priceSatang * i.qty, 0);
  useEffect(() => {
    const code = readCoupon();
    if (!code || subtotal <= 0) {
      setCouponCode(null);
      setCouponDiscount(0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/coupons/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            subtotalSatang: subtotal,
            items: items.map((i) => ({
              productId: i.productId,
              priceSatang: i.priceSatang,
              qty: i.qty,
            })),
          }),
        });
        const d = (await r.json()) as
          | { valid: true; code: string; discountSatang: number }
          | { valid: false; message: string; code: string };
        if (cancelled) return;
        if (d.valid) {
          setCouponCode(d.code);
          setCouponDiscount(d.discountSatang);
          setCouponError(null);
        } else {
          // Keep the code visible but show the reason — user might fix it
          // by adding more items, etc.
          setCouponCode(d.code);
          setCouponDiscount(0);
          setCouponError(d.message);
        }
      } catch {
        // network error — leave previous state
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subtotal]);

  function handleRemove(productId: string) {
    setRemoving((s) => new Set(s).add(productId));
    // Brief delay so the row can fade before localStorage updates re-render.
    setTimeout(() => removeFromCart(productId), 180);
  }

  const savings = items.reduce((s, i) => {
    if (i.compareAtPriceSatang && i.compareAtPriceSatang > i.priceSatang) {
      return s + (i.compareAtPriceSatang - i.priceSatang) * i.qty;
    }
    return s;
  }, 0);
  const itemCount = items.length;
  const hasUnavailable = items.some((i) => i.unavailable);
  const total = Math.max(0, subtotal - couponDiscount);

  if (loading) return <SkeletonCart />;
  if (!items.length) return <EmptyCart />;

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
      <section>
        <ul className="space-y-3">
          {items.map((i) => {
            const meta = TYPE_META[i.type] ?? TYPE_META.font;
            const cover = i.coverImageKey ? `/api/assets/${i.coverImageKey}` : "/brand/cover.png";
            const isRemoving = removing.has(i.productId);
            const itemSavings = i.compareAtPriceSatang && i.compareAtPriceSatang > i.priceSatang
              ? i.compareAtPriceSatang - i.priceSatang
              : 0;
            return (
              <li
                key={i.productId}
                className={`group bg-white rounded-2xl border p-3 sm:p-4 flex gap-3 sm:gap-4 transition-all duration-200 ${
                  i.unavailable
                    ? "border-red-200 bg-red-50/30"
                    : "border-peach-100 hover:border-peach-200 hover:shadow-sm"
                } ${isRemoving ? "opacity-0 scale-95" : ""}`}
              >
                <Link
                  href={meta.href(i.slug)}
                  className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-cream shrink-0"
                >
                  <Image src={cover} alt="" fill className="object-cover" sizes="96px" />
                </Link>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold rounded-full px-2 py-0.5 ${meta.chip}`}>
                      {meta.icon} {meta.label}
                    </span>
                    <Link
                      href={meta.href(i.slug)}
                      className="block mt-1.5 font-[family-name:var(--font-display)] text-base sm:text-lg text-teal-700 hover:text-peach-600 line-clamp-1 transition"
                    >
                      {i.name}
                    </Link>
                  </div>
                  {i.unavailable ? (
                    <div className="mt-1 inline-flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="w-3 h-3" /> ไม่พร้อมจำหน่าย
                    </div>
                  ) : itemSavings > 0 ? (
                    <div className="text-[11px] text-teal-600 font-medium">
                      ประหยัด {formatTHB(itemSavings)}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col justify-between items-end shrink-0">
                  <div className="text-right">
                    <div className="font-semibold text-peach-600 text-base sm:text-lg whitespace-nowrap">
                      {formatTHB(i.priceSatang)}
                    </div>
                    {i.compareAtPriceSatang && i.compareAtPriceSatang > i.priceSatang && (
                      <div className="text-[11px] text-ink/40 line-through whitespace-nowrap">
                        {formatTHB(i.compareAtPriceSatang)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemove(i.productId)}
                    aria-label={`ลบ ${i.name} ออกจากตะกร้า`}
                    className="text-ink/40 hover:text-red-500 hover:bg-red-50 rounded-lg p-1.5 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <Link
          href="/fonts"
          className="mt-4 inline-flex items-center gap-1 text-sm text-peach-600 hover:text-peach-700 px-1"
        >
          <ArrowRight className="w-3.5 h-3.5 rotate-180" /> ดูสินค้าต่อ
        </Link>
      </section>

      <aside className="bg-white rounded-2xl border border-peach-100 p-5 sm:p-6 lg:sticky lg:top-20 shadow-sm">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-[family-name:var(--font-display)] text-lg text-teal-700 font-semibold">
            สรุปคำสั่งซื้อ
          </h2>
          <span className="text-xs text-ink/40">{itemCount} รายการ</span>
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between text-ink/70">
            <dt>ยอดรวม</dt>
            <dd className="font-medium text-ink/90">{formatTHB(subtotal + savings)}</dd>
          </div>
          {savings > 0 && (
            <div className="flex justify-between text-teal-600">
              <dt>ส่วนลดสินค้า</dt>
              <dd className="font-medium">- {formatTHB(savings)}</dd>
            </div>
          )}
          {couponDiscount > 0 && couponCode && (
            <div className="flex justify-between text-peach-600">
              <dt className="truncate pr-2">คูปอง · {couponCode}</dt>
              <dd className="font-medium whitespace-nowrap">- {formatTHB(couponDiscount)}</dd>
            </div>
          )}
        </dl>

        <CouponBox
          code={couponCode}
          discount={couponDiscount}
          error={couponError}
          subtotal={subtotal}
          items={items}
          onApplied={(c, d) => {
            setCouponCode(c);
            setCouponDiscount(d);
            setCouponError(null);
            applyCoupon(c);
          }}
          onError={(c, msg) => {
            setCouponCode(c);
            setCouponDiscount(0);
            setCouponError(msg);
          }}
          onClear={() => {
            setCouponCode(null);
            setCouponDiscount(0);
            setCouponError(null);
            clearCoupon();
          }}
        />

        {/* Total — set off with a dashed top rule so it visually feels like
            a "tear-line" on a paper receipt. */}
        <div className="mt-5 pt-5 border-t border-dashed border-peach-200 flex items-baseline justify-between">
          <span className="text-sm text-ink/70 font-semibold">รวมทั้งหมด</span>
          <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-peach-600">
            {formatTHB(total)}
          </span>
        </div>

        <label className="mt-5 flex items-center gap-2.5 text-[12px] text-ink/70 cursor-pointer select-none">
          <Checkbox
            checked={agreed}
            onChange={setAgreed}
            ariaLabel="ยอมรับเงื่อนไขการใช้งานฟอนต์"
            size="sm"
          />
          <span className="leading-snug">
            ฉันได้อ่านและยอมรับ{" "}
            <Link
              href="/license-agreement"
              target="_blank"
              rel="noopener noreferrer"
              className="text-peach-700 underline hover:text-peach-800"
            >
              เงื่อนไขการใช้งานฟอนต์
            </Link>
          </span>
        </label>

        <Link
          href="/checkout"
          aria-disabled={hasUnavailable || !agreed}
          tabIndex={hasUnavailable || !agreed ? -1 : 0}
          className={`mt-4 flex items-center justify-center gap-2 rounded-full py-2.5 font-semibold text-base transition shadow-sm ${
            hasUnavailable || !agreed
              ? "bg-ink/10 text-ink/40 pointer-events-none"
              : "bg-peach-500 hover:bg-peach-600 text-white hover:shadow"
          }`}
        >
          ชำระเงิน <ArrowRight className="w-4 h-4" />
        </Link>

        {hasUnavailable && (
          <p className="mt-2 text-xs text-red-600 text-center">
            กรุณาลบสินค้าที่ไม่พร้อมจำหน่ายก่อนชำระเงิน
          </p>
        )}

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-ink/50">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          <span>ชำระเงินปลอดภัยผ่าน Beamcheckout</span>
        </div>
      </aside>
    </div>
  );
}

function CouponBox({
  code,
  discount,
  error,
  subtotal,
  items,
  onApplied,
  onError,
  onClear,
}: {
  code: string | null;
  discount: number;
  error: string | null;
  subtotal: number;
  items: ResolvedItem[];
  onApplied: (code: string, discount: number) => void;
  onError: (code: string, message: string) => void;
  onClear: () => void;
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const isApplied = !!code && discount > 0;

  async function apply() {
    const c = input.trim().toUpperCase();
    if (!c) return;
    setBusy(true);
    try {
      const r = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: c,
          subtotalSatang: subtotal,
          items: items.map((i) => ({
            productId: i.productId,
            priceSatang: i.priceSatang,
            qty: i.qty,
          })),
        }),
      });
      const d = (await r.json()) as
        | { valid: true; code: string; discountSatang: number }
        | { valid: false; message: string; code: string };
      if (d.valid) {
        onApplied(d.code, d.discountSatang);
        setInput("");
      } else {
        onError(d.code, d.message);
      }
    } catch (e) {
      onError(c, String(e));
    } finally {
      setBusy(false);
    }
  }

  if (isApplied) {
    return (
      <div className="mt-4 rounded-xl bg-peach-50 border border-peach-100 px-3 py-2.5 flex items-center gap-2">
        <Check className="w-4 h-4 text-peach-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-peach-700 truncate">
            ใช้คูปอง {code}
          </div>
          <div className="text-[11px] text-ink/60">ส่วนลด {formatTHB(discount)}</div>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="ลบคูปอง"
          className="text-ink/40 hover:text-red-500 p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <label className="flex items-center gap-2 bg-cream/60 rounded-xl px-3 py-1.5 text-sm focus-within:ring-2 focus-within:ring-peach-300 transition">
        <Ticket className="w-3.5 h-3.5 text-ink/40 shrink-0" />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
          placeholder="โค้ดส่วนลด"
          className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink/40 text-sm uppercase font-[family-name:var(--font-sans)]"
        />
        <button
          type="button"
          onClick={apply}
          disabled={busy || !input.trim()}
          className="text-xs font-medium text-peach-700 hover:text-peach-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "ใช้"}
        </button>
      </label>
      {error && code && (
        <div className="mt-1.5 text-[11px] text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          <span>
            {code}: {error}
          </span>
        </div>
      )}
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-peach-200 bg-peach-50/30 py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-peach-100 text-peach-600 flex items-center justify-center mx-auto">
        <ShoppingBag className="w-7 h-7" />
      </div>
      <h2 className="mt-5 font-[family-name:var(--font-display)] text-xl text-teal-700 font-semibold">
        ตะกร้าว่างเปล่า
      </h2>
      <p className="mt-1 text-sm text-ink/60">เพิ่มฟอนต์ อีบุ๊ก หรือเทมเพลตที่คุณชอบเข้าตะกร้าได้เลย</p>
      <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
        <BrowseLink href="/fonts" icon={<Type className="w-3.5 h-3.5" />}>ฟอนต์</BrowseLink>
        <BrowseLink href="/ebooks" icon={<BookOpen className="w-3.5 h-3.5" />}>อีบุ๊ก</BrowseLink>
        <BrowseLink href="/templates" icon={<LayoutTemplate className="w-3.5 h-3.5" />}>เทมเพลต</BrowseLink>
      </div>
    </div>
  );
}

function BrowseLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full bg-white border border-peach-200 hover:border-peach-400 hover:bg-peach-50 text-peach-700 text-sm font-medium px-4 py-2 transition"
    >
      {icon} {children}
    </Link>
  );
}

function SkeletonCart() {
  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
      <ul className="space-y-3">
        {[0, 1].map((i) => (
          <li
            key={i}
            className="bg-white rounded-2xl border border-peach-100 p-4 flex gap-4 animate-pulse"
          >
            <div className="w-24 h-24 rounded-xl bg-cream shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 w-16 rounded-full bg-cream" />
              <div className="h-4 w-2/3 rounded bg-cream" />
              <div className="h-3 w-1/3 rounded bg-cream" />
            </div>
            <div className="h-5 w-16 rounded bg-cream" />
          </li>
        ))}
      </ul>
      <aside className="bg-white rounded-2xl border border-peach-100 p-6 animate-pulse space-y-3">
        <div className="h-5 w-1/2 rounded bg-cream" />
        <div className="h-3 w-full rounded bg-cream" />
        <div className="h-3 w-2/3 rounded bg-cream" />
        <div className="h-12 w-full rounded-full bg-cream mt-4" />
      </aside>
    </div>
  );
}
