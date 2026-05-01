import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  cancelChallengeNotifications,
  cancelDailyReminder,
  scheduleChallengeNotifications,
  scheduleDailyReminder,
} from './notifications';

const KEY = 'lowlift:active_daily_challenge';

export type DailyChallengeMovementType = 'pushups' | 'squats' | 'burpees';

export type DailyChallengeMovement = {
  type: DailyChallengeMovementType;
  goalReps: number;
  completedReps: number;
};

export type DailyChallenge = {
  id: string;
  movements: DailyChallengeMovement[];
  createdAt: number;
  lastActiveDate: string;
  repeatDaily: boolean;
  isComplete: boolean;
  sessionsCompletedToday: number;
};

export type SessionRepPlan = {
  type: DailyChallengeMovementType;
  repsThisSession: number;
};

export type NewChallengeMovement = {
  type: DailyChallengeMovementType;
  goalReps: number;
};

const MAX_REPS_PER_SESSION: Record<DailyChallengeMovementType, number> = {
  pushups: 12,
  squats: 20,
  burpees: 10,
};
const MIN_SESSIONS_PER_DAY = 3;

function todayString(now: number = Date.now()): string {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function isValidMovement(value: unknown): value is DailyChallengeMovement {
  if (!value || typeof value !== 'object') return false;
  const m = value as Partial<DailyChallengeMovement>;
  return (
    (m.type === 'pushups' || m.type === 'squats' || m.type === 'burpees') &&
    typeof m.goalReps === 'number' &&
    typeof m.completedReps === 'number'
  );
}

function isValidChallenge(value: unknown): value is DailyChallenge {
  if (!value || typeof value !== 'object') return false;
  const c = value as Partial<DailyChallenge>;
  return (
    typeof c.id === 'string' &&
    Array.isArray(c.movements) &&
    c.movements.every(isValidMovement) &&
    typeof c.createdAt === 'number' &&
    typeof c.lastActiveDate === 'string' &&
    typeof c.repeatDaily === 'boolean' &&
    typeof c.isComplete === 'boolean' &&
    typeof c.sessionsCompletedToday === 'number'
  );
}

async function persist(challenge: DailyChallenge): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(challenge));
}

export async function loadChallenge(): Promise<DailyChallenge | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isValidChallenge(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function createChallenge(
  movements: NewChallengeMovement[],
  repeatDaily: boolean,
): Promise<DailyChallenge> {
  const challenge: DailyChallenge = {
    id: generateId(),
    movements: movements.map((m) => ({
      type: m.type,
      goalReps: m.goalReps,
      completedReps: 0,
    })),
    createdAt: Date.now(),
    lastActiveDate: todayString(),
    repeatDaily,
    isComplete: false,
    sessionsCompletedToday: 0,
  };
  await persist(challenge);
  await cancelDailyReminder();
  return challenge;
}

export async function deleteChallenge(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
  await scheduleDailyReminder();
}

export async function updateProgress(
  movementType: DailyChallengeMovementType,
  repsCompleted: number,
): Promise<DailyChallenge | null> {
  const current = await loadChallenge();
  if (!current) return null;
  const next: DailyChallenge = {
    ...current,
    movements: current.movements.map((m) =>
      m.type === movementType
        ? {
            ...m,
            completedReps: Math.min(m.goalReps, m.completedReps + repsCompleted),
          }
        : m,
    ),
  };
  await persist(next);
  return next;
}

export async function completeSession(
  repsPerMovement: Partial<Record<DailyChallengeMovementType, number>>,
): Promise<DailyChallenge | null> {
  const current = await loadChallenge();
  if (!current) return null;

  const movements = current.movements.map((m) => {
    const added = repsPerMovement[m.type] ?? 0;
    return {
      ...m,
      completedReps: Math.min(m.goalReps, m.completedReps + added),
    };
  });

  const isComplete = movements.every((m) => m.completedReps >= m.goalReps);

  const next: DailyChallenge = {
    ...current,
    movements,
    sessionsCompletedToday: current.sessionsCompletedToday + 1,
    isComplete,
  };
  await persist(next);
  if (isComplete) {
    await cancelChallengeNotifications();
  }
  return next;
}

export async function resetForNewDay(): Promise<DailyChallenge | null> {
  const current = await loadChallenge();
  if (!current) return null;
  const next: DailyChallenge = {
    ...current,
    movements: current.movements.map((m) => ({ ...m, completedReps: 0 })),
    sessionsCompletedToday: 0,
    isComplete: false,
    lastActiveDate: todayString(),
  };
  await persist(next);
  await scheduleChallengeNotifications(next);
  return next;
}

export function isNewDay(challenge: DailyChallenge, now: number = Date.now()): boolean {
  return challenge.lastActiveDate !== todayString(now);
}

export function calculateSessionReps(challenge: DailyChallenge): SessionRepPlan[] {
  const sessionsNeededPerMovement = challenge.movements.map((m) =>
    Math.ceil(m.goalReps / MAX_REPS_PER_SESSION[m.type]),
  );
  const totalSessionsForDay = Math.max(
    MIN_SESSIONS_PER_DAY,
    ...sessionsNeededPerMovement,
  );
  const sessionsRemaining = Math.max(
    1,
    totalSessionsForDay - challenge.sessionsCompletedToday,
  );

  return challenge.movements
    .map((m) => {
      const remaining = Math.max(0, m.goalReps - m.completedReps);
      if (remaining === 0) return { type: m.type, repsThisSession: 0 };
      const evenSplit = Math.ceil(remaining / sessionsRemaining);
      const capped = Math.min(evenSplit, MAX_REPS_PER_SESSION[m.type], remaining);
      return { type: m.type, repsThisSession: capped };
    })
    .filter((p) => p.repsThisSession > 0);
}
