-- User detail page sorts a user's entitlements by granted_at DESC. Without a
-- composite (user_id, granted_at) index SQLite has to scan all of a user's
-- entitlements and sort in memory — fine when entitlements are small, but
-- blows past the Worker CPU budget on heavy buyers post-migration.
CREATE INDEX IF NOT EXISTS `entitlements_user_granted_idx`
  ON `entitlements` (`user_id`, `granted_at`);
