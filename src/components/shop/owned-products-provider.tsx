"use client";
import { createContext, useContext, useEffect, useState } from "react";

/**
 * Client-side provider that fetches which products the current user owns,
 * so children (e.g. ProductCard buttons) can swap "Add to cart" → "Download".
 *
 * Listing pages stay ISR-cached (per-page, not per-user), and this fetches
 * the per-user owned set once after mount.
 */

const OwnedContext = createContext<Set<string> | null>(null);

export function useOwnedSet(): Set<string> | null {
  return useContext(OwnedContext);
}

export function OwnedProductsProvider({
  productIds,
  children,
}: {
  productIds: string[];
  children: React.ReactNode;
}) {
  const [owned, setOwned] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (productIds.length === 0) {
      setOwned(new Set());
      return;
    }
    let cancelled = false;
    fetch("/api/library/owned", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds }),
    })
      .then((r) => r.json() as Promise<{ owned: string[] }>)
      .then((d) => {
        if (cancelled) return;
        setOwned(new Set(d.owned));
      })
      .catch(() => {
        if (cancelled) return;
        setOwned(new Set());
      });
    return () => {
      cancelled = true;
    };
    // Stringify so React's identity check is on contents, not array ref.
  }, [productIds.join(",")]);

  return <OwnedContext.Provider value={owned}>{children}</OwnedContext.Provider>;
}
