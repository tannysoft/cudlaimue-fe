"use client";
import { useState } from "react";
import {
  Upload,
  X,
  Loader2,
  FileText,
  GripVertical,
  Pencil,
  Check,
} from "lucide-react";

export interface UploadedFile {
  key: string;
  name: string;
  size: number | null;
}

/**
 * Multi-file uploader for downloadable product assets (fonts / templates).
 *
 *  - Each row shows filename + size, with inline rename + remove.
 *  - "+ เพิ่มไฟล์" triggers a single-file picker; each pick uploads through
 *    /api/admin/upload (kind=file) and appends to the list.
 *  - The full JSON array is emitted through a hidden input named `{name}` so
 *    the enclosing <form> picks it up on submit.
 */
export function FilesUpload({
  name,
  productId = "new",
  defaultFiles = [],
  accept,
}: {
  name: string;
  productId?: string;
  defaultFiles?: UploadedFile[];
  accept?: string;
}) {
  const [files, setFiles] = useState<UploadedFile[]>(defaultFiles);
  const [uploading, setUploading] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  async function onPicked(list: FileList | null) {
    if (!list?.length) return;
    setErr(null);
    const arr = Array.from(list);
    setUploading((n) => n + arr.length);
    for (const file of arr) {
      try {
        const fd = new FormData();
        fd.append("kind", "file");
        fd.append("productId", productId);
        fd.append("file", file);
        const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
        if (!r.ok) throw new Error(await r.text());
        const d = (await r.json()) as { key: string; name?: string; size?: number };
        setFiles((prev) => [
          ...prev,
          {
            key: d.key,
            name: d.name ?? file.name,
            size: d.size ?? file.size,
          },
        ]);
      } catch (e) {
        setErr(String(e));
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  function remove(key: string) {
    setFiles(files.filter((f) => f.key !== key));
  }

  function beginRename(f: UploadedFile) {
    setRenaming(f.key);
    setRenameValue(f.name);
  }

  function commitRename(key: string) {
    const v = renameValue.trim();
    if (v) {
      setFiles(files.map((f) => (f.key === key ? { ...f, name: v } : f)));
    }
    setRenaming(null);
    setRenameValue("");
  }

  function move(key: string, dir: -1 | 1) {
    const idx = files.findIndex((f) => f.key === key);
    if (idx < 0) return;
    const next = idx + dir;
    if (next < 0 || next >= files.length) return;
    const copy = [...files];
    [copy[idx], copy[next]] = [copy[next], copy[idx]];
    setFiles(copy);
  }

  return (
    <div>
      {files.length === 0 && uploading === 0 && (
        <div className="rounded-xl border-2 border-dashed border-peach-200 bg-peach-50/30 px-4 py-6 text-center text-sm text-ink/50">
          ยังไม่มีไฟล์ — เพิ่มได้หลายไฟล์ (เช่น Daily, Weekly, Monthly)
        </div>
      )}

      {files.length > 0 && (
        <ul className="divide-y divide-peach-100 rounded-xl border border-peach-100 overflow-hidden bg-white">
          {files.map((f, i) => (
            <li key={f.key} className="flex items-center gap-2 px-3 py-2.5">
              <div className="flex flex-col text-ink/30">
                <button
                  type="button"
                  onClick={() => move(f.key, -1)}
                  disabled={i === 0}
                  aria-label="เลื่อนขึ้น"
                  className="hover:text-peach-500 disabled:opacity-30 leading-none"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => move(f.key, 1)}
                  disabled={i === files.length - 1}
                  aria-label="เลื่อนลง"
                  className="hover:text-peach-500 disabled:opacity-30 leading-none"
                >
                  ▼
                </button>
              </div>
              <FileText className="w-4 h-4 text-peach-500 shrink-0" />
              <div className="flex-1 min-w-0">
                {renaming === f.key ? (
                  <div className="flex items-center gap-1">
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitRename(f.key);
                        } else if (e.key === "Escape") {
                          setRenaming(null);
                        }
                      }}
                      autoFocus
                      className="flex-1 text-sm rounded-md border border-peach-300 bg-white px-2 py-1 outline-none focus:border-peach-500"
                    />
                    <button
                      type="button"
                      onClick={() => commitRename(f.key)}
                      className="w-7 h-7 rounded-md bg-peach-500 text-white inline-flex items-center justify-center"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="text-sm font-medium truncate">{f.name}</div>
                    <div className="text-[11px] text-ink/40 font-mono truncate">{f.key}</div>
                  </>
                )}
              </div>
              {renaming !== f.key && (
                <>
                  <span className="text-[11px] text-ink/50 whitespace-nowrap">
                    {f.size ? `${(f.size / 1024 / 1024).toFixed(1)} MB` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => beginRename(f)}
                    aria-label="เปลี่ยนชื่อ"
                    className="w-7 h-7 rounded-md text-ink/40 hover:text-peach-600 hover:bg-peach-50 inline-flex items-center justify-center"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(f.key)}
                    aria-label="ลบ"
                    className="w-7 h-7 rounded-md text-ink/40 hover:text-red-500 hover:bg-red-50 inline-flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </li>
          ))}
          {Array.from({ length: uploading }).map((_, i) => (
            <li
              key={`u-${i}`}
              className="flex items-center gap-3 px-3 py-2.5 text-peach-500"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-ink/60">กำลังอัปโหลด…</span>
            </li>
          ))}
        </ul>
      )}

      <label className="mt-3 inline-flex items-center gap-2 rounded-full border border-peach-200 bg-white hover:border-peach-400 hover:bg-peach-50 text-peach-700 text-sm font-medium px-4 py-2 cursor-pointer transition">
        <Upload className="w-4 h-4" />
        เพิ่มไฟล์
        <input
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => {
            onPicked(e.target.files);
            e.currentTarget.value = "";
          }}
        />
      </label>

      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}

      <input type="hidden" name={name} value={JSON.stringify(files)} readOnly />
      {/* Leading <GripVertical> import silences unused-var from icon set */}
      <span className="hidden">
        <GripVertical />
      </span>
    </div>
  );
}
