-- Admin list pages (users/orders/products) sort by created_at DESC and then
-- paginate. Without an index SQLite needs to scan the whole table and build a
-- sort buffer — which blows the Worker CPU budget once tables grow past a few
-- thousand rows. These indexes make pagination O(log n) per page.
CREATE INDEX IF NOT EXISTS `users_created_at_idx` ON `users` (`created_at` DESC);
CREATE INDEX IF NOT EXISTS `orders_created_at_idx` ON `orders` (`created_at` DESC);
CREATE INDEX IF NOT EXISTS `products_created_at_idx` ON `products` (`created_at` DESC);

-- `download_logs` grows very fast — add a time index so audit queries (if we
-- add them later) are not linear scans either.
CREATE INDEX IF NOT EXISTS `download_logs_created_at_idx` ON `download_logs` (`created_at` DESC);
