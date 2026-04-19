"use client";
import { Fragment, useState } from "react";
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Transition,
} from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";

export interface ComboboxOption<V extends string = string> {
  value: V;
  label: string;
}

/**
 * HeadlessUI Combobox — type-to-filter searchable select. Used for long
 * lists where a plain Listbox would be tedious to scroll (e.g. provinces).
 *
 * Renders a hidden `<input name>` mirroring the selected value so the field
 * participates in native `<form>` submission via FormData.
 */
export function ComboboxSelect<V extends string = string>({
  name,
  value,
  onChange,
  options,
  placeholder = "เลือก…",
  required,
  className = "",
}: {
  name?: string;
  value: V | "";
  onChange: (v: V) => void;
  options: ComboboxOption<V>[];
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;
  const selected = options.find((o) => o.value === value) ?? null;

  return (
    <div className={`relative ${className}`}>
      {name && (
        <input
          type="hidden"
          name={name}
          value={value}
          required={required}
        />
      )}
      <Combobox
        value={selected}
        onChange={(opt: ComboboxOption<V> | null) => {
          if (opt) onChange(opt.value);
        }}
      >
        <div className="relative">
          <ComboboxInput
            displayValue={(o: ComboboxOption<V> | null) => o?.label ?? ""}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-peach-200 bg-cream/50 pl-3 pr-9 py-2 text-sm outline-none focus:border-peach-500 focus:bg-white focus:ring-3 focus:ring-peach-500/15 transition placeholder:text-ink/40"
          />
          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-ink/40 hover:text-ink/70">
            <ChevronDown className="w-4 h-4" />
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
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-ink/40">ไม่พบรายการ</div>
            ) : (
              filtered.map((opt) => (
                <ComboboxOption
                  key={opt.value}
                  value={opt}
                  className="group flex items-center gap-3 px-3 py-2 text-sm cursor-pointer data-[focus]:bg-peach-50 data-[selected]:bg-peach-100/60"
                >
                  <span className="flex-1 truncate text-ink/90 group-data-[selected]:text-peach-700 group-data-[selected]:font-medium">
                    {opt.label}
                  </span>
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
