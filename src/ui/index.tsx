import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useThemePreference, useTokens } from '@/theme/theme';
import { elevation, fontFamily, radius, touchTarget, type, withAlpha, type ThemeTokens, type TypeToken } from '@/theme/tokens';
import { formatMoneyParts, MINUS, MONEY_GAP } from '@/lib/money';
import { useReducedMotion } from '@/lib/motion';
import { Icon, type IconName } from './icon';

export { Icon, type IconName } from './icon';
export { OtpInput, type OtpInputHandle } from './otp';
export { useTokens } from '@/theme/theme';

// ---------------------------------------------------------------------------------------------------------------
// Text

type TextTone = 'default' | 'muted' | 'primary' | 'success' | 'warning' | 'destructive' | 'deal';

function toneColor(tokens: ThemeTokens, tone: TextTone): string {
  return { default: tokens.foreground, muted: tokens.mutedForeground, primary: tokens.primary, success: tokens.success, warning: tokens.warning, destructive: tokens.destructive, deal: tokens.deal }[tone];
}

/** Text on the type scale (DESIGN.md §3). `display/h1/h2/h3/caption` use Be Vietnam Pro; body/small use the platform font. */
export function AppText({ variant = 'body', tone = 'default', style, ...props }: TextProps & { variant?: TypeToken; tone?: TextTone }) {
  const tokens = useTokens();
  return <Text {...props} style={[type[variant], { color: toneColor(tokens, tone) }, style]} />;
}

// ---------------------------------------------------------------------------------------------------------------
// Layout

export function Screen({ children, refreshing, onRefresh, scroll = true, style }: { children: ReactNode; refreshing?: boolean; onRefresh?: () => void; scroll?: boolean; style?: ViewStyle }) {
  const tokens = useTokens();
  const content = scroll
    ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[{ padding: 16, flexGrow: 1 }, style]} refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={tokens.primary} colors={[tokens.primary]} /> : undefined}>{children}</ScrollView>
    : <View style={[{ flex: 1, padding: 16 }, style]}>{children}</View>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: tokens.background }}>{content}</SafeAreaView>;
}

export function AppHeader({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack?: () => void; right?: ReactNode }) {
  const router = useRouter();
  const tokens = useTokens();
  return <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.border }}>
    {onBack ? <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={4} onPress={onBack ?? (() => router.back())} style={({ pressed }) => ({ width: touchTarget, height: touchTarget, marginLeft: -12, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? tokens.muted : 'transparent' })}><Icon name="ChevronLeft" color={tokens.foreground} /></Pressable> : null}
    <View style={{ flex: 1 }}><Text accessibilityRole="header" numberOfLines={1} style={[type.h3, { color: tokens.foreground }]}>{title}</Text>{subtitle ? <Text numberOfLines={1} style={[type.small, { color: tokens.mutedForeground }]}>{subtitle}</Text> : null}</View>
    {right}
  </View>;
}

/** Show/hide toggle for password fields; pass as `TextField` `trailing`. */
export function PasswordToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  const tokens = useTokens();
  return <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Hide password' : 'Show password'} onPress={onToggle} style={{ width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' }}>
    <Icon name={visible ? 'EyeOff' : 'Eye'} size={20} color={tokens.mutedForeground} />
  </Pressable>;
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const tokens = useTokens();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: tokens.border, marginLeft: inset }} />;
}

// ---------------------------------------------------------------------------------------------------------------
// Controls

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

export function Button({ title, onPress, variant = 'primary', loading = false, disabled = false, accessibilityLabel, icon }: { title: string; onPress?: () => void; variant?: ButtonVariant; loading?: boolean; disabled?: boolean; accessibilityLabel?: string; icon?: IconName }) {
  const tokens = useTokens();
  const palette = {
    primary: { backgroundColor: tokens.primary, pressed: withAlpha(tokens.primary, 0.86), color: tokens.primaryForeground, borderColor: tokens.primary },
    secondary: { backgroundColor: 'transparent', pressed: tokens.muted, color: tokens.foreground, borderColor: tokens.input },
    ghost: { backgroundColor: 'transparent', pressed: withAlpha(tokens.primary, 0.1), color: tokens.primary, borderColor: 'transparent' },
    destructive: { backgroundColor: tokens.destructive, pressed: withAlpha(tokens.destructive, 0.86), color: tokens.destructiveForeground, borderColor: tokens.destructive },
  }[variant];
  const inactive = disabled || loading;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} accessibilityState={{ disabled: inactive, busy: loading }} disabled={inactive} onPress={onPress}
    style={({ pressed }) => ({ minHeight: touchTarget, paddingHorizontal: 20, borderRadius: radius.md, borderWidth: 1, borderColor: palette.borderColor, backgroundColor: pressed ? palette.pressed : palette.backgroundColor, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1 })}>
    {loading ? <ActivityIndicator color={palette.color} /> : icon ? <Icon name={icon} size={20} color={palette.color} /> : null}
    <Text numberOfLines={1} style={{ color: palette.color, fontFamily: fontFamily.title, fontSize: 16, lineHeight: 22 }}>{title}</Text>
  </Pressable>;
}

