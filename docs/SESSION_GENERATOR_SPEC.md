# Spec: Session Generator

**Status:** Draft for review
**Author:** Coach Taylor + Claude
**Date:** 2026-05-28
**Related:** `LOWLIFT_PRODUCT_DECISIONS.md`, migrations `0002`–`0005`

---

## TL;DR

Replace random preset-template selection with a **session generator**: the user picks **type + duration + focus**, and the system assembles a session from the live movement library. Selection is **weighted to spread usage across the whole library** (anti-overuse), **respects per-movement favorite/dislike signals**, and gets smarter over time using **implicit completion/abandonment data we already collect**. Hardcoded templates remain as a fallback.

---

## Problem Statement

LowLift's sessions are built from 10 hardcoded templates (`app/src/data/sessions.ts`) that reference a fixed set of movement slugs. This creates two problems:

1. **New movements are dead inventory.** The 20 movements added in migration `0005` have been served **0 times** — every one of the 111 historical movement-plays went to the original 15 seed movements, because no template references the new slugs. Growing the library does nothing for users until someone hand-edits templates.
2. **No personalization.** Users see the same handful of movements on repeat with no way to say "more of this" or "never show me this again." For a *consistency/habit* product aimed at "stuck-at-desk strivers," staleness is a direct threat to the core loop (*prompt → move → feel better → repeat*).

**Cost of not solving:** every library expansion is wasted effort; repetition erodes the novelty that keeps inconsistent users coming back.

---

## Goals

1. **Activate the full library.** ≥90% of active movements get served to at least one user within 30 days of launch (today: 43% — 15/35).
2. **Even out usage.** Reduce the spread between most- and least-served movements. Target: the most-served movement is served ≤3× as often as the median (today the top movement is served 16× while 20 movements sit at 0).
3. **Personalize without friction.** Users can favorite/dislike a movement in ≤1 tap from where they already see movements, and it measurably shapes future sessions.
4. **Preserve the low-lift feel.** Generation adds no perceptible latency and never produces a "weird" session (wrong type, duplicate movements, too long/short).
5. **Smarter over time.** A favorited movement is more likely to appear; a disliked one never appears; a movement a user repeatedly abandons appears less.

---

## Non-Goals

- **Rep/weight programming or progressive overload.** LowLift is movement consistency, not a training-load app. Out of scope.
- **Cross-user collaborative filtering / ML recommendations.** v1 personalization is per-user, rules-based. No model training.
- **A movement-authoring or admin UI.** Movements continue to be managed via SQL migrations (`supabase db push`).
- **Replacing the Daily Challenge generator.** Daily Challenge (pushups/squats/burpees) stays as-is; it is a separate surface.
- **Server-side generation infrastructure (edge function / RPC).** v1 generates client-side. Revisited as a P2 if tuning cadence demands it.

---

## Users & Stories

Primary persona: **"Stuck-at-desk striver"** — sits most of the day, wants something easy and realistic, avoids complex workouts.

### Generating a session
- As a striver, I want to pick **type, length, and a body focus** and get a ready-to-go session, so I don't have to think about what to do.
- As a striver, I want each session to feel **a little different from last time**, so the habit stays fresh.
- As a striver, I want to **regenerate** if a set doesn't appeal to me, so I stay in control without configuring anything.

