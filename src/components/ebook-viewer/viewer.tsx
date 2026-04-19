"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Scan, X } from "lucide-react";

export function EbookViewer({
  productId,
  title,
  totalPages,
  userLabel,
}: {
  productId: string;
  title: string;
  totalPages: number;
  userLabel: string;
}) {
  const [page, setPage] = useState(1);
  // page   = comfortable reading width (max-w-4xl)
  // screen = whole page fits in viewport height (no scroll)
  // full   = stretch to browser width
  const [fit, setFit] = useState<"page" | "screen" | "full">("page");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [page, fit]);

  // Defense-in-depth: discourage screenshot-like UX.
  useEffect(() => {
    const prev = (e: KeyboardEvent) => {
      if ((e.key === "s" || e.key === "p") && (e.ctrlKey || e.metaKey)) e.preventDefault();
      if (e.key === "PrintScreen") {
        // Can't actually block, but we can scramble visibility briefly.
        if (containerRef.current) {
          containerRef.current.style.filter = "blur(40px)";
          setTimeout(() => {
            if (containerRef.current) containerRef.current.style.filter = "";
          }, 1200);
        }
      }
    };
    window.addEventListener("keydown", prev);
    const blockCtx = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", blockCtx);
    return () => {
      window.removeEventListener("keydown", prev);
      document.removeEventListener("contextmenu", blockCtx);
    };
  }, []);

  const src = `/api/library/ebooks/${productId}/page/${page}`;

  return (
    <div ref={containerRef} className="ebook-viewer h-full flex flex-col">
      <header className="sticky top-0 z-10 bg-ink/80 backdrop-blur border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/account/library" className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm">
            <X className="w-4 h-4" /> ปิด
          </Link>
          <div className="flex-1 text-sm truncate text-white/90">{title}</div>
          <div className="text-xs text-white/60">หน้า {page} / {totalPages}</div>
          <button
            type="button"
            onClick={() =>
              setFit((f) => (f === "page" ? "screen" : f === "screen" ? "full" : "page"))
            }
            className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm"
            aria-label={
              fit === "page" ? "พอดีหน้าจอ" : fit === "screen" ? "ขยายเต็มความกว้าง" : "ย่อ"
            }
            title={
              fit === "page" ? "พอดีหน้าจอ" : fit === "screen" ? "ขยายเต็มความกว้าง" : "ย่อ"
            }
          >
            {fit === "page" ? (
              <Scan className="w-4 h-4" />
            ) : fit === "screen" ? (
              <Maximize2 className="w-4 h-4" />
            ) : (
              <Minimize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto flex justify-center ${
          fit === "full" ? "items-start p-0" : fit === "screen" ? "items-center px-2 py-2" : "items-start py-6 px-2"
        }`}
      >
        <div
          className={`relative ${
            fit === "full"
              ? "w-full"
              : fit === "screen"
                ? "inline-block"
                : "w-full max-w-4xl"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            className={`select-none block ${
              fit === "full"
                ? "w-full h-auto"
                : fit === "screen"
                  ? "h-auto max-h-[calc(100dvh-8rem)] w-auto max-w-full mx-auto rounded-lg shadow-2xl"
                  : "w-full h-auto rounded-lg shadow-2xl"
            }`}
            draggable={false}
          />
          {/* Client-side text watermark — layered on top of the baked-in
              server watermark for double-redundancy. Rotated, no lines. */}
          <div
            className={`pointer-events-none absolute inset-0 overflow-hidden flex flex-wrap items-center justify-center gap-10 p-6 -rotate-[25deg] ${fit === "full" ? "" : "rounded-lg"}`}
            aria-hidden
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="text-white/[0.04] text-[11px] whitespace-nowrap">
                {userLabel}
              </span>
            ))}
          </div>
        </div>
      </div>

      <nav className="sticky bottom-0 bg-ink/80 backdrop-blur border-t border-white/10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2">
          <button
            onClick={() => setPage((n) => Math.max(1, n - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white"
          >
            <ChevronLeft className="w-4 h-4" /> ก่อนหน้า
          </button>
          <input
            type="range"
            min={1}
            max={totalPages}
            value={page}
            onChange={(e) => setPage(Number(e.target.value))}
            className="flex-1 accent-peach-400"
          />
          <button
            onClick={() => setPage((n) => Math.min(totalPages, n + 1))}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white"
          >
            ถัดไป <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </nav>
    </div>
  );
}
