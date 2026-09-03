-- ============================================================
-- STEP 9 — two independent cleanups from cross-checking your
-- scouting report against the live prop data. Both halves are
-- safe to re-run.
-- ============================================================


-- ------------------------------------------------------------
-- PART A — merge duplicate player rows
--
-- Each block only acts if BOTH the bare placeholder row and the
-- real named row still exist. If you already fixed one of these
-- by hand in Admin, that block just does nothing.
--
-- What happens: any props still attached to the placeholder row
-- get moved onto the real row first, then the placeholder row
-- is deleted. Existing picks/submissions are untouched, they
-- reference the prop itself, not the player, so nothing breaks
-- even if people have already submitted cards.
-- ------------------------------------------------------------

-- 1) "Drich" (bare, holds the real prop lines) -> the actual
--    roster entry, 'Donavan "Drich" Richardson'
do $$
declare
  keep_id uuid;
  drop_id uuid;
begin
  select id into keep_id from players where name = 'Donavan "Drich" Richardson';
  select id into drop_id from players where name = 'Drich';

  if keep_id is not null and drop_id is not null then
    update props set player_id = keep_id where player_id = drop_id;
    delete from players where id = drop_id;
    raise notice 'Merged "Drich" into Donavan "Drich" Richardson';
  end if;
end $$;

-- 2) "Kai Mattox" (bare, holds the real prop lines, including
--    his steals prop) -> the actual roster entry,
--    'Mekhai "Kai" Ryan'
do $$
declare
  keep_id uuid;
  drop_id uuid;
begin
  select id into keep_id from players where name = 'Mekhai "Kai" Ryan';
  select id into drop_id from players where name = 'Kai Mattox';

  if keep_id is not null and drop_id is not null then
    update props set player_id = keep_id where player_id = drop_id;
    delete from players where id = drop_id;
    raise notice 'Merged "Kai Mattox" into Mekhai "Kai" Ryan';
  end if;
end $$;

-- 3) bare "Eric" (no props ever attached to this one, it was
--    just a leftover placeholder) -> 'Eric Perez'
do $$
declare
  keep_id uuid;
  drop_id uuid;
begin
  select id into keep_id from players where name = 'Eric Perez';
  select id into drop_id from players where name = 'Eric';

  if keep_id is not null and drop_id is not null then
    update props set player_id = keep_id where player_id = drop_id;
    delete from players where id = drop_id;
    raise notice 'Merged "Eric" into Eric Perez';
  end if;
end $$;


-- ------------------------------------------------------------
-- PART B — add the missing defense / playmaking props
--
-- These three were the gaps between your scouting report and
-- the live lines: Drich (called an "underrated defender" with
-- no steals/blocks prop), Stephen ("great IQ and vision" with
-- no assists prop), and Tay ("great defense" with no steals/
-- blocks prop). Kai's defense is already covered, the merge
-- above brings his existing steals prop along with him.
--
-- The lines below are reasonable starting numbers based on
-- their role, not derived from real stats. Adjust freely in
-- Admin -> Props before or after they go live.
-- ------------------------------------------------------------

insert into props (player_id, stat_type, line, featured)
select id, 'steals', 1.5, false
from players
where name = 'Donavan "Drich" Richardson'
and not exists (
  select 1 from props where props.player_id = players.id and props.stat_type = 'steals'
);

insert into props (player_id, stat_type, line, featured)
select id, 'assists', 2.5, false
from players
where name = 'Stephen Blackwood'
and not exists (
  select 1 from props where props.player_id = players.id and props.stat_type = 'assists'
);

insert into props (player_id, stat_type, line, featured)
select id, 'steals', 1.5, false
from players
where name = 'Tawana "Tay" Destave'
and not exists (
  select 1 from props where props.player_id = players.id and props.stat_type = 'steals'
);
