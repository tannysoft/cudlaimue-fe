"use client";
import { ShoppingCart, Check } from "lucide-react";
import { useState } from "react";
import { addToCart } from "@/lib/cart-client";

export function AddToCartButton({
  productId,
  name,
  coverImageKey = null,
  size = "sm",
}: {
  productId: string;
  name: string;
  coverImageKey?: string | null;
  size?: "sm" | "md";
}) {
  const [added, setAdded] = useState(false);
  const sizeCls =
    size === "md" ? "px-5 py-2 text-base gap-1.5" : "px-3 py-1.5 text-sm gap-1";
  return (
    <button
      onClick={() => {
        addToCart(productId, { name, coverImageKey });
        setAdded(true);
        setTimeout(() => setAdded(false), 1400);
      }}
      aria-label={`เพิ่ม ${name} ลงตะกร้า`}
      className={`inline-flex items-center rounded-full bg-peach-500 text-white hover:bg-peach-600 transition ${sizeCls}`}
    >
      {added ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
      <span>{added ? "เพิ่มแล้ว" : "เพิ่ม"}</span>
    </button>
  );
}
