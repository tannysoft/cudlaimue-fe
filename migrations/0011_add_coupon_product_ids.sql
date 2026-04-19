-- Optional per-product restriction for coupons. Stores a JSON array of
-- product ids. Null / empty = coupon applies to every item in the cart.
-- When set, the discount is computed only against matching items' subtotal,
-- and the coupon is rejected if the cart contains no matching product.
ALTER TABLE `coupons` ADD COLUMN `product_ids` text;
