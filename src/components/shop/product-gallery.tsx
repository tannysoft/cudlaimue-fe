"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Slide = { full: string; thumb: string; alt: string };

/**
 * Product gallery slider — main image with prev/next arrows, dots, swipe,
 * and a clickable thumbnail strip below. Mirrors the single-product gallery
 * pattern from WooCommerce storefronts.
 */
export function ProductGallery({
  slides,
  mainAspectClass = "aspect-[4/3]",
  thumbAspectClass = "aspect-square",
  thumbCols = 4,
  mainShadow = false,
}: {
  slides: Slide[];
  mainAspectClass?: string;
  thumbAspectClass?: string;
  thumbCols?: 3 | 4 | 5;
  mainShadow?: boolean;
}) {
  const [active, setActive] = useState(0);
  const count = slides.length;
  const mainRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);

  const next = useCallback(
    () => setActive((i) => (i + 1) % Math.max(1, count)),
    [count],
  );
  const prev = useCallback(
    () => setActive((i) => (i - 1 + count) % Math.max(1, count)),
    [count],
  );

  // Keyboard navigation when the gallery (or anything within it) has focus.
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // Clamp active index if the slide list shrinks for any reason.
  useEffect(() => {
    if (active >= count) setActive(0);
  }, [active, count]);

  if (count === 0) return null;

  const thumbColsCls =
    thumbCols === 3 ? "grid-cols-3" : thumbCols === 5 ? "grid-cols-5" : "grid-cols-4";

  return (
    <div>
      <div
        ref={mainRef}
        tabIndex={0}
        className={`relative ${mainAspectClass} rounded-2xl overflow-hidden bg-cream border border-peach-100 group focus:outline-none focus-visible:ring-2 focus-visible:ring-peach-400 ${
          mainShadow ? "shadow-lg" : ""
        }`}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(dx) < 40) return;
          if (dx < 0) next();
          else prev();
        }}
      >
        {/* Sliding track — translates horizontally based on active index */}
        <div
          className="absolute inset-0 flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {slides.map((s, i) => (
            <div key={i} className="relative w-full h-full shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.full}
                alt={s.alt}
                loading={i === 0 ? "eager" : "lazy"}
                className="absolute inset-0 w-full h-full object-cover select-none"
                draggable={false}
              />
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="รูปก่อนหน้า"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-ink shadow backdrop-blur-sm inline-flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="รูปถัดไป"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-ink shadow backdrop-blur-sm inline-flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5 pointer-events-none">
              {slides.map((_, i) => (
                <span
                  key={i}
                  className={`rounded-full transition-all ${
                    i === active
                      ? "w-5 h-1.5 bg-white"
                      : "w-1.5 h-1.5 bg-white/60"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {count > 1 && (
        <div className={`mt-3 grid ${thumbColsCls} gap-2`}>
          {slides.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`ดูรูปที่ ${i + 1}`}
              aria-current={i === active}
              className={`relative ${thumbAspectClass} rounded-xl overflow-hidden bg-cream border transition ${
                i === active
                  ? "border-peach-500 ring-2 ring-peach-400/40"
                  : "border-peach-100 hover:border-peach-300"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.thumb}
                alt=""
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
