-- LowLift Fitness — Daily Challenge history
-- Adds:
--   daily_challenges            — one row per user per calendar day, server of record for history
--   daily_challenge_movements   — per-movement breakdown (goal vs completed reps) for each day
--
-- Active-day state stays in AsyncStorage on the client (lowlift:active_daily_challenge).
-- These tables exist so that history survives device loss, reinstall, and cross-device sync.
-- Writes are best-effort fire-and-forget from the client — see app/src/data/dailyChallengeHistory.ts.
--
-- Pattern-matched against 0002 session_attempts / session_attempt_movements. Reuses
-- the public.set_updated_at() trigger function defined in that migration.

-- ---------------------------------------------------------------------------
-- 1. daily_challenges
-- ---------------------------------------------------------------------------
create table public.daily_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_date date not null,
  client_challenge_id text not null,
  repeat_daily boolean not null default false,
  sessions_completed int not null default 0,
  is_complete boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index daily_challenges_user_date_uk
  on public.daily_challenges (user_id, challenge_date);

create index daily_challenges_user_complete_idx
  on public.daily_challenges (user_id, is_complete);

create index daily_challenges_user_date_desc_idx
  on public.daily_challenges (user_id, challenge_date desc);

alter table public.daily_challenges enable row level security;

create policy "own daily challenges" on public.daily_challenges
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger daily_challenges_set_updated_at
  before update on public.daily_challenges
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. daily_challenge_movements
-- ---------------------------------------------------------------------------
create table public.daily_challenge_movements (
  id uuid primary key default gen_random_uuid(),
  daily_challenge_id uuid not null
    references public.daily_challenges(id) on delete cascade,
  movement_type text not null
    check (movement_type in ('pushups','squats','burpees')),
  goal_reps int not null check (goal_reps > 0),
  completed_reps int not null default 0 check (completed_reps >= 0),
  order_index int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index dcm_challenge_movement_uk
  on public.daily_challenge_movements (daily_challenge_id, movement_type);

create index dcm_challenge_idx
  on public.daily_challenge_movements (daily_challenge_id);

alter table public.daily_challenge_movements enable row level security;

create policy "own daily challenge movements" on public.daily_challenge_movements
  for all
  using (
    exists (
      select 1 from public.daily_challenges dc
      where dc.id = daily_challenge_id and dc.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.daily_challenges dc
      where dc.id = daily_challenge_id and dc.user_id = auth.uid()
    )
  );

create trigger daily_challenge_movements_set_updated_at
  before update on public.daily_challenge_movements
  for each row execute function public.set_updated_at();
