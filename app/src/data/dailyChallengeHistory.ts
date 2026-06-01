import { DailyChallenge } from './dailyChallenge';
import { supabase } from './supabase';

export type ChallengeHistoryStats = {
  totalChallengesCompleted: number;
  currentChallengeStreak: number;
  longestChallengeStreak: number;
};

async function getUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

export async function upsertDailyChallenge(challenge: DailyChallenge): Promise<void> {
  try {
    const userId = await getUserId();
    if (!userId) return;

    const challengeDate = challenge.lastActiveDate;

    const { data: row, error: upsertError } = await supabase
      .from('daily_challenges')
      .upsert(
        {
          user_id: userId,
          challenge_date: challengeDate,
          client_challenge_id: challenge.id,
          repeat_daily: challenge.repeatDaily,
          sessions_completed: challenge.sessionsCompletedToday,
          is_complete: challenge.isComplete,
          completed_at: challenge.isComplete ? new Date().toISOString() : null,
        },
        { onConflict: 'user_id,challenge_date' },
      )
      .select('id')
      .single();

    if (upsertError || !row) {
      console.warn('[challenge-history] upsert parent failed:', upsertError?.message);
      return;
    }

    // Replace movement rows so a same-day delete-then-recreate with different
    // movements cleanly overwrites the prior set.
    const { error: deleteError } = await supabase
      .from('daily_challenge_movements')
      .delete()
      .eq('daily_challenge_id', row.id);
    if (deleteError) {
      console.warn('[challenge-history] delete movements failed:', deleteError.message);
      return;
    }

    const movementRows = challenge.movements.map((m, i) => ({
      daily_challenge_id: row.id,
      movement_type: m.type,
      goal_reps: m.goalReps,
      completed_reps: m.completedReps,
      order_index: i,
    }));

    if (movementRows.length === 0) return;

    const { error: insertError } = await supabase
      .from('daily_challenge_movements')
      .insert(movementRows);
    if (insertError) {
      console.warn('[challenge-history] insert movements failed:', insertError.message);
    }
  } catch (err) {
    console.warn('[challenge-history] upsertDailyChallenge threw:', err);
  }
}

export async function recordSessionProgress(challenge: DailyChallenge): Promise<void> {
  try {
    const userId = await getUserId();
    if (!userId) return;

    const challengeDate = challenge.lastActiveDate;

    const { data: row, error: parentError } = await supabase
      .from('daily_challenges')
      .update({ sessions_completed: challenge.sessionsCompletedToday })
      .eq('user_id', userId)
      .eq('challenge_date', challengeDate)
      .select('id')
      .single();

    if (parentError || !row) {
      console.warn('[challenge-history] update parent failed:', parentError?.message);
      return;
    }

    for (const m of challenge.movements) {
      const { error } = await supabase
        .from('daily_challenge_movements')
        .update({ completed_reps: m.completedReps })
        .eq('daily_challenge_id', row.id)
        .eq('movement_type', m.type);
      if (error) {
        console.warn(
          `[challenge-history] update movement ${m.type} failed:`,
          error.message,
        );
      }
    }
  } catch (err) {
    console.warn('[challenge-history] recordSessionProgress threw:', err);
  }
}

export async function markChallengeComplete(challenge: DailyChallenge): Promise<void> {
  try {
    const userId = await getUserId();
    if (!userId) return;

    const challengeDate = challenge.lastActiveDate;

    const { error } = await supabase
      .from('daily_challenges')
      .update({
        is_complete: true,
        completed_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('challenge_date', challengeDate);

    if (error) {
      console.warn('[challenge-history] markChallengeComplete failed:', error.message);
    }
  } catch (err) {
    console.warn('[challenge-history] markChallengeComplete threw:', err);
  }
}

// Parse a YYYY-MM-DD challenge_date as local midnight (matches todayString()
// which uses the device's local calendar). Streak math then operates on
// calendar-day timestamps, identical to history.ts.
function parseChallengeDate(value: string): number {
  const [y, m, d] = value.split('-').map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d).getTime();
}

function startOfLocalDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const DAY_MS = 24 * 60 * 60 * 1000;

function computeStats(
  rows: Array<{ challenge_date: string; is_complete: boolean }>,
  now: number = Date.now(),
): ChallengeHistoryStats {
  const completedDays = Array.from(
    new Set(
      rows
        .filter((r) => r.is_complete)
        .map((r) => parseChallengeDate(r.challenge_date)),
    ),
  ).sort((a, b) => a - b);

  const totalChallengesCompleted = completedDays.length;

  if (totalChallengesCompleted === 0) {
    return {
      totalChallengesCompleted: 0,
      currentChallengeStreak: 0,
      longestChallengeStreak: 0,
    };
  }

  const completedSet = new Set(completedDays);
  const today = startOfLocalDay(now);
  const yesterday = today - DAY_MS;

  let currentChallengeStreak = 0;
  let cursor: number;
  if (completedSet.has(today)) {
    cursor = today;
  } else if (completedSet.has(yesterday)) {
    cursor = yesterday;
  } else {
    cursor = NaN;
  }
  while (!Number.isNaN(cursor) && completedSet.has(cursor)) {
    currentChallengeStreak += 1;
    cursor -= DAY_MS;
  }

  let longestChallengeStreak = 1;
  let run = 1;
  for (let i = 1; i < completedDays.length; i++) {
    if (completedDays[i] - completedDays[i - 1] === DAY_MS) {
      run += 1;
      longestChallengeStreak = Math.max(longestChallengeStreak, run);
    } else {
      run = 1;
    }
  }

  return {
    totalChallengesCompleted,
    currentChallengeStreak,
    longestChallengeStreak,
  };
}

export async function loadChallengeHistory(): Promise<ChallengeHistoryStats> {
  const empty: ChallengeHistoryStats = {
    totalChallengesCompleted: 0,
    currentChallengeStreak: 0,
    longestChallengeStreak: 0,
  };

  try {
    const userId = await getUserId();
    if (!userId) return empty;

    const { data, error } = await supabase
      .from('daily_challenges')
      .select('challenge_date, is_complete')
      .eq('user_id', userId)
      .order('challenge_date', { ascending: false });

    if (error) {
      console.warn('[challenge-history] loadChallengeHistory failed:', error.message);
      return empty;
    }

    return computeStats(data ?? []);
  } catch (err) {
    console.warn('[challenge-history] loadChallengeHistory threw:', err);
    return empty;
  }
}

export const __test__ = { computeStats, parseChallengeDate };
