// generateSession — the session generator.
// Ports the design prototype's generator (gen/data.jsx) onto the real movement
// library. It filters by type/focus, excludes hidden moves, boosts favorites,
// avoids recent repeats, and reports when it had to relax filters (the
// "over-constrained" signal that drives the Preview nudge).

import { SessionType } from '../components/SessionCard';
import { BodyArea, Movement } from './movements';
import { Session } from './sessions';

export type DurationTier = 'quick' | 'standard' | 'extended';
export type Focus = 'full' | 'lower' | 'upper' | 'core';

export type SessionSelection = {
  type: SessionType;
  length: DurationTier;
  focus: Focus;
};

export const TYPES: { id: SessionType; label: string }[] = [
  { id: 'move', label: 'Move' },
  { id: 'stretch', label: 'Stretch' },
  { id: 'both', label: 'Both' },
];

export const LENGTHS: { id: DurationTier; label: string; hint: string; targetSec: number }[] = [
  { id: 'quick', label: 'Quick', hint: '~2 min', targetSec: 120 },
  { id: 'standard', label: 'Standard', hint: '~3 min', targetSec: 180 },
  { id: 'extended', label: 'Extended', hint: '~5 min', targetSec: 300 },
];

export const FOCI: { id: Focus; label: string }[] = [
  { id: 'full', label: 'Full body' },
  { id: 'lower', label: 'Lower' },
  { id: 'upper', label: 'Upper' },
  { id: 'core', label: 'Core' },
];

// Focus descriptions shown on the selection screen. They differ by type: "Move"
// frames the focus as pure movement; "Both" notes the stretch cool-down that
// gets woven in. (Stretch has its own locked "Mobility" copy on the screen.)
const MOVE_FOCUS_DESC: Record<Focus, string> = {
  full: 'A balanced mix across your whole body',
  lower: 'Legs, glutes, and hips',
  upper: 'Chest, back, shoulders, and arms',
  core: 'Abs, obliques, and trunk stability',
};

const BOTH_FOCUS_DESC: Record<Focus, string> = {
  full: 'Whole-body movement with a stretch to finish',
  lower: 'Legs and glutes, with a stretch to finish',
  upper: 'Chest, back, and arms, with a stretch to finish',
  core: 'Abs and trunk, with a stretch to finish',
};

export function focusDescription(type: SessionType, focus: Focus): string {
  return type === 'both' ? BOTH_FOCUS_DESC[focus] : MOVE_FOCUS_DESC[focus];
}

export const FOCUS_LABEL: Record<BodyArea, string> = {
  full: 'Full body',
  lower: 'Lower',
  upper: 'Upper',
  core: 'Core',
  mobility: 'Mobility',
};

function lengthDef(length: DurationTier) {
  return LENGTHS.find((l) => l.id === length) ?? LENGTHS[1];
}

// Human-readable session names built from the picker: "{Length} {Focus} {Type}",
// e.g. "Quick Lower-Body Move", "Standard Full-Body Stretch", "Extended Core Flow".
// "Both" reads as a "Flow" (moves + stretch cool-down).
const LENGTH_NAME: Record<DurationTier, string> = {
  quick: 'Quick',
  standard: 'Standard',
  extended: 'Extended',
};

const FOCUS_NAME: Record<Focus, string> = {
  full: 'Full-Body',
  lower: 'Lower-Body',
  upper: 'Upper-Body',
  core: 'Core',
};

const TYPE_NAME: Record<SessionType, string> = {
  move: 'Move',
  stretch: 'Stretch',
  both: 'Flow',
};

export function sessionName(selection: SessionSelection): string {
  const { type, length, focus } = selection;
  return `${LENGTH_NAME[length]} ${FOCUS_NAME[focus]} ${TYPE_NAME[type]}`;
}

// A move matches a focus if it targets that area, or is a full-body move
// (full-body moves fit any focus). 'full' focus accepts everything.
function moveMatchesFocus(m: Movement, focus: Focus): boolean {
  if (focus === 'full') return true;
  return m.bodyArea === focus || m.bodyArea === 'full';
}

