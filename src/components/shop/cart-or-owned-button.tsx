"use client";
import { useOwnedSet } from "./owned-products-provider";
import { AddToCartButton } from "./add-to-cart-button";
import { OwnedAction } from "./owned-action";

/**
 * Renders either an "Add to cart" CTA or a "Download/Read" CTA depending on
 * whether the current user owns this product. Reads ownership from
 * `OwnedProductsProvider` (set by the parent listing/detail page).
 *
 * If no provider is mounted (or while owned set is loading) we fall back to
 * the cart button — the same as guests would see.
 */
export function CartOrOwnedButton({
  productId,
  type,
  name,
  coverImageKey = null,
  size = "sm",
}: {
  productId: string;
  type: string;
  name: string;
  coverImageKey?: string | null;
  size?: "sm" | "md";
}) {
  const owned = useOwnedSet();
  if (owned?.has(productId)) {
    return <OwnedAction productId={productId} type={type} size={size} />;
  }
  return (
    <AddToCartButton
      productId={productId}
      name={name}
      coverImageKey={coverImageKey}
      size={size}
    />
  );
}
