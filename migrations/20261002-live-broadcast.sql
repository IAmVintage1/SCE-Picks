-- Additive migration. Keeps existing players, predictions and box scores.
BEGIN;
CREATE TABLE IF NOT EXISTS broadcast_state (
 id integer PRIMARY KEY CHECK(id=1), revision bigint NOT NULL DEFAULT 0,
 period integer NOT NULL DEFAULT 1 CHECK(period BETWEEN 1 AND 20),
 clock_seconds integer NOT NULL DEFAULT 600 CHECK(clock_seconds BETWEEN 0 AND 7200),
 clock_running boolean NOT NULL DEFAULT false, clock_started_at timestamptz,
 status text NOT NULL DEFAULT 'pregame' CHECK(status IN ('pregame','live','final')),
 scoreboard_visible boolean NOT NULL DEFAULT true, boxscore_visible boolean NOT NULL DEFAULT false,
 player_visible boolean NOT NULL DEFAULT false, boxscore_team text NOT NULL DEFAULT 'both'
 CHECK(boxscore_team IN ('both','youngknights','alumknights')),
 featured_player_id uuid REFERENCES players(id) ON DELETE SET NULL,
 token_version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO broadcast_state(id) VALUES(1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS live_stat_events (
 id uuid PRIMARY KEY, player_id uuid NOT NULL REFERENCES players(id),
 deltas jsonb NOT NULL, label text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 reversed_at timestamptz
);
CREATE INDEX IF NOT EXISTS live_stat_events_recent ON live_stat_events(created_at DESC);
-- Serialize game writes and apply a whole shot or correction in one transaction.
-- Reusing an event ID is safe after an ambiguous network failure.
CREATE OR REPLACE FUNCTION record_live_action(p_id uuid,p_player uuid,p_deltas jsonb,p_label text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE item record; current_value numeric;
BEGIN
 PERFORM 1 FROM broadcast_state WHERE id=1 FOR UPDATE;
 IF EXISTS(SELECT 1 FROM live_stat_events WHERE id=p_id) THEN RETURN; END IF;
 IF (SELECT status FROM broadcast_state WHERE id=1)='final' THEN
  RAISE EXCEPTION 'Game is final. Reopen the game before changing stats.';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM players WHERE id=p_player AND active=true) THEN RAISE EXCEPTION 'Active player required'; END IF;
 IF jsonb_typeof(p_deltas) <> 'object' OR p_deltas='{}'::jsonb THEN RAISE EXCEPTION 'Stat changes required'; END IF;
 FOR item IN SELECT key,value FROM jsonb_each_text(p_deltas) LOOP
  IF item.key NOT IN ('points','rebounds','assists','three_pt_made','three_pt_attempted','steals','blocks','turnovers','fouls','field_goals_made','field_goals_attempted','ft_made','ft_attempted')
   OR item.value::numeric <> trunc(item.value::numeric) OR abs(item.value::numeric)>100 THEN RAISE EXCEPTION 'Invalid stat delta'; END IF;
  SELECT coalesce((SELECT value FROM live_box_score WHERE player_id=p_player AND stat_type=item.key),0) INTO current_value;
  IF current_value+item.value::numeric<0 THEN RAISE EXCEPTION 'Correction would make a stat negative'; END IF;
  INSERT INTO live_box_score(player_id,stat_type,value) VALUES(p_player,item.key,item.value::numeric)
  ON CONFLICT(player_id,stat_type) DO UPDATE SET value=live_box_score.value+excluded.value,updated_at=now();
 END LOOP;
 INSERT INTO live_stat_events(id,player_id,deltas,label) VALUES(p_id,p_player,p_deltas,left(p_label,120));
 UPDATE broadcast_state SET revision=revision+1,updated_at=now() WHERE id=1;
END $$;
CREATE OR REPLACE FUNCTION undo_live_action(p_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE event live_stat_events; item record;
BEGIN
 PERFORM 1 FROM broadcast_state WHERE id=1 FOR UPDATE;
 IF (SELECT status FROM broadcast_state WHERE id=1)='final' THEN RAISE EXCEPTION 'Game is final'; END IF;
 SELECT * INTO event FROM live_stat_events WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Action not found'; END IF;
 IF event.reversed_at IS NOT NULL THEN RETURN; END IF;
 FOR item IN SELECT key,value FROM jsonb_each_text(event.deltas) LOOP
  IF coalesce((SELECT value FROM live_box_score WHERE player_id=event.player_id AND stat_type=item.key),0)-item.value::numeric<0 THEN
   RAISE EXCEPTION 'Cannot undo after another correction. Correct the stats instead.';
  END IF;
  UPDATE live_box_score SET value=value-item.value::numeric,updated_at=now() WHERE player_id=event.player_id AND stat_type=item.key;
 END LOOP;
 UPDATE live_stat_events SET reversed_at=now() WHERE id=p_id;
 UPDATE broadcast_state SET revision=revision+1,updated_at=now() WHERE id=1;
END $$;
-- Legacy callers remain compatible without prematurely grading predictions.
CREATE OR REPLACE FUNCTION bump_live_stat(p_player_id uuid,p_stat_type text,p_delta numeric)
RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 PERFORM record_live_action(gen_random_uuid(),p_player_id,jsonb_build_object(p_stat_type,p_delta),'Stat correction');
END $$;
COMMIT;
