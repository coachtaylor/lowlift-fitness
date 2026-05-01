import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_STATE = 'lowlift:feedback_state';
const KEY_PENDING = 'lowlift:feedback_pending';

export type EmojiRating = 'up' | 'meh' | 'down';

export type FeedbackState = {
  lastFeedbackSession: number;
  feedbackInterval: number;
  currentQuestionIndex: number;
  dismissedSinceAnswer: number;
};

export type PendingFeedback = {
  question: string;
  emojiRating: EmojiRating;
  textResponse: string;
  timestamp: number;
  sessionCount: number;
};

const INITIAL_INTERVAL = 3;
const POST_ANSWER_INTERVAL_MIN = 7;
const POST_ANSWER_INTERVAL_MAX = 10;
const POST_DISMISS_INTERVAL = 3;
const MIN_SESSIONS_BEFORE_FIRST_PROMPT = 3;

function randomPostAnswerInterval(): number {
  const span = POST_ANSWER_INTERVAL_MAX - POST_ANSWER_INTERVAL_MIN + 1;
  return POST_ANSWER_INTERVAL_MIN + Math.floor(Math.random() * span);
}

const RATING_TO_FORM_VALUE: Record<EmojiRating, string> = {
  up: 'positive',
  meh: 'neutral',
  down: 'negative',
};

const DEFAULT_STATE: FeedbackState = {
  lastFeedbackSession: 0,
  feedbackInterval: INITIAL_INTERVAL,
  currentQuestionIndex: 0,
  dismissedSinceAnswer: 0,
};

export const FALLBACK_QUESTIONS: string[] = [
  'How did your last session feel?',
  'Is there anything that almost stopped you from starting today?',
  'What would make LowLift better for you?',
  'How are the session lengths working for you?',
  'Anything feel confusing or unclear?',
];

// Set to a JSON endpoint or Firebase Remote Config REST URL that returns
// `{ questions: string[] }`. Empty string keeps the hardcoded fallback.
const REMOTE_CONFIG_URL = '';

const FEEDBACK_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSeVyOia02_b9tJyTc1XAcfGFHMzZZiU8S7hN0wpYv62sdHc4g/formResponse';
const FEEDBACK_FORM_FIELDS = {
  question: 'entry.1603235144',
  emojiRating: 'entry.1716697934',
  textResponse: 'entry.293099097',
  timestamp: 'entry.508485300',
  sessionCount: 'entry.285601921',
};

export async function loadFeedbackState(): Promise<FeedbackState> {
  try {
    const raw = await AsyncStorage.getItem(KEY_STATE);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

async function saveFeedbackState(state: FeedbackState): Promise<void> {
  await AsyncStorage.setItem(KEY_STATE, JSON.stringify(state));
}

export function shouldShowFeedback(state: FeedbackState, totalSessions: number): boolean {
  if (totalSessions < MIN_SESSIONS_BEFORE_FIRST_PROMPT) return false;
  return totalSessions - state.lastFeedbackSession >= state.feedbackInterval;
}

export function pickQuestion(state: FeedbackState, pool: string[]): string {
  if (pool.length === 0) return FALLBACK_QUESTIONS[0];
  return pool[state.currentQuestionIndex % pool.length];
}

export async function fetchQuestions(): Promise<string[]> {
  if (!REMOTE_CONFIG_URL) return FALLBACK_QUESTIONS;
  try {
    const res = await fetch(REMOTE_CONFIG_URL);
    if (!res.ok) return FALLBACK_QUESTIONS;
    const json = await res.json();
    const list = Array.isArray(json?.questions) ? json.questions : null;
    if (!list || list.length === 0) return FALLBACK_QUESTIONS;
    return list.filter((q: unknown): q is string => typeof q === 'string' && q.length > 0);
  } catch {
    return FALLBACK_QUESTIONS;
  }
}

export async function recordDismissed(totalSessions: number, poolSize: number): Promise<FeedbackState> {
  const prev = await loadFeedbackState();
  const next: FeedbackState = {
    lastFeedbackSession: totalSessions,
    feedbackInterval: POST_DISMISS_INTERVAL,
    currentQuestionIndex: poolSize > 0 ? (prev.currentQuestionIndex + 1) % poolSize : 0,
    dismissedSinceAnswer: prev.dismissedSinceAnswer + 1,
  };
  await saveFeedbackState(next);
  return next;
}

export async function recordAnswered(totalSessions: number, poolSize: number): Promise<FeedbackState> {
  const prev = await loadFeedbackState();
  const next: FeedbackState = {
    lastFeedbackSession: totalSessions,
    feedbackInterval: randomPostAnswerInterval(),
    currentQuestionIndex: poolSize > 0 ? (prev.currentQuestionIndex + 1) % poolSize : 0,
    dismissedSinceAnswer: 0,
  };
  await saveFeedbackState(next);
  return next;
}

async function postFeedback(payload: PendingFeedback): Promise<boolean> {
  if (!FEEDBACK_FORM_URL) return false;
  try {
    const body = new URLSearchParams();
    body.append(FEEDBACK_FORM_FIELDS.question, payload.question);
    body.append(FEEDBACK_FORM_FIELDS.emojiRating, RATING_TO_FORM_VALUE[payload.emojiRating]);
    body.append(FEEDBACK_FORM_FIELDS.textResponse, payload.textResponse);
    body.append(FEEDBACK_FORM_FIELDS.timestamp, new Date(payload.timestamp).toISOString());
    body.append(FEEDBACK_FORM_FIELDS.sessionCount, String(payload.sessionCount));
    const res = await fetch(FEEDBACK_FORM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    return res.ok || res.status === 0;
  } catch {
    return false;
  }
}

async function loadPending(): Promise<PendingFeedback[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PENDING);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function savePending(items: PendingFeedback[]): Promise<void> {
  if (items.length === 0) {
    await AsyncStorage.removeItem(KEY_PENDING);
    return;
  }
  await AsyncStorage.setItem(KEY_PENDING, JSON.stringify(items));
}

export async function submitFeedback(payload: PendingFeedback): Promise<void> {
  const ok = await postFeedback(payload);
  if (ok) return;
  const queued = await loadPending();
  queued.push(payload);
  await savePending(queued);
}

export async function flushPendingFeedback(): Promise<void> {
  const queued = await loadPending();
  if (queued.length === 0) return;
  const remaining: PendingFeedback[] = [];
  for (const item of queued) {
    const ok = await postFeedback(item);
    if (!ok) remaining.push(item);
  }
  await savePending(remaining);
}
