import AsyncStorage from '@react-native-async-storage/async-storage';
import { CompletedSession } from './history';

const KEY_ONBOARDED = 'lowlift:onboarded';
const KEY_HISTORY = 'lowlift:history';

export type PersistedState = {
  onboarded: boolean;
  history: CompletedSession[];
};

export async function loadState(): Promise<PersistedState> {
  try {
    const entries = await AsyncStorage.multiGet([KEY_ONBOARDED, KEY_HISTORY]);
    const map = Object.fromEntries(entries) as Record<string, string | null>;
    const onboarded = map[KEY_ONBOARDED] === '1';
    const history = map[KEY_HISTORY]
      ? (JSON.parse(map[KEY_HISTORY] as string) as CompletedSession[])
      : [];
    return { onboarded, history };
  } catch {
    return { onboarded: false, history: [] };
  }
}

export async function saveOnboarded(value: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_ONBOARDED, value ? '1' : '0');
}

export async function saveHistory(history: CompletedSession[]): Promise<void> {
  await AsyncStorage.setItem(KEY_HISTORY, JSON.stringify(history));
}

export async function clearAll(): Promise<void> {
  await AsyncStorage.multiRemove([KEY_ONBOARDED, KEY_HISTORY]);
}
