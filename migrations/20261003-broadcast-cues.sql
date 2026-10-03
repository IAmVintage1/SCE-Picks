BEGIN;
ALTER TABLE broadcast_state
  ADD COLUMN IF NOT EXISTS boxscore_visible_until timestamptz,
  ADD COLUMN IF NOT EXISTS player_visible_until timestamptz;
COMMIT;
