/**
 * Mobile design tokens — values from docs/design/DESIGN.md §2–§4 (same values as web `frontend/src/index.css`).
 * This file and `global.css` are the only places allowed to hold raw colour values.
 * Components read tokens through `useTokens()` (`@/theme/theme`) and never hard-code hex.
 */
import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const lightTokens = {
  background: '#f6fbfb',
  card: '#fdfefe',
  surfaceRaised: '#ffffff',
  muted: '#eaf2f2',
  foreground: '#132124',
  cardForeground: '#132124',
  mutedForeground: '#4d5e63',
  border: '#d1dcdc',
  input: '#798a8c',
  primary: '#006967',
  primaryForeground: '#f9fdfc',
  ring: '#008384',
  deal: '#c32e53',
  dealMuted: '#ffe7e9',
  success: '#217541',
  warning: '#945f0e',
  destructive: '#ba2b28',
  /** Text/icons on a filled destructive surface (5.9:1 light, 7.1:1 dark). */
  destructiveForeground: '#f9fdfc',
  /** Modal backdrop behind sheets and dialogs. */
  scrim: 'rgba(19, 33, 36, 0.4)',
  statusPending: '#945f0e',
  statusProcessing: '#006967',
  statusCompleted: '#217541',
  statusFailed: '#ba2b28',
  statusRefunded: '#754481',
  /** @deprecated use `radius.md` (or `radius.lg` for cards). Kept so existing screens keep compiling. */
  radius: 8,
};

export type ThemeTokens = typeof lightTokens;
export type ColorToken = { [K in keyof ThemeTokens]: ThemeTokens[K] extends string ? K : never }[keyof ThemeTokens];

export const darkTokens: ThemeTokens = {
  background: '#0c1416',
  card: '#131c1f',
  surfaceRaised: '#1a2528',
  muted: '#1e2a2d',
  foreground: '#e9f0f0',
  cardForeground: '#e9f0f0',
  mutedForeground: '#a5b5b6',
  border: '#313f41',
  input: '#5f6f72',
  primary: '#5dc9c0',
  primaryForeground: '#031a1b',
  ring: '#5dc9c0',
  deal: '#ef8191',
  dealMuted: '#472026',
  success: '#75ca8e',
  warning: '#eabc6e',
  destructive: '#f3827a',
  destructiveForeground: '#031a1b',
  scrim: 'rgba(0, 0, 0, 0.6)',
  statusPending: '#eabc6e',
  statusProcessing: '#5dc9c0',
  statusCompleted: '#75ca8e',
  statusFailed: '#f3827a',
  statusRefunded: '#c89cd2',
  radius: 8,
};

/** Radius by hierarchy: sm = chips/badges, md = buttons/inputs, lg = cards/sheets/images, full = avatars/pills. */
export const radius = { sm: 4, md: 8, lg: 14, full: 999 } as const;

/** 4-based spacing scale. */
export const space = { 0: 0, 0.5: 2, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 } as const;

/** Minimum touch target (Material 48 dp, also clears iOS 44 pt). */
export const touchTarget = 48;

/** Be Vietnam Pro families (one family per weight on native). Body text stays on the platform font. */
export const fontFamily = {
  display: 'BeVietnamPro_700Bold',
  title: 'BeVietnamPro_600SemiBold',
  money: 'BeVietnamPro_600SemiBold',
  medium: 'BeVietnamPro_500Medium',
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }),
} as const;

export type TypeToken = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption';

/**
 * Type scale (mobile pt column of DESIGN.md §3). Headings carry their Be Vietnam Pro family; body/small stay on
 * the platform font. Never combine these families with `fontWeight` (the family already is the weight).
 */
export const type: Record<TypeToken, TextStyle> = {
  display: { fontFamily: fontFamily.display, fontSize: 34, lineHeight: 38, letterSpacing: -0.68 },
  h1: { fontFamily: fontFamily.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.42 },
  h2: { fontFamily: fontFamily.title, fontSize: 22, lineHeight: 27, letterSpacing: -0.22 },
  h3: { fontFamily: fontFamily.title, fontSize: 18, lineHeight: 23 },
  body: { fontSize: 16, lineHeight: 24 },
  small: { fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 17, letterSpacing: 0.12 },
};

/** Motion durations in ms (DESIGN.md §5). */
export const motion = { enter: 180, exit: 120, sheet: 300, celebrate: 400 } as const;

/**
 * Elevation: 0 = border only (default), 1 = popover/menu, 2 = sheet/dialog. Dark mode has no shadows.
 */
export function elevation(level: 0 | 1 | 2, scheme: 'light' | 'dark'): ViewStyle {
  if (level === 0 || scheme === 'dark') return {};
  return level === 1
    ? { boxShadow: '0 4px 16px rgba(19, 33, 36, 0.10)' }
    : { boxShadow: '0 12px 32px rgba(19, 33, 36, 0.16)' };
}

/** `withAlpha(tokens.primary, 0.1)` → `rgba(0, 105, 103, 0.1)`. Accepts `#rgb` or `#rrggbb`. */
export function withAlpha(color: string, alpha: number): string {
  const hex = color.replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((digit) => digit + digit).join('') : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return color;
  const [r, g, b] = [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16));
  const clamped = Math.min(1, Math.max(0, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}
