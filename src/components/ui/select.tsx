"use client";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, Transition } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";
import { Fragment } from "react";

export interface SelectOption<V extends string = string> {
  value: V;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

export function Select<V extends string = string>({
  value,
  onChange,
  options,
  placeholder = "เลือก…",
  className = "",
}: {
  value: V;
  onChange: (v: V) => void;
  options: SelectOption<V>[];
  placeholder?: string;
  className?: string;
}) {
  const active = options.find((o) => o.value === value);
  return (
    <Listbox value={value} onChange={onChange}>
      <div className={`relative ${className}`}>
        <ListboxButton className="relative w-full rounded-xl border border-peach-200 bg-cream/40 py-2.5 pl-3 pr-10 text-left text-sm outline-none focus:border-peach-500 focus:bg-white focus:ring-3 focus:ring-peach-500/15 transition">
          <span className="flex items-center gap-2 truncate">
            {active?.icon}
            {active?.label ?? <span className="text-ink/40">{placeholder}</span>}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
            <ChevronDown className="w-4 h-4 text-ink/40" />
          </span>
        </ListboxButton>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <ListboxOptions
            anchor="bottom start"
            className="mt-1.5 w-[var(--button-width)] rounded-xl border border-peach-100 bg-white shadow-lg focus:outline-none overflow-hidden z-50"
          >
            {options.map((opt) => (
              <ListboxOption
                key={opt.value}
                value={opt.value}
                className="group flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer data-[focus]:bg-peach-50 data-[selected]:bg-peach-100/60"
              >
                {opt.icon}
                <div className="flex-1 min-w-0">
                  <div className="truncate text-ink/90 group-data-[selected]:text-peach-700 group-data-[selected]:font-medium">
                    {opt.label}
                  </div>
                  {opt.description && (
                    <div className="text-xs text-ink/50 truncate">{opt.description}</div>
                  )}
                </div>
                <Check className="w-4 h-4 text-peach-600 opacity-0 group-data-[selected]:opacity-100" />
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Transition>
      </div>
    </Listbox>
  );
}
