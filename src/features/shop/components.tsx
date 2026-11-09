import { useState, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BigJs from 'big.js';
import { AppText, BottomSheet, Button, Card, Icon, Money, Skeleton, useTokens, type IconName } from '@/ui';
import { radius, touchTarget, type, withAlpha } from '@/theme/tokens';
import type { ProductSummary, Variant } from '@web/features/commerce/types';

/** @deprecated kept for older imports; use `useTokens` from `@/ui`. */
export const useShopTokens = useTokens;

/** Whole-percent discount of `price` against `compareAtPrice`, or null when there is no real discount. */
export function discountPercent(price: string, compareAtPrice?: string | null): number | null {
  if (!compareAtPrice) return null;
  try {
    const was = new BigJs(compareAtPrice);
    const now = new BigJs(price);
    if (was.lte(0) || now.gte(was)) return null;
    const percent = Number(was.minus(now).div(was).times(100).round(0, BigJs.roundDown).toString());
    return percent > 0 ? percent : null;
  } catch {
    return null;
  }
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const tokens = useTokens();
  return <View style={{ minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
    <AppText accessibilityRole="header" variant="h3">{title}</AppText>
    {action ? <Pressable accessibilityRole="button" onPress={onAction} hitSlop={4} style={({ pressed }) => ({ minHeight: touchTarget, justifyContent: 'center', paddingHorizontal: 8, marginRight: -8, borderRadius: radius.md, backgroundColor: pressed ? withAlpha(tokens.primary, 0.1) : 'transparent' })}><Text style={[type.small, { color: tokens.primary, fontWeight: '600' }]}>{action}</Text></Pressable> : null}
  </View>;
}

export function CatalogImage({ uri, size = 112, style }: { uri: string; size?: number; style?: StyleProp<ViewStyle> }) {
  const tokens = useTokens();
  const isSvg = uri.startsWith('data:image/svg+xml');
  return <View style={[{ width: size, height: size, backgroundColor: tokens.muted, borderRadius: radius.lg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, style]}>
    {isSvg ? <SvgUri uri={uri} width="100%" height="100%" /> : uri ? <Image source={{ uri }} resizeMode="cover" style={{ width: '100%', height: '100%' }} /> : <Icon name="ImageOff" size={Math.min(28, size / 3)} color={tokens.mutedForeground} />}
  </View>;
}

/** The lotus discount chip (deal on dealMuted, radius sm). The only `deal` surface besides the sale price. */
export function DiscountChip({ percent }: { percent: number }) {
  const tokens = useTokens();
  return <View accessibilityLabel={`${percent} percent off`} style={{ borderRadius: radius.sm, backgroundColor: tokens.dealMuted, paddingHorizontal: 6, paddingVertical: 2 }}>
    <Text style={[type.caption, { color: tokens.deal }]}>−{percent}%</Text>
  </View>;
}

/** Price with the sale treatment: sale price in `deal`, struck original, discount chip. Regular prices stay foreground. */
export function PriceBlock({ price, compareAtPrice, size = 'body' }: { price: string; compareAtPrice?: string | null; size?: 'body' | 'h3' | 'h1' }) {
  const percent = discountPercent(price, compareAtPrice);
  const struckSize = size === 'h1' ? 'body' : 'small';
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 2 }}>
    <Money amount={price} size={size} tone={percent ? 'deal' : 'default'} />
    {percent && compareAtPrice ? <>
      <View style={{ flexShrink: 1, minWidth: 0 }}><Money amount={compareAtPrice} size={struckSize} strike accessibilityLabel={`was ${compareAtPrice} dong`} /></View>
      <DiscountChip percent={percent} />
    </> : null}
  </View>;
}

function RatingLine({ product }: { product: ProductSummary }) {
  const tokens = useTokens();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
    <Icon name="Star" size={12} color={tokens.mutedForeground} fill={tokens.mutedForeground} />
    <Text numberOfLines={1} style={[type.caption, { color: tokens.mutedForeground, flexShrink: 1 }]}>{product.rating} · {product.soldCount} sold</Text>
  </View>;
}

/**
 * Product card (a unit you pick up → it is a card-like tile without a border). Fixed anatomy so nothing clips:
 * square image, 2-line title, price (deal when on sale), rating · sold.
 */
export function ProductCard({ product, compact = false, style }: { product: ProductSummary; compact?: boolean; style?: StyleProp<ViewStyle> }) {
  const tokens = useTokens();
  const percent = discountPercent(product.price, product.compareAtPrice);
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open ${product.name}`} onPress={() => router.push(`/product/${encodeURIComponent(product.slug)}`)}
    style={({ pressed }) => [{ width: compact ? 148 : '48%', gap: 6, opacity: pressed ? 0.8 : 1 }, style]}>
    <View>
      <CatalogImage uri={product.imageUrl} style={{ width: '100%', height: undefined, aspectRatio: 1 }} />
      {percent ? <View style={{ position: 'absolute', top: 8, left: 8 }}><DiscountChip percent={percent} /></View> : null}
    </View>
    <Text numberOfLines={2} style={[type.small, { color: tokens.foreground, minHeight: 40 }]}>{product.name}</Text>
    <Money amount={product.price} size="body" tone={percent ? 'deal' : 'default'} />
    {percent && product.compareAtPrice ? <Money amount={product.compareAtPrice} size="caption" strike /> : null}
    <RatingLine product={product} />
  </Pressable>;
}

export function ProductGrid({ products, compact = false }: { products: ProductSummary[]; compact?: boolean }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 20 }}>
    {products.map((product) => <ProductCard key={product.id} product={product} compact={compact} />)}
  </View>;
}

/** Full-bleed product row for narrow panes (categories) — a list, not a grid of tiny cards. */
export function ProductRow({ product, divider = true }: { product: ProductSummary; divider?: boolean }) {
  const tokens = useTokens();
  const percent = discountPercent(product.price, product.compareAtPrice);
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open ${product.name}`} onPress={() => router.push(`/product/${encodeURIComponent(product.slug)}`)}
    style={({ pressed }) => ({ flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: divider ? StyleSheet.hairlineWidth : 0, borderBottomColor: tokens.border, backgroundColor: pressed ? tokens.muted : 'transparent' })}>
    <CatalogImage uri={product.imageUrl} size={64} />
    <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
      <Text numberOfLines={2} style={[type.small, { color: tokens.foreground }]}>{product.name}</Text>
      <Money amount={product.price} size="small" tone={percent ? 'deal' : 'default'} style={{ fontSize: 15 }} />
      <RatingLine product={product} />
    </View>
  </Pressable>;
}

export function ProductSkeletons({ count = 4, compact = false }: { count?: number; compact?: boolean }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 20 }}>
    {Array.from({ length: count }, (_, index) => <View key={index} style={{ width: compact ? 148 : '48%', gap: 6 }}>
      <Skeleton style={{ width: '100%', height: undefined, aspectRatio: 1, borderRadius: radius.lg }} /><Skeleton height={14} /><Skeleton width="60%" height={14} /><Skeleton width="45%" height={18} />
    </View>)}
  </View>;
}

