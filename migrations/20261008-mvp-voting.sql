BEGIN;

ALTER TABLE event_settings
  ADD COLUMN IF NOT EXISTS mvp_open_time timestamptz,
  ADD COLUMN IF NOT EXISTS mvp_voting_closed boolean NOT NULL DEFAULT false;

UPDATE event_settings
SET pick_lock_time = '2026-10-09 19:00:00 America/New_York',
    mvp_open_time = '2026-10-09 20:00:00 America/New_York',
    mvp_voting_closed = false,
    updated_at = now()
WHERE id = 1;

CREATE TABLE IF NOT EXISTS mvp_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  voter_token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mvp_votes_player_id_idx ON mvp_votes(player_id);
CREATE INDEX IF NOT EXISTS mvp_votes_created_at_idx ON mvp_votes(created_at DESC);

COMMIT;
