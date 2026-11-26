import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import BigJs from 'big.js';
import { AppText, BottomBar, BottomSheet, Button, Card, CatalogImage, Icon, Money, PressableScale, Skeleton, useTokens, type IconName } from '@/ui';
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
 * Product tile (a unit you pick up: image plate, no border). Price-first anatomy so the eye lands on the number:
 * square image (discount chip on it) → price + struck price on one line → 2-line title → rating · sold pinned to
 * the bottom, so tiles in a grid row line up whatever the title length.
 */
export function ProductCard({ product, compact = false, style }: { product: ProductSummary; compact?: boolean; style?: StyleProp<ViewStyle> }) {
  const tokens = useTokens();
  const percent = discountPercent(product.price, product.compareAtPrice);
  return <PressableScale accessibilityRole="button" accessibilityLabel={`Open ${product.name}`} onPress={() => router.push(`/product/${encodeURIComponent(product.slug)}`)}
    containerStyle={[{ width: compact ? 148 : '48%' }, style]} style={{ flex: 1 }}>
    <View style={{ flex: 1, gap: 8 }}>
      <View>
        <CatalogImage uri={product.imageUrl} fill />
        {percent ? <View style={{ position: 'absolute', top: 8, left: 8 }}><DiscountChip percent={percent} /></View> : null}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 6 }}>
          <Money amount={product.price} size="body" tone={percent ? 'deal' : 'default'} style={{ fontSize: 17 }} />
          {percent && product.compareAtPrice ? <Money amount={product.compareAtPrice} size="caption" strike accessibilityLabel={`was ${product.compareAtPrice} dong`} /> : null}
        </View>
        <Text numberOfLines={2} style={[type.small, { color: tokens.foreground }]}>{product.name}</Text>
        <View style={{ marginTop: 'auto', paddingTop: 2 }}><RatingLine product={product} /></View>
      </View>
    </View>
  </PressableScale>;
}

export function ProductGrid({ products, compact = false }: { products: ProductSummary[]; compact?: boolean }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 24 }}>
    {products.map((product) => <ProductCard key={product.id} product={product} compact={compact} />)}
  </View>;
}

/** Horizontal product rail that bleeds to the screen edges (cards scroll under the gutter, not clipped at it). */
export function ProductRail({ products }: { products: ProductSummary[] }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingVertical: 4 }}>
    {products.map((product) => <ProductCard key={product.id} product={product} compact />)}
  </ScrollView>;
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
      <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 6 }}>
        <Money amount={product.price} size="small" tone={percent ? 'deal' : 'default'} style={{ fontSize: 15 }} />
        {percent && product.compareAtPrice ? <Money amount={product.compareAtPrice} size="caption" strike accessibilityLabel={`was ${product.compareAtPrice} dong`} /> : null}
      </View>
      <RatingLine product={product} />
    </View>
  </Pressable>;
}

export function ProductSkeletons({ count = 4, compact = false }: { count?: number; compact?: boolean }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 24 }}>
    {Array.from({ length: count }, (_, index) => <View key={index} style={{ width: compact ? 148 : '48%', gap: 8 }}>
      <Skeleton aspectRatio={1} rounded="lg" /><Skeleton width="55%" height={18} /><Skeleton height={14} /><Skeleton width="40%" height={12} />
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
      const label = variantLabel(variant);
      const percent = discountPercent(variant.price, variant.compareAtPrice);
      return <OptionRow key={variant.id} selected={selectedId === variant.id} label={label} accessibilityLabel={label} disabled={variant.stock < 1} onPress={() => onSelect(variant)}
        detail={variant.stock < 1 ? 'Out of stock' : variant.stock <= 5 ? `Only ${variant.stock} left` : undefined}
        trailing={variant.stock ? <Money amount={variant.price} size="small" tone={percent ? 'deal' : 'default'} /> : null} />;
    })}</View> : <Text style={[type.body, { color: tokens.mutedForeground }]}>No variants available.</Text>}
  </BottomSheet>;
}

export function variantLabel(variant: Variant) {
  return Object.values(variant.options).join(' / ') || variant.sku;
}

/** Up to this many variants are picked inline as chips; more open the sheet. */
export const INLINE_VARIANT_LIMIT = 8;

/**
 * Variant picker on the product page (one tap, no sheet). Out-of-stock variants stay visible but struck and
 * disabled; low stock is called out under the chips.
 */
