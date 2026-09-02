-- ============================================================
-- STEP 4 of 5 — the actual prop board.
-- Safe to re-run: uses your existing unique(player_id, stat_type)
-- constraint to UPDATE the line if a prop already exists (so it
-- also corrects any placeholder/test lines from earlier testing)
-- instead of erroring or duplicating.
--
-- IMPORTANT — READ BEFORE RUNNING:
-- Three names in your prop list don't exactly match your
-- original 20-player roster:  JOE, DRICH, and KAI MATTOX.
-- These read like nicknames for existing players (Eric?,
-- Donavan Richardson?, Mekhai Ryan?), but I did not guess and
-- silently rename anyone -- a wrong guess could scramble real
-- pick history. Instead this script adds them as new player
-- rows if they don't already exist by that exact name. If any
-- of these are the SAME person as an existing roster name, tell
-- me and I'll write a one-line cleanup to merge/rename properly
-- and deactivate the duplicate.
-- ============================================================

-- Add the 3 ambiguous names as players only if they don't already exist.
insert into players (name, team_id, active)
select 'Joe', t.id, true from teams t where t.slug = 'youngknights'
and not exists (select 1 from players where name = 'Joe');

insert into players (name, team_id, active)
select 'Drich', t.id, true from teams t where t.slug = 'alumknights'
and not exists (select 1 from players where name = 'Drich');

insert into players (name, team_id, active)
select 'Kai Mattox', t.id, true from teams t where t.slug = 'alumknights'
and not exists (select 1 from players where name = 'Kai Mattox');

-- ---------- the real prop board ----------
insert into props (player_id, stat_type, line, featured)
select p.id, v.stat_type::stat_type, v.line, v.featured
from (values
  -- YOUNGKNIGHTS
  ('Bao Nguyen', 'points', 19.5, true),
  ('Bao Nguyen', 'three_pt_made', 3.5, false),
  ('Bao Nguyen', 'points_rebounds', 23.5, false),
  ('Bao Nguyen', 'pra', 27.5, false),

  ('Tawana Destave', 'points', 4.5, false),
  ('Tawana Destave', 'rebounds', 3.5, false),
  ('Tawana Destave', 'points_rebounds', 8.5, false),

  ('Matt Williams', 'points', 18.5, true),
  ('Matt Williams', 'rebounds', 6.5, false),
  ('Matt Williams', 'points_rebounds', 25.5, false),
  ('Matt Williams', 'pra', 28.5, false),

  ('Elijah Louis', 'points', 8.5, false),
  ('Elijah Louis', 'rebounds', 5.5, false),
  ('Elijah Louis', 'points_rebounds', 14.5, false),
  ('Elijah Louis', 'blocks', 0.5, false),

  ('Joe', 'points', 7.5, false),
  ('Joe', 'rebounds', 7.5, false),
  ('Joe', 'points_rebounds', 15.5, false),
  ('Joe', 'blocks', 1.5, false),

  ('Adrian Pantoja', 'points', 10.5, false),
  ('Adrian Pantoja', 'steals', 2.5, true),
  ('Adrian Pantoja', 'assists', 2.5, false),
  ('Adrian Pantoja', 'points_rebounds', 14.5, false),

  ('Mia Ruiz', 'points', 3.5, false),
  ('Mia Ruiz', 'rebounds', 2.5, false),
  ('Mia Ruiz', 'points_rebounds', 6.5, false),

  ('Eric Perez', 'points', 8.5, false),
  ('Eric Perez', 'three_pt_made', 1.5, false),
  ('Eric Perez', 'points_rebounds', 12.5, false),

  ('Da''Juan Thornton', 'points', 6.5, false),
  ('Da''Juan Thornton', 'rebounds', 5.5, false),
  ('Da''Juan Thornton', 'blocks', 0.5, false),
  ('Da''Juan Thornton', 'points_rebounds', 12.5, false),

  ('Nohl Abellana', 'points', 8.5, false),
  ('Nohl Abellana', 'three_pt_made', 1.5, true),
  ('Nohl Abellana', 'rebounds', 4.5, false),
  ('Nohl Abellana', 'points_rebounds', 13.5, false),
  ('Nohl Abellana', 'pra', 16.5, false),

  -- ALUMKNIGHTS
  ('Drich', 'points', 19.5, true),
  ('Drich', 'three_pt_made', 3.5, false),
  ('Drich', 'assists', 3.5, false),
  ('Drich', 'points_assists', 24.5, false),
  ('Drich', 'pra', 28.5, false),

  ('Vanessa Smarth', 'points', 3.5, false),
  ('Vanessa Smarth', 'rebounds', 3.5, false),
  ('Vanessa Smarth', 'assists', 2.5, false),
  ('Vanessa Smarth', 'points_rebounds', 7.5, false),

  ('Stephen Blackwood', 'points', 15.5, true),
  ('Stephen Blackwood', 'three_pt_made', 2.5, false),
  ('Stephen Blackwood', 'rebounds', 4.5, false),
  ('Stephen Blackwood', 'points_rebounds', 20.5, false),
  ('Stephen Blackwood', 'pra', 23.5, false),

  ('Shemar Hutchins', 'points', 11.5, false),
  ('Shemar Hutchins', 'rebounds', 6.5, false),
  ('Shemar Hutchins', 'blocks', 0.5, false),
  ('Shemar Hutchins', 'points_rebounds', 18.5, false),

  ('Justin McCray', 'points', 10.5, false),
  ('Justin McCray', 'rebounds', 7.5, false),
  ('Justin McCray', 'blocks', 1.5, false),
  ('Justin McCray', 'rebounds_blocks', 9.5, true),
  ('Justin McCray', 'points_rebounds', 18.5, false),

  ('Michael Cunningham', 'points', 12.5, false),
  ('Michael Cunningham', 'rebounds', 6.5, false),
  ('Michael Cunningham', 'assists', 3.5, false),
  ('Michael Cunningham', 'points_rebounds', 19.5, true),
  ('Michael Cunningham', 'pra', 23.5, false),

  ('Kai Mattox', 'points', 5.5, false),
  ('Kai Mattox', 'rebounds', 4.5, false),
  ('Kai Mattox', 'steals', 1.5, false),
  ('Kai Mattox', 'points_rebounds', 10.5, false),

  ('Kay Mattox', 'points', 5.5, false),
  ('Kay Mattox', 'rebounds', 3.5, false),
  ('Kay Mattox', 'points_rebounds', 9.5, false),

  ('Toom', 'points', 5.5, false),
  ('Toom', 'rebounds', 4.5, false),
  ('Toom', 'points_rebounds', 10.5, false),

  ('Robert Smith III', 'points', 8.5, false),
  ('Robert Smith III', 'rebounds', 5.5, false),
  ('Robert Smith III', 'assists', 2.5, false),
  ('Robert Smith III', 'points_rebounds', 14.5, false),
  ('Robert Smith III', 'pra', 17.5, false)
) as v(player_name, stat_type, line, featured)
join players p on p.name = v.player_name
on conflict (player_id, stat_type)
do update set line = excluded.line, featured = excluded.featured, active = true;

-- ---------- team-level props ----------
insert into team_props (prop_type, line, featured, active)
values ('winning_team', null, true, true)
on conflict (prop_type) do update set featured = true, active = true;

insert into team_props (prop_type, line, featured, active)
values ('combined_points', 137.5, true, true)
on conflict (prop_type) do update set line = 137.5, featured = true, active = true;