export function CategoryChip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const tokens = useTokens();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
    style={({ pressed }) => ({ minHeight: 40, marginVertical: 4, paddingHorizontal: 14, borderRadius: radius.full, borderWidth: 1, borderColor: selected ? tokens.primary : tokens.border, backgroundColor: selected ? withAlpha(tokens.primary, 0.1) : pressed ? tokens.muted : tokens.card, justifyContent: 'center' })}>
    <Text style={[type.small, { color: selected ? tokens.primary : tokens.foreground, fontWeight: selected ? '600' : '400' }]}>{label}</Text>
  </Pressable>;
}

/** Radio/checkbox glyph for picker rows (icon, never a Unicode bullet). */
export function SelectMark({ selected, kind = 'radio' }: { selected: boolean; kind?: 'radio' | 'checkbox' }) {
  const tokens = useTokens();
  const name: IconName = kind === 'radio' ? (selected ? 'CircleDot' : 'Circle') : (selected ? 'SquareCheck' : 'Square');
  return <Icon name={name} size={22} color={selected ? tokens.primary : tokens.input} />;
}

/** A picker row: 48 pt+, radio mark, body, optional trailing (e.g. a fee). */
export function OptionRow({ selected, label, detail, trailing, onPress, disabled = false, accessibilityLabel }: { selected: boolean; label: string; detail?: ReactNode; trailing?: ReactNode; onPress: () => void; disabled?: boolean; accessibilityLabel?: string }) {
  const tokens = useTokens();
  return <Pressable accessibilityRole="radio" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, opacity: disabled ? 0.5 : 1, backgroundColor: pressed ? tokens.muted : 'transparent', borderRadius: radius.md })}>
    <SelectMark selected={selected} />
    <View style={{ flex: 1, minWidth: 0 }}><Text style={[type.body, { color: tokens.foreground }]}>{label}</Text>{typeof detail === 'string' ? <Text style={[type.small, { color: tokens.mutedForeground }]}>{detail}</Text> : detail}</View>
    {trailing}
  </Pressable>;
}

