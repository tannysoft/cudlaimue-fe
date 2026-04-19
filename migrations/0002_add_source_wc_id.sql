-- Track which products originated from the WooCommerce importer so the admin
-- can wipe and re-run the import without touching manually-created products.
ALTER TABLE `products` ADD COLUMN `source_wc_id` integer;
CREATE INDEX `products_source_wc_idx` ON `products` (`source_wc_id`);
