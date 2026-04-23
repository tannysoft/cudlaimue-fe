"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";

type LiffDefault = typeof import("@line/liff").default;

/**
 * Silently inits LIFF SDK when the page loads inside the LINE in-app browser,
 * so download links can escape into the system browser via `liff.openWindow`.
 * LINE's WebView blocks `Content-Disposition: attachment`, so a plain <a> just
 * opens a blank screen — users need the OS browser to save the file.
 */
type LiffExternal = {
  isInClient: boolean;
  openExternal: (url: string) => void;
};

const Ctx = createContext<LiffExternal>({
  isInClient: false,
  openExternal: (url) => {
    if (typeof window !== "undefined") window.location.href = url;
  },
});

export function LiffExternalProvider({
  liffId,
  children,
}: {
  liffId: string;
  children: React.ReactNode;
}) {
  const liffRef = useRef<LiffDefault | null>(null);
  const [isInClient, setIsInClient] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!/Line\//i.test(navigator.userAgent)) return;
    let cancelled = false;
    (async () => {
      try {
        const mod = (await import("@line/liff")).default;
        await mod.init({ liffId });
        if (cancelled) return;
        liffRef.current = mod;
        setIsInClient(mod.isInClient());
      } catch {
        // If init fails the context stays with isInClient=false and the
        // fallback opens links normally — no worse than before.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [liffId]);

  const openExternal = (url: string) => {
    const liff = liffRef.current;
    const absolute =
      url.startsWith("http") ? url : new URL(url, window.location.origin).toString();
    if (liff && isInClient) {
      liff.openWindow({ url: absolute, external: true });
    } else {
      window.location.href = absolute;
    }
  };

  return <Ctx.Provider value={{ isInClient, openExternal }}>{children}</Ctx.Provider>;
}

export function useLiffExternal() {
  return useContext(Ctx);
}