// Weighted shuffle: favorites float up, recently-used sink down. Mirrors the
// prototype's scoring (1 + random, +2.2 favorite, -0.8 recent).
function pickWeighted(
  pool: Movement[],
  n: number,
  favorites: Set<string>,
  recent: Set<string>,
): Movement[] {
  const scored = pool.map((m) => {
    let w = 1 + Math.random();
    if (favorites.has(m.slug)) w += 2.2;
    if (recent.has(m.slug)) w -= 0.8;
    return { m, w };
  });
  scored.sort((a, b) => b.w - a.w);
  return scored.slice(0, n).map((s) => s.m);
}

// Pick movements (weighted, no repeats) that pack into the time budget without
// exceeding it, then spread the leftover seconds across those movements so the
// session total lands EXACTLY on the target length. Returns duration-adjusted
// copies (never mutates the catalog).
function pickByDuration(
  pool: Movement[],
  targetSec: number,
  favorites: Set<string>,
  recent: Set<string>,
): Movement[] {
  const ordered = pool
    .map((m) => {
      let w = 1 + Math.random();
      if (favorites.has(m.slug)) w += 2.2;
      if (recent.has(m.slug)) w -= 0.8;
      return { m, w };
    })
    .sort((a, b) => b.w - a.w)
    .map((s) => s.m);

  // Greedily pack movements that fit under the target (tightest-fit first via
  // the weighted order). Guarantee at least one movement.
  const picked: Movement[] = [];
  let total = 0;
  for (const m of ordered) {
    if (total + m.duration <= targetSec) {
      picked.push(m);
      total += m.duration;
    }
  }
  if (picked.length === 0 && ordered.length) {
    picked.push(ordered[0]);
    total = ordered[0].duration;
  }

  // Distribute the remaining seconds evenly so the total equals the target.
  const deficit = targetSec - total;
  if (deficit > 0 && picked.length > 0) {
    const base = Math.floor(deficit / picked.length);
    const extra = deficit - base * picked.length;
    return picked.map((m, i) => ({
      ...m,
      duration: m.duration + base + (i < extra ? 1 : 0),
    }));
  }
  return picked;
}

type GenArgs = {
  pool: Movement[];
  selection: SessionSelection;
  favorites: string[];
  hidden: string[];
  recent: string[];
  avoid?: string[];
};

// Evenly weave two ordered lists (Bresenham-style) so neither bunches up — for
// equal lengths this alternates; for unequal it spreads the shorter list across
// the longer one.
function weave(a: Movement[], b: Movement[]): Movement[] {
  const out: Movement[] = [];
  let i = 0;
  let j = 0;
  const total = a.length + b.length;
  for (let k = 0; k < total; k++) {
    if (i >= a.length) out.push(b[j++]);
    else if (j >= b.length) out.push(a[i++]);
    else if ((i + 0.5) / a.length <= (j + 0.5) / b.length) out.push(a[i++]);
    else out.push(b[j++]);
  }
  return out;
}

// "Both" ordering: mix moves and stretches evenly, but reserve one stretch as
// the closer so the session always finishes on a cool-down stretch.
function mixMovesAndStretches(moves: Movement[], stretches: Movement[]): Movement[] {
  if (stretches.length === 0) return moves;
  if (moves.length === 0) return stretches;
  const closer = stretches[stretches.length - 1];
  const innerStretches = stretches.slice(0, -1);
  return [...weave(moves, innerStretches), closer];
}

export type GenerateResult = { session: Session; relaxed: boolean };

