import { useSyncExternalStore } from 'react';
import { deleteItemAsync, getItemAsync, setItemAsync } from './secure-storage';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

type SessionState = { authenticated: boolean; initialized: boolean };
let state: SessionState = { authenticated: false, initialized: false };
let memoryTokens: AuthTokens | null = null;
let sessionRememberMe = true;
const subscribers = new Set<() => void>();
const notify = () => subscribers.forEach((subscriber) => subscriber());

async function store(key: string, value: string): Promise<void> {
  await setItemAsync(key, value);
}

export async function getAccessToken(): Promise<string | null> {
  return memoryTokens?.accessToken ?? getItemAsync('access-token');
}

export async function getRefreshToken(): Promise<string | null> {
  return memoryTokens?.refreshToken ?? getItemAsync('refresh-token');
}

export async function saveTokens(tokens: AuthTokens, rememberMe = sessionRememberMe): Promise<void> {
  memoryTokens = tokens;
  sessionRememberMe = rememberMe;
  try {
    if (rememberMe) {
      await Promise.all([store('access-token', tokens.accessToken), store('refresh-token', tokens.refreshToken)]);
    } else {
      await Promise.all([deleteItemAsync('access-token'), deleteItemAsync('refresh-token')]);
    }
  } catch {
    // Keep the active session in memory if secure storage is temporarily unavailable.
  }
  state = { authenticated: true, initialized: true };
  notify();
}

export async function clearSession(): Promise<void> {
  memoryTokens = null;
  sessionRememberMe = true;
  try {
    await Promise.all([deleteItemAsync('access-token'), deleteItemAsync('refresh-token')]);
  } catch {
    // Clear in-memory identity even if persistent storage cannot be reached.
  }
  state = { authenticated: false, initialized: true };
  notify();
}

export async function initializeSession(): Promise<void> {
  try {
    memoryTokens = null;
    const token = await getItemAsync('access-token');
    sessionRememberMe = Boolean(token);
    state = { authenticated: Boolean(token), initialized: true };
  } catch {
    state = { authenticated: false, initialized: true };
    notify();
    throw new Error('Unable to load the saved session.');
  }
  notify();
}

export async function getDeviceId(): Promise<string> {
  const saved = await getItemAsync('device-id');
  if (saved) return saved;
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  await setItemAsync('device-id', id);
  return id;
}

export function subscribeSession(subscriber: () => void) {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

export function getSessionSnapshot(): SessionState {
  return state;
}

export function useAuth() {
  return useSyncExternalStore(subscribeSession, getSessionSnapshot, getSessionSnapshot);
}
