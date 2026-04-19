"use client";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Download, ChevronDown } from "lucide-react";

type File = { key: string; name: string; size: number | null };

/**
 * Download button that shows a single link when the product has 1 file, and
 * a dropdown menu when it has multiple. Each menu entry appends `?file=<key>`
 * so the server can pick the right R2 object.
 */
export function FileDownloadButton({
  files,
  baseHref,
  label = "โหลด",
  className,
}: {
  files: File[];
  baseHref: string; // e.g. /api/library/fonts/{id}
  label?: string;
  className?: string;
}) {
  if (files.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-ink/10 text-ink/40 text-sm px-3 py-1.5">
        ไม่มีไฟล์
      </span>
    );
  }
  if (files.length === 1) {
    return (
      <a
        href={`${baseHref}?file=${encodeURIComponent(files[0].key)}`}
        className={
          className ??
          "inline-flex items-center gap-1 rounded-full bg-peach-500 text-white text-sm px-3 py-1.5 hover:bg-peach-600"
        }
      >
        <Download className="w-4 h-4" /> {label}
      </a>
    );
  }
  return (
    <Menu as="div" className="relative inline-block">
      <MenuButton
        className={
          className ??
          "inline-flex items-center gap-1 rounded-full bg-peach-500 text-white text-sm px-3 py-1.5 hover:bg-peach-600"
        }
      >
        <Download className="w-4 h-4" /> {label} ({files.length})
        <ChevronDown className="w-3 h-3 -mr-1" />
      </MenuButton>
      <MenuItems
        anchor={{ to: "bottom end", gap: 6 }}
        className="w-64 rounded-xl bg-white border border-peach-100 shadow-xl p-1 z-50 focus:outline-none"
      >
        {files.map((f) => (
          <MenuItem key={f.key}>
            {({ focus }) => (
              <a
                href={`${baseHref}?file=${encodeURIComponent(f.key)}`}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                  focus ? "bg-peach-50 text-peach-700" : "text-ink/80"
                }`}
              >
                <Download className="w-3.5 h-3.5 shrink-0 text-ink/40" />
                <span className="flex-1 truncate">{f.name}</span>
                {f.size && (
                  <span className="text-[10px] text-ink/40 shrink-0">
                    {(f.size / 1024 / 1024).toFixed(1)}MB
                  </span>
                )}
              </a>
            )}
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}
