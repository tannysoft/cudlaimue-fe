"use client";
import { Fragment, useEffect, useState } from "react";
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Transition,
} from "@headlessui/react";
import { Check, ChevronDown, Loader2 } from "lucide-react";

/**
 * District (อำเภอ/เขต) typeahead with auto-fill of province on select.
 *
 * Backed by `@/lib/thai-addresses.json` — a flat list of {district, province}
 * pairs (~927 entries, ~29KB) extracted from `react-thailand-address-typeahead`
 * once and committed. Loaded lazily so the chunk only ships on /checkout.
 */

export interface ThaiAddress {
  district: string;
  province: string;
}

type AddrRecord = {
  d: string; // district
  p: string; // province
};

let cachedDataset: AddrRecord[] | null = null;
let loadPromise: Promise<AddrRecord[]> | null = null;

function loadDataset(): Promise<AddrRecord[]> {
  if (cachedDataset) return Promise.resolve(cachedDataset);
  if (loadPromise) return loadPromise;
  loadPromise = import("@/lib/thai-addresses.json").then((m) => {
    cachedDataset = m.default as AddrRecord[];
    return cachedDataset;
  });
  return loadPromise;
}

export function ThaiDistrictSearch({
  district,
  onSelect,
  placeholder = "พิมพ์ชื่ออำเภอ/เขต…",
  required,
  className = "",
}: {
  district: string;
  onSelect: (addr: ThaiAddress) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  const [ds, setDs] = useState<AddrRecord[] | null>(cachedDataset);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (cachedDataset) return;
    let cancelled = false;
    loadDataset().then((d) => {
      if (!cancelled) setDs(d);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const trimmed = query.trim();
  // Cap to 30 rows for UI snappiness.
  const filtered: AddrRecord[] = !trimmed || !ds
    ? []
    : (() => {
        const q = trimmed.toLowerCase();
        const out: AddrRecord[] = [];
        for (const r of ds) {
          if (r.d.toLowerCase().includes(q)) {
            out.push(r);
            if (out.length >= 30) break;
          }
        }
        return out;
      })();

  const ready = ds !== null;

  return (
    <div className={`relative ${className}`}>
      <Combobox
        value={null}
        onChange={(r: AddrRecord | null) => {
          if (!r) return;
          onSelect({ district: r.d, province: r.p });
          setQuery("");
        }}
      >
        <div className="relative">
          <ComboboxInput
            displayValue={() => district}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={ready ? placeholder : "กำลังโหลดข้อมูล…"}
            disabled={!ready}
            required={required}
            className="w-full rounded-lg border border-peach-200 bg-cream/50 pl-3 pr-9 py-2 text-sm outline-none focus:border-peach-500 focus:bg-white focus:ring-3 focus:ring-peach-500/15 transition placeholder:text-ink/40 disabled:opacity-60"
          />
          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-ink/40 hover:text-ink/70">
            {ready ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
          </ComboboxButton>
        </div>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          afterLeave={() => setQuery("")}
        >
          <ComboboxOptions
            anchor="bottom start"
            className="mt-1.5 w-[var(--input-width)] max-h-72 rounded-xl border border-peach-100 bg-white shadow-lg focus:outline-none overflow-auto z-50"
          >
            {!trimmed ? (
              <div className="px-3 py-6 text-center text-sm text-ink/40">
                เริ่มพิมพ์ชื่ออำเภอ/เขต
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-ink/40">
                ไม่พบรายการ
              </div>
            ) : (
              filtered.map((r) => (
                <ComboboxOption
                  key={`${r.d}-${r.p}`}
                  value={r}
                  className="group flex items-center gap-3 px-3 py-2 text-sm cursor-pointer data-[focus]:bg-peach-50"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-ink/90">{r.d}</span>{" "}
                    <span className="text-ink/60">— {r.p}</span>
                  </div>
                  <Check className="w-4 h-4 text-peach-600 opacity-0 group-data-[selected]:opacity-100" />
                </ComboboxOption>
              ))
            )}
          </ComboboxOptions>
        </Transition>
      </Combobox>
    </div>
  );
}
