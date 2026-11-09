import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * True when the OS "reduce motion" setting is on. Use cross-fades (or no animation) instead of
 * slides/scales when it is (DESIGN.md §5).
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => { if (active) setReduced(Boolean(value)); })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (value: boolean) => setReduced(Boolean(value)));
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);
  return reduced;
}