export function generateSession({
  pool,
  selection,
  favorites,
  hidden,
  recent,
  avoid = [],
}: GenArgs): GenerateResult {
  const { type, length, focus } = selection;
  const target = lengthDef(length).targetSec;
  const hid = new Set(hidden);
  const fav = new Set(favorites);
  const rec = new Set(recent);
  const avoidSet = new Set(avoid);
  let relaxed = false;

  // "Both" splits the time budget evenly between moves and stretches.
  const moveTarget = type === 'both' ? Math.round(target / 2) : type === 'move' ? target : 0;
  const stretchTarget = type === 'both' ? target - moveTarget : type === 'stretch' ? target : 0;

  const poolFor = (kind: 'move' | 'stretch', useFocus: boolean): Movement[] =>
    pool.filter((m) => {
      if (m.category !== kind) return false;
      if (hid.has(m.slug)) return false;
      if (avoidSet.has(m.slug)) return false;
      if (kind === 'move' && useFocus) return moveMatchesFocus(m, focus);
      return true;
    });

  const sumDur = (list: Movement[]) => list.reduce((a, m) => a + m.duration, 0);

  const fill = (kind: 'move' | 'stretch', secs: number): Movement[] => {
    if (secs <= 0) return [];
    let candidates = poolFor(kind, true);
    if (sumDur(candidates) < secs) {
      // not enough time available in this focus — relax to full body
      relaxed = true;
      candidates = poolFor(kind, false);
    }
    if (sumDur(candidates) < secs) {
      // still short — allow recents/avoided back in
      relaxed = true;
      const more = pool.filter(
        (m) => m.category === kind && !hid.has(m.slug) && !candidates.includes(m),
      );
      candidates = candidates.concat(more);
    }
    return pickByDuration(candidates, secs, fav, rec);
  };

  const moves = fill('move', moveTarget);
  const stretches = fill('stretch', stretchTarget);
  // Both → moves and stretches woven together, always finishing on a stretch so
  // the session still winds down with a cool-down.
  const movements = mixMovesAndStretches(moves, stretches);

  // Unique per generated session. The slug must be unique (not just derived from
  // the picker) — favorites are keyed by slug, so two sessions built from the
  // same Type/Length/Focus would otherwise collide and favorite each other.
  const token = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const session: Session = {
    id: `generated-${type}-${token}`,
    slug: `generated-${type}-${length}-${focus}-${token}`,
    type,
    name: sessionName(selection),
    movements,
  };
  return { session, relaxed };
}

// One replacement for a single slot (used by Hide → swap-in-place on Preview).
export function pickReplacement({
  pool,
  slotType,
  focus,
  exclude,
  hidden,
  favorites,
  recent,
}: {
  pool: Movement[];
  slotType: 'move' | 'stretch';
  focus: Focus;
  exclude: string[];
  hidden: string[];
  favorites: string[];
  recent: string[];
}): Movement | null {
  const ex = new Set(exclude);
  const hid = new Set(hidden);
  let candidates = pool.filter((m) => {
    if (m.category !== slotType) return false;
    if (hid.has(m.slug) || ex.has(m.slug)) return false;
    if (slotType === 'move') return moveMatchesFocus(m, focus);
    return true;
  });
  if (!candidates.length) {
    candidates = pool.filter(
      (m) => m.category === slotType && !hid.has(m.slug) && !ex.has(m.slug),
    );
  }
  if (!candidates.length) return null;
  return pickWeighted(candidates, 1, new Set(favorites), new Set(recent))[0] ?? null;
}

// How many movements are available for the current filter — drives the
// "you've hidden a lot" nudge before it becomes a hard fallback.
export function availableCount({
  pool,
  type,
  focus,
  hidden,
}: {
  pool: Movement[];
  type: SessionType;
  focus: Focus;
  hidden: string[];
}): number {
  const hid = new Set(hidden);
  const moves = pool.filter(
    (m) => m.category === 'move' && !hid.has(m.slug) && moveMatchesFocus(m, focus),
  );
  const stretches = pool.filter((m) => m.category === 'stretch' && !hid.has(m.slug));
  if (type === 'move') return moves.length;
  if (type === 'stretch') return stretches.length;
  return moves.length + stretches.length;
}

export function totalLabel(items: Movement[]): string {
  const tot = items.reduce((a, m) => a + m.duration, 0);
  if (tot < 60) return `${tot} sec`;
  const m = Math.round((tot / 60) * 10) / 10;
  return `${m % 1 ? m.toFixed(1) : m.toFixed(0)} min`;
}
