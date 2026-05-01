import { SessionType } from '../components/SessionCard';

export type CompletedSessionMovement = {
  slug: string;
  name: string;
  durationSeconds: number;
};

export type CompletedSession = {
  id: string;
  sessionSlug: string;
  type: SessionType;
  sessionName: string;
  durationSeconds: number;
  completedAt: number;
  movements?: CompletedSessionMovement[];
};

export type WeekDay = {
  letter: string;
  isToday: boolean;
  completed: boolean;
  inFuture: boolean;
};

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function sameCalendarDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function buildWeek(history: CompletedSession[], now: number = Date.now()): WeekDay[] {
  const monday = startOfWeek(new Date(now));
  return DAY_LETTERS.map((letter, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const dayMs = day.getTime();
    const dayStart = dayMs;
    const dayEnd = dayMs + 24 * 60 * 60 * 1000;
    const completed = history.some(
      (h) => h.completedAt >= dayStart && h.completedAt < dayEnd,
    );
    return {
      letter,
      isToday: sameCalendarDay(dayMs, now),
      completed,
      inFuture: dayStart > now && !sameCalendarDay(dayMs, now),
    };
  });
}

export function currentStreak(history: CompletedSession[], now: number = Date.now()): number {
  if (history.length === 0) return 0;
  const days = new Set(
    history.map((h) => {
      const d = new Date(h.completedAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }),
  );
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  const cursor = new Date(today);
  while (days.has(cursor.getTime())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function longestStreak(history: CompletedSession[]): number {
  if (history.length === 0) return 0;
  const days = Array.from(
    new Set(
      history.map((h) => {
        const d = new Date(h.completedAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }),
    ),
  ).sort((a, b) => a - b);

  let longest = 1;
  let run = 1;
  const DAY = 24 * 60 * 60 * 1000;
  for (let i = 1; i < days.length; i++) {
    if (days[i] - days[i - 1] === DAY) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }
  return longest;
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatRelativeDate(ts: number, now: number = Date.now()): string {
  const d = new Date(ts);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const target = new Date(ts);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - target.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}

export function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
