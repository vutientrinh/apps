import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useTokens } from '@/ui';
import { motion, type } from '@/theme/tokens';

const CIRCLE = 2 * Math.PI * 10;
const CHECK = 9;

/**
 * The one orchestrated motion moment (DESIGN.md §5): the ring and then the check draw in once over 400 ms,
 * with a success haptic. With reduce motion on, the finished mark cross-fades in instead.
 * Stroke offsets are driven as plain numbers (not Animated SVG nodes) so the same code works on web.
 */
export function SuccessMark({ color, size = 72 }: { color: string; size?: number }) {
  const [draw, setDraw] = useState(0);
  const [fade, setFade] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const progress = new Animated.Value(0);
    let target: (value: number) => void = setDraw;
    const listener = progress.addListener(({ value }) => { if (!cancelled) target(value); });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    void AccessibilityInfo.isReduceMotionEnabled().catch(() => false).then((reduced) => {
      if (cancelled) return;
      if (reduced) { setDraw(1); target = setFade; }
      else setFade(1);
      Animated.timing(progress, { toValue: 1, duration: reduced ? motion.enter : motion.celebrate, easing: Easing.out(reduced ? Easing.quad : Easing.cubic), useNativeDriver: false }).start();
    });
    return () => { cancelled = true; progress.removeListener(listener); progress.stopAnimation(); };
  }, []);
  const ring = Math.min(1, draw / 0.6);
  const check = Math.max(0, (draw - 0.6) / 0.4);
  return <View accessible accessibilityRole="image" accessibilityLabel="Success" style={{ opacity: fade }}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.6} strokeDasharray={CIRCLE} strokeDashoffset={CIRCLE * (1 - ring)} strokeLinecap="round" transform="rotate(-90 12 12)" />
      <Path d="m8.5 12 2.5 2.5 4.5-4.5" stroke={color} strokeWidth={1.8} strokeDasharray={CHECK} strokeDashoffset={CHECK * (1 - check)} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  </View>;
}

/** Success screen body: mark, title, the amount (largest type on the screen), details, then actions in the thumb zone. */
export function PaymentSuccess({ title, amount, details, actions }: { title: string; amount: ReactNode; details?: ReactNode; actions: ReactNode }) {
  const colors = useTokens();
  return <View style={{ flex: 1, gap: 24, paddingTop: 32 }}>
    <View accessibilityLiveRegion="polite" style={{ alignItems: 'center', gap: 12 }}>
      <SuccessMark color={colors.success} />
      <Text accessibilityRole="header" style={[type.h3, { color: colors.foreground }]}>{title}</Text>
      {amount}
      {details ? <View style={{ alignItems: 'center', gap: 4 }}>{details}</View> : null}
    </View>
    <View style={{ flex: 1 }} />
    <View style={{ gap: 12 }}>{actions}</View>
  </View>;
}
