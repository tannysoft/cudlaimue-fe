-- Add tags + categories to products (both stored as JSON arrays of strings)
ALTER TABLE `products` ADD COLUMN `tags` text;
ALTER TABLE `products` ADD COLUMN `categories` text;