/** `trailing` sits inside the field on the right (e.g. a show-password toggle, 48 pt). */
export function TextField({ label, error, hint, trailing, ...props }: TextInputProps & { label: string; error?: string; hint?: string; trailing?: ReactNode }) {
  const tokens = useTokens();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? tokens.destructive : focused ? tokens.ring : tokens.input;
  return <View style={{ gap: 6 }}>
    <Text style={[type.small, { color: tokens.foreground, fontWeight: '500' }]}>{label}</Text>
    <View style={{ justifyContent: 'center' }}>
    <TextInput placeholderTextColor={tokens.mutedForeground} {...props} accessibilityLabel={props.accessibilityLabel ?? label} accessibilityHint={error ?? hint ?? props.accessibilityHint}
      onFocus={(event) => { setFocused(true); props.onFocus?.(event); }} onBlur={(event) => { setFocused(false); props.onBlur?.(event); }}
      style={[{ minHeight: touchTarget, borderWidth: focused || error ? 2 : 1, borderColor, borderRadius: radius.md, color: tokens.foreground, backgroundColor: tokens.card, paddingHorizontal: focused || error ? 11 : 12, paddingRight: trailing ? touchTarget : undefined, fontSize: 16, opacity: props.editable === false ? 0.6 : 1 }, props.style]} />
    {trailing ? <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: touchTarget, alignItems: 'center', justifyContent: 'center' }}>{trailing}</View> : null}
    </View>
    {error ? <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Icon name="CircleExclamationPoint" size={16} color={tokens.destructive} /><Text accessibilityRole="alert" style={[type.small, { color: tokens.destructive, flex: 1 }]}>{error}</Text></View>
      : hint ? <Text style={[type.small, { color: tokens.mutedForeground }]}>{hint}</Text> : null}
  </View>;
}

// ---------------------------------------------------------------------------------------------------------------
// Money — the signature (DESIGN.md §1: ledger numerals)

type MoneyTone = 'default' | 'muted' | 'success' | 'deal';

function readableAmount(negative: boolean, number: string, currency: string) {
  const [whole = '0', fraction] = number.split(',');
  const spoken = `${whole.replaceAll('.', ',')}${fraction ? `.${fraction}` : ''}`;
  return `${negative ? 'minus ' : ''}${spoken} ${currency === 'VND' ? 'dong' : currency}`;
}

/**
 * Every money amount goes through this component. Semibold Be Vietnam Pro with tabular figures, the currency mark
 * smaller and muted after the number, U+2212 for outgoing, `+` and success colour for incoming.
 *
 * - `size`: type token (`display` for balances/checkout total, `small` in dense rows). Default `body`.
 * - `direction`: `in` → `+` and success colour; `out` → `−` in foreground. Negative amounts always get `−`.
 * - `tone`: `deal` for sale prices (shopping only), `muted` for secondary amounts. `strike` for the struck price.
 * - `style` styles the number (e.g. `color` on a primary surface); the mark follows its size and colour.
 */
