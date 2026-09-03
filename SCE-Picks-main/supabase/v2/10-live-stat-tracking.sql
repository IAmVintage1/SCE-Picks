-- ============================================================
-- STEP 10 — live stat tracking.
--
-- Trackers log raw box-score stats during the game (points,
-- rebounds, assists, 3PM, steals, blocks, turnovers) per player.
-- Every time a number changes, this recomputes and upserts into
-- the SAME `results` / `team_prop_results` tables your existing
-- Results page uses, which means your existing grading triggers
-- (trg_grade_picks, trg_grade_team_picks) fire automatically.
--
-- Nothing about grading, card_status, or the leaderboard needed
-- to change, they already react to `results` changing. This
-- just feeds them live instead of once after the game.
--
-- Safe to re-run.
-- ============================================================

create table if not exists live_box_score (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  stat_type text not null check (
    stat_type in (
      'points', 'rebounds', 'assists',
      'three_pt_made', 'steals', 'blocks', 'turnovers'
    )
  ),
  value numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (player_id, stat_type)
);

-- Admin-only table, no public policy needed, this is only ever
-- touched via the service-role client from an admin API route
-- (same pattern as every other write in this app).
alter table live_box_score enable row level security;

-- ------------------------------------------------------------
-- bump_live_stat(player_id, stat_type, delta)
--
-- Atomically adjusts one raw stat for one player (delta can be
-- negative, for corrections, clamped at 0), then recomputes
-- every active prop that player has, including combo props
-- like PTS+REB and PRA, and pushes the new actual_value into
-- `results`. Also keeps the Combined Points team prop synced
-- since it's just the sum of everyone's points.
-- ------------------------------------------------------------
create or replace function bump_live_stat(
  p_player_id uuid,
  p_stat_type text,
  p_delta numeric
)
returns void
language plpgsql
as $$
declare
  v_points numeric;
  v_rebounds numeric;
  v_assists numeric;
  v_three numeric;
  v_steals numeric;
  v_blocks numeric;
  v_turnovers numeric;
  v_actual numeric;
  v_total_points numeric;
  v_combined_id uuid;
  r record;
begin
  insert into live_box_score (player_id, stat_type, value)
  values (p_player_id, p_stat_type, greatest(p_delta, 0))
  on conflict (player_id, stat_type)
  do update set
    value = greatest(live_box_score.value + p_delta, 0),
    updated_at = now();

  select
    coalesce(max(value) filter (where stat_type = 'points'), 0),
    coalesce(max(value) filter (where stat_type = 'rebounds'), 0),
    coalesce(max(value) filter (where stat_type = 'assists'), 0),
    coalesce(max(value) filter (where stat_type = 'three_pt_made'), 0),
    coalesce(max(value) filter (where stat_type = 'steals'), 0),
    coalesce(max(value) filter (where stat_type = 'blocks'), 0),
    coalesce(max(value) filter (where stat_type = 'turnovers'), 0)
  into v_points, v_rebounds, v_assists, v_three, v_steals, v_blocks, v_turnovers
  from live_box_score
  where player_id = p_player_id;

  for r in
    select id, stat_type, line from props
    where player_id = p_player_id and active = true
  loop
    v_actual := case r.stat_type
      when 'points' then v_points
      when 'rebounds' then v_rebounds
      when 'assists' then v_assists
      when 'three_pt_made' then v_three
      when 'steals' then v_steals
      when 'blocks' then v_blocks
      when 'turnovers' then v_turnovers
      when 'points_rebounds' then v_points + v_rebounds
      when 'points_assists' then v_points + v_assists
      when 'rebounds_assists' then v_rebounds + v_assists
      when 'rebounds_blocks' then v_rebounds + v_blocks
      when 'pra' then v_points + v_rebounds + v_assists
      else null
    end;

    if v_actual is not null then
      insert into results (prop_id, actual_value, result)
      values (
        r.id,
        v_actual,
        case
          when v_actual = r.line then 'push'
          when v_actual > r.line then 'hit'
          else 'miss'
        end
      )
      on conflict (prop_id) do update
        set actual_value = excluded.actual_value,
            result = excluded.result,
            updated_at = now();
    end if;
  end loop;

  -- Bonus: Combined Points is just the sum of every player's
  -- live points total, keep it synced too. Winning Team is left
  -- alone here, that still gets entered manually once the game
  -- actually ends.
  if p_stat_type = 'points' then
    select coalesce(sum(value), 0) into v_total_points
    from live_box_score where stat_type = 'points';

    select id into v_combined_id
    from team_props
    where prop_type = 'combined_points' and active = true;

    if v_combined_id is not null then
      insert into team_prop_results (team_prop_id, actual_value)
      values (v_combined_id, v_total_points)
      on conflict (team_prop_id) do update
        set actual_value = excluded.actual_value,
            updated_at = now();
    end if;
  end if;
end;
$$;
