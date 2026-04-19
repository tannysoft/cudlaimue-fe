import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Cudlaimue D1 schema
 * - Money stored in **satang** (THB * 100) as integer to avoid float errors.
 * - Timestamps stored as unix epoch milliseconds (integer).
 * - Product type discriminator: 'font' | 'ebook'.
 */

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email"),
    phone: text("phone"),
    lineUserId: text("line_user_id"),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    passwordHash: text("password_hash"),
    role: text("role").notNull().default("user"), // 'user' | 'admin'
    isBanned: integer("is_banned", { mode: "boolean" }).notNull().default(false),
    billingAddress: text("billing_address"), // JSON (address_1, city, postcode, ...)
    shippingAddress: text("shipping_address"), // JSON — usually same as billing
    sourceWcId: integer("source_wc_id"), // WP customer id if migrated
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
    lineIdx: uniqueIndex("users_line_idx").on(t.lineUserId),
    sourceIdx: index("users_source_wc_idx").on(t.sourceWcId),
  }),
);

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(), // 'font' | 'ebook'
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    tagline: text("tagline"),
    description: text("description"), // markdown
    priceSatang: integer("price_satang").notNull(),
    compareAtPriceSatang: integer("compare_at_price_satang"),
    coverImageKey: text("cover_image_key"),
    previewImageKeys: text("preview_image_keys"), // JSON array of R2 keys
    fileKey: text("file_key"), // legacy single file (still used for ebook source)
    fileName: text("file_name"),
    fileSize: integer("file_size"),
    files: text("files"), // JSON array [{ key, name, size }] — multiple downloadable files
    pageCount: integer("page_count"), // ebook only
    tags: text("tags"), // JSON array of strings
    categories: text("categories"), // JSON array of strings
    sourceWcId: integer("source_wc_id"), // WooCommerce product id if imported from WP
    isPublished: integer("is_published", { mode: "boolean" }).notNull().default(false),
    isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => ({
    slugIdx: uniqueIndex("products_slug_idx").on(t.slug),
    typeIdx: index("products_type_idx").on(t.type),
  }),
);

export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    status: text("status").notNull().default("pending"), // pending|paid|failed|cancelled|refunded
    currency: text("currency").notNull().default("THB"),
    subtotalSatang: integer("subtotal_satang").notNull(),
    totalSatang: integer("total_satang").notNull(),
    customerEmail: text("customer_email"),
    customerName: text("customer_name"),
    customerPhone: text("customer_phone"),
    customerDistrict: text("customer_district"), // อำเภอ / เขต
    customerProvince: text("customer_province"), // TH-XX code or display name
    couponCode: text("coupon_code"), // applied coupon (uppercase) — null if none
    discountSatang: integer("discount_satang").notNull().default(0),
    beamChargeId: text("beam_charge_id"),
    beamPaymentLinkId: text("beam_payment_link_id"),
    beamStatus: text("beam_status"),
    paymentQrUrl: text("payment_qr_url"), // Beam QR PromptPay image URL
    paymentExpiresAt: integer("payment_expires_at"), // unix ms, from Beam
    paidAt: integer("paid_at"),
    sourceWcId: integer("source_wc_id"), // WP order id if migrated
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => ({
    userIdx: index("orders_user_idx").on(t.userId),
    statusIdx: index("orders_status_idx").on(t.status),
    beamIdx: index("orders_beam_idx").on(t.beamChargeId),
    sourceIdx: index("orders_source_wc_idx").on(t.sourceWcId),
  }),
);

export const orderItems = sqliteTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull().references(() => products.id),
    productType: text("product_type").notNull(),
    productNameSnapshot: text("product_name_snapshot").notNull(),
    priceSatang: integer("price_satang").notNull(),
    quantity: integer("quantity").notNull().default(1),
  },
  (t) => ({
    orderIdx: index("order_items_order_idx").on(t.orderId),
  }),
);

export const entitlements = sqliteTable(
  "entitlements",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    productId: text("product_id").notNull().references(() => products.id),
    orderId: text("order_id").notNull().references(() => orders.id),
    grantedAt: integer("granted_at").notNull(),
  },
  (t) => ({
    userProductIdx: uniqueIndex("entitlements_user_product_idx").on(t.userId, t.productId),
    userIdx: index("entitlements_user_idx").on(t.userId),
    userGrantedIdx: index("entitlements_user_granted_idx").on(t.userId, t.grantedAt),
  }),
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
    userAgent: text("user_agent"),
    ip: text("ip"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({
    userIdx: index("sessions_user_idx").on(t.userId),
  }),
);

export const carts = sqliteTable(
  "carts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id),
    anonymousToken: text("anonymous_token"),
    items: text("items").notNull().default("[]"), // JSON: [{productId, qty}]
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => ({
    userIdx: index("carts_user_idx").on(t.userId),
    anonIdx: index("carts_anon_idx").on(t.anonymousToken),
  }),
);

export const downloadLogs = sqliteTable(
  "download_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    productId: text("product_id").notNull().references(() => products.id),
    action: text("action").notNull(), // font_download | ebook_page_view | ebook_open
    page: integer("page"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({
    userIdx: index("download_logs_user_idx").on(t.userId),
    productIdx: index("download_logs_product_idx").on(t.productId),
  }),
);

export const adminAudit = sqliteTable("admin_audit", {
  id: text("id").primaryKey(),
  adminId: text("admin_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  target: text("target"),
  payload: text("payload"), // JSON
  createdAt: integer("created_at").notNull(),
});

export const coupons = sqliteTable(
  "coupons",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(), // stored uppercase, e.g. "BUNDLE3"
    type: text("type").notNull(), // 'percent' | 'fixed'
    value: integer("value").notNull(), // percent → 1..100, fixed → satang
    minSubtotalSatang: integer("min_subtotal_satang"), // null = no min
    maxUses: integer("max_uses"), // null = unlimited
    usedCount: integer("used_count").notNull().default(0),
    expiresAt: integer("expires_at"), // unix ms, null = no expiry
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    // JSON array of product ids this coupon is restricted to. null/empty
    // string = applies to every product in the cart. When set, the coupon's
    // discount is computed only against the eligible items' subtotal.
    productIds: text("product_ids"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => ({
    codeIdx: uniqueIndex("coupons_code_idx").on(t.code),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Entitlement = typeof entitlements.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type NewCoupon = typeof coupons.$inferInsert;
