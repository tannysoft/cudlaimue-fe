"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, AlertTriangle, Check, Search } from "lucide-react";
import type { Coupon } from "@/lib/db/schema";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, type SelectOption } from "@/components/ui/select";
import { formatTHB } from "@/lib/utils";

type CouponType = "percent" | "fixed";

const TYPE_OPTIONS: SelectOption<CouponType>[] = [
  { value: "percent", label: "เปอร์เซ็นต์ (%)", description: "ลดเป็นเปอร์เซ็นต์ของยอดรวม" },
  { value: "fixed", label: "จำนวนเงิน (บาท)", description: "ลดเป็นจำนวนเงินคงที่" },
];

export type ProductOption = {
  id: string;
  name: string;
  type: string;
  priceSatang: number;
  isPublished: boolean;
};

function parseInitialProductIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

export function CouponEditor({
  coupon,
  products,
}: {
  coupon?: Coupon;
  products: ProductOption[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<CouponType>(
    (coupon?.type as CouponType) ?? "percent",
  );
  const [isActive, setIsActive] = useState<boolean>(coupon?.isActive ?? true);
  const [restricted, setRestricted] = useState<boolean>(
    !!coupon?.productIds && parseInitialProductIds(coupon.productIds).length > 0,
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(parseInitialProductIds(coupon?.productIds)),
  );

  const isNew = !coupon;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const code = String(form.get("code") ?? "").trim().toUpperCase();
    const valueRaw = String(form.get("value") ?? "");
    const value = type === "fixed"
      ? Math.round(parseFloat(valueRaw) * 100) // baht → satang
      : Math.round(parseFloat(valueRaw));
    const minRaw = String(form.get("minSubtotal") ?? "").trim();
    const minSubtotalSatang = minRaw
      ? Math.round(parseFloat(minRaw) * 100)
      : null;
    const maxRaw = String(form.get("maxUses") ?? "").trim();
    const maxUses = maxRaw ? parseInt(maxRaw, 10) : null;
    const expiresRaw = String(form.get("expiresAt") ?? "").trim();
    const expiresAt = expiresRaw ? new Date(expiresRaw).getTime() : null;

    const productIds = restricted ? Array.from(selectedIds) : null;
    if (restricted && productIds!.length === 0) {
      setError("เลือกสินค้าที่ใช้ได้อย่างน้อย 1 รายการ หรือปิดตัวเลือกเพื่อใช้ได้ทุกสินค้า");
      return;
    }

    start(async () => {
      const payload = isNew
        ? { code, type, value, minSubtotalSatang, maxUses, expiresAt, isActive, productIds }
        : { type, value, minSubtotalSatang, maxUses, expiresAt, isActive, productIds };
      const url = isNew ? "/api/admin/coupons" : `/api/admin/coupons/${coupon!.id}`;
      const method = isNew ? "POST" : "PATCH";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        setError(d.message ?? d.error ?? `HTTP ${r.status}`);
        return;
      }
      router.push("/admin/coupons");
      router.refresh();
    });
  }

  function doDelete() {
    if (!coupon) return;
    start(async () => {
      const r = await fetch(`/api/admin/coupons/${coupon.id}`, { method: "DELETE" });
      if (!r.ok) {
        setError(`HTTP ${r.status}`);
        return;
      }
      router.push("/admin/coupons");
      router.refresh();
    });
  }

  // Format expiresAt → datetime-local input value
  const expiresDefault = coupon?.expiresAt
    ? new Date(coupon.expiresAt - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";

  return (
    <form onSubmit={submit} className="max-w-3xl">
      <header className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/coupons"
          className="text-ink/50 hover:text-peach-600"
          aria-label="กลับ"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-800 font-bold flex-1">
          {isNew ? "เพิ่มคูปอง" : `แก้ไข ${coupon!.code}`}
        </h1>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-full bg-peach-500 hover:bg-peach-600 text-white px-5 py-2.5 text-sm font-medium shadow-sm disabled:opacity-60"
        >
          <Check className="w-4 h-4" />
          {pending ? "กำลังบันทึก…" : "บันทึก"}
        </button>
      </header>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      <Card title="โค้ดและส่วนลด">
        <Field label="โค้ด" required>
          <input
            required
            name="code"
            defaultValue={coupon?.code ?? ""}
            disabled={!isNew}
            placeholder="WELCOME50"
            pattern="[A-Za-z0-9_\-]+"
            className={`${inputClass} font-mono uppercase ${
              isNew ? "" : "bg-cream/30 cursor-not-allowed"
            }`}
            onInput={(e) => {
              const t = e.currentTarget;
              t.value = t.value.toUpperCase();
            }}
          />
          <Hint>
            <strong>ใช้ได้:</strong> ตัวอักษรอังกฤษพิมพ์ใหญ่ A-Z, ตัวเลข 0-9, ขีดล่าง _, ขีด -<br />
            <strong>ห้าม:</strong> ภาษาไทย, ช่องว่าง, อักขระพิเศษอื่นๆ · <strong>ห้ามเปลี่ยน</strong>โค้ดทีหลัง (สร้างใหม่แทน)
          </Hint>
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="ประเภทส่วนลด" required>
            <div className="mt-1.5">
              <Select<CouponType>
                value={type}
                onChange={setType}
                options={TYPE_OPTIONS}
              />
            </div>
            <Hint>
              <strong>%</strong> = ลดเป็นเปอร์เซ็นต์ของยอดรวม (เหมาะกับโปรเหมา)<br />
              <strong>บาท</strong> = ลดเป็นจำนวนเงินคงที่ (ไม่เกินยอดสั่งซื้อ)
            </Hint>
          </Field>
          <Field
            label={type === "percent" ? "เปอร์เซ็นต์ (%)" : "จำนวนเงิน (บาท)"}
            required
          >
            <input
              required
              type="number"
              name="value"
              min={type === "percent" ? 1 : 0}
              max={type === "percent" ? 100 : undefined}
              step={type === "percent" ? 1 : 0.01}
              defaultValue={
                coupon
                  ? coupon.type === "fixed"
                    ? (coupon.value / 100).toString()
                    : coupon.value.toString()
                  : ""
              }
              placeholder={type === "percent" ? "10" : "50"}
              className={inputClass}
            />
            {type === "percent" ? (
              <Hint>
                <strong>ใส่ได้:</strong> 1 ถึง 100 (จำนวนเต็ม)<br />
                <strong>ห้าม:</strong> 0, ค่าติดลบ, มากกว่า 100, ทศนิยม · 100% = สินค้าฟรี (ระวังใส่ <em>จำกัดจำนวนครั้ง</em> ด้วย)
              </Hint>
            ) : (
              <Hint>
                <strong>ใส่ได้:</strong> ตัวเลขมากกว่า 0 (ทศนิยมได้ เช่น 50.50)<br />
                <strong>ห้าม:</strong> 0, ค่าติดลบ · ถ้ามากกว่ายอดสินค้า ระบบจะหักได้สูงสุดเท่ายอดสินค้า (ไม่ติดลบ)
              </Hint>
            )}
          </Field>
        </div>
      </Card>

      <Card title="เงื่อนไขการใช้" className="mt-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="ยอดสั่งซื้อขั้นต่ำ (บาท)">
            <input
              type="number"
              name="minSubtotal"
              min={0}
              step={0.01}
              defaultValue={
                coupon?.minSubtotalSatang != null
                  ? (coupon.minSubtotalSatang / 100).toString()
                  : ""
              }
              placeholder="ไม่จำกัด"
              className={inputClass}
            />
            <Hint>
              ลูกค้าต้องซื้อยอดถึงจึงใช้คูปองได้ · <strong>เว้นว่าง</strong> = ไม่จำกัด
            </Hint>
          </Field>
          <Field label="จำนวนครั้งที่ใช้ได้รวม">
            <input
              type="number"
              name="maxUses"
              min={1}
              step={1}
              defaultValue={coupon?.maxUses ?? ""}
              placeholder="ไม่จำกัด"
              className={inputClass}
            />
            <Hint>
              นับรวมทุก user · <strong>เว้นว่าง</strong> = ไม่จำกัด<br />
              <strong className="text-red-600">⚠ ห้ามเว้นว่าง</strong>ถ้าตั้งส่วนลด 100% (กันโดน abuse)
            </Hint>
          </Field>
        </div>
        <Field label="วันหมดอายุ">
          <input
            type="datetime-local"
            name="expiresAt"
            defaultValue={expiresDefault}
            className={inputClass}
          />
          <Hint>
            หลังเวลานี้ลูกค้าใช้ไม่ได้ (อิงเวลาประเทศไทย) · <strong>เว้นว่าง</strong> = ไม่หมดอายุ
          </Hint>
        </Field>
      </Card>

      <Card title="สินค้าที่ใช้ได้" className="mt-4">
        <Switch
          checked={restricted}
          onChange={(v) => {
            setRestricted(v);
            if (!v) setSelectedIds(new Set());
          }}
          label="จำกัดเฉพาะบางสินค้า"
          description="ปิด = ใช้ได้กับทุกสินค้าในตะกร้า · เปิด = เลือกสินค้าที่ใช้ได้ด้านล่าง"
        />
        {restricted && (
          <ProductPicker
            products={products}
            selectedIds={selectedIds}
            onChange={setSelectedIds}
          />
        )}
      </Card>

      <Card title="สถานะ" className="mt-4">
        <Switch
          checked={isActive}
          onChange={setIsActive}
          label="เปิดใช้งาน"
          description="ลูกค้าจะใช้โค้ดนี้ได้เมื่อเปิดเท่านั้น · ปิดได้ตลอด"
        />
        {coupon && (
          <div className="text-xs text-ink/50 pt-3 border-t border-peach-100">
            ถูกใช้แล้ว <strong>{coupon.usedCount}</strong> ครั้ง
            {coupon.maxUses != null ? ` จากทั้งหมด ${coupon.maxUses}` : ""}
          </div>
        )}
      </Card>

      {coupon && (
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 disabled:opacity-60"
          >
            <Trash2 className="w-4 h-4" /> ลบคูปอง
          </button>
        </div>
      )}

      {confirmDelete && coupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-ink/90">ลบคูปอง {coupon.code}?</h3>
                <p className="mt-1.5 text-sm text-ink/60">
                  Order ที่เคยใช้คูปองนี้แล้วจะไม่ได้รับผลกระทบ
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-full px-4 py-2 text-sm text-ink/60 hover:text-ink"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={doDelete}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white px-5 py-2 text-sm font-medium disabled:opacity-60"
              >
                <Trash2 className="w-4 h-4" />
                {pending ? "กำลังลบ…" : "ยืนยันลบ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

const inputClass =
  "mt-1 w-full rounded-lg border border-peach-200 bg-cream/50 px-3 py-2 text-sm outline-none focus:border-peach-500 focus:ring-3 focus:ring-peach-500/15 transition";

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1.5 text-[11px] text-ink/55 leading-relaxed">{children}</p>
  );
}

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-white rounded-2xl border border-peach-100 p-5 ${className}`}>
      <h3 className="font-semibold text-teal-700 mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

const TYPE_LABEL: Record<string, string> = {
  font: "ฟอนต์",
  ebook: "อีบุ๊ก",
  template: "เทมเพลต",
};

function ProductPicker({
  products,
  selectedIds,
  onChange,
}: {
  products: ProductOption[];
  selectedIds: Set<string>;
  onChange: (ids: Set<string>) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, query]);

  function toggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  return (
    <div className="mt-3 rounded-xl border border-peach-100 bg-cream/30">
      <div className="relative border-b border-peach-100 p-2">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาสินค้า…"
          className="w-full rounded-lg bg-white border border-peach-200 pl-8 pr-3 py-2 text-sm outline-none focus:border-peach-500 focus:ring-3 focus:ring-peach-500/15 transition"
        />
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-peach-50">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-ink/50">ไม่พบสินค้า</div>
        ) : (
          filtered.map((p) => {
            const checked = selectedIds.has(p.id);
            return (
              <div
                key={p.id}
                onClick={() => toggle(p.id)}
                className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-peach-50/60 cursor-pointer"
              >
                <Checkbox
                  checked={checked}
                  onChange={() => toggle(p.id)}
                  ariaLabel={p.name}
                  size="sm"
                />
                <span className="flex-1 truncate">
                  {p.name}
                  {!p.isPublished && (
                    <span className="ml-1.5 text-[10px] text-ink/40">(ซ่อน)</span>
                  )}
                </span>
                <span className="text-[10px] text-ink/40 rounded-full bg-white border border-peach-100 px-1.5 py-0.5">
                  {TYPE_LABEL[p.type] ?? p.type}
                </span>
                <span className="text-xs text-ink/50 tabular-nums w-20 text-right">
                  {formatTHB(p.priceSatang)}
                </span>
              </div>
            );
          })
        )}
      </div>
      <div className="flex items-center justify-between px-3 py-2 text-[11px] text-ink/60 border-t border-peach-100">
        <span>เลือกแล้ว {selectedIds.size} รายการ</span>
        {selectedIds.size > 0 && (
          <button
            type="button"
            onClick={() => onChange(new Set())}
            className="text-ink/50 hover:text-red-500"
          >
            ล้างทั้งหมด
          </button>
        )}
      </div>
    </div>
  );
}

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
