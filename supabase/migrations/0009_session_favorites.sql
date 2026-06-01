-- LowLift Fitness — Phase 9: server-backed session-level favorites
-- Moves the Dashboard "Favorites" list off device-local AsyncStorage and onto the
-- server, so a user's favorites follow them across devices/reinstalls and never
-- bleed into another account signing in on the same device.
--
-- A favorite is one saved, replayable session:
--   * curated template -> snapshot is NULL, resolved live by session_slug (getSessionBySlug)
--   * generated session -> snapshot holds a self-contained copy (slug/type/name +
--     movement refs) so the exact random session can be rebuilt and replayed
-- session_slug is unique per user (one row per favorited session); the client caps
-- the count (FAVORITES_MAX) — there is no server-side limit.

create table public.session_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_slug text not null,
  snapshot jsonb,
  saved_at timestamptz not null default now(),
  unique (user_id, session_slug)
);

-- Primary read path: "give me this user's favorites, newest first."
create index session_favorites_user_idx
  on public.session_favorites (user_id, saved_at desc);

alter table public.session_favorites enable row level security;

create policy "own session favorites" on public.session_favorites
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
