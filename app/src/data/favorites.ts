import { SessionType } from '../components/SessionCard';
import { supabase } from './supabase';

// Session-level favorites are server-backed (`public.session_favorites`, RLS-scoped
// to the user) so they follow the account across devices/reinstalls and never bleed
// into another account on the same device. Row-Level Security filters reads/writes
// to the signed-in user, so we don't pass user_id on reads; writes set it explicitly.
export const FAVORITES_MAX = 10;

// getSession() is local/offline-safe (no network round-trip like getUser()); the
// access token still carries the uid that RLS enforces.
async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

// A slim, self-contained copy of a generated session. Templates resolve live by
// slug (no snapshot); generated sessions are random, so we persist enough to
// rebuild and replay the exact session — movements are stored by slug and
// re-hydrated from the live library at read time.
export type FavoriteMovementRef = {
  slug: string;
  name: string;
  duration: number;
};

export type FavoriteSnapshot = {
  slug: string;
  type: SessionType;
  name: string;
  movements: FavoriteMovementRef[];
};

export type FavoriteRecord = {
  sessionId: string;
  savedAt: number;
  snapshot?: FavoriteSnapshot;
};

export type SaveResult = 'added' | 'full';

function isSnapshot(v: unknown): v is FavoriteSnapshot {
  if (!v || typeof v !== 'object') return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.slug === 'string' &&
    typeof s.type === 'string' &&
    typeof s.name === 'string' &&
    Array.isArray(s.movements) &&
    s.movements.every(
      (m) =>
        m &&
        typeof (m as FavoriteMovementRef).slug === 'string' &&
        typeof (m as FavoriteMovementRef).name === 'string' &&
        typeof (m as FavoriteMovementRef).duration === 'number',
    )
  );
}

export async function loadFavorites(): Promise<FavoriteRecord[]> {
  try {
    const { data, error } = await supabase
      .from('session_favorites')
      .select('session_slug, snapshot, saved_at')
      .order('saved_at', { ascending: false });
    if (error || !data) return [];
    return data.map((row) => ({
      sessionId: row.session_slug as string,
      savedAt: new Date(row.saved_at as string).getTime(),
      snapshot: isSnapshot(row.snapshot) ? row.snapshot : undefined,
    }));
  } catch {
    return [];
  }
}

export async function saveFavorite(
  sessionId: string,
  snapshot?: FavoriteSnapshot,
): Promise<SaveResult> {
  try {
    const userId = await currentUserId();
    if (!userId) return 'added';
    const current = await loadFavorites();
    if (current.some((r) => r.sessionId === sessionId)) return 'added';
    if (current.length >= FAVORITES_MAX) return 'full';
    await supabase.from('session_favorites').insert({
      user_id: userId,
      session_slug: sessionId,
      snapshot: snapshot ?? null,
    });
    return 'added';
  } catch {
    return 'added';
  }
}

export async function removeFavorite(sessionId: string): Promise<void> {
  try {
    const userId = await currentUserId();
    if (!userId) return;
    await supabase
      .from('session_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('session_slug', sessionId);
  } catch {
    /* best-effort */
  }
}

export async function isFavorite(sessionId: string): Promise<boolean> {
  const current = await loadFavorites();
  return current.some((r) => r.sessionId === sessionId);
}
