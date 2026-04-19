"use client";
import { useState } from "react";
import { addToCart } from "@/lib/cart-client";
import { useRouter } from "next/navigation";
import { useOwnedSet } from "./owned-products-provider";

export function BuyNowButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const owned = useOwnedSet();
  // Hide once the user already owns this product — the matching
  // `CartOrOwnedButton` next to us will surface the "อ่าน / ดาวน์โหลด" CTA.
  if (owned?.has(productId)) return null;
  return (
    <button
      disabled={busy}
      onClick={() => {
        setBusy(true);
        addToCart(productId);
        router.push("/checkout");
      }}
      className="rounded-full px-5 py-2 bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-60"
    >
      ซื้อเลย
    </button>
  );
}
