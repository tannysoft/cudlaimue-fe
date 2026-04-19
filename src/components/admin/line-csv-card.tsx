"use client";
import { useState } from "react";
import { Upload, CheckCheck, AlertTriangle, X } from "lucide-react";

/**
 * Simple upload card for applying Nextend LINE data via CSV export.
 * Lives inside the Import → Customers tab as a secondary panel.
 */
export function LineCsvCard() {
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{
    rows: number;
    matched: number;
    updated: number;
    skippedNoUser: number;
    skippedAlready: number;
    skippedCollision: number;
    skippedWrongType?: number;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!file) return;
    setPending(true);
    setErr(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/admin/import/line-csv", { method: "POST", body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(
          (data as { message?: string; error?: string }).message ??
            (data as { error?: string }).error ??
            `HTTP ${r.status}`,
        );
      }
      setResult(data as typeof result);
      setFile(null);
    } catch (e) {
      setErr(String(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-6 bg-white rounded-2xl border border-peach-100 p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#06C755]/10 text-[#06C755] flex items-center justify-center shrink-0">
          <Upload className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-teal-700">นำเข้า LINE User ID จาก CSV</h3>
          <p className="text-xs text-ink/60 mt-1 leading-relaxed">
            Export ตาราง social ของเก่ามา upload ตรงๆ ได้เลย — ระบบจะ match ด้วย
            <strong> WP user ID</strong> (คอลัมน์ <code>ID</code>) หรือ{" "}
            <strong>email</strong> อัตโนมัติ
          </p>
          <details className="mt-2 text-xs text-ink/60">
            <summary className="cursor-pointer hover:text-peach-600">
              วิธี export + คอลัมน์ที่รองรับ (ขยายดู)
            </summary>
            <p className="mt-2">
              วิธีง่ายสุด: phpMyAdmin → เปิดตาราง <code>wp_social_users</code> → กด{" "}
              <strong>Export → CSV</strong> → upload ทั้งไฟล์ได้เลย ระบบจะกรองเฉพาะ row{" "}
              <code>type = line</code> ให้เอง
            </p>
            <pre className="mt-2 bg-cream/60 rounded-lg p-3 overflow-x-auto text-[11px]">
{`# Export ทั้งตารางได้เลย — ไม่ต้อง join
social_users_id, ID, type, identifier, register_date, login_date, link_date
1, 1, line, Ud5bdc23dcb2e5a57dde94ea4e47a53c8, NULL, ..., ...

# หรือ custom SQL (join กับ wp_users เอา email มาด้วย):
SELECT u.user_email AS email, s.identifier AS line_user_id
FROM wp_social_users s
JOIN wp_users u ON u.ID = s.ID
WHERE s.type = 'line';`}
            </pre>
            <p className="mt-2">
              Aliases ที่รองรับ:
              <br />• LINE ID: <code className="font-mono">identifier / line_user_id</code>
              <br />• WP user: <code className="font-mono">ID / wp_user_id / user_id</code>
              <br />• Email: <code className="font-mono">email / user_email</code>
              <br />• Provider: <code className="font-mono">type / provider</code> (filter line)
            </p>
          </details>

          <div className="mt-4 flex items-center gap-3">
            <label className="flex-1 cursor-pointer rounded-xl border-2 border-dashed border-peach-200 hover:border-peach-400 hover:bg-peach-50/40 transition px-4 py-3 flex items-center gap-2 text-sm">
              <Upload className="w-4 h-4 text-ink/50" />
              <span className="text-ink/70 truncate">
                {file ? file.name : "เลือกไฟล์ CSV…"}
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <button
              disabled={!file || pending}
              onClick={submit}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#06C755] hover:bg-[#05b04c] text-white px-4 py-2.5 text-sm font-medium shadow-sm disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {pending ? "กำลังนำเข้า…" : "เริ่ม"}
            </button>
          </div>

          {err && (
            <div className="mt-3 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <div className="flex-1">{err}</div>
              <button onClick={() => setErr(null)} className="text-red-500 hover:text-red-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {result && (
            <div className="mt-3 rounded-lg bg-teal-50 border border-teal-100 px-3 py-2 text-xs text-teal-800 flex items-start gap-2">
              <CheckCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-teal-600" />
              <div className="flex-1 leading-relaxed">
                เสร็จสมบูรณ์ · แถวทั้งหมด <strong>{result.rows}</strong> ·{" "}
                match <strong>{result.matched}</strong> ·{" "}
                เติม LINE ID ใหม่ <strong>{result.updated}</strong>
                <div className="text-teal-700/70 mt-1">
                  ข้าม: ไม่เจอ user {result.skippedNoUser} · มี LINE อยู่แล้ว{" "}
                  {result.skippedAlready} · LINE ID ซ้ำ {result.skippedCollision}
                  {result.skippedWrongType ? ` · type ≠ line ${result.skippedWrongType}` : ""}
                </div>
              </div>
              <button onClick={() => setResult(null)} className="text-teal-600 hover:text-teal-800">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
