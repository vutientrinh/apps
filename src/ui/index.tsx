import { useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Easing, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, type PressableProps, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useThemePreference, useTokens } from '@/theme/theme';
import { elevation, fontFamily, motion, radius, touchTarget, type, withAlpha, type ThemeTokens, type TypeToken } from '@/theme/tokens';
import { formatMoneyParts, MINUS, MONEY_GAP } from '@/lib/money';
import { useReducedMotion } from '@/lib/motion';
import { Icon, type IconName } from './icon';
import { Illustration, type IllustrationName } from './illustration';

export { Icon, type IconName } from './icon';
export { OtpInput, type OtpInputHandle } from './otp';
export { BottomBar, CatalogImage } from './surfaces';
export { BrandGradient, BrandMark, Wordmark } from './brand';
export { CampaignStrip } from './campaign-strip';
export { Illustration, illustrationNames, type IllustrationName } from './illustration';
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

/**
 * Safe-area page. `edges` defaults to all four; with a `BottomBar` inside, pass `['top', 'left', 'right']` (or keep the
 * bar as a sibling of `Screen`) so the bottom inset is applied once.
 */
export function Screen({ children, refreshing, onRefresh, scroll = true, style, edges }: { children: ReactNode; refreshing?: boolean; onRefresh?: () => void; scroll?: boolean; style?: ViewStyle; edges?: readonly Edge[] }) {
  const tokens = useTokens();
  const content = scroll
    ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[{ padding: 16, flexGrow: 1 }, style]} refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={tokens.primary} colors={[tokens.primary]} /> : undefined}>{children}</ScrollView>
    : <View style={[{ flex: 1, padding: 16 }, style]}>{children}</View>;
  return <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: tokens.background }}>{content}</SafeAreaView>;
}

/**
 * Screen header. Two styles, used the same way on every screen:
 * - `large` for tab roots (Home, Categories, Wallet, Cart, Me, My orders): h1 title, no divider.
 * - default (compact) for pushed screens: back button + h3 title + hairline divider.
 * `right` takes `IconButton`s (bell, share, filter). `onBack` without a handler falls back to `router.back()`.
 */
export function AppHeader({ title, subtitle, onBack, right, large = false }: { title: string; subtitle?: string; onBack?: (() => void) | true; right?: ReactNode; large?: boolean }) {
  const router = useRouter();
  const tokens = useTokens();
  const back = onBack === true ? () => (router.canGoBack() ? router.back() : router.replace('/')) : onBack;
  return <View style={{ minHeight: large ? 64 : 56, paddingTop: large ? 8 : 0, flexDirection: 'row', alignItems: 'center', gap: 4, borderBottomWidth: large ? 0 : StyleSheet.hairlineWidth, borderBottomColor: tokens.border }}>
    {back ? <IconButton icon="ChevronLeft" accessibilityLabel="Go back" onPress={back} style={{ marginLeft: -12 }} /> : null}
    <View style={{ flex: 1 }}><Text accessibilityRole="header" numberOfLines={1} style={[large ? type.h1 : type.h3, { color: tokens.foreground }]}>{title}</Text>{subtitle ? <Text numberOfLines={1} style={[type.small, { color: tokens.mutedForeground }]}>{subtitle}</Text> : null}</View>
    {right ? <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: -12 }}>{right}</View> : null}
  </View>;
}

/** Round 48 pt icon-only button for headers and toolbars. Optional `badge` shows a count dot (e.g. unread). */
export function IconButton({ icon, onPress, accessibilityLabel, color, badge, style, disabled = false }: { icon: IconName; onPress?: () => void; accessibilityLabel: string; color?: string; badge?: string; style?: StyleProp<ViewStyle>; disabled?: boolean }) {
  const tokens = useTokens();
  return <PressableScale scaleTo={0.92} accessibilityRole="button" accessibilityLabel={badge ? `${accessibilityLabel}, ${badge}` : accessibilityLabel} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} containerStyle={style}
    style={({ pressed }) => ({ width: touchTarget, height: touchTarget, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? tokens.muted : 'transparent', opacity: disabled ? 0.4 : 1 })}>
    <Icon name={icon} size={24} color={color ?? tokens.foreground} />
    {badge ? <View style={{ position: 'absolute', top: 6, right: 4, minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: radius.full, backgroundColor: tokens.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: tokens.primaryForeground, fontFamily: fontFamily.title, fontSize: 11, lineHeight: 14, fontVariant: ['tabular-nums'] }}>{badge}</Text></View> : null}
  </PressableScale>;
}

