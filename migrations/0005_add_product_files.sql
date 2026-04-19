-- Support multiple downloadable files per product (WooCommerce allows it —
-- e.g. a planner SKU ships with Daily/Weekly/Monthly PDFs). Store as a JSON
-- array of `{key, name, size}`. Legacy `file_*` columns remain for ebook
-- rasterization (which needs a single source.pdf).
ALTER TABLE `products` ADD COLUMN `files` text;
