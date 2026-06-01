import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Onboarding is device-local (no server backing), so it MUST be scoped per
// user — otherwise a second account signing in on the same device inherits the
// first user's "onboarded" flag and skips onboarding. Keying by user id lets
// each account keep its own flag without clearing it on sign-out (which would
// force returning users back through onboarding).
const KEY_ONBOARDED_BASE = 'lowlift:onboarded';
const KEY_PENDING_PASSWORD_RESET = 'lowlift:pending_password_reset';

export type PersistedState = {
  onboarded: boolean;
};

async function onboardedKey(): Promise<string | null> {
  // Use getSession() (local, offline-safe) rather than getUser() (network
  // round-trip) — an offline returning user must still resolve their key.
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  return userId ? `${KEY_ONBOARDED_BASE}:${userId}` : null;
}

export async function loadState(): Promise<PersistedState> {
  try {
    const key = await onboardedKey();
    // No signed-in user → treat as not onboarded (the onboarding flow gates on
    // an authed session anyway).
    if (!key) return { onboarded: false };
    const value = await AsyncStorage.getItem(key);
    return { onboarded: value === '1' };
  } catch {
    return { onboarded: false };
  }
}

export async function saveOnboarded(value: boolean): Promise<void> {
  const key = await onboardedKey();
  if (!key) return;
  await AsyncStorage.setItem(key, value ? '1' : '0');
}

export async function setPendingPasswordReset(value: boolean): Promise<void> {
  if (value) {
    await AsyncStorage.setItem(KEY_PENDING_PASSWORD_RESET, '1');
  } else {
    await AsyncStorage.removeItem(KEY_PENDING_PASSWORD_RESET);
  }
}

export async function getPendingPasswordReset(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY_PENDING_PASSWORD_RESET)) === '1';
  } catch {
    return false;
  }
}

export async function clearAll(): Promise<void> {
  // Best-effort: remove the pending-reset flag and any onboarding keys
  // (per-user `lowlift:onboarded:<id>` plus the legacy un-suffixed key).
  const keys = await AsyncStorage.getAllKeys();
  const onboardingKeys = keys.filter((k) => k.startsWith(KEY_ONBOARDED_BASE));
  await AsyncStorage.multiRemove([...onboardingKeys, KEY_PENDING_PASSWORD_RESET]);
}
