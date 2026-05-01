import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'lowlift:favorites';

export const FAVORITES_MAX = 10;

export type FavoriteRecord = {
  sessionId: string;
  savedAt: number;
};

export type SaveResult = 'added' | 'full';

export async function loadFavorites(): Promise<FavoriteRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is FavoriteRecord =>
        r &&
        typeof r.sessionId === 'string' &&
        typeof r.savedAt === 'number',
    );
  } catch {
    return [];
  }
}

async function persist(records: FavoriteRecord[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(records));
}

export async function saveFavorite(sessionId: string): Promise<SaveResult> {
  const current = await loadFavorites();
  if (current.some((r) => r.sessionId === sessionId)) return 'added';
  if (current.length >= FAVORITES_MAX) return 'full';
  const next: FavoriteRecord[] = [
    { sessionId, savedAt: Date.now() },
    ...current,
  ];
  await persist(next);
  return 'added';
}

export async function removeFavorite(sessionId: string): Promise<void> {
  const current = await loadFavorites();
  const next = current.filter((r) => r.sessionId !== sessionId);
  if (next.length === current.length) return;
  await persist(next);
}

export async function isFavorite(sessionId: string): Promise<boolean> {
  const current = await loadFavorites();
  return current.some((r) => r.sessionId === sessionId);
}
