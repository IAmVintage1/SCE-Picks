-- ============================================================
-- STEP 5 of 5 — OPTIONAL, run only if you want to.
-- Deactivates (not deletes) the 4 test players you created
-- while debugging (Tracy McGrady, Vince Carter, Marcus Smart,
-- DeAaron Fox) and their duplicate test props, since they were
-- never part of your real roster. Deactivating keeps the rows
-- around instead of destroying them, in case you want them back.
-- ============================================================

update players
set active = false
where name in ('Tracy McGrady', 'Vince Carter', 'Marcus Smart', 'DeAaron Fox');

update props
set active = false
where player_id in (
  select id from players
  where name in ('Tracy McGrady', 'Vince Carter', 'Marcus Smart', 'DeAaron Fox')
);
