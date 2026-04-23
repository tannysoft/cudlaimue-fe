import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { formatTHB } from "@/lib/utils";
import { thumbUrl, fullUrl } from "@/lib/img";
import { OwnedProductsProvider } from "@/components/shop/owned-products-provider";
import { CartOrOwnedButton } from "@/components/shop/cart-or-owned-button";
import { BuyNowButton } from "@/components/shop/buy-now-button";
import { ProductTaxonomy } from "@/components/shop/product-taxonomy";
import { ProductGallery } from "@/components/shop/product-gallery";
import { jsonLdString, productJsonLd, productMetadata } from "@/lib/seo";

function parseList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

async function loadEbook(slug: string) {
  const row = await db()
    .select()
    .from(products)
    .where(
      and(
        eq(products.slug, slug),
        eq(products.type, "ebook"),
        eq(products.isPublished, true),
      ),
    )
    .limit(1);
  return row[0] ?? null;
}

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await loadEbook(slug);
  if (!p) return { title: "ไม่พบอีบุ๊ก" };
  return productMetadata({
    name: p.name,
    tagline: p.tagline,
    description: p.description,
    priceSatang: p.priceSatang,
    coverImageKey: p.coverImageKey,
    type: "ebook",
    slug: p.slug,
  });
}

export default async function EbookDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await loadEbook(slug);
  if (!p) return notFound();
  const previews = parseList(p.previewImageKeys);
  const tags = parseList(p.tags);
  const categories = parseList(p.categories);
  return (
    <OwnedProductsProvider productIds={[p.id]}>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: jsonLdString(
          productJsonLd({
            name: p.name,
            tagline: p.tagline,
            description: p.description,
            priceSatang: p.priceSatang,
            coverImageKey: p.coverImageKey,
            type: "ebook",
            slug: p.slug,
          }),
        ),
      }}
    />
    <div className="mx-auto max-w-6xl px-4 pt-10 pb-20 grid lg:grid-cols-2 gap-10">
      <div>
        <ProductGallery
          slides={[
            { full: fullUrl(p.coverImageKey), thumb: thumbUrl(p.coverImageKey), alt: p.name },
            ...previews.map((k, i) => ({
              full: fullUrl(k),
              thumb: thumbUrl(k),
              alt: `ตัวอย่างอีบุ๊ก ${p.name} หน้า ${i + 1}`,
            })),
          ]}
          mainAspectClass="aspect-[3/4]"
          thumbAspectClass="aspect-[3/4]"
          thumbCols={3}
          mainShadow
        />
      </div>
      <div>
        <span className="inline-block text-xs font-semibold uppercase bg-teal-500 text-white rounded-full px-2 py-0.5">
          Ebook
        </span>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-teal-700 font-bold">
          {p.name}
        </h1>
        {p.tagline && <p className="mt-2 text-ink/70">{p.tagline}</p>}
        {p.pageCount && (
          <p className="mt-2 text-sm text-ink/50">{p.pageCount} หน้า</p>
        )}
        <div className="mt-5 flex items-baseline gap-3">
          <div className="text-3xl font-semibold text-peach-600">{formatTHB(p.priceSatang)}</div>
          {p.compareAtPriceSatang && p.compareAtPriceSatang > p.priceSatang && (
            <div className="text-lg line-through text-ink/40">
              {formatTHB(p.compareAtPriceSatang)}
            </div>
          )}
        </div>
        <div className="mt-5 flex gap-3">
          <CartOrOwnedButton
            productId={p.id}
            type={p.type}
            name={p.name}
            coverImageKey={p.coverImageKey}
            size="md"
          />
          <BuyNowButton productId={p.id} />
        </div>
        <ProductTaxonomy categories={categories} tags={tags} />
        {p.description && (
          <div
            className="prose prose-cudlaimue mt-8 max-w-none text-ink/80"
            dangerouslySetInnerHTML={{ __html: p.description }}
          />
        )}
        <div className="mt-8 rounded-xl bg-white border border-peach-100 p-4 text-sm text-ink/70">
          <h4 className="font-semibold text-teal-600 mb-2">วิธีอ่าน</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>อ่านผ่านเว็บ / LINE LIFF ได้ทุกอุปกรณ์</li>
            <li>ไม่สามารถดาวน์โหลดไฟล์ต้นฉบับได้ (เพื่อปกป้องลิขสิทธิ์)</li>
          </ul>
        </div>
      </div>
    </div>
    </OwnedProductsProvider>
  );
}
