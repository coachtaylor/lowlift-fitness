import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClientOptions } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Add them to app/.env and restart `npx expo start -c`.',
  );
}

if (!AsyncStorage || typeof AsyncStorage.getItem !== 'function') {
  throw new Error(
    `AsyncStorage not available (got: ${typeof AsyncStorage}). ` +
      '@react-native-async-storage/async-storage failed to link. Stop Metro and run: cd app && npx expo start -c',
  );
}

const storageAdapter = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

const SENSITIVE_BODY_KEYS = new Set(['password', 'access_token', 'refresh_token', 'id_token']);

const redactBody = (body: unknown): string => {
  if (typeof body !== 'string') return typeof body;
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed === 'object') {
      for (const key of Object.keys(parsed)) {
        if (SENSITIVE_BODY_KEYS.has(key)) parsed[key] = '[redacted]';
      }
      return JSON.stringify(parsed).slice(0, 300);
    }
  } catch {}
  return '[unloggable body]';
};

const loggingFetch: typeof fetch = async (input, init) => {
  const urlStr = typeof input === 'string' ? input : (input as URL | Request).toString();
  console.log('[sb-fetch] ->', init?.method ?? 'GET', urlStr);
  console.log('[sb-fetch] body:', redactBody(init?.body));
  try {
    const res = await fetch(input, init);
    console.log('[sb-fetch] <- status', res.status, urlStr);
    return res;
  } catch (e: any) {
    console.warn('[sb-fetch] THREW for', urlStr, '-', e?.message, e?.stack?.slice(0, 400));
    throw e;
  }
};

const options: SupabaseClientOptions<'public'> = {
  global: __DEV__ ? { fetch: loggingFetch } : {},
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
};

export const supabase = createClient(url, anonKey, options);
