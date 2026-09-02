-- ============================================================
-- STEP 3 of 5 — safe to run any time after step 2.
-- Adds admin-configurable minimum pick count and prize text
-- for each tier. Defaults match the spec exactly.
-- ============================================================

alter table event_settings add column if not exists min_picks int not null default 3;
alter table event_settings add column if not exists prize_3 text not null default 'SCE Instagram shoutout';
alter table event_settings add column if not exists prize_5 text not null default 'SCE shirt';
alter table event_settings add column if not exists prize_10 text not null default 'Gift card';
