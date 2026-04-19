"use client";

/**
 * Client-side cart persisted in localStorage. Server re-validates prices and
 * availability at checkout — this is purely UX state.
 */

const KEY = "cudlaimue:cart";

export interface CartItem {
  productId: string;
  qty: number;
}

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as CartItem[];
    return Array.isArray(arr) ? arr.filter((i) => i && i.productId) : [];
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("cudlaimue:cart-updated"));
}

export interface CartAddedDetail {
  productId: string;
  name?: string;
  coverImageKey?: string | null;
}

export function addToCart(
  productId: string,
  info?: { name?: string; coverImageKey?: string | null },
) {
  const items = readCart();
  const wasAlreadyInCart = items.some((i) => i.productId === productId);
  const found = items.find((i) => i.productId === productId);
  if (found) {
    // Digital goods: keep qty at 1 — no point buying the same file twice.
    found.qty = 1;
  } else {
    items.push({ productId, qty: 1 });
  }
  writeCart(items);
  // Fire a separate "added" event (distinct from the generic "cart-updated"
  // which also fires on remove) so the toast component can react only to
  // additions. Skip if the item was already in the cart.
  if (typeof window !== "undefined" && !wasAlreadyInCart) {
    const detail: CartAddedDetail = {
      productId,
      name: info?.name,
      coverImageKey: info?.coverImageKey ?? null,
    };
    window.dispatchEvent(new CustomEvent("cudlaimue:cart-added", { detail }));
  }
}

export function removeFromCart(productId: string) {
  writeCart(readCart().filter((i) => i.productId !== productId));
}

export function clearCart() {
  writeCart([]);
  clearCoupon();
}

// ---------- Coupon ----------

const COUPON_KEY = "cudlaimue:coupon";

export function readCoupon(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(COUPON_KEY);
  } catch {
    return null;
  }
}

export function applyCoupon(code: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(COUPON_KEY, code.toUpperCase());
  window.dispatchEvent(new Event("cudlaimue:cart-updated"));
}

export function clearCoupon() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(COUPON_KEY);
  window.dispatchEvent(new Event("cudlaimue:cart-updated"));
}