### Shaping future sessions
- As a striver, I want to **favorite** a movement I like, so it shows up more often.
- As a striver, I want to **dislike/hide** a movement (e.g., one that hurts or I can't do), so it never appears again.
- As a striver, I want my favorites/dislikes to **follow me across devices and reinstalls**, so I don't lose my tuning.

### Edge / boundary
- As a striver who has disliked many movements, I want to **still get a valid session** (the app gracefully relaxes constraints rather than erroring).
- As a brand-new user with no history, I want a **sensible, varied first session** (cold start).
- As an offline user, I want generation to **still respect my dislikes** (preferences cached locally).

---

## Functional Design

### A. Selection inputs (UI)

`SessionSelectionScreen` expands from 3 type buttons to three lightweight choices:

| Input | Options | Notes |
|---|---|---|
| **Type** | Move · Stretch · Both | Existing `SessionType` |
| **Duration** | Quick (~2m) · Standard (~3m) · Extended (~5m) | Maps to movement count (see below) |
| **Focus** | Full body · Lower · Upper · Core · *(Mobility for stretch)* | Requires new movement metadata — see §D |

Defaults are remembered (last-used) so a returning user is one tap from generating.

### B. Duration → movement count

Movements are ~30–45s plus a 5s countdown. Target counts:

| Duration | move / stretch | both |
|---|---|---|
| Quick | 3 | 2 move + 1 stretch |
| Standard | 4 | 3 move + 2 stretch |
| Extended | 6 | 4 move + 2 stretch |

For **Both**, moves are sequenced first, stretches last (natural cool-down).

### C. The generator (weighted, anti-overuse)

A **pure function** `generateSession({ type, duration, focus, pool, preferences, usage })` so it is unit-testable and deterministic given a seed.

**Steps:**
1. **Candidate pool** = active movements matching `category` (from type) and `focus` (if not Full body).
2. **Hard filter:** remove `disliked` movements.
3. **Weight each candidate** `w = base × recency × frequency × favorite × completion`:
   - `base = 1`
   - `recency` — strong penalty if served in the most recent sessions; decays back to 1 as time/sessions since last use grows (this is the primary anti-overuse lever — least-recently-used movements float to the top).
   - `frequency` — inverse of how often it's been served in the lookback window (last ~14 days or ~10 sessions). Spreads load across the library.
   - `favorite` — multiplier (~1.5–2×) if favorited.
   - `completion` *(implicit signal)* — slight down-weight for movements this user frequently abandons (`session_attempt_movements.status = 'in_progress'` left dangling). Capped so it nudges, never hard-excludes.
4. **Weighted random sample without replacement** until the target count is hit. Randomness (not pure LRU) keeps sessions non-predictable while weights keep them balanced.
5. **Guardrails / fallback ladder** if the eligible pool is too small to fill the count:
   a. relax recency/frequency penalties → b. relax focus filter → c. as a last resort, fall back to a **hardcoded preset template** of the requested type. Dislikes are *never* relaxed.

**Cold start** (no usage history): recency/frequency are neutral, so generation is effectively uniform-random with favorite bias — already varied and safe.

### D. Movement metadata: focus tags (schema change)

The `movements` table has no body-area data today. Add a tag so the generator can honor "focus."

- **Option chosen:** add `body_area text` (one of `full`, `lower`, `upper`, `core`, `mobility`) — simple, one value per movement, easy to query/weight.
- Backfilled for all 35 existing movements via migration. Future movements set it in their seed row.
- *(Alternative considered: a `text[] tags` array for multi-area movements. Deferred to P2 — single value covers v1 and keeps the generator simple.)*

### E. Preferences: favorite / dislike (schema + sync)

New table `movement_preferences` (server-of-record, RLS per user), because existing favorites are **session-level and local-only** (`AsyncStorage`, max 10) — insufficient for movement-level, cross-device tuning.

```sql
create table public.movement_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  movement_id uuid not null references public.movements(id) on delete cascade,
  preference text not null check (preference in ('favorite','disliked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, movement_id)
);
-- RLS: own rows only; updated_at trigger reuses public.set_updated_at()
```

- A movement is favorite, disliked, or neutral (mutually exclusive → single row, upsert on toggle, delete to clear).
- **Mirrored to `AsyncStorage`** so dislikes are honored offline (same pattern as today's favorites cache).

### F. UI for favorite/dislike

- Primary surface: **Session Preview screen** — each listed movement gets a ♥ (favorite) and a ⃠ (dislike/hide) affordance. This is where users already review movements before starting.
- Disliking in preview **immediately regenerates** that slot with a replacement.
- Secondary (P1): same affordance inside the player and in a movement-detail view.
- A **"Regenerate"** button on the preview reshuffles the whole session.

### G. Tracking / instrumentation

Reuse the existing `session_attempts` / `session_attempt_movements` writes (no change to the player). Add `analytics_events` for: `session_generated` (type/duration/focus, movement slugs), `session_regenerated`, `movement_favorited`, `movement_disliked`, `generator_fallback_used`.

---

## Requirements

### Must-Have (P0)
- **P0-1 Focus metadata.** Migration adds `body_area` to `movements` + backfills all 35.
  - *Given* any active movement, *then* it has a non-null `body_area`.
- **P0-2 Preferences table + sync.** `movement_preferences` table, RLS, client read/write, AsyncStorage mirror.
  - [ ] Favorite/dislike persists to Supabase and survives reinstall.
  - [ ] Dislikes are respected even when offline.
  - [ ] Toggling favorite↔dislike↔neutral works via a single row.
- **P0-3 Generator function.** Pure, testable `generateSession(...)` with weighting (recency + frequency + favorite + dislike hard-filter) and the fallback ladder.
  - *Given* a user with usage history, *when* they generate twice in a row, *then* the two sessions differ and avoid the most-recently-served movements.
  - *Given* a disliked movement, *then* it never appears in any generated session.
  - *Given* an over-constrained request, *then* a valid session is still returned (never an error/empty).
  - [ ] No duplicate movements within a session.
  - [ ] Movement count and type match the selected duration/type.
- **P0-4 Selection UI.** Type + duration + focus pickers wired to the generator; defaults remembered.
- **P0-5 Preview favorite/dislike + regenerate.** Per-movement ♥/⃠ and a Regenerate button.
- **P0-6 Presets as fallback.** Templates retained and invoked only by the fallback ladder.

### Nice-to-Have (P1)
- **P1-1** Favorite/dislike from inside the player and movement-detail.
- **P1-2** "Why this session" microcopy (e.g., "fresh picks you haven't done lately").
- **P1-3** Tunable weight constants via remote config (no app release to adjust).
- **P1-4** Surface a gentle nudge when dislikes shrink the pool ("You've hidden a lot of moves — want to un-hide some?").

### Future Considerations (P2)
- **P2-1** Server-side generation (Postgres RPC / edge function) if weight tuning needs to ship without app releases or the pool grows large.
- **P2-2** Multi-area movements via `tags text[]`.
- **P2-3** Implicit *positive* signals (high completion → boost), beyond v1's abandonment down-weight.
- **P2-4** Migrate/retire the legacy session-level favorites in favor of movement preferences.

---

## Success Metrics

**Leading (days–weeks):**
- Library coverage: % of active movements served ≥1× per 30 days. **Target ≥90%** (baseline 43%).
- Usage spread: most-served ÷ median-served movement. **Target ≤3×.**
- Preference adoption: % of weekly-active users who set ≥1 favorite/dislike. **Target ≥25% in 30 days.**
- Regenerate rate per generated session (health signal; very high = bad picks). **Watch, target <0.5.**
- Generation latency p95. **Target <100ms** (client-side, tiny pool).

**Lagging (weeks–months):**
- Session completion rate (generated vs old preset baseline). **Target: no regression, ideally +.**
- Repeat-session frequency / weekly active retention. **Target: improvement.**

**Measurement:** `analytics_events` queries + `session_attempt_movements` coverage query (already prototyped this session).

---

## Decisions (resolved)

_Taylor, 2026-05-28:_
- **[Design] Negative action = "Hide" (eye-off icon)**, not a thumbs-down — reads as "not for me," never judgment of the user.
- **[Product] First run = the generated set** (no curated first-timer screen); cold-start generation is already varied/safe.
- **[Design] Stretch focus = single "Mobility"** option (no Lower/Upper/Core for stretches).
- **[Design] Selection layout = single screen** with chips / segmented controls (no step-through).

## Open Questions

- **[Product]** Should "Both" focus apply to the move portion only, or also bias stretch selection toward the same area? _(Current design: move portion only.)_
- **[Data]** Lookback window for recency/frequency — sessions-based (last N) or time-based (last N days)? Lean sessions-based for low-frequency users; confirm against usage cadence.
- **[Eng]** Recency/frequency needs per-user usage at generation time — one extra Supabase query on the selection screen. Acceptable, or precompute/cache on app open?

---

## Timeline / Phasing

No hard external deadline. Suggested phasing:

- **Phase 1 (foundation):** P0-1 (focus migration) + P0-2 (preferences table/sync). Shippable independently; unblocks everything.
- **Phase 2 (engine):** P0-3 generator + unit tests against the real pool.
- **Phase 3 (surface):** P0-4/5/6 UI, fallback wiring, instrumentation → launch.
- **Fast follow:** P1 items based on regenerate-rate and coverage data.

**Dependencies:** Phase 2 depends on Phase 1 metadata; all DB changes ship as numbered migrations via `supabase db push` (MCP stays read-only).
