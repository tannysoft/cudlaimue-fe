"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { readCart, readCoupon, clearCart } from "@/lib/cart-client";
import { formatTHB } from "@/lib/utils";
import { THAI_PROVINCE_OPTIONS } from "@/lib/thai-provinces";
import { ComboboxSelect } from "@/components/ui/combobox-select";
import { ThaiDistrictSearch } from "@/components/ui/thai-district-search";

interface Resolved {
  productId: string;
  qty: number;
  name: string;
  priceSatang: number;
  type: string;
  coverImageKey: string | null;
  unavailable?: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  font: "ฟอนต์",
  ebook: "อีบุ๊ก",
  template: "เทมเพลต",
};

export function CheckoutForm({
  user,
}: {
  user: {
    email: string;
    displayName: string;
    phone: string;
    district: string;
    province: string;
  };
}) {
  const [items, setItems] = useState<Resolved[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [province, setProvince] = useState<string>(normalizeProvince(user.province));
  const [district, setDistrict] = useState<string>(user.district);

  useEffect(() => {
    (async () => {
      const cart = readCart();
      if (!cart.length) {
        setLoading(false);
        return;
      }
      const r = await fetch("/api/cart/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart }),
      });
      const d = (await r.json()) as { items: Resolved[] };
      setItems(d.items.filter((i) => !i.unavailable));
      setLoading(false);
    })();
  }, []);

  const subtotal = items.reduce((s, i) => s + i.priceSatang * i.qty, 0);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
          couponCode: readCoupon() ?? undefined,
          customer: {
            email: String(form.get("email") ?? ""),
            phone: String(form.get("phone") ?? ""),
            district: String(form.get("district") ?? ""),
            province: String(form.get("province") ?? ""),
          },
        }),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        throw new Error(d.message ?? d.error ?? `HTTP ${r.status}`);
      }
      const d = (await r.json()) as { paymentUrl: string; orderId: string };
      clearCart();
      window.location.href = d.paymentUrl;
    } catch (err) {
      setError(String(err));
      setSubmitting(false);
    }
  }

  if (loading) return <div className="py-12 text-center text-ink/50">กำลังโหลด…</div>;
  if (!items.length)
    return (
      <div className="rounded-2xl border border-dashed border-peach-200 py-16 text-center text-ink/60">
        ตะกร้าว่างเปล่า
      </div>
    );

  return (
    <form onSubmit={submit} className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
      <section className="bg-white rounded-2xl border border-peach-100 p-5 sm:p-6 space-y-4">
        <h3 className="font-[family-name:var(--font-display)] text-xl text-teal-700 font-semibold">
          ข้อมูลผู้ซื้อ
        </h3>

        <Field label="อีเมล" required>
          <input
            required
            type="email"
            name="email"
            defaultValue={user.email}
            className={inputClass}
          />
        </Field>
        <Field label="เบอร์มือถือ" required>
          <input
            required
            type="tel"
            inputMode="tel"
            name="phone"
            defaultValue={user.phone}
            placeholder="08X-XXX-XXXX"
            pattern="[0-9+\-\s]{8,15}"
            className={inputClass}
          />
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="เขต / อำเภอ" required>
            <div className="mt-1">
              <ThaiDistrictSearch
                district={district}
                onSelect={(addr) => {
                  setDistrict(addr.district);
                  // Auto-fill province from picked record. Prefer matching to
                  // our TH-XX code so the saved value lines up with the
                  // province dropdown's option set.
                  const match = THAI_PROVINCE_OPTIONS.find((p) => p.name === addr.province);
                  if (match) setProvince(match.code);
                }}
                required
              />
              <input type="hidden" name="district" value={district} />
            </div>
          </Field>
          <Field label="จังหวัด" required>
            <div className="mt-1">
              <ComboboxSelect
                name="province"
                required
                value={province}
                onChange={setProvince}
                placeholder="พิมพ์ค้นหาจังหวัด…"
                options={THAI_PROVINCE_OPTIONS.map((p) => ({ value: p.code, label: p.name }))}
              />
            </div>
          </Field>
        </div>
      </section>

      <aside className="bg-white rounded-2xl border border-peach-100 p-5 sm:p-6 lg:sticky lg:top-20 shadow-sm">
        <h3 className="font-[family-name:var(--font-display)] text-xl text-teal-700 font-semibold">
          สรุปคำสั่งซื้อ
        </h3>
        <ul className="mt-3 divide-y divide-peach-100">
          {items.map((i) => (
            <li key={i.productId} className="py-2.5 flex gap-3 items-center">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-cream shrink-0">
                <Image
                  src={i.coverImageKey ? `/api/assets/${i.coverImageKey}` : "/brand/cover.png"}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
              <div className="flex-1 text-sm min-w-0">
                <div className="truncate font-medium">{i.name}</div>
                <div className="text-xs text-ink/50">{TYPE_LABEL[i.type] ?? i.type}</div>
              </div>
              <div className="text-sm font-semibold text-peach-600 whitespace-nowrap">
                {formatTHB(i.priceSatang)}
              </div>
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between mt-4 border-t border-peach-100 pt-3">
          <span className="text-base text-ink/80 font-medium">ยอดที่ต้องชำระ</span>
          <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-peach-600">
            {formatTHB(subtotal)}
          </span>
        </div>
        {error && (
          <div className="mt-3 text-sm text-red-600 rounded-lg bg-red-50 border border-red-100 px-3 py-2">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="mt-5 w-full rounded-full py-3 font-semibold bg-peach-500 text-white hover:bg-peach-600 disabled:opacity-60 transition shadow-sm"
        >
          {submitting ? "กำลังสร้าง QR…" : "ชำระเงินด้วย PromptPay"}
        </button>
        <p className="mt-3 text-xs text-ink/50 text-center">
          ระบบจะสร้าง QR PromptPay ให้สแกนในหน้าถัดไป
        </p>
      </aside>
    </form>
  );
}

const inputClass =
  "mt-1 w-full rounded-lg border border-peach-200 bg-cream/50 px-3 py-2 text-sm outline-none focus:border-peach-500 focus:ring-3 focus:ring-peach-500/15 transition";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm text-ink/70">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

/**
 * Match an existing province value (could be raw "TH-10", "10", or display
 * "กรุงเทพมหานคร") to the dropdown's value (always the "TH-XX" code) so the
 * pre-fill survives a render. Unknown values fall through unchanged.
 */
function normalizeProvince(input: string): string {
  if (!input) return "";
  const s = input.trim();
  if (s.startsWith("TH-")) return s;
  if (/^\d{1,2}$/.test(s)) return `TH-${s.padStart(2, "0")}`;
  // Try matching by display name
  const byName = THAI_PROVINCE_OPTIONS.find((p) => p.name === s);
  return byName?.code ?? "";
}
