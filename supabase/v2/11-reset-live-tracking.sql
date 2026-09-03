-- ============================================================
-- STEP 11 — full reset for live stat tracking.
--
-- Wipes every raw stat your trackers have logged, along with
-- everything that got auto-graded off of it: player prop
-- results, the Combined Points team result, every pick/team
-- pick's hit-miss-pending status, and every submission's
-- card_status. Everything goes back to a clean "nothing has
-- happened yet" state.
--
-- What this does NOT touch: the submissions themselves (who
-- picked what stays intact), and the Winning Team result if an
-- admin already entered one manually.
--
-- Meant for wiping a practice run before the real game starts.
-- Safe to re-run.
-- ============================================================

create or replace function reset_live_tracking()
returns void
language plpgsql
as $$
begin
  delete from live_box_score;
  delete from results;

  -- Only clear the Combined Points half of team_prop_results.
  -- Winning Team lives in the same table but a different row
  -- (team_props.prop_type is unique), so it's untouched.
  delete from team_prop_results
  where team_prop_id in (
    select id from team_props where prop_type = 'combined_points'
  );

  update picks set result = 'pending';
  update team_picks set result = 'pending';
  update submissions set card_status = 'pending';
end;
$$;
