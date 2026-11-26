import { useId, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { brand } from '@/config/brand';
import { useTokens } from '@/theme/theme';
import { fontFamily } from '@/theme/tokens';

/**
 * The logo mark on its 512 grid: a bag handle on the bag's top edge (= the J's bar) and a J ending in a ledger tick.
 * Geometry must match `docs/design/brand/logo.svg` and `scripts/build-app-icons.mjs`.
 */
export function BrandMark({ size = 28 }: { size?: number }) {
  const tokens = useTokens();
  return <Svg width={size} height={size} viewBox="0 0 512 512">
    <Rect width={512} height={512} rx={113} fill={tokens.primary} />
    <G fill="none" stroke={tokens.primaryForeground} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M214 204V162a46 46 0 0 1 92 0v42" strokeWidth={34} />
      <Path d="M168 208H344" strokeWidth={44} />
      <Path d="M306 208V302L222 386L156 320" strokeWidth={44} />
    </G>
  </Svg>;
}

/** Mark + name in Be Vietnam Pro 700, −0.02em. Used on onboarding and auth. */
export function Wordmark() {
  const tokens = useTokens();
  return <View accessible accessibilityRole="image" accessibilityLabel={brand.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <BrandMark size={28} />
    <Text style={{ color: tokens.foreground, fontFamily: fontFamily.display, fontSize: 19, letterSpacing: -0.38 }}>{brand.name}</Text>
  </View>;
}

/**
 * The brand gradient (135°) behind its children. Only for the hero, auth, onboarding and splash (DESIGN.md §8).
 * Put `primaryForeground` text on it. `style` sets the box (radius, padding, size).
 */
export function BrandGradient({ children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const tokens = useTokens();
  const id = `brand-gradient-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [from, to] = tokens.brandGradient;
  return <View style={[{ overflow: 'hidden', backgroundColor: from }, style]}>
    <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
    {children}
  </View>;
}
