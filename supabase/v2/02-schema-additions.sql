-- ============================================================
-- STEP 2 of 5 — run after 01-add-enum-value.sql.
-- 100% additive: no existing table is dropped, altered
-- destructively, or has data removed. Safe to run on your
-- live, populated database.
-- ============================================================

-- ---------- player storyline context (small bio bullets) ----------
alter table players add column if not exists bio_tags text[];

-- ---------- featured flag for player props ----------
alter table props add column if not exists featured boolean not null default false;

-- ---------- TEAM-LEVEL PROPS (Winning Team, Combined Points) ----------
-- These aren't tied to a single player, so they get their own
-- table rather than forcing player_id to be nullable on props.
do $$ begin
  create type team_prop_type as enum ('winning_team', 'combined_points');
exception
  when duplicate_object then null;
end $$;

create table if not exists team_props (
  id uuid primary key default gen_random_uuid(),
  prop_type team_prop_type not null unique,
  line numeric(6,1),                          -- used by combined_points only
  featured boolean not null default true,
  active boolean not null default true,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- TEAM PICKS (a user's pick on a team-level prop) ----------
create table if not exists team_picks (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  team_prop_id uuid not null references team_props(id) on delete restrict,
  -- for winning_team: a team slug ('youngknights' / 'alumknights')
  -- for combined_points: 'more' or 'less'
  selection text not null,
  result pick_result not null default 'pending',
  created_at timestamptz not null default now(),
  unique (submission_id, team_prop_id)
);
create index if not exists idx_team_picks_submission on team_picks(submission_id);

-- ---------- TEAM PROP RESULTS (admin enters these after the game) ----------
create table if not exists team_prop_results (
  id uuid primary key default gen_random_uuid(),
  team_prop_id uuid not null references team_props(id) on delete cascade unique,
  actual_value numeric(6,1),        -- combined_points actual total
  winning_team_slug text,           -- winning_team actual winner
  updated_at timestamptz not null default now()
);

-- ---------- CARD-LEVEL STATE ON SUBMISSIONS ----------
-- pick_count: total legs (player + team picks) on this card
-- prize_tier: 3, 5, or 10 -- the tier this card qualifies for IF perfect
-- card_status: pending | perfect | busted
alter table submissions add column if not exists pick_count int not null default 0;
alter table submissions add column if not exists prize_tier int;
alter table submissions add column if not exists card_status text not null default 'pending';

-- ============================================================
-- FUNCTION: recompute a single submission's card_status
-- Called after any pick (player or team) is graded.
-- Logic: any confirmed miss = busted immediately (one wrong
-- pick breaks the whole card, even if others are still
-- pending). Otherwise perfect only once EVERY leg is a hit.
-- ============================================================
create or replace function recompute_card_status(p_submission_id uuid)
returns void
language plpgsql
as $$
declare
  total_legs int;
  hit_legs int;
  miss_legs int;
begin
  select
    (select count(*) from picks where submission_id = p_submission_id)
      + (select count(*) from team_picks where submission_id = p_submission_id),
    (select count(*) from picks where submission_id = p_submission_id and result = 'hit')
      + (select count(*) from team_picks where submission_id = p_submission_id and result = 'hit'),
    (select count(*) from picks where submission_id = p_submission_id and result = 'miss')
      + (select count(*) from team_picks where submission_id = p_submission_id and result = 'miss')
  into total_legs, hit_legs, miss_legs;

  update submissions
  set card_status = case
    when miss_legs > 0 then 'busted'
    when total_legs > 0 and hit_legs = total_legs then 'perfect'
    else 'pending'
  end
  where id = p_submission_id;
end;
$$;

-- ============================================================
-- Extend the existing player-prop grading trigger to also
-- recompute the card status of every affected submission.
-- (Replaces the function from the original schema.sql; the
-- trigger itself is unchanged.)
-- ============================================================
create or replace function grade_picks_for_prop()
returns trigger
language plpgsql
as $$
declare
  prop_line numeric(6,1);
  affected_submission uuid;
begin
  select line into prop_line from props where id = new.prop_id;

  update picks
  set result = case
    when new.actual_value = prop_line then 'push'::pick_result
    when new.actual_value > prop_line and selection = 'over' then 'hit'::pick_result
    when new.actual_value < prop_line and selection = 'under' then 'hit'::pick_result
    else 'miss'::pick_result
  end
  where prop_id = new.prop_id;

  for affected_submission in
    select distinct submission_id from picks where prop_id = new.prop_id
  loop
    perform recompute_card_status(affected_submission);
  end loop;

  return new;
end;
$$;

-- ============================================================
-- FUNCTION + TRIGGER: grade team-level picks once an admin
-- enters a team_prop_results row.
-- ============================================================
create or replace function grade_team_picks_for_prop()
returns trigger
language plpgsql
as $$
declare
  prop_type_val team_prop_type;
  prop_line numeric(6,1);
  affected_submission uuid;
begin
  select prop_type, line into prop_type_val, prop_line
  from team_props where id = new.team_prop_id;

  if prop_type_val = 'winning_team' then
    update team_picks
    set result = case
      when selection = new.winning_team_slug then 'hit'::pick_result
      else 'miss'::pick_result
    end
    where team_prop_id = new.team_prop_id;
  elsif prop_type_val = 'combined_points' then
    update team_picks
    set result = case
      when new.actual_value = prop_line then 'push'::pick_result
      when new.actual_value > prop_line and selection = 'more' then 'hit'::pick_result
      when new.actual_value < prop_line and selection = 'less' then 'hit'::pick_result
      else 'miss'::pick_result
    end
    where team_prop_id = new.team_prop_id;
  end if;

  for affected_submission in
    select distinct submission_id from team_picks where team_prop_id = new.team_prop_id
  loop
    perform recompute_card_status(affected_submission);
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_grade_team_picks on team_prop_results;
create trigger trg_grade_team_picks
after insert or update on team_prop_results
for each row execute function grade_team_picks_for_prop();

-- ---------- RLS for the new tables ----------
alter table team_props enable row level security;
alter table team_picks enable row level security;
alter table team_prop_results enable row level security;

drop policy if exists "public read team_props" on team_props;
create policy "public read team_props" on team_props for select using (active = true);

drop policy if exists "public read team_prop_results" on team_prop_results;
create policy "public read team_prop_results" on team_prop_results for select using (true);

drop policy if exists "public insert team_picks" on team_picks;
create policy "public insert team_picks" on team_picks for insert with check (true);

drop policy if exists "public read team_picks" on team_picks;
create policy "public read team_picks" on team_picks for select using (true);
