-- Coupon system: discount codes that customers redeem at cart/checkout.
-- Each coupon is single-use-per-stamp (we increment used_count atomically
-- when an order is created). Two discount types are supported:
--   - percent: `value` is 1..100 (e.g. 10 = 10% off subtotal)
--   - fixed:   `value` is satang (e.g. 5000 = 50 baht flat off)
CREATE TABLE IF NOT EXISTS `coupons` (
  `id` text PRIMARY KEY NOT NULL,
  `code` text NOT NULL,
  `type` text NOT NULL,
  `value` integer NOT NULL,
  `min_subtotal_satang` integer,
  `max_uses` integer,
  `used_count` integer DEFAULT 0 NOT NULL,
  `expires_at` integer,
  `is_active` integer DEFAULT true NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `coupons_code_idx` ON `coupons` (`code`);

-- Track which coupon (if any) was applied to each order, plus the resulting
-- discount amount. `discount_satang` is the value subtracted from subtotal
-- to arrive at total — kept in its own column so future audits / receipts
-- can break out the discount line cleanly without re-running coupon logic.
ALTER TABLE `orders` ADD COLUMN `coupon_code` text;
ALTER TABLE `orders` ADD COLUMN `discount_satang` integer DEFAULT 0 NOT NULL;