/**
 * Pressable that eases down to `scaleTo` while held (90 ms in, 120 ms out) — the press feedback for buttons,
 * tiles and cards. No scale when reduce motion is on. `haptic` adds a selection tick on press (native only).
 * `containerStyle` styles the animated wrapper (use it for `flex: 1` in rows); `style` styles the pressable.
 */
export function PressableScale({ containerStyle, scaleTo = 0.97, haptic = false, onPress, onPressIn, onPressOut, disabled, ...props }: PressableProps & { containerStyle?: StyleProp<ViewStyle>; scaleTo?: number; haptic?: boolean }) {
  const reducedMotion = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const animate = (toValue: number) => {
    if (reducedMotion) return;
    Animated.timing(scale, { toValue, duration: toValue === 1 ? motion.exit : 90, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }).start();
  };
  return <Animated.View style={[containerStyle, { transform: [{ scale }] }]}>
    <Pressable {...props} disabled={disabled}
      onPressIn={(event) => { animate(scaleTo); onPressIn?.(event); }}
      onPressOut={(event) => { animate(1); onPressOut?.(event); }}
      onPress={(event) => { if (haptic && Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => undefined); onPress?.(event); }} />
  </Animated.View>;
}

/** Section title with an optional trailing link ("See all"), 48 pt tall. Use above lists, strips and grids. */
export function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  const tokens = useTokens();
  return <View style={{ minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
    <Text accessibilityRole="header" numberOfLines={1} style={[type.h3, { color: tokens.foreground, flex: 1 }]}>{title}</Text>
    {actionLabel && onAction ? <Pressable accessibilityRole="link" onPress={onAction} hitSlop={8} style={({ pressed }) => ({ minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: 2, opacity: pressed ? 0.6 : 1 })}>
      <Text style={[type.small, { color: tokens.primary, fontFamily: fontFamily.title }]}>{actionLabel}</Text>
      <Icon name="ChevronRight" size={16} color={tokens.primary} />
    </Pressable> : null}
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

/**
 * 48 pt button (`size="sm"`: 40 pt visual + 4 pt hit slop, for inline row actions such as "Buy again").
 * Eases to 98% while pressed. Destructive only inside a confirm sheet.
 */
export function Button({ title, onPress, variant = 'primary', loading = false, disabled = false, accessibilityLabel, icon, size = 'md' }: { title: string; onPress?: () => void; variant?: ButtonVariant; loading?: boolean; disabled?: boolean; accessibilityLabel?: string; icon?: IconName; size?: 'md' | 'sm' }) {
  const tokens = useTokens();
  const small = size === 'sm';
  const palette = {
    primary: { backgroundColor: tokens.primary, pressed: withAlpha(tokens.primary, 0.86), color: tokens.primaryForeground, borderColor: tokens.primary },
    secondary: { backgroundColor: 'transparent', pressed: tokens.muted, color: tokens.foreground, borderColor: tokens.input },
    ghost: { backgroundColor: 'transparent', pressed: withAlpha(tokens.primary, 0.1), color: tokens.primary, borderColor: 'transparent' },
    destructive: { backgroundColor: tokens.destructive, pressed: withAlpha(tokens.destructive, 0.86), color: tokens.destructiveForeground, borderColor: tokens.destructive },
  }[variant];
  const inactive = disabled || loading;
  return <PressableScale scaleTo={0.98} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} accessibilityState={{ disabled: inactive, busy: loading }} disabled={inactive} onPress={onPress} hitSlop={small ? 4 : undefined}
    style={({ pressed }) => ({ minHeight: small ? 40 : touchTarget, paddingHorizontal: small ? 14 : 20, borderRadius: radius.md, borderWidth: 1, borderColor: palette.borderColor, backgroundColor: pressed ? palette.pressed : palette.backgroundColor, flexDirection: 'row', gap: small ? 6 : 8, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1 })}>
    {loading ? <ActivityIndicator color={palette.color} /> : icon ? <Icon name={icon} size={small ? 16 : 20} color={palette.color} /> : null}
    <Text numberOfLines={1} style={{ color: palette.color, fontFamily: fontFamily.title, fontSize: small ? 14 : 16, lineHeight: small ? 20 : 22 }}>{title}</Text>
  </PressableScale>;
}

/**
 * Labelled input. The border and focus ring live on a wrapper (1 pt `input` border; focused = `ring` colour plus a
 * 1 pt outer ring = 2 pt, no layout shift), so web shows no browser outline. `trailing` sits inside on the right
 * (e.g. a show-password toggle, 48 pt). `style` still styles the inner `TextInput` (e.g. `minHeight` for multiline).
 */
export function TextField({ label, error, hint, trailing, ...props }: TextInputProps & { label: string; error?: string; hint?: string; trailing?: ReactNode }) {
  const tokens = useTokens();
  const [focused, setFocused] = useState(false);
  const ringColor = error ? tokens.destructive : focused ? tokens.ring : null;
  return <View style={{ gap: 6 }}>
    <Text style={[type.small, { color: tokens.foreground, fontWeight: '500' }]}>{label}</Text>
    <View style={{ minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: ringColor ?? tokens.input, borderRadius: radius.md, backgroundColor: tokens.card, boxShadow: ringColor ? `0 0 0 1px ${ringColor}` : undefined, opacity: props.editable === false ? 0.6 : 1 }}>
      <TextInput placeholderTextColor={tokens.mutedForeground} {...props} accessibilityLabel={props.accessibilityLabel ?? label} accessibilityHint={error ?? hint ?? props.accessibilityHint}
        onFocus={(event) => { setFocused(true); props.onFocus?.(event); }} onBlur={(event) => { setFocused(false); props.onBlur?.(event); }}
        style={[{ flex: 1, alignSelf: 'stretch', minHeight: touchTarget - 2, paddingHorizontal: 12, color: tokens.foreground, fontSize: 16, borderWidth: 0 }, Platform.OS === 'web' ? webNoOutline : null, props.style]} />
      {trailing ? <View style={{ width: touchTarget, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}>{trailing}</View> : null}
    </View>
    {error ? <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Icon name="CircleExclamationPoint" size={16} color={tokens.destructive} /><Text accessibilityRole="alert" style={[type.small, { color: tokens.destructive, flex: 1 }]}>{error}</Text></View>
      : hint ? <Text style={[type.small, { color: tokens.mutedForeground }]}>{hint}</Text> : null}
  </View>;
}

/** react-native-web accepts `outlineStyle`; the RN types do not list it. */
const webNoOutline = { outlineStyle: 'none', outlineWidth: 0 } as unknown as TextStyle;

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

/**
 * Full-bleed list row with a divider. `chevron` marks rows that navigate.
 * - `inset`: adds 16 pt side padding, for rows inside a `ListGroup` (edge-to-edge block).
 * - `dividerInset`: indents the divider so it starts under the text, not under the leading icon.
 * - `destructive`: title in the destructive colour (e.g. "Sign out" row that opens a confirm sheet).
 */
export function ListItem({ title, subtitle, leading, trailing, onPress, chevron = false, divider = true, accessibilityLabel, inset = false, dividerInset = 0, destructive = false }: { title: string; subtitle?: string; leading?: ReactNode; trailing?: ReactNode; onPress?: () => void; chevron?: boolean; divider?: boolean; accessibilityLabel?: string; inset?: boolean; dividerInset?: number; destructive?: boolean }) {
  const tokens = useTokens();
  return <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={accessibilityLabel} disabled={!onPress} onPress={onPress}
    style={({ pressed }) => ({ minHeight: 56, paddingVertical: 10, paddingHorizontal: inset ? 16 : 0, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? tokens.muted : 'transparent' })}>
    {leading}
    <View style={{ flex: 1, gap: 2 }}><Text style={[type.body, { color: destructive ? tokens.destructive : tokens.foreground, fontWeight: '500' }]}>{title}</Text>{subtitle ? <Text style={[type.small, { color: tokens.mutedForeground }]}>{subtitle}</Text> : null}</View>
    {trailing}
    {chevron ? <Icon name="ChevronRight" size={20} color={tokens.mutedForeground} /> : null}
    {divider ? <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, right: 0, left: dividerInset, height: StyleSheet.hairlineWidth, backgroundColor: tokens.border }} /> : null}
  </Pressable>;
}

