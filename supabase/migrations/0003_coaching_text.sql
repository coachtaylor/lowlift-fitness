alter table public.movements add column coaching_text text;

update public.movements set coaching_text = 'Feet planted, chest proud. Sit back like there''s a chair behind you, nice and slow. Feel your legs do the work.' where slug = 'bodyweight-squat';
update public.movements set coaching_text = 'Hands on the desk, body straight. Lower yourself down with control, then push back up. You set the pace.' where slug = 'incline-push-up';
update public.movements set coaching_text = 'Flat on your back, knees bent. Press through your heels and lift those hips. Squeeze at the top, then lower slow.' where slug = 'glute-bridge';
update public.movements set coaching_text = 'Rise up onto your toes, hold for a beat, then come back down. Slow and steady wins this one.' where slug = 'standing-calf-raises';
update public.movements set coaching_text = 'Stand tall and lift one knee, then the other. Keep it controlled, like a slow-motion warm-up. Easy does it.' where slug = 'standing-march';
update public.movements set coaching_text = 'Slide your back down the wall until your legs hit 90 degrees. Hold it there. Breathe. Your legs are stronger than they think.' where slug = 'wall-sit';
update public.movements set coaching_text = 'Step one foot back, lower down, then drive back up. Alternate sides. Stay upright, stay controlled.' where slug = 'reverse-lunges';
update public.movements set coaching_text = 'Get into position and hold. Straight line from head to heels. If you''re shaking, that means it''s working.' where slug = 'plank-hold';
update public.movements set coaching_text = 'Arms out wide, start making small circles. Forward first, then reverse. Loosen up those shoulders.' where slug = 'standing-arm-circles';
update public.movements set coaching_text = 'Sit down, stand up. Simple as that. Use your legs, not momentum. Control the way down.' where slug = 'chair-sit-to-stand';

update public.movements set coaching_text = 'Tilt your ear toward your shoulder and just... let gravity do the work. Breathe into the stretch. Switch sides when you''re ready.' where slug = 'neck-stretch';
update public.movements set coaching_text = 'Clasp your hands behind your back and open up your chest. Stand tall, lift gently. Let all that desk tension melt away.' where slug = 'chest-opener';
update public.movements set coaching_text = 'Sit tall, then rotate to one side. Let your exhale take you a little deeper. Switch when it feels right.' where slug = 'seated-spinal-twist';
update public.movements set coaching_text = 'One leg forward, hinge at the hips. Reach toward your toes but don''t force it. Your hamstrings will thank you tomorrow.' where slug = 'hamstring-stretch';
update public.movements set coaching_text = 'Step back into a low lunge and let your hips sink forward. This is the antidote to sitting all day. Breathe and hold.' where slug = 'hip-flexor-stretch';
