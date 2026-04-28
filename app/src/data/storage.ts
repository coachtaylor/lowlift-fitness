import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_ONBOARDED = 'lowlift:onboarded';
const KEY_PENDING_PASSWORD_RESET = 'lowlift:pending_password_reset';

export type PersistedState = {
  onboarded: boolean;
};

export async function loadState(): Promise<PersistedState> {
  try {
    const value = await AsyncStorage.getItem(KEY_ONBOARDED);
    return { onboarded: value === '1' };
  } catch {
    return { onboarded: false };
  }
}

export async function saveOnboarded(value: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_ONBOARDED, value ? '1' : '0');
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
  await AsyncStorage.multiRemove([KEY_ONBOARDED, KEY_PENDING_PASSWORD_RESET]);
}
