-- Cudlaimue initial schema — D1 (SQLite)
-- Run:   pnpm wrangler d1 migrations apply cudlaimue-db --remote

CREATE TABLE `users` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text,
  `phone` text,
  `line_user_id` text,
  `display_name` text,
  `avatar_url` text,
  `password_hash` text,
  `role` text DEFAULT 'user' NOT NULL,
  `is_banned` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);
CREATE UNIQUE INDEX `users_line_idx` ON `users` (`line_user_id`);

CREATE TABLE `products` (
  `id` text PRIMARY KEY NOT NULL,
  `type` text NOT NULL,
  `slug` text NOT NULL,
  `name` text NOT NULL,
  `tagline` text,
  `description` text,
  `price_satang` integer NOT NULL,
  `compare_at_price_satang` integer,
  `cover_image_key` text,
  `preview_image_keys` text,
  `file_key` text,
  `file_name` text,
  `file_size` integer,
  `page_count` integer,
  `is_published` integer DEFAULT 0 NOT NULL,
  `is_featured` integer DEFAULT 0 NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
CREATE UNIQUE INDEX `products_slug_idx` ON `products` (`slug`);
CREATE INDEX `products_type_idx` ON `products` (`type`);

CREATE TABLE `orders` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`),
  `status` text DEFAULT 'pending' NOT NULL,
  `currency` text DEFAULT 'THB' NOT NULL,
  `subtotal_satang` integer NOT NULL,
  `total_satang` integer NOT NULL,
  `customer_email` text,
  `customer_name` text,
  `customer_phone` text,
  `beam_charge_id` text,
  `beam_payment_link_id` text,
  `beam_status` text,
  `paid_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
CREATE INDEX `orders_user_idx` ON `orders` (`user_id`);
CREATE INDEX `orders_status_idx` ON `orders` (`status`);
CREATE INDEX `orders_beam_idx` ON `orders` (`beam_charge_id`);

CREATE TABLE `order_items` (
  `id` text PRIMARY KEY NOT NULL,
  `order_id` text NOT NULL REFERENCES `orders`(`id`) ON DELETE CASCADE,
  `product_id` text NOT NULL REFERENCES `products`(`id`),
  `product_type` text NOT NULL,
  `product_name_snapshot` text NOT NULL,
  `price_satang` integer NOT NULL,
  `quantity` integer DEFAULT 1 NOT NULL
);
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);

CREATE TABLE `entitlements` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`),
  `product_id` text NOT NULL REFERENCES `products`(`id`),
  `order_id` text NOT NULL REFERENCES `orders`(`id`),
  `granted_at` integer NOT NULL
);
CREATE UNIQUE INDEX `entitlements_user_product_idx` ON `entitlements` (`user_id`, `product_id`);
CREATE INDEX `entitlements_user_idx` ON `entitlements` (`user_id`);

CREATE TABLE `sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `expires_at` integer NOT NULL,
  `user_agent` text,
  `ip` text,
  `created_at` integer NOT NULL
);
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);

CREATE TABLE `carts` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text REFERENCES `users`(`id`),
  `anonymous_token` text,
  `items` text DEFAULT '[]' NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
CREATE INDEX `carts_user_idx` ON `carts` (`user_id`);
CREATE INDEX `carts_anon_idx` ON `carts` (`anonymous_token`);

CREATE TABLE `download_logs` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`),
  `product_id` text NOT NULL REFERENCES `products`(`id`),
  `action` text NOT NULL,
  `page` integer,
  `ip` text,
  `user_agent` text,
  `created_at` integer NOT NULL
);
CREATE INDEX `download_logs_user_idx` ON `download_logs` (`user_id`);
CREATE INDEX `download_logs_product_idx` ON `download_logs` (`product_id`);

CREATE TABLE `admin_audit` (
  `id` text PRIMARY KEY NOT NULL,
  `admin_id` text NOT NULL REFERENCES `users`(`id`),
  `action` text NOT NULL,
  `target` text,
  `payload` text,
  `created_at` integer NOT NULL
);
