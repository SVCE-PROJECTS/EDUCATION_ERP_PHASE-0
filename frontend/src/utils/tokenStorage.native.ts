/**
 * tokenStorage.native.ts
 * Used on iOS and Android — backed by expo-secure-store (encrypted keychain/keystore).
 * Metro automatically picks this file over tokenStorage.ts on native platforms.
 */
import * as SecureStore from 'expo-secure-store';

export async function getToken(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setToken(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch { /* keychain unavailable on simulator without entitlement */ }
}

export async function removeToken(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch { /* already gone */ }
}