export function VariantChips({ variants, selectedId, onSelect }: { variants: Variant[]; selectedId?: string; onSelect: (variant: Variant) => void }) {
  const tokens = useTokens();
  const [sheetVisible, setSheetVisible] = useState(false);
  const selected = variants.find((variant) => variant.id === selectedId);
  if (variants.length < 2) return null;
  const inline = variants.length <= INLINE_VARIANT_LIMIT;
  return <View style={{ gap: 10 }}>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
      <AppText variant="small" tone="muted">Option</AppText>
      <Text numberOfLines={1} style={[type.small, { color: tokens.foreground, fontWeight: '600', flex: 1 }]}>{selected ? variantLabel(selected) : 'Choose one'}</Text>
    </View>
    {inline ? <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{variants.map((variant) => {
      const active = variant.id === selected?.id;
      const soldOut = variant.stock < 1;
      return <Pressable key={variant.id} accessibilityRole="radio" accessibilityLabel={`${variantLabel(variant)}${soldOut ? ', out of stock' : ''}`} accessibilityState={{ checked: active, disabled: soldOut }} disabled={soldOut} onPress={() => onSelect(variant)}
        style={({ pressed }) => ({ minHeight: touchTarget, minWidth: 64, paddingHorizontal: 16, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: active ? 2 : 1, borderColor: active ? tokens.primary : tokens.border, backgroundColor: active ? withAlpha(tokens.primary, 0.1) : pressed ? tokens.muted : tokens.card, opacity: soldOut ? 0.5 : 1 })}>
        <Text style={[type.small, { color: active ? tokens.primary : tokens.foreground, fontWeight: active ? '600' : '400', textDecorationLine: soldOut ? 'line-through' : 'none' }]}>{variantLabel(variant)}</Text>
      </Pressable>;
    })}</View> : <Button title={`Choose from ${variants.length} options`} variant="secondary" icon="SlidersHorizontal" onPress={() => setSheetVisible(true)} />}
    {selected && selected.stock > 0 && selected.stock <= 5 ? <AppText variant="small" tone="warning">Only {selected.stock} left</AppText> : null}
    <VariantSheet visible={sheetVisible} variants={variants} selectedId={selected?.id} onClose={() => setSheetVisible(false)} onSelect={(variant) => { onSelect(variant); setSheetVisible(false); }} />
  </View>;
}

/**
 * Sticky buy bar in the thumb zone (kit `BottomBar`): Add to cart / Buy now for the selected variant. When nothing is
 * in stock it says so and offers a way on (similar products) instead of two dead buttons. An add-to-cart error sits on
 * its own strip just above the bar. Absolutely positioned: pad the scroll content with the `onHeight` value.
 */
export function ProductPurchaseBar({ variant, soldOut, loading, error, onAdd, onSimilar, onHeight }: { variant?: Variant; soldOut: boolean; loading?: boolean; error?: string; onAdd: (variant: Variant, buyNow: boolean) => void; onSimilar: () => void; onHeight?: (height: number) => void }) {
  const tokens = useTokens();
  const [barHeight, setBarHeight] = useState(73);
  const measure = (height: number) => { setBarHeight(height); onHeight?.(height); };
  return <>
    {error ? <View style={{ position: 'absolute', left: 0, right: 0, bottom: barHeight, flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: tokens.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tokens.border }}><Icon name="CircleExclamationPoint" size={16} color={tokens.destructive} /><Text accessibilityRole="alert" style={[type.small, { color: tokens.destructive, flex: 1 }]}>{error}</Text></View> : null}
    {soldOut || !variant ? <BottomBar onHeight={measure} action={{ title: 'See similar', onPress: onSimilar }}>
      <View style={{ flex: 1, minWidth: 0 }}><AppText variant="body" style={{ fontWeight: '600' }}>Sold out</AppText><AppText variant="small" tone="muted" numberOfLines={1}>No stock right now</AppText></View>
    </BottomBar> : <BottomBar onHeight={measure}
      secondaryAction={{ title: 'Add to cart', icon: 'ShoppingCart', onPress: () => onAdd(variant, false), loading }}
      action={{ title: 'Buy now', onPress: () => onAdd(variant, true), disabled: loading }} />}
  </>;
}

export function InlineDivider() {
  const tokens = useTokens();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: tokens.border, marginVertical: 8 }} />;
}

export { Card };
