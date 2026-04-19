import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { CouponEditor } from "@/components/admin/coupon-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "เพิ่มคูปอง" };

export default async function NewCouponPage() {
  const productList = await db()
    .select({
      id: products.id,
      name: products.name,
      type: products.type,
      priceSatang: products.priceSatang,
      isPublished: products.isPublished,
    })
    .from(products)
    .orderBy(asc(products.name));
  return <CouponEditor products={productList} />;
}
