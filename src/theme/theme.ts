import { useSyncExternalStore } from 'react';
import { Appearance, type ColorSchemeName } from 'react-native';
import { getItemAsync, setItemAsync } from '../lib/secure-storage';
import { darkTokens, lightTokens, type ThemeTokens } from './tokens';

type ThemePreference = 'system' | 'light' | 'dark';
let preference: ThemePreference = 'system';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export async function initializeTheme(): Promise<void> {
  try {
    const saved = await getItemAsync('theme-preference');
    if (saved === 'light' || saved === 'dark' || saved === 'system') preference = saved;
  } catch {
    preference = 'system';
    emit();
    throw new Error('Unable to load the saved theme preference.');
  }
  emit();
}

export async function setThemePreference(value: ThemePreference): Promise<void> {
  preference = value;
  try {
    await setItemAsync('theme-preference', value);
  } catch {
    // The in-memory setting remains usable if device storage is unavailable.
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const appearanceSubscription = Appearance.addChangeListener(emit);
  return () => {
    listeners.delete(listener);
    appearanceSubscription.remove();
  };
}

export function useThemePreference() {
  useSyncExternalStore(subscribe, () => preference, () => preference);
  const systemScheme: ColorSchemeName = Appearance.getColorScheme() ?? 'light';
  const colorScheme: 'light' | 'dark' = (preference === 'system' ? systemScheme : preference) === 'dark' ? 'dark' : 'light';
  return {
    preference,
    colorScheme,
    setThemePreference,
  } as const;
}

/** Semantic colour tokens for the active scheme. Prefer this over picking light/dark tokens by hand. */
export function useTokens(): ThemeTokens {
  const { colorScheme } = useThemePreference();
  return colorScheme === 'dark' ? darkTokens : lightTokens;
}
