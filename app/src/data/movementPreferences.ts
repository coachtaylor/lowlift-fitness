// movementPreferences — per-movement favorite / hide signals that feed the
// session generator. Server-of-record is the `movement_preferences` table
// (preference 'favorite' | 'disliked'); the UI term "hidden" maps to 'disliked'.
// Mirrored to AsyncStorage so hides are respected instantly and offline.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadMovements } from './movements';
import { supabase } from './supabase';

const KEY = 'lowlift:movement_prefs';

export type MovementPrefs = { favorites: string[]; hidden: string[] }; // slugs

const EMPTY: MovementPrefs = { favorites: [], hidden: [] };

function dedupe(a: string[]): string[] {
  return Array.from(new Set(a));
}

async function readMirror(): Promise<MovementPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const p = JSON.parse(raw);
    return {
      favorites: Array.isArray(p?.favorites) ? p.favorites.filter((x: unknown) => typeof x === 'string') : [],
      hidden: Array.isArray(p?.hidden) ? p.hidden.filter((x: unknown) => typeof x === 'string') : [],
    };
  } catch {
    return EMPTY;
  }
}

async function writeMirror(prefs: MovementPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* best-effort */
  }
}

// Best-effort snapshot: AsyncStorage first (instant, offline-safe), then
// reconciled with Supabase when reachable (cross-device truth).
export async function loadMovementPreferences(): Promise<MovementPrefs> {
  const mirror = await readMirror();
  try {
    const { data, error } = await supabase
      .from('movement_preferences')
      .select('movement_id, preference');
    if (error || !data) return mirror;

    const catalog = await loadMovements();
    const idToSlug = new Map<string, string>();
    catalog.forEach((m) => idToSlug.set(m.id, m.slug));

    const favorites: string[] = [];
    const hidden: string[] = [];
    for (const row of data) {
      const slug = idToSlug.get(row.movement_id as string);
      if (!slug) continue;
      if (row.preference === 'favorite') favorites.push(slug);
      else if (row.preference === 'disliked') hidden.push(slug);
    }
    const fresh: MovementPrefs = { favorites: dedupe(favorites), hidden: dedupe(hidden) };
    await writeMirror(fresh);
    return fresh;
  } catch {
    return mirror;
  }
}

// Apply a preference change to the mirror and (fire-and-forget) to Supabase.
// pref === null clears any preference for the slug.
export async function setMovementPreference(
  slug: string,
  pref: 'favorite' | 'hidden' | null,
): Promise<MovementPrefs> {
  // 1) update the mirror immediately (mutually exclusive)
  const current = await readMirror();
  const next: MovementPrefs = {
    favorites: current.favorites.filter((s) => s !== slug),
    hidden: current.hidden.filter((s) => s !== slug),
  };
  if (pref === 'favorite') next.favorites = dedupe([slug, ...next.favorites]);
  if (pref === 'hidden') next.hidden = dedupe([slug, ...next.hidden]);
  await writeMirror(next);

  // 2) sync to Supabase (best-effort)
  void syncOne(slug, pref);
  return next;
}

async function syncOne(slug: string, pref: 'favorite' | 'hidden' | null): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return;
    const catalog = await loadMovements();
    const movement = catalog.get(slug);
    if (!movement) return;

    if (pref === null) {
      await supabase
        .from('movement_preferences')
        .delete()
        .eq('user_id', userId)
        .eq('movement_id', movement.id);
      return;
    }
    const dbPref = pref === 'hidden' ? 'disliked' : 'favorite';
    await supabase.from('movement_preferences').upsert(
      { user_id: userId, movement_id: movement.id, preference: dbPref },
      { onConflict: 'user_id,movement_id' },
    );
  } catch {
    /* best-effort; mirror already holds the truth offline */
  }
}

// Clear the device-local mirror on sign-out so the next account on this device
// doesn't briefly see (or merge against) the previous user's favorites/hides.
// Supabase is the source of truth, so loadMovementPreferences() repopulates the
// mirror for whoever signs in next.
export async function clearLocalMovementPrefs(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* best-effort */
  }
}

// Bulk clear all hides (used by "Unhide all").
export async function clearHidden(currentHidden: string[]): Promise<void> {
  for (const slug of currentHidden) {
    await setMovementPreference(slug, null);
  }
}
