import { supabase } from './supabase';

export type MovementCategory = 'move' | 'stretch';

export type Movement = {
  id: string;
  slug: string;
  name: string;
  category: MovementCategory;
  subcategory: string | null;
  duration: number;
  difficulty: number;
  steps: string[];
  cues: string[];
  videoUrl: string | null;
  thumbUrl: string | null;
};

let cache: Map<string, Movement> | null = null;
let inflight: Promise<Map<string, Movement>> | null = null;

export async function loadMovements(): Promise<Map<string, Movement>> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase
      .from('movements')
      .select(
        'id, slug, name, category, subcategory, default_duration_seconds, difficulty, steps, cues, video_url, thumb_url',
      )
      .eq('is_active', true);
    if (error) {
      console.warn('[movements] fetch failed:', error.message);
      inflight = null;
      return new Map();
    }
    const map = new Map<string, Movement>();
    for (const row of data ?? []) {
      map.set(row.slug, {
        id: row.id,
        slug: row.slug,
        name: row.name,
        category: row.category as MovementCategory,
        subcategory: row.subcategory ?? null,
        duration: row.default_duration_seconds,
        difficulty: row.difficulty,
        steps: row.steps ?? [],
        cues: row.cues ?? [],
        videoUrl: row.video_url ?? null,
        thumbUrl: row.thumb_url ?? null,
      });
    }
    cache = map;
    inflight = null;
    return map;
  })();
  return inflight;
}

export function clearMovementsCache(): void {
  cache = null;
  inflight = null;
}
