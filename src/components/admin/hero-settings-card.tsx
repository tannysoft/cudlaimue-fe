"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Upload, Trash2, Check, AlertTriangle, Loader2 } from "lucide-react";

/**
 * Admin card for managing the homepage hero background. Upload writes the
 * file to R2, then PATCH /api/admin/settings persists the new key.
 *
 * Live-preview shows the currently saved image; "ลบ" clears it (hero falls
 * back to the gradient default on the homepage).
 */
export function HeroSettingsCard({
  initialHeroKey,
}: {
  initialHeroKey: string | null;
}) {
  const router = useRouter();
  const [heroKey, setHeroKey] = useState<string | null>(initialHeroKey);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setErr(null);
    setOkMsg(null);
    setPending(true);
    try {
      const fd = new FormData();
      fd.append("kind", "hero");
      fd.append("file", file);
      const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!r.ok) throw new Error(await r.text());
      const { key } = (await r.json()) as { key: string };
      // Persist to settings
      const r2 = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroImageKey: key }),
      });
      if (!r2.ok) throw new Error(await r2.text());
      setHeroKey(key);
      setOkMsg("อัปโหลดเรียบร้อย — รีเฟรชหน้าแรกเพื่อดูผล");
      router.refresh();
    } catch (e) {
      setErr(String(e));
    } finally {
      setPending(false);
    }
  }

  async function clearHero() {
    setErr(null);
    setOkMsg(null);
    setPending(true);
    try {
      const r = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroImageKey: null }),
      });
      if (!r.ok) throw new Error(await r.text());
      setHeroKey(null);
      setOkMsg("ลบรูป hero แล้ว");
      router.refresh();
    } catch (e) {
      setErr(String(e));
    } finally {
      setPending(false);
    }
  }

  const previewUrl = heroKey ? `/api/assets/${heroKey}` : null;

  return (
    <section className="bg-white rounded-2xl border border-peach-100 p-5 sm:p-6">
      <header className="mb-4">
        <h2 className="font-semibold text-teal-700">รูปพื้นหลัง Hero (หน้าแรก)</h2>
        <p className="text-xs text-ink/50 mt-0.5">
          แนะนำขนาด 2400×1200 px (อัตราส่วน 2:1) · ไฟล์ jpg/png/webp · ขนาด ≤ 2MB
        </p>
      </header>

      {previewUrl && (
        <div className="relative w-full aspect-[2/1] rounded-xl overflow-hidden bg-cream border border-peach-100 mb-4">
          <Image src={previewUrl} alt="Hero preview" fill className="object-cover" unoptimized />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label
          className={`inline-flex items-center gap-2 rounded-full bg-peach-500 hover:bg-peach-600 text-white text-sm font-medium px-4 py-2 cursor-pointer transition shadow-sm ${
            pending ? "opacity-60 pointer-events-none" : ""
          }`}
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {pending ? "กำลังอัปโหลด…" : heroKey ? "เปลี่ยนรูป" : "อัปโหลดรูป"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            disabled={pending}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.currentTarget.value = "";
              if (f) uploadFile(f);
            }}
          />
        </label>
        {heroKey && (
          <button
            type="button"
            onClick={clearHero}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-100 bg-red-50 hover:bg-red-100 text-red-600 text-sm px-3 py-2 transition disabled:opacity-60"
          >
            <Trash2 className="w-3.5 h-3.5" /> ลบรูป
          </button>
        )}
      </div>

      {err && (
        <div className="mt-3 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <div>{err}</div>
        </div>
      )}
      {okMsg && (
        <div className="mt-3 rounded-lg bg-teal-50 border border-teal-100 px-3 py-2 text-xs text-teal-700 flex items-start gap-2">
          <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-teal-600" />
          <div>{okMsg}</div>
        </div>
      )}
    </section>
  );
}
