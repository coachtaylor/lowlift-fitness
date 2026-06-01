# UI Design Brief: Session Generator

Self-contained brief for designing the UI. No need to read other docs — everything required is here.
Companions (for engineers): `SESSION_GENERATOR_SPEC.md` (PRD), `SESSION_GENERATOR_DESIGN.md` (eng).

---

## Context (read once)

**Product:** LowLift Fitness — a *movement-consistency / habit* app (NOT a fitness app) for **"stuck-at-desk strivers"**: desk-bound adults who feel guilty about inactivity and want something easy and realistic. Core loop: **prompt → move → feel better → repeat.** Guiding principle: **simplicity is the feature.** Sessions are ultra-short (2–5 min).

**What we're building:** Replacing fixed preset workouts with a **generator**. The user makes a few light choices and the app assembles a fresh session from the movement library. It avoids repeating the same movements, and learns from **favorite** (more of this) and **dislike/hide** (never show again) signals.

**Platform:** React Native / Expo (phone). Reuse the existing visual system and the `SessionCard` component. Aesthetic is calm, encouraging, low-pressure — never "hardcore gym."

---

## The flow

```
[Session Selection]  →  [Session Preview]  →  [Player]
  pick type/length/focus   review + tune set     (UNCHANGED — do not redesign)
  → Generate                → Start
```

Only the first two screens change. The player stays as-is.

---

## Screen 1 — Session Selection (redesign)

Today this is three buttons (Move / Stretch / Both). It becomes three light choices, then Generate.

**Inputs:**
1. **Type** — Move · Stretch · Both
2. **Length** — Quick (~2 min) · Standard (~3 min) · Extended (~5 min)
3. **Focus** — Full body · Lower · Upper · Core. **When Stretch is selected, Focus collapses to a single "Mobility"** option (the control still shows, but reads "Mobility" — no Lower/Upper/Core for stretches).

**Requirements:**
- **Layout (locked):** a **single screen using chips / segmented controls** for all three inputs — no step-through. Keep all choices visible at once.
- Defaults to the user's **last-used** choices so a returning user is **one tap from generating**. Don't make them re-decide every time.
- Keep it glanceable — this is a 2-minute habit, not a config screen. Resist a dense form.
- A primary **Generate** action.

**States:** default (with remembered selections), Stretch-selected (Focus shows single "Mobility" chip), generating (brief, <100ms — likely no spinner needed).

---

## Screen 2 — Session Preview (enhance)

Shows the generated list of movements before the user commits. This is the main new surface and where personalization happens.

**Must show / do:**
- Ordered list of the chosen movements (name, duration; reuse movement card styling). For "Both," moves first then stretches (cool-down).
- Per-movement **Favorite (♥)** and **Hide (eye-off)** affordance, reachable in **one tap**.
  - Hiding a movement should **immediately swap it** for a replacement in that slot (don't make them regenerate the whole thing).
  - Favoriting gives light positive feedback; it boosts that movement in future sessions.
- A **Regenerate** action that reshuffles the whole set (for when the vibe is just off).
- A primary **Start** action → existing player.
- Optional light microcopy explaining the freshness, e.g. *"Fresh picks you haven't done lately."* Keep it warm, not braggy.

**States to design:**
- **Default** generated set.
- **Cold start / first-ever session** — user has no history. **The first run uses the generated set** (no special curated first-timer screen); with no usage data the generator naturally produces a varied, safe set.
- **Over-constrained** — user has hidden so many movements the app had to relax filters or fall back to a preset. Surface gently, e.g. *"You've hidden a lot of moves — want to un-hide some?"* Never show an error or an empty session.
- **Offline** — works from cached data; dislikes still respected. No scary messaging.

---

## Favorite vs Hide — interaction & framing

- A movement is **favorited**, **hidden**, or neutral — mutually exclusive (tapping one clears the other).
- **Locked:** the negative action is **"Hide"** with an **eye-off icon** — not a thumbs-down. It reads as *"not for me / can't do this,"* never judgment of the user. (This audience already feels guilty about inactivity — avoid anything implying failure.)
- Favorites/dislikes **persist across devices and reinstalls** (server-synced), so the affordance should feel durable, not throwaway.
- Provide a way (now or noted for later) to review/undo hidden movements.

---

## UX copy to write
- Length labels & their time hints.
- Focus labels.
- Generate / Regenerate / Start button text.
- Favorite & Hide labels + any confirmation/feedback.
- Empty/over-constrained nudge.
- "Why this session" microcopy (optional).

Voice: encouraging, plain, low-pressure. Short. Think *"Nice — saved."* not *"Movement successfully added to favorites."*

---

## Constraints & out-of-scope
- **Do not** redesign the player or the post-session flow.
- No rep/weight programming, no difficulty slider, no charts — keep it minimal.
- Reuse existing components/tokens where possible; this should feel native to the current app, not a new design language.

## Locked decisions (Taylor, 2026-05-28)
1. **Negative action** = **Hide** with an **eye-off icon** (not thumbs-down).
2. **Stretch focus** = single **"Mobility"** option (no Lower/Upper/Core for stretches).
3. **First run** = the **generated set** (no curated first-timer screen).
4. **Selection layout** = **single screen with chips / segmented controls** (no step-through).
