"use client";
import { useState, type KeyboardEvent } from "react";
import { X, Plus } from "lucide-react";

/**
 * Chip-style multi-value input. Type a value → press Enter or comma → adds a
 * chip. Click the × on a chip to remove. Exposes the value via a hidden
 * input named `{name}` carrying `JSON.stringify(values)` so the enclosing
 * <form> submission picks it up.
 */
export function TagInput({
  name,
  defaultValues = [],
  placeholder = "พิมพ์แล้วกด Enter",
  accent = "peach",
}: {
  name: string;
  defaultValues?: string[];
  placeholder?: string;
  accent?: "peach" | "teal";
}) {
  const [values, setValues] = useState<string[]>(defaultValues);
  const [draft, setDraft] = useState("");

  const chipCls =
    accent === "teal"
      ? "bg-teal-100 text-teal-700"
      : "bg-peach-100 text-peach-700";

  function commit() {
    const v = draft.trim();
    if (!v) return;
    if (values.includes(v)) {
      setDraft("");
      return;
    }
    setValues([...values, v]);
    setDraft("");
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && draft === "" && values.length > 0) {
      setValues(values.slice(0, -1));
    }
  }

  function remove(v: string) {
    setValues(values.filter((x) => x !== v));
  }

  return (
    <div className="rounded-xl border border-peach-200 bg-cream/40 px-2 py-1.5 flex flex-wrap items-center gap-1.5 min-h-[44px] focus-within:border-peach-500 focus-within:bg-white focus-within:ring-3 focus-within:ring-peach-500/15 transition">
      {values.map((v) => (
        <span
          key={v}
          className={`inline-flex items-center gap-1 rounded-full text-xs font-medium px-2.5 py-1 ${chipCls}`}
        >
          {v}
          <button
            type="button"
            onClick={() => remove(v)}
            aria-label={`ลบ ${v}`}
            className="hover:text-red-600 transition"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={commit}
        placeholder={values.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[8rem] bg-transparent text-sm px-1 py-0.5 outline-none"
      />
      {draft && (
        <button
          type="button"
          onClick={commit}
          aria-label="เพิ่ม"
          className="w-6 h-6 rounded-full bg-peach-500 text-white inline-flex items-center justify-center hover:bg-peach-600"
        >
          <Plus className="w-3 h-3" />
        </button>
      )}
      <input type="hidden" name={name} value={JSON.stringify(values)} readOnly />
    </div>
  );
}
