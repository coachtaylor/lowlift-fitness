-- 0008_situps_challenge_movement.sql
-- Adds 'situps' as an allowed daily-challenge movement type.
--
-- The Daily Challenge setup screen now offers Sit Ups (between Squats and
-- Burpees). Without widening this CHECK, daily_challenge_movements inserts for
-- sit-ups would be rejected, so they'd silently drop out of challenge history.

alter table public.daily_challenge_movements
  drop constraint daily_challenge_movements_movement_type_check;

alter table public.daily_challenge_movements
  add constraint daily_challenge_movements_movement_type_check
  check (movement_type in ('pushups', 'squats', 'burpees', 'situps'));
