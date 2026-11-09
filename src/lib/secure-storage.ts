import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

type StorageAdapter = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

export function createStorageAdapter(platform: string): StorageAdapter {
  if (platform === 'web') {
    return {
      async getItemAsync(key) {
        if (typeof globalThis.localStorage === 'undefined') return null;
        return globalThis.localStorage.getItem(key);
      },
      async setItemAsync(key, value) {
        if (typeof globalThis.localStorage !== 'undefined') globalThis.localStorage.setItem(key, value);
      },
      async deleteItemAsync(key) {
        if (typeof globalThis.localStorage !== 'undefined') globalThis.localStorage.removeItem(key);
      },
    };
  }

  return {
    getItemAsync: (key) => SecureStore.getItemAsync(key),
    setItemAsync: (key, value) => SecureStore.setItemAsync(key, value),
    deleteItemAsync: (key) => SecureStore.deleteItemAsync(key),
  };
}

const storage = createStorageAdapter(Platform.OS);
export const getItemAsync = storage.getItemAsync;
export const setItemAsync = storage.setItemAsync;
export const deleteItemAsync = storage.deleteItemAsync;
