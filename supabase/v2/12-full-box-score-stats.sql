-- ============================================================
-- STEP 12 — widen live tracking to a full box score.
--
-- The props/betting side of the app only ever uses points,
-- rebounds, assists, three_pt_made, steals, and blocks (that
-- part is unchanged, nothing new here becomes bettable). This
-- just lets trackers ALSO log fouls and shot attempts so the
-- end-of-game box score sheet has real shooting splits (FG,
-- 3PT, FT) instead of just makes.
--
-- Safe to re-run.
-- ============================================================

alter table live_box_score drop constraint if exists live_box_score_stat_type_check;

alter table live_box_score add constraint live_box_score_stat_type_check check (
  stat_type in (
    'points', 'rebounds', 'assists', 'three_pt_made',
    'steals', 'blocks', 'turnovers',
    'fouls',
    'field_goals_made', 'field_goals_attempted',
    'three_pt_attempted',
    'ft_made', 'ft_attempted'
  )
);
