-- ============================================================
-- SCE PICKS — Seed data
-- Run this AFTER schema.sql. Adds the two teams and the exact
-- 20 roster players you provided. No stats or props are created
-- here — you create those yourself from the admin dashboard.
-- ============================================================

insert into teams (name, slug, color) values
  ('YoungKnights', 'youngknights', '#E23428'),
  ('AlumKnights', 'alumknights', '#1E4FE0')
on conflict (name) do nothing;

-- AlumKnights roster
insert into players (name, team_id, active)
select p.name, t.id, true
from (values
  ('Shemar Hutchins'),
  ('Vanessa Smarth'),
  ('Justin McCray'),
  ('Michael Cunningham'),
  ('Donavan Richardson'),
  ('Toom'),
  ('Robert Smith III'),
  ('Mekhai Ryan'),
  ('Stephen Blackwood'),
  ('Kay Mattox')
) as p(name)
cross join (select id from teams where slug = 'alumknights') as t
on conflict do nothing;

-- YoungKnights roster
insert into players (name, team_id, active)
select p.name, t.id, true
from (values
  ('Bao Nguyen'),
  ('Tawana Destave'),
  ('Adrian Pantoja'),
  ('Matt Williams'),
  ('Elijah Louis'),
  ('Eric Perez'),
  ('Eric'),
  ('Da''Juan Thornton'),
  ('Nohl Abellana'),
  ('Mia Ruiz')
) as p(name)
cross join (select id from teams where slug = 'youngknights') as t
on conflict do nothing;
