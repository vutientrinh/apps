import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Icon, IconButton, Illustration, Screen, Wordmark, type IllustrationName } from '@/ui';
import { useTokens } from '@/theme/theme';
import { fontFamily, radius, touchTarget, type, withAlpha } from '@/theme/tokens';

/** Below this window height (small phones) the header art is dropped so the form stays above the fold. */
const MIN_HEIGHT_FOR_ART = 700;

/**
 * Auth screens: top bar (back when there is history, otherwise the wordmark; "Not now" → browse as guest),
 * h1 title + one line of help, the form, and the switch-flow footer pinned to the bottom of the screen.
 * `art` adds a header illustration above the title on screens tall enough to keep the form in view.
 */
export function AuthLayout({ title, description, children, footer, art }: { title: string; description: string; children: ReactNode; footer?: ReactNode; art?: IllustrationName }) {
  const tokens = useTokens();
  const router = useRouter();
  const { height } = useWindowDimensions();
  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: tokens.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Screen><View style={{ width: '100%', maxWidth: 480, alignSelf: 'center', flex: 1 }}>
      <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {router.canGoBack() ? <IconButton icon="ChevronLeft" accessibilityLabel="Go back" onPress={() => router.back()} style={{ marginLeft: -12 }} /> : <Wordmark />}
        <Link href="/" asChild><Pressable accessibilityRole="link" accessibilityLabel="Not now, browse as guest" style={{ minHeight: touchTarget, paddingHorizontal: 12, marginRight: -12, justifyContent: 'center' }}><Text style={[type.small, { color: tokens.mutedForeground, fontFamily: fontFamily.medium }]}>Not now</Text></Pressable></Link>
      </View>
      {art && height >= MIN_HEIGHT_FOR_ART ? <Illustration name={art} height={152} style={{ marginTop: 8 }} /> : null}
      <View style={{ gap: 8, marginTop: 24, marginBottom: 32 }}>
        <Text accessibilityRole="header" style={[type.h1, { color: tokens.foreground }]}>{title}</Text>
        <Text style={[type.body, { color: tokens.mutedForeground }]}>{description}</Text>
      </View>
      {children}
      <View style={{ flex: 1, minHeight: 24 }} />
      {footer}
    </View></Screen>
  </KeyboardAvoidingView>;
}

/** Inline "question · link" row under auth forms. */
export function AuthFooter({ prompt, href, label }: { prompt: string; href: '/login' | '/register'; label: string }) {
  const tokens = useTokens();
  return <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', columnGap: 4 }}>
    <Text style={[type.small, { color: tokens.mutedForeground }]}>{prompt}</Text>
    <Link href={href} asChild><Pressable accessibilityRole="link" style={{ minHeight: touchTarget, justifyContent: 'center', paddingHorizontal: 4 }}><Text style={[type.small, { color: tokens.primary, fontWeight: '600' }]}>{label}</Text></Pressable></Link>
  </View>;
}

export function CheckRow({ checked, onToggle, title, description, disabled = false }: { checked: boolean; onToggle: () => void; title: string; description?: string; disabled?: boolean }) {
  const tokens = useTokens();
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked, disabled }} disabled={disabled} onPress={onToggle} style={{ minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: disabled ? 0.5 : 1 }}>
    <View style={{ width: 22, height: 22, borderRadius: radius.sm, borderWidth: checked ? 0 : 1.5, borderColor: tokens.input, backgroundColor: checked ? tokens.primary : tokens.card, alignItems: 'center', justifyContent: 'center' }}>{checked ? <Icon name="Check" size={16} strokeWidth={3} color={tokens.primaryForeground} /> : null}</View>
    <View style={{ flex: 1, gap: 2 }}><Text style={[type.small, { color: tokens.foreground }]}>{title}</Text>{description ? <Text style={[type.small, { color: tokens.mutedForeground, fontSize: 13 }]}>{description}</Text> : null}</View>
  </Pressable>;
}

export function FormAlert({ message }: { message: string | null }) {
  const tokens = useTokens();
  if (!message) return null;
  return <View accessibilityRole="alert" style={{ padding: 12, flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: withAlpha(tokens.destructive, 0.1), borderRadius: radius.md }}>
    <Icon name="CircleExclamationPoint" size={18} color={tokens.destructive} />
    <Text style={[type.small, { color: tokens.foreground, flex: 1 }]}>{message}</Text>
  </View>;
}

/** Four-segment strength meter. Renders nothing until the user starts typing. */
export function PasswordStrength({ password }: { password: string }) {
  const tokens = useTokens();
  if (!password) return null;
  const checks = [password.length >= 8, /[a-z]/i.test(password), /\d/.test(password), /[^a-z\d]/i.test(password)];
  const strength = checks.filter(Boolean).length;
  const label = ['Add a password', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const fill = strength <= 1 ? tokens.destructive : strength === 2 ? tokens.warning : tokens.success;
  return <View accessibilityLiveRegion="polite" accessibilityLabel={`Password strength: ${label}`} style={{ gap: 6 }}>
    <View style={{ flexDirection: 'row', gap: 4 }}>{checks.map((_, index) => <View key={index} style={{ flex: 1, height: 4, borderRadius: radius.full, backgroundColor: index < strength ? fill : tokens.muted }} />)}</View>
    <Text style={[type.caption, { color: tokens.mutedForeground }]}>{label}{password.length > 0 && password.length < 8 ? ' · Use at least 8 characters' : ''}</Text>
  </View>;
}

export function InitialsAvatar({ name, size = 56 }: { name: string; size?: number }) {
  const tokens = useTokens();
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = (words.length > 1 ? [words[0], words[words.length - 1]] : words).map((part) => part[0]?.toUpperCase()).join('') || '?';
  return <View accessibilityLabel={`${name || 'Shopper'} avatar`} style={{ width: size, height: size, borderRadius: radius.full, backgroundColor: withAlpha(tokens.primary, 0.14), alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color: tokens.primary, fontFamily: fontFamily.title, fontSize: Math.round(size * 0.36) }}>{initials}</Text>
  </View>;
}
