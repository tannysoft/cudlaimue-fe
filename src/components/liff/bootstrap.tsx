"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

/**
 * LIFF bootstrap shell. Steps:
 *   1. Dynamic-import the LIFF SDK (avoid breaking SSR on non-LINE clients).
 *   2. `liff.init({ liffId })`.
 *   3. If not logged in → `liff.login()` — LINE handles auth.
 *   4. Grab `liff.getAccessToken()`, POST to our /api/auth/liff route.
 *   5. Server verifies token with LINE, upserts user, sets our session cookie.
 *   6. Redirect to `?to=/account/library` (default).
 *
 * The user lands in a same-origin session so all subsequent in-app pages work
 * normally inside the LIFF browser (including the ebook viewer).
 */
export function LiffBootstrap({
  liffId,
  searchParams,
}: {
  liffId: string;
  searchParams: Promise<{ to?: string }>;
}) {
  const router = useRouter();
  const sp = use(searchParams);
  const [status, setStatus] = useState("กำลังเริ่มต้น…");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!liffId) {
          setStatus("ยังไม่ได้ตั้งค่า LIFF_ID");
          return;
        }
        setStatus("กำลังโหลด LINE SDK…");
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId });
        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href });
          return;
        }
        setStatus("กำลังเชื่อมบัญชี…");
        const token = liff.getAccessToken();
        if (!token) throw new Error("no_access_token");
        const r = await fetch("/api/auth/liff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: token }),
        });
        if (!r.ok) throw new Error(await r.text());
        if (cancelled) return;
        const dest = sp.to && sp.to.startsWith("/") ? sp.to : "/account/library";
        router.replace(dest);
      } catch (e) {
        setStatus(`เกิดข้อผิดพลาด: ${String(e)}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [liffId, sp, router]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto animate-pulse">
          <Image src="/brand/logo.png" alt="" fill className="rounded-full object-cover" />
        </div>
        <p className="mt-4 text-ink/70 text-sm">{status}</p>
      </div>
    </div>
  );
}
