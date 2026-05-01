import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { DailyChallenge, DailyChallengeMovementType } from './dailyChallenge';

const IDS_KEY = 'lowlift:challenge_notification_ids';
const DAILY_REMINDER_ID_KEY = 'lowlift:daily_reminder_id';
const DAILY_REMINDER_DECLINED_KEY = 'lowlift:daily_reminder_declined';

const DAILY_REMINDER_BODIES = [
  'A quick session is all it takes. Open LowLift?',
  'Your body will thank you. 2 minutes?',
  'Small moves, big momentum. Ready?',
  'Hey, your muscles called. They miss you.',
];

const DAILY_REMINDER_HOUR = 9;
const DAILY_REMINDER_MINUTE = 0;

const MOVEMENT_DISPLAY_NAMES: Record<DailyChallengeMovementType, string> = {
  pushups: 'push ups',
  squats: 'squats',
  burpees: 'burpees',
};

type ScheduledTime = { hour: number; minute: number };

const SCHEDULE: ScheduledTime[] = [
  { hour: 10, minute: 0 },
  { hour: 14, minute: 0 },
  { hour: 20, minute: 0 },
];

function nextOccurrence({ hour, minute }: ScheduledTime, now: Date = new Date()): Date {
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

function totalRemainingReps(challenge: DailyChallenge): number {
  return challenge.movements.reduce(
    (sum, m) => sum + Math.max(0, m.goalReps - m.completedReps),
    0,
  );
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;
    if (!existing.canAskAgain) return false;
    const result = await Notifications.requestPermissionsAsync();
    return result.granted;
  } catch (err) {
    console.warn('[notifications] permission request failed:', err);
    return false;
  }
}

async function readStoredIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

async function writeStoredIds(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(IDS_KEY, JSON.stringify(ids));
}

export async function scheduleChallengeNotifications(
  challenge: DailyChallenge,
): Promise<void> {
  await cancelChallengeNotifications();

  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;

  const firstMovement = challenge.movements[0];
  if (!firstMovement) return;
  const movementName = MOVEMENT_DISPLAY_NAMES[firstMovement.type];
  const remaining = totalRemainingReps(challenge);

  const bodies: string[] = [
    `Your ${movementName} challenge is waiting. Quick session?`,
    `You have ${remaining} reps left today. You've got this.`,
    `Last call! ${remaining} reps to finish your challenge today.`,
  ];

  const ids: string[] = [];
  for (let i = 0; i < SCHEDULE.length; i++) {
    const fireAt = nextOccurrence(SCHEDULE[i]);
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'LowLift Daily Challenge',
          body: bodies[i],
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireAt,
        },
      });
      ids.push(id);
    } catch (err) {
      console.warn('[notifications] schedule failed:', err);
    }
  }

  await writeStoredIds(ids);
}

export async function cancelChallengeNotifications(): Promise<void> {
  const ids = await readStoredIds();
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (err) {
      console.warn('[notifications] cancel failed:', err);
    }
  }
  await AsyncStorage.removeItem(IDS_KEY);
}

export async function isDailyReminderScheduled(): Promise<boolean> {
  const id = await AsyncStorage.getItem(DAILY_REMINDER_ID_KEY);
  return !!id;
}

export async function wasDailyReminderDeclined(): Promise<boolean> {
  const v = await AsyncStorage.getItem(DAILY_REMINDER_DECLINED_KEY);
  return v === '1';
}

async function markDailyReminderDeclined(): Promise<void> {
  await AsyncStorage.setItem(DAILY_REMINDER_DECLINED_KEY, '1');
}

export async function cancelDailyReminder(): Promise<void> {
  const id = await AsyncStorage.getItem(DAILY_REMINDER_ID_KEY);
  if (id) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (err) {
      console.warn('[notifications] cancel daily reminder failed:', err);
    }
  }
  await AsyncStorage.removeItem(DAILY_REMINDER_ID_KEY);
}

export async function scheduleDailyReminder(): Promise<void> {
  // Lazy import to avoid circular dep at module load
  const { loadChallenge } = await import('./dailyChallenge');
  const challenge = await loadChallenge();
  if (challenge) return;

  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;

  await cancelDailyReminder();

  const body =
    DAILY_REMINDER_BODIES[Math.floor(Math.random() * DAILY_REMINDER_BODIES.length)];

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'LowLift',
        body,
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: DAILY_REMINDER_HOUR,
        minute: DAILY_REMINDER_MINUTE,
      },
    });
    await AsyncStorage.setItem(DAILY_REMINDER_ID_KEY, id);
  } catch (err) {
    console.warn('[notifications] schedule daily reminder failed:', err);
  }
}

// First-session permission flow. Returns true if reminder was scheduled.
export async function promptAndScheduleDailyReminder(): Promise<boolean> {
  if (await wasDailyReminderDeclined()) return false;

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) {
    await scheduleDailyReminder();
    return true;
  }
  if (!existing.canAskAgain) return false;

  return new Promise<boolean>((resolve) => {
    Alert.alert(
      'Stay on track?',
      'Want a daily reminder to keep your streak going?',
      [
        {
          text: 'Not now',
          style: 'cancel',
          onPress: async () => {
            await markDailyReminderDeclined();
            resolve(false);
          },
        },
        {
          text: 'Yes, remind me',
          onPress: async () => {
            const result = await Notifications.requestPermissionsAsync();
            if (result.granted) {
              await scheduleDailyReminder();
              resolve(true);
            } else {
              await markDailyReminderDeclined();
              resolve(false);
            }
          },
        },
      ],
      { cancelable: false },
    );
  });
}
