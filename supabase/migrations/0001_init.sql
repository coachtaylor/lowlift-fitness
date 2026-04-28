-- LowLift Fitness — backend Phase 1 foundations
-- Tables: profiles, completed_sessions, analytics_events
-- RLS: every user sees only their own rows

-- profiles: one row per auth user
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- completed_sessions: the server-of-record for history
create table public.completed_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null,
  type text not null check (type in ('move','stretch','both')),
  session_name text not null,
  duration_seconds int not null,
  completed_at timestamptz not null,
  client_id text
);
create unique index completed_sessions_client_id_idx
  on public.completed_sessions (user_id, client_id);
create index completed_sessions_user_completed_idx
  on public.completed_sessions (user_id, completed_at desc);

-- analytics_events: Phase 2 will write to this
create table public.analytics_events (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index analytics_events_user_time_idx
  on public.analytics_events (user_id, occurred_at desc);

-- RLS
alter table public.profiles enable row level security;
alter table public.completed_sessions enable row level security;
alter table public.analytics_events enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own sessions" on public.completed_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own events insert" on public.analytics_events
  for insert with check (auth.uid() = user_id);
create policy "own events read" on public.analytics_events
  for select using (auth.uid() = user_id);

-- auto-create profile row on signup
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
