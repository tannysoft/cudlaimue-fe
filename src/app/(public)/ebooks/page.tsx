import { desc, eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { ProductCard } from "@/components/shop/product-card";
import { OwnedProductsProvider } from "@/components/shop/owned-products-provider";

export const metadata = { title: "อีบุ๊กทั้งหมด" };
export const revalidate = 60;

export default async function EbooksPage() {
  const list = await db()
    .select()
    .from(products)
    .where(and(eq(products.isPublished, true), eq(products.type, "ebook")))
    .orderBy(desc(products.sortOrder), desc(products.createdAt));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-600 font-bold">
          อีบุ๊ก
        </h1>
        <p className="text-ink/60 mt-1">อ่านผ่านเว็บ ปลอดภัยด้วยลายน้ำเฉพาะคุณ</p>
      </header>
      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-peach-200 py-16 text-center text-ink/50">
          ยังไม่มีอีบุ๊กในระบบ
        </div>
      ) : (
        <OwnedProductsProvider productIds={list.map((p) => p.id)}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            {list.map((p) => (
              <ProductCard key={p.id} product={p} aspect="portrait" />
            ))}
          </div>
        </OwnedProductsProvider>
      )}
    </div>
  );
}
