"use client";
import { useState } from "react";
import Image from "next/image";
import { Plus, X, Loader2 } from "lucide-react";

/**
 * Multi-image gallery uploader. Uploads each file via /api/admin/upload
 * (kind=preview) which returns the R2 key; the parent form posts the full
 * array of keys via the hidden input named `{name}`.
 *
 * Admin can reorder by drag (future), remove a thumbnail, or add more up
 * to `max` items.
 */
export function GalleryUpload({
  name,
  productId = "new",
  defaultKeys = [],
  max = 8,
}: {
  name: string;
  productId?: string;
  defaultKeys?: string[];
  max?: number;
}) {
  const [keys, setKeys] = useState<string[]>(defaultKeys);
  const [uploading, setUploading] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setErr(null);
    const remaining = Math.max(0, max - keys.length);
    const picked = Array.from(files).slice(0, remaining);
    setUploading(picked.length);
    for (const file of picked) {
      try {
        const fd = new FormData();
        fd.append("kind", "preview");
        fd.append("productId", productId);
        fd.append("file", file);
        const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
        if (!r.ok) throw new Error(await r.text());
        const d = (await r.json()) as { key: string };
        setKeys((prev) => [...prev, d.key]);
      } catch (e) {
        setErr(String(e));
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  function remove(k: string) {
    setKeys(keys.filter((x) => x !== k));
  }

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {keys.map((k) => (
          <div
            key={k}
            className="group relative aspect-square rounded-xl overflow-hidden bg-cream border border-peach-100"
          >
            <Image src={`/api/assets/${k}`} alt="" fill className="object-cover" unoptimized />
            <button
              type="button"
              onClick={() => remove(k)}
              aria-label="ลบ"
              className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-ink/70 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 transition inline-flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {Array.from({ length: uploading }).map((_, i) => (
          <div
            key={`up-${i}`}
            className="aspect-square rounded-xl border border-dashed border-peach-200 bg-peach-50/30 flex items-center justify-center text-peach-500"
          >
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ))}
        {keys.length + uploading < max && (
          <label className="group cursor-pointer aspect-square rounded-xl border-2 border-dashed border-peach-200 hover:border-peach-400 hover:bg-peach-50/40 transition flex flex-col items-center justify-center text-ink/40 hover:text-peach-600">
            <Plus className="w-5 h-5" />
            <span className="mt-1 text-[10px]">เพิ่มรูป</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                onFiles(e.target.files);
                e.currentTarget.value = "";
              }}
            />
          </label>
        )}
      </div>
      <p className="mt-2 text-[11px] text-ink/50">
        สูงสุด {max} รูป · ลากภาพหรือคลิกปุ่มบวกเพื่อเพิ่ม · คลิก × เพื่อลบ
      </p>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
      <input type="hidden" name={name} value={JSON.stringify(keys)} readOnly />
    </div>
  );
}
