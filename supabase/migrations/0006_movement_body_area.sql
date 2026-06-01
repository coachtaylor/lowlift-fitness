-- LowLift Fitness — Phase 6: movement body_area tagging
-- Adds public.movements.body_area so the session generator can honor a "focus" filter
-- (Full body / Lower / Upper / Core / Mobility). One primary area per movement.
--
-- Filter semantics (enforced in app, documented here):
--   move   + Full body  -> no area filter (all moves eligible, incl. body_area='full')
--   move   + Lower/Upper/Core -> body_area = that value
--   stretch + Mobility  -> all stretches (per-area tags on stretches are future-proofing for P2)
--
-- Future seed inserts MUST set body_area (column is NOT NULL, no default — forces tagging).

alter table public.movements add column body_area text;

update public.movements set body_area = case slug
  -- moves --------------------------------------------------------------
  when 'bodyweight-squat'         then 'lower'
  when 'incline-push-up'          then 'upper'
  when 'glute-bridge'             then 'lower'
  when 'standing-calf-raises'     then 'lower'
  when 'standing-march'           then 'lower'
  when 'wall-sit'                 then 'lower'
  when 'reverse-lunges'           then 'lower'
  when 'plank-hold'               then 'core'
  when 'standing-arm-circles'     then 'upper'
  when 'chair-sit-to-stand'       then 'lower'
  when 'bear-plank-hold'          then 'core'
  when 'dead-bug'                 then 'core'
  when 'heel-to-toe-rock'         then 'lower'
  when 'knee-drive-hold'          then 'core'
  when 'seated-knee-extensions'   then 'lower'
  when 'side-step-squats'         then 'lower'
  when 'standing-cross-punches'   then 'upper'
  when 'standing-side-leg-raises' then 'lower'
  when 'step-back-reach'          then 'full'
  when 'wall-push-hold'           then 'upper'
  -- stretches ----------------------------------------------------------
  when 'neck-stretch'             then 'upper'
  when 'chest-opener'             then 'upper'
  when 'seated-spinal-twist'      then 'core'
  when 'hamstring-stretch'        then 'lower'
  when 'hip-flexor-stretch'       then 'lower'
  when 'childs-pose'              then 'mobility'
  when 'quad-stretch'             then 'lower'
  when 'figure-four-stretch'      then 'lower'
  when 'forward-fold'             then 'lower'
  when 'shoulder-stretch'         then 'upper'
  when 'side-body-stretch'        then 'core'
  when 'wrist-stretch'            then 'upper'
  when 'ankle-circles'            then 'lower'
  when 'cat-cow-stretch'          then 'mobility'
  when 'seated-shoulder-rolls'    then 'upper'
end;

-- Aborts the migration if any movement was left untagged.
alter table public.movements alter column body_area set not null;

alter table public.movements
  add constraint movements_body_area_check
  check (body_area in ('full','lower','upper','core','mobility'));

create index movements_category_bodyarea_active_idx
  on public.movements (category, body_area, is_active);