/**
 * Edge-to-edge block of rows (settings-style) with an optional caption label above it.
 * Put it directly inside `Screen` (it cancels the 16 pt screen padding) and give its rows `inset`.
 */
export function ListGroup({ label, children }: { label?: string; children: ReactNode }) {
  const tokens = useTokens();
  return <View style={{ marginHorizontal: -16, gap: 6 }}>
    {label ? <Text accessibilityRole="header" style={[type.caption, { color: tokens.mutedForeground, paddingHorizontal: 16 }]}>{label}</Text> : null}
    <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: tokens.border, backgroundColor: tokens.card }}>{children}</View>
  </View>;
}

/** 40 pt round icon on a 10% tint: the leading element of settings rows and shortcut tiles. */
export function IconTile({ icon, tone = 'primary', size = 40 }: { icon: IconName; tone?: 'primary' | 'muted' | 'destructive' | 'success'; size?: number }) {
  const tokens = useTokens();
  const color = { primary: tokens.primary, muted: tokens.mutedForeground, destructive: tokens.destructive, success: tokens.success }[tone];
  return <View style={{ width: size, height: size, borderRadius: radius.full, backgroundColor: withAlpha(color, tone === 'muted' ? 0.12 : 0.1), alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={Math.round(size / 2)} color={color} /></View>;
}
/** Alias used by TASK-026 wording. */
export const ListRow = ListItem;

/** One shared pulse clock, so every skeleton on screen breathes in sync (900 ms each way). */
const skeletonPulse = new Animated.Value(1);
let skeletonLoop: Animated.CompositeAnimation | null = null;
let skeletonUsers = 0;
function useSkeletonPulse(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return undefined;
    skeletonUsers += 1;
    if (!skeletonLoop) {
      const step = (toValue: number) => Animated.timing(skeletonPulse, { toValue, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' });
      skeletonLoop = Animated.loop(Animated.sequence([step(0.5), step(1)]));
      skeletonLoop.start();
    }
    return () => {
      skeletonUsers -= 1;
      if (skeletonUsers === 0 && skeletonLoop) { skeletonLoop.stop(); skeletonLoop = null; skeletonPulse.setValue(1); }
    };
  }, [enabled]);
}

/** Loading placeholder on `muted`. Pulses gently (static when reduce motion is on). */
/**
 * Loading placeholder. Fixed: `width` + `height`. Proportional: `aspectRatio` (e.g. `1` for a product image square)
 * sizes it from `width` and ignores `height` — this is the way to get a real square on web (do not pass
 * `height: undefined` through `style`; RN web keeps the old height). `radius` defaults to `sm`; use `lg` for images.
 */
export function Skeleton({ width = '100%', height = 18, aspectRatio, rounded = 'sm', style }: { width?: number | `${number}%`; height?: number; aspectRatio?: number; rounded?: keyof typeof radius; style?: StyleProp<ViewStyle> }) {
  const tokens = useTokens();
  const reducedMotion = useReducedMotion();
  useSkeletonPulse(!reducedMotion);
  const box: ViewStyle = aspectRatio ? { width, aspectRatio } : { width, height };
  return <Animated.View accessibilityLabel="Loading" style={[box, { backgroundColor: tokens.muted, borderRadius: radius[rounded], opacity: reducedMotion ? 1 : skeletonPulse }, style]} />;
}

/** Icons that already say which scene fits, so existing `<EmptyState icon=…>` callers get art without changes. */
const illustrationForIcon: Partial<Record<IconName, IllustrationName>> = {
  ShoppingCart: 'empty-cart', Package: 'empty-orders', PackageSearch: 'empty-search', SearchX: 'error-not-found',
  Bell: 'empty-notifications', BellOff: 'empty-notifications', ReceiptText: 'empty-statement', Heart: 'empty-wishlist',
  MapPin: 'empty-addresses', WifiOff: 'offline',
};

/**
 * Centered empty/zero state: an illustration (or a tinted icon), one line of title, one of help, and at most one
 * action. `illustration` picks the scene; without it a known `icon` picks one; `illustration={null}` keeps the icon.
 */
export function EmptyState({ title, description, action, icon, illustration }: { title: string; description?: string; action?: ReactNode; icon?: IconName; illustration?: IllustrationName | null }) {
  const tokens = useTokens();
  const art = illustration === undefined && icon ? illustrationForIcon[icon] : illustration;
  return <View style={{ flex: 1, minHeight: 240, justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 32 }}>
    {art ? <Illustration name={art} style={{ marginBottom: 12 }} />
      : icon ? <View style={{ width: 72, height: 72, borderRadius: radius.full, backgroundColor: withAlpha(tokens.primary, 0.1), alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}><Icon name={icon} size={32} strokeWidth={1.75} color={tokens.primary} /></View> : null}
    <Text accessibilityRole="header" style={[type.h3, { color: tokens.foreground, textAlign: 'center' }]}>{title}</Text>
    {description ? <Text style={[type.body, { color: tokens.mutedForeground, textAlign: 'center', maxWidth: 300 }]}>{description}</Text> : null}
    {action ? <View style={{ marginTop: 16, minWidth: 200 }}>{action}</View> : null}
  </View>;
}

/**
 * Failed load with a retry. Inline by default; pass `illustration` ("error-generic" or "offline") when the error is
 * the whole screen.
 */
export function ErrorState({ message = 'Unable to load data', retry, illustration }: { message?: string; retry: () => void; illustration?: IllustrationName }) {
  const tokens = useTokens();
  return <View style={{ gap: 12, paddingVertical: 16 }}>
    {illustration ? <Illustration name={illustration} /> : null}
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

/**
 * Inverted snackbar at the bottom. Slides up 8 pt + fades in (180 ms; fade only with reduce motion).
 * `icon` (e.g. `CircleCheck`) leads the message. The caller owns `visible` and the auto-dismiss timer.
 */
export function Toast({ visible, message, actionLabel, onAction, onDismiss, icon }: { visible: boolean; message: string; actionLabel?: string; onAction?: () => void; onDismiss?: () => void; icon?: IconName }) {
  const tokens = useTokens();
  const { colorScheme } = useThemePreference();
  const reducedMotion = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!visible) { progress.setValue(0); return; }
    Animated.timing(progress, { toValue: 1, duration: motion.enter, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [visible, progress]);
  if (!visible) return null;
  const translateY = reducedMotion ? 0 : progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });
  return <Animated.View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[{ position: 'absolute', left: 16, right: 16, bottom: 20, minHeight: 52, borderRadius: radius.md, paddingLeft: 16, paddingRight: actionLabel ? 4 : 16, paddingVertical: 4, backgroundColor: tokens.foreground, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, opacity: progress, transform: [{ translateY }] }, elevation(1, colorScheme)]}>
    {icon ? <Icon name={icon} size={20} color={tokens.background} /> : null}
    <Text style={[type.small, { color: tokens.background, flex: 1 }]}>{message}</Text>
    {actionLabel ? <Pressable accessibilityRole="button" onPress={onAction ?? onDismiss} style={({ pressed }) => ({ minHeight: touchTarget, justifyContent: 'center', paddingHorizontal: 12, borderRadius: radius.md, opacity: pressed ? 0.7 : 1 })}><Text style={{ color: tokens.background, fontFamily: fontFamily.title, fontSize: 14 }}>{actionLabel}</Text></Pressable> : null}
  </Animated.View>;
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

/** Horizontal filter tabs. A selected tab that is off screen (e.g. opened from a link) is scrolled into view. */
export function SegmentedTabs({ items, selected, onChange }: { items: { key: string; label: string; count?: number }[]; selected: string; onChange: (key: string) => void }) {
  const tokens = useTokens();
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const view = useRef({ width: 0, offset: 0, tabs: new Map<string, { x: number; width: number }>() });
  const reveal = (key: string) => {
    const { width, offset, tabs } = view.current;
    const tab = tabs.get(key);
    if (!tab || !width || (tab.x >= offset && tab.x + tab.width <= offset + width)) return;
    scroller.current?.scrollTo({ x: Math.max(0, tab.x - 24), animated: false });
  };
  useEffect(() => { reveal(selected); }, [selected]);
  return <ScrollView ref={scroller} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }} accessibilityRole="tablist" scrollEventThrottle={32}
    onScroll={(event) => { view.current.offset = event.nativeEvent.contentOffset.x; }}
    onLayout={(event) => { view.current.width = event.nativeEvent.layout.width; reveal(selected); }}>{items.map((item) => {
    const active = selected === item.key;
    return <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: active }} hitSlop={{ top: 4, bottom: 4 }} onPress={() => onChange(item.key)}
      onLayout={(event) => { const { x, width } = event.nativeEvent.layout; view.current.tabs.set(item.key, { x, width }); if (active) reveal(item.key); }}
      style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 14, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, borderWidth: 1, borderColor: active ? tokens.primary : tokens.border, backgroundColor: active ? tokens.primary : pressed ? tokens.muted : 'transparent' })}>
      <Text style={[type.small, { color: active ? tokens.primaryForeground : tokens.foreground, fontWeight: active ? '600' : '400' }]}>{item.label}</Text>
      {item.count !== undefined ? <Text style={[type.caption, { color: active ? tokens.primaryForeground : tokens.mutedForeground, fontVariant: ['tabular-nums'] }]}>{item.count}</Text> : null}
    </Pressable>;
  })}</ScrollView>;
}
