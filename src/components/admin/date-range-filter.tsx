"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Calendar, X } from "lucide-react";

type Preset = "today" | "7d" | "30d" | "90d" | "ytd" | "all" | "custom";

const PRESET_LABELS: Record<Preset, string> = {
  today: "วันนี้",
  "7d": "7 วัน",
  "30d": "30 วัน",
  "90d": "90 วัน",
  ytd: "ตั้งแต่ต้นปี",
  all: "ทั้งหมด",
  custom: "กำหนดเอง",
};

/**
 * Preset + custom range date filter driven by URL search params:
 *   `?preset=7d`                      → server applies rolling 7-day window
 *   `?from=2025-01-01&to=2025-12-31`  → explicit range
 *
 * The server is the source of truth for what "rolling 7d" means (timezone,
 * midnight boundaries, etc). This component just sets the params.
 */
export function DateRangeFilter({
  currentPreset,
  currentFrom,
  currentTo,
}: {
  currentPreset: Preset;
  currentFrom: string | null;
  currentTo: string | null;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [from, setFrom] = useState(currentFrom ?? "");
  const [to, setTo] = useState(currentTo ?? "");
  const [customOpen, setCustomOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Close popover on outside click / Escape.
  useEffect(() => {
    if (!customOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(t) &&
        !triggerRef.current?.contains(t)
      ) {
        setCustomOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCustomOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [customOpen]);

  function apply(preset: Preset, fromVal?: string, toVal?: string) {
    const params = new URLSearchParams(sp.toString());
    params.delete("from");
    params.delete("to");
    params.delete("preset");
    if (preset === "custom" && fromVal && toVal) {
      params.set("from", fromVal);
      params.set("to", toVal);
    } else if (preset !== "30d") {
      // "30d" is the default — keep URL clean when user picks it.
      params.set("preset", preset);
    }
    start(() => {
      router.push(`?${params.toString()}`);
    });
  }

  return (
    <div className="relative flex flex-wrap items-center gap-1.5">
      <div
        className={`inline-flex items-center bg-white border border-peach-200 rounded-full p-0.5 ${
          pending ? "opacity-60" : ""
        }`}
      >
        {(["today", "7d", "30d", "90d", "ytd", "all"] as const).map((p) => {
          const active = currentPreset === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => {
                setCustomOpen(false);
                apply(p);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                active
                  ? "bg-peach-500 text-white shadow-sm"
                  : "text-ink/60 hover:text-ink hover:bg-peach-50"
              }`}
            >
              {PRESET_LABELS[p]}
            </button>
          );
        })}
      </div>

      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setCustomOpen((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            currentPreset === "custom"
              ? "bg-peach-500 text-white border-peach-500"
              : "bg-white border-peach-200 text-ink/60 hover:bg-peach-50"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          {currentPreset === "custom" && currentFrom && currentTo
            ? `${currentFrom} → ${currentTo}`
            : "กำหนดเอง"}
        </button>

        {customOpen && (
          <div
            ref={popoverRef}
            className="absolute right-0 sm:left-0 sm:right-auto top-full mt-2 z-30 bg-white border border-peach-200 rounded-xl shadow-xl p-3 min-w-[18rem]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-ink/70">
                เลือกช่วงวันที่
              </span>
              <button
                type="button"
                onClick={() => setCustomOpen(false)}
                aria-label="ปิด"
                className="w-6 h-6 rounded-full text-ink/40 hover:text-ink hover:bg-peach-50 inline-flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              <label className="block">
                <span className="text-[11px] text-ink/50 uppercase tracking-wider">
                  จาก
                </span>
                <input
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(e) => setFrom(e.target.value)}
                  className="mt-0.5 w-full text-xs rounded-lg border border-peach-200 px-2 py-1.5 bg-cream/40 focus:border-peach-500 focus:ring-2 focus:ring-peach-500/15 outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-ink/50 uppercase tracking-wider">
                  ถึง
                </span>
                <input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-0.5 w-full text-xs rounded-lg border border-peach-200 px-2 py-1.5 bg-cream/40 focus:border-peach-500 focus:ring-2 focus:ring-peach-500/15 outline-none"
                />
              </label>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCustomOpen(false)}
                className="text-xs rounded-full px-3 py-1.5 text-ink/60 hover:text-ink"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!from || !to || pending}
                onClick={() => {
                  apply("custom", from, to);
                  setCustomOpen(false);
                }}
                className="text-xs rounded-full bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 disabled:opacity-50"
              >
                ใช้ช่วงนี้
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
