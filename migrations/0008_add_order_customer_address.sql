-- Checkout form now requires district + province for every order so we can
-- send accurate billing info to Beamcheckout and have it on file for refunds
-- / receipts.
ALTER TABLE `orders` ADD COLUMN `customer_district` text;
ALTER TABLE `orders` ADD COLUMN `customer_province` text;
