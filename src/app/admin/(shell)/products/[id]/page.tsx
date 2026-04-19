import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { ProductEditor } from "@/components/admin/product-editor";

export const dynamic = "force-dynamic";

export default async function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await db().select().from(products).where(eq(products.id, id)).limit(1);
  if (!row.length) return notFound();
  const p = row[0];
  return (
    <div>
      <header className="mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-800 font-bold">
            {p.name}
          </h1>
          <span
            className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${
              p.type === "font" ? "bg-peach-100 text-peach-700" : "bg-teal-100 text-teal-700"
            }`}
          >
            {p.type}
          </span>
        </div>
        <p className="text-ink/50 text-xs mt-1 font-mono">{p.id}</p>
      </header>
      <ProductEditor product={p} />
    </div>
  );
}
