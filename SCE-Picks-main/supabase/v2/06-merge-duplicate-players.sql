-- ============================================================
-- STEP 6 — fixes the 3 mismatched names from the last update.
-- Confirmed against your actual roster:
--   "Drich"       -> is Donavan Richardson (already existed)
--   "Kai Mattox"  -> is actually Mekhai Ryan going by "Kai"
--                    (confirmed NOT the same person as Kay Mattox
--                    -- those two stay separate, no change needed)
--   "Joe"         -> is Joe Mooney (the placeholder second "Eric"
--                    from your very first roster upload)
--
-- This re-points each prop to the correct real player, then
-- deactivates the incorrect duplicate player row (not deleted,
-- just hidden, in case anything unexpected referenced it).
-- Safe to run even if a submission already exists against one
-- of these props -- picks reference the prop, not the player
-- name directly, so existing submissions correct themselves
-- automatically once the prop points at the right player.
-- ============================================================

-- ---------- Drich -> Donavan Richardson ----------
update props
set player_id = (select id from players where name = 'Donavan Richardson')
where player_id = (select id from players where name = 'Drich');

update players set active = false where name = 'Drich';

-- ---------- Kai Mattox -> Mekhai Ryan ----------
update props
set player_id = (select id from players where name = 'Mekhai Ryan')
where player_id = (select id from players where name = 'Kai Mattox');

update players set active = false where name = 'Kai Mattox';

-- ---------- Joe -> Joe Mooney (was placeholder "Eric") ----------
update props
set player_id = (select id from players where name = 'Eric')
where player_id = (select id from players where name = 'Joe');

update players set name = 'Joe Mooney' where name = 'Eric';
update players set active = false where name = 'Joe';
