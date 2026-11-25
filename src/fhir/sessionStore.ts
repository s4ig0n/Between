import * as SecureStore from 'expo-secure-store';

import type { EpicSession } from './session';

// The token and its metadata are kept under separate keys so each value stays
// well under SecureStore's recommended 2 KB size.
const TOKEN_KEY = 'epic.accessToken';
const META_KEY = 'epic.session';

const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export async function saveSession(session: EpicSession): Promise<void> {
  const { accessToken, ...meta } = session;
  await SecureStore.setItemAsync(TOKEN_KEY, accessToken, options);
  await SecureStore.setItemAsync(META_KEY, JSON.stringify(meta), options);
}

export async function loadSession(): Promise<EpicSession | undefined> {
  const [token, meta] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY, options),
    SecureStore.getItemAsync(META_KEY, options),
  ]);
  if (!token || !meta) return undefined;
  try {
    return { ...(JSON.parse(meta) as Omit<EpicSession, 'accessToken'>), accessToken: token };
  } catch {
    return undefined;
  }
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY, options),
    SecureStore.deleteItemAsync(META_KEY, options),
  ]);
}
