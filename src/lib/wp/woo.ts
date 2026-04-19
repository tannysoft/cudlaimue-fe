import "server-only";
import { env } from "../cf";

/**
 * WooCommerce REST API client (v3). Authenticates with Basic Auth using
 * Consumer Key as username + Consumer Secret as password — WC's standard
 * pattern when the API is accessed over HTTPS.
 */

export interface WCImage {
  id: number;
  src: string;
  alt?: string;
}

export interface WCDownload {
  id: string;
  name: string;
  file: string;
}

export interface WCTerm {
  id: number;
  name: string;
  slug: string;
}

export interface WCProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  type: string;
  status: string;
  featured: boolean;
  short_description: string;
  description: string;
  price: string;
  regular_price: string;
  sale_price: string;
  virtual: boolean;
  downloadable: boolean;
  downloads: WCDownload[];
  images: WCImage[];
  categories: WCTerm[];
  tags: WCTerm[];
  date_created: string;
  date_modified: string;
}

function authHeader() {
  const e = env();
  const key = e.WC_CONSUMER_KEY;
  const secret = e.WC_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("WC_CONSUMER_KEY / WC_CONSUMER_SECRET not set");
  return `Basic ${btoa(`${key}:${secret}`)}`;
}

async function wcFetch<T>(path: string): Promise<T> {
  const { body } = await wcFetchRaw(path);
  return body as T;
}

async function wcFetchPage<T>(
  path: string,
  page: number,
  perPage: number,
): Promise<WCPage<T>> {
  const { body, headers } = await wcFetchRaw(path);
  return {
    items: body as T[],
    page,
    perPage,
    total: Number(headers.get("x-wp-total") ?? (body as T[]).length),
    totalPages: Number(headers.get("x-wp-totalpages") ?? 1),
  };
}

async function wcFetchRaw(path: string): Promise<{ body: unknown; headers: Headers }> {
  const e = env();
  const url = `${e.WC_API_URL}${path}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const r = await fetch(url, {
      headers: { Authorization: authHeader() },
      cache: "no-store",
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`WC ${path} ${r.status}: ${t.slice(0, 300)}`);
    }
    return { body: await r.json(), headers: r.headers };
  } finally {
    clearTimeout(timer);
  }
}

export async function wcListAllProducts(): Promise<WCProduct[]> {
  // Walk all pages. WC returns total pages in `x-wp-totalpages` but we'll
  // just loop until we get less than per_page results.
  const PER_PAGE = 50;
  const out: WCProduct[] = [];
  for (let page = 1; page <= 20; page++) {
    const batch = await wcFetch<WCProduct[]>(
      `/products?per_page=${PER_PAGE}&page=${page}&status=publish&orderby=date&order=desc`,
    );
    out.push(...batch);
    if (batch.length < PER_PAGE) break;
  }
  return out;
}

export async function wcGetProduct(id: number): Promise<WCProduct> {
  return wcFetch<WCProduct>(`/products/${id}`);
}

// ---------- Customers ----------

export interface WCAddress {
  first_name?: string;
  last_name?: string;
  company?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  email?: string;
  phone?: string;
}

export interface WCMeta {
  id: number;
  key: string;
  value: string | number | boolean | null;
}

export interface WCCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  avatar_url?: string;
  billing: WCAddress;
  shipping: WCAddress;
  date_created: string;
  is_paying_customer?: boolean;
  meta_data?: WCMeta[];
}

/** One page of WC customers with pagination metadata. */
export interface WCPage<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export async function wcListCustomersPage(
  page = 1,
  perPage = 50,
): Promise<WCPage<WCCustomer>> {
  // `context=edit` is required to get all meta_data (private keys prefixed
  // with `_` are hidden in the default `view` context). Requires the API key
  // to have write or admin privileges on the WC API.
  return wcFetchPage<WCCustomer>(
    `/customers?per_page=${perPage}&page=${page}&role=all&context=edit&orderby=id&order=desc`,
    page,
    perPage,
  );
}

export async function wcGetCustomer(id: number): Promise<WCCustomer> {
  return wcFetch<WCCustomer>(`/customers/${id}?context=edit`);
}

/** Fetch all customers (used by POST import-all). Still capped to 1000. */
export async function wcListAllCustomers(): Promise<WCCustomer[]> {
  const out: WCCustomer[] = [];
  for (let page = 1; page <= 20; page++) {
    try {
      const r = await wcListCustomersPage(page, 50);
      out.push(...r.items);
      if (page >= r.totalPages) break;
    } catch (e) {
      if (page === 1) throw e;
      break;
    }
  }
  return out;
}

// ---------- Orders ----------

export interface WCLineItem {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  subtotal: string;
  total: string;
  price: number;
}

export interface WCCouponLine {
  id: number;
  code: string;
  discount: string;
  discount_tax?: string;
}

export interface WCOrder {
  id: number;
  number: string;
  status: string; // pending | processing | on-hold | completed | cancelled | refunded | failed
  currency: string;
  total: string;
  subtotal?: string;
  customer_id: number;
  billing: WCAddress;
  line_items: WCLineItem[];
  coupon_lines?: WCCouponLine[];
  date_created: string;
  date_paid?: string | null;
  date_completed?: string | null;
  payment_method?: string;
  payment_method_title?: string;
}

export async function wcListOrdersPage(
  page = 1,
  perPage = 50,
): Promise<WCPage<WCOrder>> {
  return wcFetchPage<WCOrder>(
    `/orders?per_page=${perPage}&page=${page}&orderby=id&order=desc`,
    page,
    perPage,
  );
}

export async function wcListAllOrders(): Promise<WCOrder[]> {
  const out: WCOrder[] = [];
  for (let page = 1; page <= 20; page++) {
    try {
      const r = await wcListOrdersPage(page, 50);
      out.push(...r.items);
      if (page >= r.totalPages) break;
    } catch (e) {
      if (page === 1) throw e;
      break;
    }
  }
  return out;
}

// ---------- Coupons ----------

export interface WCCoupon {
  id: number;
  code: string;
  amount: string; // string number, e.g. "10" (percent) or "50.00" (fixed)
  discount_type: "percent" | "fixed_cart" | "fixed_product";
  description?: string;
  date_expires?: string | null;
  date_created: string;
  usage_count: number;
  usage_limit?: number | null;
  minimum_amount?: string | null; // "300.00"
  maximum_amount?: string | null;
  product_ids?: number[]; // WC product ids the coupon is restricted to
  excluded_product_ids?: number[];
}

export async function wcListCouponsPage(
  page = 1,
  perPage = 50,
): Promise<WCPage<WCCoupon>> {
  return wcFetchPage<WCCoupon>(
    `/coupons?per_page=${perPage}&page=${page}&orderby=id&order=desc`,
    page,
    perPage,
  );
}

export async function wcListAllCoupons(): Promise<WCCoupon[]> {
  const out: WCCoupon[] = [];
  for (let page = 1; page <= 20; page++) {
    try {
      const r = await wcListCouponsPage(page, 100);
      out.push(...r.items);
      if (page >= r.totalPages) break;
    } catch (e) {
      if (page === 1) throw e;
      break;
    }
  }
  return out;
}
