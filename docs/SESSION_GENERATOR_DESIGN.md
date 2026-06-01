# Engineering Design: `generateSession()`

Companion to [`SESSION_GENERATOR_SPEC.md`](./SESSION_GENERATOR_SPEC.md). Covers the generator function, weighting math, data access, and integration. v1 runs **client-side** (matches the all-client + RLS architecture; pool is ~35 movements).

---

## 1. New / changed modules

```
app/src/data/movements.ts          (CHANGE) add body_area to Movement + SELECT
app/src/data/movementPreferences.ts (NEW)   favorite/dislike read+write, AsyncStorage mirror
app/src/data/movementUsage.ts       (NEW)   per-user recent usage from session_attempt_movements
app/src/data/generateSession.ts     (NEW)   pure generator + weighting
app/src/data/sessions.ts            (CHANGE) keep templates; expose buildPresetFallback()
app/src/screens/SessionSelectionScreen.tsx (CHANGE) type+duration+focus pickers
app/src/screens/SessionPreviewScreen.tsx   (CHANGE) ♥/⃠ per movement + Regenerate
```

---

## 2. Types

```ts
// movements.ts — extend existing Movement
export type Movement = {
  id: string; slug: string; name: string;
  category: 'move' | 'stretch';
  subcategory: string | null;
  bodyArea: 'full' | 'lower' | 'upper' | 'core' | 'mobility'; // NEW (from body_area)
  duration: number; difficulty: number;
  steps: string[]; cues: string[];
  videoUrl: string | null; thumbUrl: string | null;
};

export type SessionType = 'move' | 'stretch' | 'both';
export type DurationTier = 'quick' | 'standard' | 'extended';
export type Focus = 'full' | 'lower' | 'upper' | 'core' | 'mobility';

export type MovementPreference = 'favorite' | 'disliked';

export type MovementUsage = {
  // derived per user over the lookback window
  sessionsSinceLastUse: number; // Infinity if not used in window
  timesServedInWindow: number;
  servedCount: number;          // total samples (for confidence gating)
  abandonRate: number;          // abandoned / servedCount, 0..1
};

export type GenerateInput = {
  type: SessionType;
  duration: DurationTier;
  focus: Focus;
  pool: Movement[];                          // active movements (cached)
  preferences: Map<string, MovementPreference>; // slug -> pref
  usage: Map<string, MovementUsage>;         // slug -> usage (empty = cold start)
  rng?: () => number;                        // injectable for tests; defaults Math.random
};

export type GeneratedSession = {
  source: 'generated' | 'preset-fallback';
  type: SessionType;
  movements: Movement[];                     // ordered, no duplicates
  meta: { type: SessionType; duration: DurationTier; focus: Focus; relaxed: string[] };
};
```

---

## 3. Tunable constants (one place; later P1 = remote config)

```ts
export const DURATION_COUNTS = {
  move:    { quick: 3, standard: 4, extended: 6 },
  stretch: { quick: 3, standard: 4, extended: 6 },
  both:    { quick: { move: 2, stretch: 1 },
             standard: { move: 3, stretch: 2 },
             extended: { move: 4, stretch: 2 } },
} as const;

export const W = {
  LOOKBACK_SESSIONS: 10,   // window for recency + frequency
  FAVORITE_MULT:     2.0,  // favorited movements are 2x as likely
  RECENCY_RECOVERY:  5,    // sessions until a used movement returns to full weight
  RECENCY_FLOOR:     0.10, // a just-used movement still has a small chance
  FREQ_WEIGHT:       0.5,  // higher = punish frequently-served movements harder
  ABANDON_PENALTY:   0.4,  // max down-weight from abandonment (worst case x0.6)
  ABANDON_MIN_SAMPLES: 3,  // ignore abandon signal below this many serves (noise guard)
} as const;
```

---

## 4. Weighting

For each candidate movement, weight is the product of independent factors (base 1.0):

```
recencyFactor   = clamp(sessionsSinceLastUse / RECENCY_RECOVERY, RECENCY_FLOOR, 1)
                  // not used in window -> 1.0 (Infinity/5 clamps to 1)
frequencyFactor = 1 / (1 + FREQ_WEIGHT * timesServedInWindow)
completionFactor= servedCount >= ABANDON_MIN_SAMPLES
                    ? (1 - ABANDON_PENALTY * abandonRate)
                    : 1
favoriteFactor  = pref == 'favorite' ? FAVORITE_MULT : 1
                  // pref == 'disliked' is hard-filtered before weighting

weight = recencyFactor * frequencyFactor * completionFactor * favoriteFactor
```

**Why product, not sum:** factors are independent multipliers on a baseline probability; a value of 1.0 is a no-op, so cold-start (all 1.0) cleanly degrades to uniform-random-with-favorites.

### Worked example (real data, "move / standard=4 / full")

Using current per-user-style serve counts as `timesServedInWindow` and assuming each top movement was used in the **last** session (`sessionsSinceLastUse = 1`), no favorites/dislikes, abandon ignored except where sampled:

| movement | served | recency(1/5=.2) | freq 1/(1+.5·n) | abandon | weight |
|---|---|---|---|---|---|
| hip-flexor-stretch* | 16 | 0.20 | 0.111 | – | **0.022** |
| standing-march | 8 | 0.20 | 0.200 | 3/8 → ×0.85 | **0.034** |
| bodyweight-squat | 10 | 0.20 | 0.167 | – | **0.033** |
| **dead-bug (new)** | 0 | 1.00 | 1.000 | – | **1.000** |
| **side-step-squats (new)** | 0 | 1.00 | 1.000 | – | **1.000** |

