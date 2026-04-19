"use client";
import { Switch as HSwitch, Field, Label, Description } from "@headlessui/react";

export function Switch({
  checked,
  onChange,
  label,
  description,
  name,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  description?: React.ReactNode;
  name?: string;
}) {
  return (
    <Field className="flex items-start gap-3 py-2">
      <HSwitch
        checked={checked}
        onChange={onChange}
        name={name}
        className="group mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-peach-100 transition data-[checked]:bg-peach-500 focus:outline-none focus:ring-3 focus:ring-peach-500/20"
      >
        <span className="sr-only">{typeof label === "string" ? label : ""}</span>
        <span
          aria-hidden
          className="pointer-events-none inline-block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition group-data-[checked]:translate-x-[22px]"
        />
      </HSwitch>
      <div className="text-sm leading-snug flex-1">
        <Label className="font-medium text-ink/90 cursor-pointer block">{label}</Label>
        {description && <Description className="text-xs text-ink/50 mt-0.5">{description}</Description>}
      </div>
    </Field>
  );
}
