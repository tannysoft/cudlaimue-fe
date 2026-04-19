"use client";
import { Checkbox as HCheckbox } from "@headlessui/react";
import { Check, Minus } from "lucide-react";

/**
 * Branded checkbox built on HeadlessUI's Checkbox primitive. Supports the
 * three tri-state modes (`unchecked`, `checked`, `indeterminate`) plus
 * disabled. Styling follows the peach theme used across the admin.
 */
export function Checkbox({
  checked,
  onChange,
  indeterminate = false,
  disabled = false,
  ariaLabel,
  size = "md",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  indeterminate?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const icon = size === "sm" ? "w-2.5 h-2.5" : "w-3.5 h-3.5";
  return (
    <HCheckbox
      checked={checked}
      onChange={onChange}
      indeterminate={indeterminate}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center rounded-md border transition cursor-pointer focus:outline-none focus:ring-3 focus:ring-peach-500/25 ${box}
        border-peach-300 bg-white
        data-[checked]:border-peach-500 data-[checked]:bg-peach-500
        data-[indeterminate]:border-peach-500 data-[indeterminate]:bg-peach-500
        data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed`}
    >
      {indeterminate ? (
        <Minus className={`${icon} text-white`} strokeWidth={3} />
      ) : checked ? (
        <Check className={`${icon} text-white`} strokeWidth={3} />
      ) : null}
    </HCheckbox>
  );
}
