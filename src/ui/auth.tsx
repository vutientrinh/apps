import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Icon, Screen } from '@/ui';
import { useTokens } from '@/theme/theme';
import { fontFamily, radius, touchTarget, type, withAlpha } from '@/theme/tokens';

export function AuthLayout({ title, description, children, footer }: { title: string; description: string; children: ReactNode; footer?: ReactNode }) {
  const tokens = useTokens();
  return <Screen><View style={{ width: '100%', maxWidth: 480, alignSelf: 'center', flex: 1, gap: 24, paddingTop: 16 }}>
    <View style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={[type.h1, { color: tokens.foreground }]}>{title}</Text>
      <Text style={[type.body, { color: tokens.mutedForeground }]}>{description}</Text>
    </View>
    {children}
    {footer}
    <View style={{ flex: 1, minHeight: 12 }} />
    <Link href="/" asChild><Pressable accessibilityRole="link" style={{ minHeight: touchTarget, alignItems: 'center', justifyContent: 'center' }}><Text style={[type.small, { color: tokens.mutedForeground, textDecorationLine: 'underline' }]}>Browse as guest</Text></Pressable></Link>
  </View></Screen>;
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

export function PasswordStrength({ password }: { password: string }) {
  const tokens = useTokens();
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
