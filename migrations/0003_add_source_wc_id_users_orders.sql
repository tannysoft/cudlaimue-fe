-- Track WooCommerce origin on users + orders so the admin can re-run the
-- customers/orders importers cleanly.
ALTER TABLE `users` ADD COLUMN `source_wc_id` integer;
CREATE INDEX `users_source_wc_idx` ON `users` (`source_wc_id`);

ALTER TABLE `orders` ADD COLUMN `source_wc_id` integer;
CREATE INDEX `orders_source_wc_idx` ON `orders` (`source_wc_id`);