export function Money({ amount, currency = 'VND', size = 'body', direction, tone, strike = false, style, numberOfLines = 1, accessibilityLabel }: {
  amount: string; currency?: string; size?: TypeToken; direction?: 'in' | 'out'; tone?: MoneyTone; strike?: boolean;
  style?: StyleProp<TextStyle>; numberOfLines?: number; accessibilityLabel?: string;
  /** @deprecated ignored: amounts always use the ledger format (`1.250.000 ₫`). */
  locale?: string;
}) {
  const tokens = useTokens();
  const parts = useMemo(() => { try { return formatMoneyParts(amount, currency); } catch { return null; } }, [amount, currency]);
  const flat = StyleSheet.flatten(style) ?? {};
  const { fontWeight: _ignoredWeight, ...numberStyle } = flat;
  const base = type[size];
  const fontSize = numberStyle.fontSize ?? base.fontSize ?? 16;
  const lineHeight = numberStyle.lineHeight ?? (numberStyle.fontSize ? Math.round(fontSize * 1.25) : base.lineHeight);
  const effectiveTone: MoneyTone = tone ?? (strike ? 'muted' : direction === 'in' && !parts?.negative ? 'success' : 'default');
  const color = numberStyle.color ?? { default: tokens.foreground, muted: tokens.mutedForeground, success: tokens.success, deal: tokens.deal }[effectiveTone];
  const symbolColor = numberStyle.color ?? (effectiveTone === 'default' ? tokens.mutedForeground : color);
  if (!parts) return <Text style={[{ fontSize, color: tokens.mutedForeground }, numberStyle]}>—</Text>;
  const negative = parts.negative || (direction === 'out' && !parts.zero);
  const sign = negative ? MINUS : direction === 'in' && !parts.zero ? '+' : '';
  return <Text numberOfLines={numberOfLines} accessibilityLabel={accessibilityLabel ?? readableAmount(negative, parts.number, currency)}
    style={[{ fontFamily: fontFamily.money, fontSize, lineHeight, letterSpacing: size === 'display' ? -0.5 : 0, fontVariant: ['tabular-nums'], textDecorationLine: strike ? 'line-through' : 'none' }, numberStyle, { color }]}>
    {sign}{parts.number}{MONEY_GAP}<Text style={{ fontSize: Math.round(fontSize * 0.7), color: symbolColor }}>{parts.symbol}</Text>
  </Text>;
}

// ---------------------------------------------------------------------------------------------------------------
// Status

type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'refunded';
const statusMap: Record<string, { tone: StatusTone; icon: IconName; label?: string }> = {
  COMPLETED: { tone: 'success', icon: 'Check' }, LIVE: { tone: 'success', icon: 'Check' }, APPROVED: { tone: 'success', icon: 'Check' }, PAID: { tone: 'success', icon: 'Check' }, PUBLISHED: { tone: 'success', icon: 'Check' }, CONFIRMED: { tone: 'success', icon: 'Check' }, PACKED: { tone: 'success', icon: 'Package' }, DELIVERED: { tone: 'success', icon: 'PackageCheck' }, SUCCEEDED: { tone: 'success', icon: 'Check' }, VERIFIED: { tone: 'success', icon: 'ShieldCheck' },
  PENDING: { tone: 'warning', icon: 'Clock' }, PENDING_PAYMENT: { tone: 'warning', icon: 'Clock' }, CREATED: { tone: 'warning', icon: 'Clock' }, REQUIRES_ACTION: { tone: 'warning', icon: 'CircleExclamationPoint' }, RETURN_REQUESTED: { tone: 'warning', icon: 'Undo2' }, UNDER_REVIEW: { tone: 'warning', icon: 'Clock' }, PENDING_REVIEW: { tone: 'warning', icon: 'Clock' }, EXPIRED: { tone: 'warning', icon: 'Clock' },
  FAILED: { tone: 'danger', icon: 'CircleX' }, PAYMENT_FAILED: { tone: 'danger', icon: 'CircleX' }, DELIVERY_FAILED: { tone: 'danger', icon: 'CircleX' }, DECLINED: { tone: 'danger', icon: 'CircleX' }, REJECTED: { tone: 'danger', icon: 'CircleX' },
  PROCESSING: { tone: 'info', icon: 'LoaderCircle' }, PAYMENT_PROCESSING: { tone: 'info', icon: 'LoaderCircle' }, SHIPPED: { tone: 'info', icon: 'Truck' }, IN_TRANSIT: { tone: 'info', icon: 'Truck' }, OUT_FOR_DELIVERY: { tone: 'info', icon: 'Truck' }, LABEL_CREATED: { tone: 'info', icon: 'Tag' },
  DRAFT: { tone: 'neutral', icon: 'Circle' }, HIDDEN: { tone: 'neutral', icon: 'EyeOff' }, REFUNDED: { tone: 'refunded', icon: 'Undo2' }, RETURNED: { tone: 'refunded', icon: 'Undo2' }, CANCELLED: { tone: 'neutral', icon: 'Ban' },
};
const toneLabel: Record<StatusTone, string> = { success: 'done', warning: 'needs attention', danger: 'failed', info: 'in progress', neutral: 'inactive', refunded: 'refunded' };

