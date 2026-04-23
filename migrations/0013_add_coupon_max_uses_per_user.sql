-- Per-user usage cap. null = unlimited (legacy/default), 1 = classic "one
-- redemption per user" coupon. Counts paid/refunded orders only — pending
-- or failed orders don't consume a slot.
ALTER TABLE `coupons` ADD COLUMN `max_uses_per_user` integer;
