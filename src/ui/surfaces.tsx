import { useContext, type ReactNode } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { SvgUri } from 'react-native-svg';
import { useTokens } from '@/theme/theme';
import { radius, type } from '@/theme/tokens';
import { Icon, type IconName } from './icon';
import { Button, Money } from './index';

/**
 * Catalog image on a muted plate (promoted from `features/shop/components`, TASK-027 F1).
 * - `size`: fixed square (rows, order lines). `fill`: a square that fills its parent's width (grids, galleries).
 * - `rounded` (default true) = radius lg. Handles data-SVG mock images, bitmaps, and a missing image (ImageOff icon).
 * Never pass `height: undefined` through `style` to get a square: RN web keeps the old height. Use `fill`.
 */
export function CatalogImage({ uri, size = 112, fill = false, rounded = true, style, accessibilityLabel }: { uri: string; size?: number; fill?: boolean; rounded?: boolean; style?: StyleProp<ViewStyle>; accessibilityLabel?: string }) {
  const tokens = useTokens();
  const isSvg = uri.startsWith('data:image/svg+xml');
  const box: ViewStyle = fill ? { width: '100%', aspectRatio: 1 } : { width: size, height: size };
  return <View accessible={Boolean(accessibilityLabel)} accessibilityRole={accessibilityLabel ? 'image' : undefined} accessibilityLabel={accessibilityLabel}
    style={[box, { backgroundColor: tokens.muted, borderRadius: rounded ? radius.lg : 0, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, style]}>
    {isSvg ? <SvgUri uri={uri} width="100%" height="100%" /> : uri ? <Image source={{ uri }} resizeMode="cover" style={{ width: '100%', height: '100%' }} /> : <Icon name="ImageOff" size={fill ? 28 : Math.min(28, size / 3)} color={tokens.mutedForeground} />}
  </View>;
}

export interface BottomBarAction { title: string; onPress: () => void; disabled?: boolean; loading?: boolean; icon?: IconName; accessibilityLabel?: string }

/**
 * Sticky action bar pinned to the bottom of a screen (cart, checkout, pay, product, send, top-up).
 * Left: `amount` (+ `label`, default "Total", and an optional `caption` such as "3 items · incl. shipping"), or your own
 * `children`. Right: the one primary `action`. Optional `secondaryAction` (secondary button, e.g. "Add to cart" next to
 * "Buy now"). Card surface, hairline top border, bottom padding = max(safe-area inset, 12).
 * Absolutely positioned: give the scroll content `paddingBottom` = the height reported by `onHeight`.
 */
export function BottomBar({ amount, currency = 'VND', label = 'Total', caption, action, secondaryAction, children, onHeight }: {
  amount?: string; currency?: string; label?: string; caption?: string; action: BottomBarAction; secondaryAction?: BottomBarAction; children?: ReactNode; onHeight?: (height: number) => void;
}) {
  const tokens = useTokens();
  const bottomInset = useContext(SafeAreaInsetsContext)?.bottom ?? 0;
  const summary = children ?? (amount !== undefined ? <View style={{ flex: 1, gap: 2 }}>
    <Text style={[type.caption, { color: tokens.mutedForeground }]}>{label}</Text>
    <Money amount={amount} currency={currency} size="h3" />
    {caption ? <Text numberOfLines={1} style={[type.caption, { color: tokens.mutedForeground }]}>{caption}</Text> : null}
  </View> : null);
  const button = (item: BottomBarAction, variant: 'primary' | 'secondary') => <View style={{ flex: summary ? undefined : 1, minWidth: summary ? 148 : undefined }}>
    <Button title={item.title} variant={variant} icon={item.icon} onPress={item.onPress} disabled={item.disabled} loading={item.loading} accessibilityLabel={item.accessibilityLabel} />
  </View>;
  return <View onLayout={(event) => onHeight?.(event.nativeEvent.layout.height)}
    style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(bottomInset, 12), backgroundColor: tokens.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tokens.border }}>
    {summary}
    {secondaryAction ? button(secondaryAction, 'secondary') : null}
    {button(action, 'primary')}
  </View>;
}