export function VariantSheet({ visible, variants, selectedId, onClose, onSelect }: { visible: boolean; variants: Variant[]; selectedId?: string; onClose: () => void; onSelect: (variant: Variant) => void }) {
  const tokens = useTokens();
  return <BottomSheet visible={visible} title="Choose a variant" onClose={onClose}>
    {variants.length ? <View>{variants.map((variant) => {
      const label = Object.values(variant.options).join(' / ') || variant.sku;
      const percent = discountPercent(variant.price, variant.compareAtPrice);
      return <OptionRow key={variant.id} selected={selectedId === variant.id} label={label} accessibilityLabel={label} disabled={variant.stock < 1} onPress={() => onSelect(variant)}
        detail={variant.stock < 1 ? 'Out of stock' : variant.stock <= 5 ? `Only ${variant.stock} left` : undefined}
        trailing={variant.stock ? <Money amount={variant.price} size="small" tone={percent ? 'deal' : 'default'} /> : null} />;
    })}</View> : <Text style={[type.body, { color: tokens.mutedForeground }]}>No variants available.</Text>}
  </BottomSheet>;
}

/**
 * Sticky buy bar in the thumb zone: variant picker row + Add to cart / Buy now. Sits outside the scroll view and
 * respects the bottom safe area.
 */
export function ProductPurchaseBar({ variants, selectedId, loading, error, onSelect, onAdd }: { variants: Variant[]; selectedId?: string; loading?: boolean; error?: string; onSelect: (variant: Variant) => void; onAdd: (variant: Variant, buyNow: boolean) => void }) {
  const tokens = useTokens();
  const insets = useSafeAreaInsets();
  const [sheetVisible, setSheetVisible] = useState(false);
  const selected = variants.find((variant) => variant.id === selectedId) ?? variants.find((variant) => variant.stock > 0) ?? variants[0];
  const label = selected ? Object.values(selected.options).join(' / ') || selected.sku : '';
  const outOfStock = !selected?.stock;
  return <View style={{ gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: tokens.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tokens.border }}>
    {variants.length > 1 ? <Pressable accessibilityRole="button" accessibilityLabel="Choose product variant" accessibilityHint={label ? `Selected ${label}` : undefined} onPress={() => setSheetVisible(true)}
      style={({ pressed }) => ({ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.md, backgroundColor: pressed ? tokens.muted : 'transparent' })}>
      <Text style={[type.small, { color: tokens.mutedForeground }]}>Variant</Text>
      <Text numberOfLines={1} style={[type.small, { color: tokens.foreground, fontWeight: '600', flex: 1 }]}>{label || 'Choose'}</Text>
      <Icon name="ChevronRight" size={18} color={tokens.mutedForeground} />
    </Pressable> : null}
    {error ? <Text accessibilityRole="alert" style={[type.small, { color: tokens.destructive }]}>{error}</Text> : null}
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ flex: 1 }}><Button title="Add to cart" variant="secondary" onPress={() => selected && onAdd(selected, false)} loading={loading} disabled={outOfStock} /></View>
      <View style={{ flex: 1 }}><Button title={outOfStock ? 'Sold out' : 'Buy now'} onPress={() => selected && onAdd(selected, true)} loading={loading} disabled={outOfStock} /></View>
    </View>
    <VariantSheet visible={sheetVisible} variants={variants} selectedId={selected?.id} onClose={() => setSheetVisible(false)} onSelect={(variant) => { onSelect(variant); setSheetVisible(false); }} />
  </View>;
}

/**
 * Sticky bottom action bar (cart, checkout): content on the left, one primary action on the right. Pinned to the
 * bottom of the screen; `onHeight` reports its measured height so the scroll content can pad itself clear of it.
 */
export function StickyBar({ children, onHeight }: { children: ReactNode; onHeight?: (height: number) => void }) {
  const tokens = useTokens();
  const insets = useSafeAreaInsets();
  return <View onLayout={(event) => onHeight?.(event.nativeEvent.layout.height)} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: tokens.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tokens.border }}>
    {children}
  </View>;
}

export function PrimaryAction({ title, onPress, disabled, loading }: { title: string; onPress: () => void; disabled?: boolean; loading?: boolean }) {
  return <Button title={title} onPress={onPress} disabled={disabled} loading={loading} />;
}

export function InlineDivider() {
  const tokens = useTokens();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: tokens.border, marginVertical: 8 }} />;
}

export { Card };