/** Status = icon + label, never colour alone. `icon` takes a Lucide icon name. */
export function StatusBadge({ status, tone, icon, label }: { status: string; tone?: StatusTone; icon?: IconName; label?: string }) {
  const tokens = useTokens();
  const normalized = status.trim().toUpperCase();
  const mapped = statusMap[normalized] ?? { tone: normalized.includes('FAIL') ? 'danger' as const : normalized.includes('PROCESS') ? 'info' as const : 'neutral' as const, icon: 'Circle' as const };
  const finalTone = tone ?? mapped.tone;
  const color = { success: tokens.success, warning: tokens.warning, danger: tokens.destructive, info: tokens.primary, neutral: tokens.mutedForeground, refunded: tokens.statusRefunded }[finalTone];
  const humanLabel = label ?? mapped.label ?? normalized.toLowerCase().replaceAll('_', ' ').replace(/^./, (character) => character.toUpperCase());
  return <View accessible accessibilityLabel={`${humanLabel}, ${toneLabel[finalTone]}`} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.sm, backgroundColor: withAlpha(color, 0.12), paddingHorizontal: 8, paddingVertical: 3 }}>
    <Icon name={icon ?? mapped.icon} size={14} strokeWidth={2.25} color={color} />
    <Text numberOfLines={1} style={[type.caption, { color }]}>{humanLabel}</Text>
  </View>;
}

// ---------------------------------------------------------------------------------------------------------------
// Surfaces & lists

/** A unit you can pick up or act on (product, address, payment method). Elevation 0: border only, radius lg. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const tokens = useTokens();
  return <View style={[{ padding: 16, backgroundColor: tokens.card, borderWidth: StyleSheet.hairlineWidth, borderColor: tokens.border, borderRadius: radius.lg }, style]}>{children}</View>;
}

/** Full-bleed list row with a divider. `chevron` marks rows that navigate. */
export function ListItem({ title, subtitle, leading, trailing, onPress, chevron = false, divider = true, accessibilityLabel }: { title: string; subtitle?: string; leading?: ReactNode; trailing?: ReactNode; onPress?: () => void; chevron?: boolean; divider?: boolean; accessibilityLabel?: string }) {
  const tokens = useTokens();
  return <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={accessibilityLabel} disabled={!onPress} onPress={onPress}
    style={({ pressed }) => ({ minHeight: 56, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: divider ? StyleSheet.hairlineWidth : 0, borderBottomColor: tokens.border, backgroundColor: pressed ? tokens.muted : 'transparent' })}>
    {leading}
    <View style={{ flex: 1, gap: 2 }}><Text style={[type.body, { color: tokens.foreground, fontWeight: '500' }]}>{title}</Text>{subtitle ? <Text style={[type.small, { color: tokens.mutedForeground }]}>{subtitle}</Text> : null}</View>
    {trailing}
    {chevron ? <Icon name="ChevronRight" size={20} color={tokens.mutedForeground} /> : null}
  </Pressable>;
}
/** Alias used by TASK-026 wording. */
export const ListRow = ListItem;

export function Skeleton({ width = '100%', height = 18, style }: { width?: number | `${number}%`; height?: number; style?: StyleProp<ViewStyle> }) {
  const tokens = useTokens();
  return <View accessibilityLabel="Loading" style={[{ width, height, backgroundColor: tokens.muted, borderRadius: radius.sm }, style]} />;
}

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: IconName }) {
  const tokens = useTokens();
  return <View style={{ flex: 1, minHeight: 200, justifyContent: 'center', alignItems: 'center', gap: 8, padding: 24 }}>
    {icon ? <View style={{ width: 56, height: 56, borderRadius: radius.full, backgroundColor: tokens.muted, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}><Icon name={icon} size={26} color={tokens.mutedForeground} /></View> : null}
    <Text style={[type.h3, { color: tokens.foreground, textAlign: 'center' }]}>{title}</Text>
    {description ? <Text style={[type.small, { color: tokens.mutedForeground, textAlign: 'center', maxWidth: 320 }]}>{description}</Text> : null}
    {action ? <View style={{ marginTop: 8 }}>{action}</View> : null}
  </View>;
}

export function ErrorState({ message = 'Unable to load data', retry }: { message?: string; retry: () => void }) {
  const tokens = useTokens();
  return <View style={{ gap: 12, paddingVertical: 16 }}>
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}><Icon name="CircleExclamationPoint" size={20} color={tokens.destructive} /><Text accessibilityRole="alert" style={[type.body, { color: tokens.foreground, flex: 1 }]}>{message}</Text></View>
    <Button title="Try again" variant="secondary" icon="RotateCw" onPress={retry} />
  </View>;
}

// ---------------------------------------------------------------------------------------------------------------
// Overlays

