import { useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useTokens } from '@/theme/theme';
import { mixColor, type ThemeTokens } from '@/theme/tokens';
import { illustrationXml } from './illustration-xml';

/** The illustration kit (DESIGN.md §8, plan §5.3). Same names as the web kit. */
export type IllustrationName = keyof typeof illustrationXml;
export const illustrationNames = Object.keys(illustrationXml) as IllustrationName[];

/** Replaces the `var(--token)` placeholders with theme colours (same mapping as the web `<Illustration>`). */
export function themedIllustration(name: IllustrationName, tokens: ThemeTokens): string {
  const colors: Record<string, string> = {
    primary: tokens.primary,
    card: tokens.card,
    muted: tokens.muted,
    'muted-foreground': tokens.mutedForeground,
    // unDraw neutrals with no token of their own, mixed from tokens so light and dark both work.
    'jw-ink': mixColor(tokens.foreground, tokens.background, 0.82),
    'jw-soft': mixColor(tokens.muted, tokens.border, 0.4),
    'jw-mid': mixColor(tokens.border, tokens.input, 0.55),
  };
  return illustrationXml[name].replace(/var\(--([a-z-]+)\)/g, (_match, key: string) => colors[key] ?? tokens.mutedForeground);
}

/**
 * Decorative scene, centred in a fixed-height box. Always pair it with a text title: it is hidden from screen
 * readers. Only on empty / success / error states, auth and onboarding; never on lists, tables or forms.
 */
export function Illustration({ name, height = 160, style }: { name: IllustrationName; height?: number; style?: StyleProp<ViewStyle> }) {
  const tokens = useTokens();
  const xml = useMemo(() => themedIllustration(name, tokens), [name, tokens]);
  return <View testID={`illustration-${name}`} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={[{ width: '100%', height }, style]}>
    <SvgXml xml={xml} width="100%" height="100%" />
  </View>;
}
