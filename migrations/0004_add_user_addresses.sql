-- Store full billing/shipping address (JSON) on users — populated by the WC
-- customers importer so migrated data isn't lost. Columns are nullable so
-- native/LINE signups don't need to populate them.
ALTER TABLE `users` ADD COLUMN `billing_address` text;
ALTER TABLE `users` ADD COLUMN `shipping_address` text;
