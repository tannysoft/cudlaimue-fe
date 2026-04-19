import Link from "next/link";
import type { Product } from "@/lib/db/schema";
import { formatTHB } from "@/lib/utils";
import { thumbUrl } from "@/lib/img";
import { CartOrOwnedButton } from "./cart-or-owned-button";

export function ProductCard({
  product,
  aspect = "landscape",
}: {
  product: Product;
  /** Cover aspect. Books → portrait, fonts → square, templates → landscape. */
  aspect?: "landscape" | "portrait" | "square";
}) {
  const href =
    product.type === "font"
      ? `/fonts/${product.slug}`
      : product.type === "ebook"
      ? `/ebooks/${product.slug}`
      : `/templates/${product.slug}`;
  const discount =
    product.compareAtPriceSatang && product.compareAtPriceSatang > product.priceSatang
      ? Math.round((1 - product.priceSatang / product.compareAtPriceSatang) * 100)
      : 0;
  const aspectClass =
    aspect === "portrait"
      ? "aspect-[2/3]"
      : aspect === "square"
      ? "aspect-square"
      : "aspect-[4/3]";
  return (
    <div className="group rounded-2xl bg-white border border-peach-100 shadow-sm overflow-hidden hover:shadow-md transition">
      <Link href={href} className={`block ${aspectClass} relative bg-cream`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbUrl(product.coverImageKey)}
          alt={product.name}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition"
        />
        {discount > 0 && (
          <span className="absolute top-3 left-3 bg-peach-500 text-white text-xs font-semibold rounded-full px-2 py-0.5">
            -{discount}%
          </span>
        )}
        <span className="absolute top-3 right-3 bg-teal-500 text-white text-[10px] font-semibold rounded-full px-2 py-0.5 uppercase">
          {product.type}
        </span>
      </Link>
      <div className="p-4">
        <Link href={href}>
          <h3 className="font-[family-name:var(--font-display)] text-lg text-teal-600 line-clamp-1">
            {product.name}
          </h3>
        </Link>
        {product.tagline && (
          <p className="mt-1 text-sm text-ink/60 line-clamp-2">{product.tagline}</p>
        )}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div>
            <div className="text-peach-600 font-semibold">{formatTHB(product.priceSatang)}</div>
            {product.compareAtPriceSatang && product.compareAtPriceSatang > product.priceSatang && (
              <div className="text-xs text-ink/40 line-through">
                {formatTHB(product.compareAtPriceSatang)}
              </div>
            )}
          </div>
          <CartOrOwnedButton
            productId={product.id}
            type={product.type}
            name={product.name}
            coverImageKey={product.coverImageKey}
          />
        </div>
      </div>
    </div>
  );
}