The 20 never-served movements each carry ~**30–45× the weight** of the most-overused ones — so they dominate selection until usage evens out, then the recency/frequency penalties keep rotation fresh. (*hip-flexor is a stretch; shown for contrast.)

---

## 5. Generator (pseudocode)

```ts
export function generateSession(input: GenerateInput): GeneratedSession {
  const rng = input.rng ?? Math.random;
  const relaxed: string[] = [];

  const want = countsFor(input.type, input.duration); // number | {move,stretch}

  // Build one "track" (a category + target count) at a time.
  const pick = (category, count, focus, allowRelax) => {
    let cands = input.pool.filter(m => m.category === category);

    // Focus filter — applies to moves; stretch+mobility = all stretches.
    if (focus !== 'full' && category === 'move')
      cands = cands.filter(m => m.bodyArea === focus);

    // HARD filter: dislikes are never included.
    cands = cands.filter(m => input.preferences.get(m.slug) !== 'disliked');

    // Fallback ladder if too few candidates:
    if (cands.length < count && allowRelax) {
      // a) drop focus filter
      let r = input.pool.filter(m => m.category === category
                && input.preferences.get(m.slug) !== 'disliked');
      relaxed.push('focus');
      cands = r;
    }
    if (cands.length < count) relaxed.push('count'); // accept a shorter track

    return weightedSampleWithoutReplacement(cands, count, input, rng);
  };

  let movements: Movement[];
  if (input.type === 'both') {
    const moves    = pick('move',    want.move,    input.focus, true);
    const stretches= pick('stretch', want.stretch, 'full',      true);
    movements = [...moves, ...stretches]; // cool-down ordering
  } else {
    movements = pick(input.type, want, input.focus, true);
  }

  // Last resort: nothing usable -> curated preset of the same type.
  if (movements.length === 0) {
    return { source: 'preset-fallback', type: input.type,
             movements: buildPresetFallback(input.type),
             meta: { ...input, relaxed: [...relaxed, 'preset'] } };
  }

  return { source: 'generated', type: input.type, movements,
           meta: { type: input.type, duration: input.duration, focus: input.focus, relaxed } };
}

function weightedSampleWithoutReplacement(cands, k, input, rng) {
  const picked = [];
  const pool = cands.map(m => ({ m, w: weightOf(m, input) }));
  for (let i = 0; i < k && pool.length; i++) {
    const total = pool.reduce((s, x) => s + x.w, 0);
    let r = rng() * total;
    let idx = 0;
    while (r > pool[idx].w) { r -= pool[idx].w; idx++; }
    picked.push(pool[idx].m);
    pool.splice(idx, 1); // without replacement
  }
  return picked;
}
```

`weightOf()` implements §4. `rng` injection makes the whole thing deterministic under test (seeded PRNG).

---

## 6. Data access

```ts
// movementUsage.ts — one query on the selection screen (or cache on app open)
export async function loadRecentUsage(userId: string): Promise<Map<string, MovementUsage>>;
//   SELECT over session_attempt_movements JOIN session_attempts
//   for this user, most recent W.LOOKBACK_SESSIONS attempts; compute
//   sessionsSinceLastUse, timesServedInWindow, servedCount, abandonRate per slug.

// movementPreferences.ts — DB-backed, AsyncStorage-mirrored (dislikes honored offline)
export async function loadMovementPreferences(userId: string): Promise<Map<string, MovementPreference>>;
export async function setMovementPreference(userId, movementId, pref: MovementPreference | null): Promise<void>;
//   pref null   -> DELETE row (back to neutral)
//   otherwise   -> upsert on (user_id, movement_id); also write the AsyncStorage mirror
```

**Offline rule:** preferences read from AsyncStorage first (instant, dislike-safe), reconciled with Supabase in the background. Usage: if the query fails, pass an empty `usage` map → generator degrades to uniform+favorites (no crash, just less smart).

---

## 7. Integration (App.tsx flow)

```
SessionSelectionScreen (type, duration, focus)
   → loadMovements() [cached]  +  loadRecentUsage(uid)  +  loadMovementPreferences(uid)
   → generateSession({...})
   → SessionPreviewScreen(generatedSession)
        • ♥ / ⃠ per movement → setMovementPreference(); ⃠ regenerates that one slot
        • "Regenerate" → generateSession() again (new rng)
        • "Start" → existing startAttempt(session) path (UNCHANGED)
```

The player (`SessionPlayerScreen`) and tracking writes (`session_attempts` / `session_attempt_movements`) are **unchanged** — the generator only produces the `Session.movements` array the player already consumes.

---

## 8. Analytics (analytics_events)

`session_generated` {type,duration,focus,slugs,source,relaxed[]} ·
`session_regenerated` · `movement_favorited` {slug} ·
`movement_disliked` {slug} · `generator_fallback_used` {stage}.

---

## 9. Test plan (pure-function = easy)

- Determinism: fixed seed ⇒ identical output.
- Dislike is absolute: disliked slug never appears across 1000 seeds.
- No dupes; count & types match duration/type.
- Anti-overuse: given skewed usage, never-served movements appear at >X× the rate of the top-served over 1000 runs.
- Fallback ladder: over-constrained focus relaxes focus then count then preset, and records `meta.relaxed`.
- Cold start: empty usage ⇒ ~uniform distribution (+favorite bias).
```
