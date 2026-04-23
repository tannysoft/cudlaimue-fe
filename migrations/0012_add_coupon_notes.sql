-- Internal admin note for coupons. Plain text, not shown to customers.
-- Used to record the reason, campaign, or context behind the coupon.
ALTER TABLE `coupons` ADD COLUMN `notes` text;