/** Elevation 2, radius lg on top, surfaceRaised. Slides in (300 ms) or cross-fades when reduce motion is on. */
export function BottomSheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const tokens = useTokens();
  const { colorScheme } = useThemePreference();
  const reducedMotion = useReducedMotion();
  return <Modal transparent animationType={reducedMotion ? 'fade' : 'slide'} visible={visible} onRequestClose={onClose}>
    <Pressable accessibilityLabel="Close sheet" onPress={onClose} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: tokens.scrim }}>
      <Pressable onPress={(event) => event.stopPropagation()} style={[{ padding: 20, paddingTop: 8, paddingBottom: 32, gap: 16, backgroundColor: tokens.surfaceRaised, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderWidth: colorScheme === 'dark' ? StyleSheet.hairlineWidth : 0, borderColor: tokens.border }, elevation(2, colorScheme)]}>
        <View style={{ width: 36, height: 4, borderRadius: radius.full, backgroundColor: tokens.border, alignSelf: 'center', marginBottom: 4 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text accessibilityRole="header" style={[type.h3, { color: tokens.foreground, flex: 1 }]}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={({ pressed }) => ({ width: touchTarget, height: touchTarget, marginRight: -12, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? tokens.muted : 'transparent' })}><Icon name="X" size={22} color={tokens.mutedForeground} /></Pressable>
        </View>
        {children}
      </Pressable>
    </Pressable>
  </Modal>;
}

export function Toast({ visible, message, actionLabel, onAction, onDismiss }: { visible: boolean; message: string; actionLabel?: string; onAction?: () => void; onDismiss?: () => void }) {
  const tokens = useTokens();
  const { colorScheme } = useThemePreference();
  if (!visible) return null;
  return <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[{ position: 'absolute', left: 16, right: 16, bottom: 20, minHeight: 52, borderRadius: radius.md, paddingLeft: 16, paddingRight: 4, backgroundColor: tokens.foreground, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, elevation(1, colorScheme)]}>
    <Text style={[type.small, { color: tokens.background, flex: 1 }]}>{message}</Text>
    {actionLabel ? <Pressable accessibilityRole="button" onPress={onAction ?? onDismiss} style={{ minHeight: touchTarget, justifyContent: 'center', paddingHorizontal: 12 }}><Text style={{ color: tokens.background, fontFamily: fontFamily.title, textDecorationLine: 'underline' }}>{actionLabel}</Text></Pressable> : null}
  </View>;
}

export function OfflineBanner({ visible = true }: { visible?: boolean }) {
  const tokens = useTokens();
  if (!visible) return null;
  return <View accessibilityRole="alert" style={{ paddingVertical: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: withAlpha(tokens.warning, 0.14), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.border }}>
    <Icon name="WifiOff" size={16} color={tokens.warning} />
    <Text style={[type.small, { color: tokens.foreground }]}>You’re offline. Some actions are unavailable.</Text>
  </View>;
}

// ---------------------------------------------------------------------------------------------------------------
// Inputs

export function QuantityStepper({ value, onChange, min = 1, max = 99 }: { value: number; onChange: (value: number) => void; min?: number; max?: number }) {
  const tokens = useTokens();
  const step = (label: string, icon: IconName, disabled: boolean, next: number) => <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={() => onChange(next)}
    style={({ pressed }) => ({ width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: tokens.input, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? tokens.muted : 'transparent', opacity: disabled ? 0.4 : 1 })}><Icon name={icon} size={18} color={tokens.foreground} /></Pressable>;
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
    {step('Decrease quantity', 'Minus', value <= min, Math.max(min, value - 1))}
    <Text accessibilityLabel={`Quantity ${value}`} style={{ color: tokens.foreground, minWidth: 32, textAlign: 'center', fontFamily: fontFamily.money, fontSize: 16, fontVariant: ['tabular-nums'] }}>{value}</Text>
    {step('Increase quantity', 'Plus', value >= max, Math.min(max, value + 1))}
  </View>;
}

export function SegmentedTabs({ items, selected, onChange }: { items: { key: string; label: string; count?: number }[]; selected: string; onChange: (key: string) => void }) {
  const tokens = useTokens();
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }} accessibilityRole="tablist">{items.map((item) => {
    const active = selected === item.key;
    return <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: active }} hitSlop={{ top: 4, bottom: 4 }} onPress={() => onChange(item.key)}
      style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 14, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, borderWidth: 1, borderColor: active ? tokens.primary : tokens.border, backgroundColor: active ? tokens.primary : pressed ? tokens.muted : 'transparent' })}>
      <Text style={[type.small, { color: active ? tokens.primaryForeground : tokens.foreground, fontWeight: active ? '600' : '400' }]}>{item.label}</Text>
      {item.count !== undefined ? <Text style={[type.caption, { color: active ? tokens.primaryForeground : tokens.mutedForeground, fontVariant: ['tabular-nums'] }]}>{item.count}</Text> : null}
    </Pressable>;
  })}</ScrollView>;
}
