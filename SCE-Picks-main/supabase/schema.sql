-- ============================================================
-- SCE PICKS — Database Schema
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- TEAMS ----------
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  color text not null,
  created_at timestamptz not null default now()
);

-- ---------- PLAYERS ----------
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  team_id uuid not null references teams(id) on delete restrict,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_players_team on players(team_id);

-- ---------- PROPS ----------
create type stat_type as enum (
  'points', 'rebounds', 'assists', 'three_pt_made',
  'steals', 'blocks', 'turnovers',
  'points_rebounds', 'points_assists', 'rebounds_assists', 'pra'
);

create table if not exists props (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  stat_type stat_type not null,
  line numeric(6,1) not null,
  active boolean not null default true,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, stat_type)
);
create index if not exists idx_props_player on props(player_id);
create index if not exists idx_props_active on props(active);

-- ---------- USERS (guest submitters, not Supabase auth users) ----------
create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  instagram_username text,
  leaderboard_opt_out boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- SUBMISSIONS ----------
create type submission_status as enum ('pending', 'graded');

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete set null,
  submission_code text not null unique,
  submitted_at timestamptz not null default now(),
  status submission_status not null default 'pending'
);

-- ---------- PICKS ----------
create type pick_selection as enum ('over', 'under');
create type pick_result as enum ('pending', 'hit', 'miss', 'push');

create table if not exists picks (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  prop_id uuid not null references props(id) on delete restrict,
  selection pick_selection not null,
  result pick_result not null default 'pending',
  created_at timestamptz not null default now(),
  unique (submission_id, prop_id)
);
create index if not exists idx_picks_submission on picks(submission_id);
create index if not exists idx_picks_prop on picks(prop_id);

-- ---------- RESULTS ----------
create table if not exists results (
  id uuid primary key default gen_random_uuid(),
  prop_id uuid not null references props(id) on delete cascade unique,
  actual_value numeric(6,1) not null,
  result pick_result not null,
  updated_at timestamptz not null default now()
);

-- ---------- EVENT SETTINGS (single row config, editable from admin) ----------
create table if not exists event_settings (
  id int primary key default 1,
  event_name text not null default 'YoungKnights vs AlumKnights',
  event_date date,
  venue text,
  event_logo_url text,
  young_logo_url text,
  alum_logo_url text,
  pick_lock_time timestamptz,
  picks_locked boolean not null default false,
  leaderboard_visible boolean not null default true,
  email_required boolean not null default false,
  instagram_required boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);
insert into event_settings (id) values (1) on conflict (id) do nothing;

-- ============================================================
-- FUNCTION: auto-grade a pick once a result is entered
-- ============================================================
create or replace function grade_picks_for_prop()
returns trigger
language plpgsql
as $$
declare
  prop_line numeric(6,1);
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

  return new;
end;
$$;

drop trigger if exists trg_grade_picks on results;
create trigger trg_grade_picks
after insert or update of actual_value on results
for each row execute function grade_picks_for_prop();

-- ============================================================
-- ROW LEVEL SECURITY
-- Public (anon) can: read teams/players/props/event_settings,
-- and INSERT their own app_users/submissions/picks, but never
-- read/update/delete other people's submissions or touch
-- players/props/results. All admin writes go through server-side
-- API routes using the service_role key, which bypasses RLS.
-- ============================================================

alter table teams enable row level security;
alter table players enable row level security;
alter table props enable row level security;
alter table app_users enable row level security;
alter table submissions enable row level security;
alter table picks enable row level security;
alter table results enable row level security;
alter table event_settings enable row level security;

-- Public read-only content
create policy "public read teams" on teams for select using (true);
create policy "public read players" on players for select using (active = true);
create policy "public read props" on props for select using (active = true);
create policy "public read results" on results for select using (true);
create policy "public read event settings" on event_settings for select using (true);

-- Guests can create their own user record + read it back
create policy "public insert app_users" on app_users for insert with check (true);
create policy "public read own app_users" on app_users for select using (true);

-- Guests can create submissions and picks, and read back a submission
-- by code (used for the "picks locked" confirmation screen), but
-- cannot update or delete anything.
create policy "public insert submissions" on submissions for insert with check (true);
create policy "public read submissions" on submissions for select using (true);

create policy "public insert picks" on picks for insert with check (true);
create policy "public read picks" on picks for select using (true);

-- No public insert/update/delete policies exist for players, props,
-- results, or event_settings — so only the service_role key (used
-- exclusively in server-side admin API routes) can write to them.
