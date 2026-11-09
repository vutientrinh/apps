import { forwardRef, useImperativeHandle, useRef, useState, type ComponentRef } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useTokens } from '@/theme/theme';
import { fontFamily, radius } from '@/theme/tokens';

export interface OtpInputHandle { focus: () => void }

/**
 * Six digit boxes backed by one transparent TextInput, so typing, paste and SMS/OS autofill
 * (`oneTimeCode` / `sms-otp`) all work. Calls `onComplete` once all digits are entered.
 */
export const OtpInput = forwardRef<OtpInputHandle, {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  accessibilityLabel?: string;
}>(function OtpInput({ value, onChange, onComplete, length = 6, error = false, disabled = false, autoFocus = true, accessibilityLabel = `${length}-digit code` }, ref) {
  const tokens = useTokens();
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);
  useImperativeHandle(ref, () => ({ focus: () => input.current?.focus() }), []);

  function handleChange(text: string) {
    const next = text.replace(/\D/g, '').slice(0, length);
    onChange(next);
    if (next.length === length && next !== value) onComplete?.(next);
  }

  const activeIndex = Math.min(value.length, length - 1);
  return <Pressable accessible={false} onPress={() => input.current?.focus()} style={{ alignSelf: 'stretch' }}>
    <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'space-between' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length }, (_, index) => {
        const digit = value[index] ?? '';
        const active = focused && index === activeIndex && !disabled;
        const borderColor = error ? tokens.destructive : active ? tokens.ring : digit ? tokens.foreground : tokens.input;
        return <View key={index} style={{ flex: 1, maxWidth: 52, height: 56, borderRadius: radius.md, borderWidth: active || error ? 2 : 1, borderColor, backgroundColor: tokens.card, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1 }}>
          <Text style={{ color: tokens.foreground, fontFamily: fontFamily.money, fontSize: 24, lineHeight: 30, fontVariant: ['tabular-nums'] }}>{digit}</Text>
          {active && !digit ? <View style={{ position: 'absolute', bottom: 12, width: 14, height: 2, borderRadius: 1, backgroundColor: tokens.ring }} /> : null}
        </View>;
      })}
    </View>
    <TextInput
      ref={input}
      testID="otp-input"
      value={value}
      onChangeText={handleChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      editable={!disabled}
      autoFocus={autoFocus}
      keyboardType="number-pad"
      inputMode="numeric"
      textContentType="oneTimeCode"
      autoComplete="sms-otp"
      maxLength={length}
      caretHidden
      contextMenuHidden={false}
      selectionColor="transparent"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: value ? value.split('').join(' ') : 'empty' }}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, color: 'transparent', backgroundColor: 'transparent', borderWidth: 0, outlineWidth: 0, fontSize: 16 }}
    />
  </Pressable>;
});
