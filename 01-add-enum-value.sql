-- ============================================================
-- STEP 1 of 5 — run this FIRST, by itself.
-- Postgres requires a brand-new enum value to be committed
-- before it can be used anywhere else, so this has to run
-- alone before 02-schema-additions.sql.
-- ============================================================

alter type stat_type add value if not exists 'rebounds_blocks';
