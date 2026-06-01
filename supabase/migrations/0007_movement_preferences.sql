-- LowLift Fitness — Phase 7: per-movement favorite / dislike preferences
-- Server-of-record for movement-level personalization that drives the session generator.
-- (Existing session-level favorites live only in AsyncStorage; this is movement-level and
--  syncs across devices/reinstalls.)
--
--   favorite -> generator boosts this movement
--   disliked -> generator NEVER includes this movement (hard filter, respected offline via cache)
-- A movement is favorite, disliked, or neutral (no row) — mutually exclusive, so one row per
-- (user, movement); toggling is an upsert, clearing is a delete.
--
-- Reuses the public.set_updated_at() trigger function defined in 0002.

create table public.movement_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  movement_id uuid not null references public.movements(id) on delete cascade,
  preference text not null check (preference in ('favorite','disliked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, movement_id)
);

-- Primary read path: "give me this user's preferences" (generator + preview screen).
create index movement_preferences_user_idx
  on public.movement_preferences (user_id);

-- Fast lookup of a user's preference for a specific movement.
create index movement_preferences_user_movement_idx
  on public.movement_preferences (user_id, movement_id);

alter table public.movement_preferences enable row level security;

create policy "own movement preferences" on public.movement_preferences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger movement_preferences_set_updated_at
  before update on public.movement_preferences
  for each row execute function public.set_updated_at();
