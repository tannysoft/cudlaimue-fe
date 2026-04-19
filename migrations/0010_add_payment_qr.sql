-- Beam QR PromptPay flow: we stopped using Beam's hosted payment page and
-- now render the QR on our own /checkout/return page. Store the QR image
-- URL + expiry per order so the return page can display it without an
-- extra Beam round-trip on every poll.
ALTER TABLE `orders` ADD COLUMN `payment_qr_url` text;
ALTER TABLE `orders` ADD COLUMN `payment_expires_at` integer;
