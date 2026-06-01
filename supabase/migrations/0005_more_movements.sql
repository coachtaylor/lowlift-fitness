-- LowLift Fitness — Phase 5: expand movement library
-- Adds 10 more strength moves (category='move') + 10 more stretches (category='stretch').
-- Follows the seed pattern from 0002. steps[] = "How to do it", cues[] = "Cues".
-- coaching_text left null here; add later like 0003 if a voiced cue is desired.

insert into public.movements
  (slug, name, category, subcategory, default_duration_seconds, difficulty, steps, cues)
values
  -- -------------------------------------------------------------------------
  -- Strength / moves (10)
  -- -------------------------------------------------------------------------
  ('step-back-reach', 'Step Back Reach', 'move', 'activation', 40, 1,
    array[
      'Step one foot back',
      'Reach both arms overhead',
      'Return and switch sides'
    ],
    array['Stay tall', 'Move smoothly']
  ),
  ('knee-drive-hold', 'Knee Drive Hold', 'move', 'strength', 30, 2,
    array[
      'Lift one knee',
      'Hold for 2–3 seconds',
      'Lower and switch'
    ],
    array['Engage core', 'Keep balance controlled']
  ),
  ('standing-side-leg-raises', 'Standing Side Leg Raises', 'move', 'strength', 30, 1,
    array[
      'Stand tall',
      'Lift one leg out to the side',
      'Lower slowly',
      'Switch sides'
    ],
    array['Don''t lean', 'Control the movement']
  ),
  ('bear-plank-hold', 'Bear Plank Hold', 'move', 'strength', 30, 2,
    array[
      'Hands and knees on floor',
      'Lift knees slightly off ground',
      'Hold position'
    ],
    array['Flat back', 'Tight core']
  ),
  ('seated-knee-extensions', 'Seated Knee Extensions', 'move', 'strength', 35, 1,
    array[
      'Sit tall in a chair',
      'Extend one leg straight',
      'Lower slowly',
      'Alternate sides'
    ],
    array['Move slowly', 'Keep posture upright']
  ),
  ('standing-cross-punches', 'Standing Cross Punches', 'move', 'activation', 30, 1,
    array[
      'Stand with soft knees',
      'Punch one arm across body',
      'Alternate sides'
    ],
    array['Rotate slightly through torso', 'Keep movement controlled']
  ),
  ('heel-to-toe-rock', 'Heel-to-Toe Rock', 'move', 'activation', 30, 1,
    array[
      'Rock onto toes',
      'Then rock back onto heels'
    ],
    array['Move slowly', 'Stay balanced']
  ),
  ('side-step-squats', 'Side Step Squats', 'move', 'strength', 40, 2,
    array[
      'Step sideways',
      'Lower into squat',
      'Stand and repeat opposite side'
    ],
    array['Chest up', 'Push hips back']
  ),
  ('dead-bug', 'Dead Bug', 'move', 'strength', 35, 2,
    array[
      'Lie on back with arms and knees up',
      'Extend opposite arm and leg',
      'Return and switch'
    ],
    array['Keep lower back down', 'Move slowly']
  ),
  ('wall-push-hold', 'Wall Push Hold', 'move', 'strength', 30, 1,
    array[
      'Hands against wall',
      'Push into wall firmly',
      'Hold tension'
    ],
    array['Tight core', 'Shoulders relaxed']
  ),
  -- -------------------------------------------------------------------------
  -- Stretches (10)
  -- -------------------------------------------------------------------------
  ('wrist-stretch', 'Wrist Stretch', 'stretch', 'static', 30, 1,
    array[
      'Extend one arm forward',
      'Pull fingers back gently',
      'Switch sides'
    ],
    array['Gentle pressure only']
  ),
  ('shoulder-stretch', 'Shoulder Stretch', 'stretch', 'static', 35, 1,
    array[
      'Pull one arm across chest',
      'Hold gently',
      'Switch sides'
    ],
    array['Relax shoulders']
  ),
  ('side-body-stretch', 'Side Body Stretch', 'stretch', 'static', 35, 1,
    array[
      'Reach one arm overhead',
      'Lean slightly to opposite side'
    ],
    array['Lengthen through side body']
  ),
  ('cat-cow-stretch', 'Cat-Cow Stretch', 'stretch', 'dynamic', 40, 1,
    array[
      'On hands and knees',
      'Round back',
      'Then arch gently'
    ],
    array['Move with breath']
  ),
  ('childs-pose', 'Child''s Pose', 'stretch', 'static', 45, 1,
    array[
      'Kneel and sit hips back',
      'Reach arms forward'
    ],
    array['Relax shoulders', 'Breathe deeply']
  ),
  ('quad-stretch', 'Quad Stretch', 'stretch', 'static', 35, 1,
    array[
      'Stand tall',
      'Pull one foot toward glutes',
      'Switch sides'
    ],
    array['Knees close together']
  ),
  ('ankle-circles', 'Ankle Circles', 'stretch', 'dynamic', 30, 1,
    array[
      'Lift one foot slightly',
      'Rotate ankle slowly',
      'Switch sides'
    ],
    array['Smooth circles']
  ),
  ('figure-four-stretch', 'Figure Four Stretch', 'stretch', 'static', 40, 1,
    array[
      'Sit or lie down',
      'Cross ankle over opposite knee',
      'Gently pull in'
    ],
    array['Relax hips']
  ),
  ('forward-fold', 'Forward Fold', 'stretch', 'static', 35, 1,
    array[
      'Stand tall',
      'Fold forward gently'
    ],
    array['Soft knees', 'Relax neck']
  ),
  ('seated-shoulder-rolls', 'Seated Shoulder Rolls', 'stretch', 'dynamic', 30, 1,
    array[
      'Roll shoulders backward slowly',
      'Then forward'
    ],
    array['Big smooth circles']
  );
