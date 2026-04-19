import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { coupons, products } from "@/lib/db/schema";
import { CouponEditor } from "@/components/admin/coupon-editor";

export const dynamic = "force-dynamic";

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [rows, productList] = await Promise.all([
    db().select().from(coupons).where(eq(coupons.id, id)).limit(1),
    db()
      .select({
        id: products.id,
        name: products.name,
        type: products.type,
        priceSatang: products.priceSatang,
        isPublished: products.isPublished,
      })
      .from(products)
      .orderBy(asc(products.name)),
  ]);
  if (!rows.length) return notFound();
  return <CouponEditor coupon={rows[0]} products={productList} />;
}
