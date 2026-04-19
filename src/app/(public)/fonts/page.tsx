import { desc, eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { ProductCard } from "@/components/shop/product-card";
import { OwnedProductsProvider } from "@/components/shop/owned-products-provider";

export const metadata = { title: "ฟอนต์ลายมือทั้งหมด" };
export const revalidate = 60;

export default async function FontsPage() {
  const list = await db()
    .select()
    .from(products)
    .where(and(eq(products.isPublished, true), eq(products.type, "font")))
    .orderBy(desc(products.sortOrder), desc(products.createdAt));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-600 font-bold">
          ฟอนต์ลายมือ
        </h1>
        <p className="text-ink/60 mt-1">ใช้ได้ทั้งส่วนตัวและเชิงพาณิชย์</p>
      </header>
      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-peach-200 py-16 text-center text-ink/50">
          ยังไม่มีฟอนต์ในระบบ
        </div>
      ) : (
        <OwnedProductsProvider productIds={list.map((p) => p.id)}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {list.map((p) => (
              <ProductCard key={p.id} product={p} aspect="square" />
            ))}
          </div>
        </OwnedProductsProvider>
      )}
    </div>
  );
}
