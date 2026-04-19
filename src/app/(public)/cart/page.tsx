import { CartClient } from "@/components/shop/cart-client";

export const metadata = { title: "ตะกร้าสินค้า" };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-600 font-bold mb-6">
        ตะกร้าสินค้า
      </h1>
      <CartClient />
    </div>
  );
}
