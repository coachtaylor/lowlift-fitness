-- LowLift Fitness — Phase 2: movement library + session attempt tracking
-- Adds:
--   movements                  — canonical catalog (read by clients, edited via service role)
--   session_attempts           — one row per Start tap, captures completed/abandoned
--   session_attempt_movements  — per-movement rows, drop-off signal lives here
-- Retires:
--   completed_sessions         — superseded by session_attempts (status='completed')
--
-- No production users yet, so the completed_sessions drop is safe.

-- ---------------------------------------------------------------------------
-- 1. movements
-- ---------------------------------------------------------------------------
create table public.movements (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null check (category in ('move','stretch')),
  subcategory text,
  default_duration_seconds int not null check (default_duration_seconds > 0),
  difficulty int not null default 1 check (difficulty between 1 and 5),
  steps text[] not null default '{}',
  cues text[] not null default '{}',
  video_url text,
  thumb_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index movements_category_active_idx
  on public.movements (category, is_active);

alter table public.movements enable row level security;

create policy "movements read for authenticated" on public.movements
  for select to authenticated using (true);

-- auto-update updated_at on every UPDATE
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

create trigger movements_set_updated_at
  before update on public.movements
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. session_attempts
-- ---------------------------------------------------------------------------
create table public.session_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_slug text not null,
  session_type text not null check (session_type in ('move','stretch','both')),
  session_name text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'in_progress'
    check (status in ('in_progress','completed','abandoned')),
  total_duration_seconds int,
  client_version text
);

create index session_attempts_user_started_idx
  on public.session_attempts (user_id, started_at desc);

create index session_attempts_user_status_idx
  on public.session_attempts (user_id, status);

alter table public.session_attempts enable row level security;

create policy "own attempts" on public.session_attempts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. session_attempt_movements
--    One row per planned movement. Written up-front at attempt start so a
--    lingering status='in_progress' row is the drop-off signal even if the
--    client never gets another chance to write.
-- ---------------------------------------------------------------------------
create table public.session_attempt_movements (
  id uuid primary key default gen_random_uuid(),
  session_attempt_id uuid not null
    references public.session_attempts(id) on delete cascade,
  movement_id uuid references public.movements(id) on delete set null,
  movement_slug text not null,
  movement_name text not null,
  order_index int not null,
  planned_duration_seconds int not null,
  started_at timestamptz,
  completed_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending','in_progress','completed','skipped'))
);

create unique index sam_attempt_order_uk
  on public.session_attempt_movements (session_attempt_id, order_index);

-- partial index for the headline drop-off query:
--   "which movement do users hang on most often?"
create index sam_dropoff_idx
  on public.session_attempt_movements (movement_slug)
  where status = 'in_progress';

alter table public.session_attempt_movements enable row level security;

create policy "own attempt movements" on public.session_attempt_movements
  for all
  using (
    exists (
      select 1 from public.session_attempts sa
      where sa.id = session_attempt_id and sa.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.session_attempts sa
      where sa.id = session_attempt_id and sa.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Retire completed_sessions
-- ---------------------------------------------------------------------------
drop table if exists public.completed_sessions;

-- ---------------------------------------------------------------------------
-- 5. Seed movements (10 strength + 5 stretch)
-- ---------------------------------------------------------------------------
insert into public.movements
  (slug, name, category, subcategory, default_duration_seconds, difficulty, steps, cues)
values
  ('bodyweight-squat', 'Bodyweight Squat', 'move', 'strength', 40, 2,
    array[
      'Stand with feet shoulder-width apart',
      'Push hips back and bend knees',
      'Lower, then stand back up'
    ],
    array['Chest up', 'Weight in heels', 'Move slow']
  ),
  ('incline-push-up', 'Incline Push-Up', 'move', 'strength', 40, 2,
    array[
      'Hands on desk or wall',
      'Lower chest toward surface',
      'Push back up'
    ],
    array['Straight body', 'Don''t sag hips']
  ),
  ('glute-bridge', 'Glute Bridge', 'move', 'strength', 35, 1,
    array[
      'Lie on back, knees bent',
      'Lift hips',
      'Lower slowly'
    ],
    array['Squeeze glutes', 'Don''t arch back']
  ),
  ('standing-calf-raises', 'Standing Calf Raises', 'move', 'strength', 30, 1,
    array[
      'Lift heels',
      'Pause',
      'Lower slowly'
    ],
    array['Slow and controlled']
  ),
  ('standing-march', 'Standing March', 'move', 'activation', 30, 1,
    array[
      'Lift one knee at a time',
      'Alternate'
    ],
    array['Stay tall', 'Control movement']
  ),
  ('wall-sit', 'Wall Sit', 'move', 'strength', 30, 2,
    array[
      'Back against wall',
      'Slide down into seated position',
      'Hold'
    ],
    array['Knees at 90°', 'Back flat']
  ),
  ('reverse-lunges', 'Reverse Lunges', 'move', 'strength', 40, 2,
    array[
      'Step one foot back',
      'Lower into lunge',
      'Return and switch'
    ],
    array['Stay upright', 'Control descent']
  ),
  ('plank-hold', 'Plank Hold', 'move', 'strength', 30, 2,
    array[
      'Hands or forearms on floor',
      'Body straight',
      'Hold'
    ],
    array['Tight core', 'Don''t sag hips']
  ),
  ('standing-arm-circles', 'Standing Arm Circles', 'move', 'activation', 30, 1,
    array[
      'Arms out to sides',
      'Small circles forward, then backward'
    ],
    array['Keep arms straight', 'Controlled movement']
  ),
  ('chair-sit-to-stand', 'Chair Sit-to-Stand', 'move', 'strength', 35, 1,
    array[
      'Sit in chair',
      'Stand up',
      'Sit back down slowly'
    ],
    array['Use legs, not momentum', 'Control the descent']
  ),
  ('neck-stretch', 'Neck Stretch', 'stretch', 'static', 40, 1,
    array[
      'Sit or stand tall',
      'Tilt right ear toward right shoulder',
      'Hold, then switch sides'
    ],
    array['Relax shoulders', 'No bouncing', 'Breathe slowly']
  ),
  ('chest-opener', 'Chest Opener', 'stretch', 'static', 35, 1,
    array[
      'Clasp hands behind back',
      'Straighten arms and lift gently',
      'Open the chest'
    ],
    array['Stand tall', 'Keep chin level', 'Don''t shrug']
  ),
  ('seated-spinal-twist', 'Seated Spinal Twist', 'stretch', 'static', 40, 1,
    array[
      'Sit tall',
      'Rotate torso to one side',
      'Rest a hand on the chair or knee',
      'Hold, then switch sides'
    ],
    array['Inhale taller', 'Exhale deeper', 'Twist from the ribs']
  ),
  ('hamstring-stretch', 'Hamstring Stretch', 'stretch', 'static', 35, 1,
    array[
      'Step one leg forward, heel down',
      'Hinge at the hips',
      'Reach toward toes',
      'Hold, then switch sides'
    ],
    array['Flat back', 'Soft front knee', 'Bend from hips, not spine']
  ),
  ('hip-flexor-stretch', 'Hip Flexor Stretch', 'stretch', 'static', 40, 1,
    array[
      'Step one foot back into a low lunge',
      'Drop back knee toward the floor',
      'Shift hips forward',
      'Hold, then switch sides'
    ],
    array['Tuck pelvis', 'Tall chest', 'Front knee over ankle']
  );
