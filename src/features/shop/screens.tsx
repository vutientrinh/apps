import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import BigJs from 'big.js';
import { ActivityIndicator, Animated, Easing, Image, Modal, PanResponder, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import QRCode from 'react-native-qrcode-svg';
import { AppHeader, AppText, BottomSheet, Button, Card, Divider, EmptyState, ErrorState, Icon, ListItem, Money, OtpInput, QuantityStepper, Screen, Skeleton, StatusBadge, TextField, Toast, useTokens, type IconName } from '@/ui';
import { fontFamily, lightTokens, radius, touchTarget, type, withAlpha } from '@/theme/tokens';
import { useReducedMotion } from '@/lib/motion';
import { useAuth } from '@/lib/session';
import { createIdempotencyKey } from '@/lib/idempotency';
import type { CartItem, CheckoutQuote, Variant } from '@web/features/commerce/types';
import { useAddCartItem, useAddresses, useCancelPayment, useCart, useCategories, useCheckout, useConfirmPayment, useCreateAddress, useDeleteCartItem, useHome, useOrderList, usePaymentIntent, useProduct, useProducts, useQuote, useRetryPayment, useSeller, useSimulatePayment, useUpdateCartItem, useWallet, type SearchParams } from './api';
import { CatalogImage, CategoryChip, OptionRow, PriceBlock, ProductGrid, ProductCard, ProductPurchaseBar, ProductRow, ProductSkeletons, SectionTitle, SelectMark, StickyBar } from './components';
import { cartSelectionUpdates, checkoutRequestKey, isPaymentTerminal, selectedCartItemIds, type CartSelectionTarget } from './logic';

const contentStyle = { gap: 24, paddingBottom: 32 } as const;
/** Dev-only OTP the mock wallet accepts (shown as a chip, never as a fake typed value). */
const DEV_OTP = '123456';

function useRefresh(...refetches: (() => Promise<unknown>)[]) {
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    try { await Promise.all(refetches.map((refetch) => refetch())); }
    finally { setRefreshing(false); }
  };
  return { refreshing, refresh };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Try again.';
}

function queryParams(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value ?? ''; }

/** Inline warning/error line: icon + text, never colour alone. */
function Notice({ tone, children }: { tone: 'warning' | 'destructive'; children: ReactNode }) {
  const tokens = useTokens();
  const color = tone === 'warning' ? tokens.warning : tokens.destructive;
  return <View accessibilityRole={tone === 'destructive' ? 'alert' : undefined} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
    <Icon name="TriangleExclamationPoint" size={16} color={color} style={{ marginTop: 2 }} />
    <Text style={[type.small, { color, flex: 1 }]}>{children}</Text>
  </View>;
}

/** Keeps a toast above a sticky bar of `offset` height instead of covering its buttons. */
function ToastAbove({ offset, ...toast }: { offset: number } & Parameters<typeof Toast>[0]) {
  return <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: offset, height: 96 }}><Toast {...toast} /></View>;
}

function MonoText({ children, selectable = false, muted = true }: { children: ReactNode; selectable?: boolean; muted?: boolean }) {
  const tokens = useTokens();
  return <Text selectable={selectable} style={[type.small, { fontFamily: fontFamily.mono, color: muted ? tokens.mutedForeground : tokens.foreground }]}>{children}</Text>;
}

// ---------------------------------------------------------------------------------------------------------------
// M-10 Home

const QUICK_ACTIONS: readonly (readonly [string, string, IconName])[] = [['Scan QR', '/wallet/scan', 'ScanLine'], ['Top up', '/wallet/top-up', 'Wallet'], ['Send', '/wallet/send', 'Send']];

export function HomeScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const auth = useAuth();
  const home = useHome();
  const wallet = useWallet(auth.authenticated);
  const { refreshing, refresh } = useRefresh(home.refetch, ...(auth.authenticated ? [wallet.refetch] : []));
  const data = home.data;
  const banner = data?.banners[0];
  return <Screen refreshing={refreshing} onRefresh={refresh}>
    <View style={contentStyle}>
      <Pressable accessibilityRole="search" accessibilityLabel="Search products and shops" onPress={() => router.push('/search')}
        style={({ pressed }) => ({ minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: pressed ? tokens.muted : tokens.card, borderWidth: 1, borderColor: tokens.input })}>
        <Icon name="Search" size={20} color={tokens.mutedForeground} /><Text style={[type.body, { color: tokens.mutedForeground }]}>Search products, shops…</Text>
      </Pressable>
      <View style={{ gap: 12 }}>
        {auth.authenticated ? <Pressable accessibilityRole="button" accessibilityLabel="Open wallet" onPress={() => router.push('/wallet')}
          style={({ pressed }) => ({ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: tokens.border, backgroundColor: pressed ? tokens.muted : tokens.card })}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="small" tone="muted">Wallet balance</AppText>
            {wallet.isLoading ? <Skeleton width={140} height={23} /> : wallet.data ? <Money amount={wallet.data.availableBalance} size="h3" /> : <AppText variant="body">View wallet</AppText>}
          </View>
          <Icon name="ChevronRight" size={20} color={tokens.mutedForeground} />
        </Pressable> : null}
        <View style={{ flexDirection: 'row' }}>
          {QUICK_ACTIONS.map(([label, href, icon]) => <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} onPress={() => router.push(href as never)}
            style={({ pressed }) => ({ flex: 1, minHeight: 76, gap: 6, justifyContent: 'center', alignItems: 'center', borderRadius: radius.lg, backgroundColor: pressed ? tokens.muted : 'transparent' })}>
            <View style={{ width: 44, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(tokens.primary, 0.1) }}><Icon name={icon} size={22} color={tokens.primary} /></View>
            <AppText variant="caption">{label}</AppText>
          </Pressable>)}
        </View>
      </View>
      {home.isLoading ? <><Skeleton height={150} style={{ borderRadius: radius.lg }} /><ProductSkeletons count={2} /></> : home.isError ? <ErrorState message={getErrorMessage(home.error)} retry={() => void home.refetch()} /> : data ? <>
        {banner ? <Pressable accessibilityRole="button" accessibilityLabel={`Open ${banner.title}`} onPress={() => router.push(banner.href as never)}
          style={({ pressed }) => ({ borderRadius: radius.lg, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: tokens.border, backgroundColor: tokens.card, opacity: pressed ? 0.85 : 1 })}>
          {banner.imageUrl ? <Image source={{ uri: banner.imageUrl }} style={{ width: '100%', aspectRatio: 2.4, backgroundColor: tokens.muted }} resizeMode="cover" /> : null}
          <View style={{ padding: 16, gap: 2 }}><AppText variant="h3">{banner.title}</AppText>{banner.subtitle ? <AppText variant="small" tone="muted">{banner.subtitle}</AppText> : null}</View>
        </Pressable> : null}
        <View><SectionTitle title="Categories" action="Browse all" onAction={() => router.push('/(tabs)/categories')} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{data.categories.filter((item) => !item.parentId).map((category) => <CategoryChip key={category.id} label={category.name} onPress={() => router.push({ pathname: '/search', params: { category: category.slug } })} />)}</ScrollView></View>
        {data.deals.length ? <View><SectionTitle title="Deals" action="See all" onAction={() => router.push({ pathname: '/search', params: { sort: 'best_selling' } })} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 4 }}>{data.deals.map((product) => <ProductCard key={product.id} product={product} compact />)}</ScrollView></View> : null}
        <View><SectionTitle title="Recommended" action="See all" onAction={() => router.push('/search')} /><ProductGrid products={data.recommended} /></View>
      </> : <EmptyState icon="Store" title="Shop is ready when you are" description="Pull down to refresh the catalog." />}
    </View>
  </Screen>;
}

// ---------------------------------------------------------------------------------------------------------------
// M-11 Search

function ToolbarButton({ label, icon, onPress, active = false }: { label: string; icon: IconName; onPress: () => void; active?: boolean }) {
  const tokens = useTokens();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => ({ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, borderColor: active ? tokens.primary : tokens.input, backgroundColor: pressed ? tokens.muted : 'transparent' })}>
    <Icon name={icon} size={18} color={active ? tokens.primary : tokens.foreground} /><Text style={[type.small, { color: active ? tokens.primary : tokens.foreground, fontWeight: '600' }]}>{label}</Text>
  </Pressable>;
}

export function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string; category?: string; sort?: string; sellerSlug?: string; minPrice?: string; maxPrice?: string; minRating?: string }>();
  const router = useRouter();
  const tokens = useTokens();
  const initialQuery = queryParams(params.q);
  const [text, setText] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(queryParams(params.category));
  const [sellerSlug] = useState(queryParams(params.sellerSlug));
  const [sort, setSort] = useState((queryParams(params.sort) as SearchParams['sort']) || 'relevance');
  const [minimum, setMinimum] = useState(queryParams(params.minPrice));
  const [maximum, setMaximum] = useState(queryParams(params.maxPrice));
  const [rating, setRating] = useState(queryParams(params.minRating));
  const [location, setLocation] = useState('');
  const [sheet, setSheet] = useState<'filters' | 'sort' | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [suggestionText, setSuggestionText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const categories = useCategories();
  useEffect(() => { const timeout = setTimeout(() => setSuggestionText(text.trim()), 250); return () => clearTimeout(timeout); }, [text]);
  const suggestions = useProducts({ q: suggestionText, sellerSlug: sellerSlug || undefined, size: 5 }, !query && suggestionText.length >= 2);
  const results = useProducts({ q: query || undefined, category: category || undefined, sellerSlug: sellerSlug || undefined, minPrice: minimum || undefined, maxPrice: maximum || undefined, minRating: rating || undefined, sort, size: 12 }, Boolean(query || category || sellerSlug));
  const items = useMemo(() => results.data?.pages.flatMap((page) => page.content) ?? [], [results.data]);
  const filtered = useMemo(() => location ? items.filter((item) => item.seller.location.toLowerCase().includes(location.toLowerCase())) : items, [items, location]);
  const filtersActive = Boolean(minimum || maximum || rating || location);
  const loadMore = () => { if (results.hasNextPage && !results.isFetchingNextPage) void results.fetchNextPage(); };
  const pushParams = (overrides: Partial<Record<'q' | 'category' | 'sort', string>> = {}) => router.setParams({ q: (overrides.q ?? query) || undefined, category: (overrides.category ?? category) || undefined, sellerSlug: sellerSlug || undefined, sort: overrides.sort ?? sort, minPrice: minimum || undefined, maxPrice: maximum || undefined, minRating: rating || undefined });
  const submit = () => { const value = text.trim(); setQuery(value); if (value) setRecent((previous) => [value, ...previous.filter((item) => item !== value)].slice(0, 8)); pushParams({ q: value }); };
  const clearFilters = () => { setCategory(''); setMinimum(''); setMaximum(''); setRating(''); setLocation(''); setQuery(''); setText(''); router.setParams({ q: undefined, category: undefined, minPrice: undefined, maxPrice: undefined, minRating: undefined }); };
  const onListScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    if (contentSize.height - layoutMeasurement.height - contentOffset.y < 500) loadMore();
  };
  const showResults = Boolean(query || category);
  return <Screen scroll={false} style={{ padding: 0 }}>
    <View style={{ paddingHorizontal: 16 }}><AppHeader title="Search" onBack={() => router.back()} /></View>
    <ScrollView keyboardShouldPersistTaps="handled" onScroll={onListScroll} scrollEventThrottle={250} refreshControl={<RefreshControl tintColor={tokens.primary} colors={[tokens.primary]} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); try { await Promise.all([results.refetch(), categories.refetch()]); } finally { setRefreshing(false); } }} />} contentContainerStyle={{ padding: 16, paddingTop: 12 }}>
    <View style={contentStyle}>
      <View style={{ minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 12, borderWidth: 1, borderColor: tokens.input, borderRadius: radius.md, backgroundColor: tokens.card, overflow: 'hidden' }}>
        <Icon name="Search" size={20} color={tokens.mutedForeground} />
        <TextInput accessibilityLabel="Search products" value={text} onChangeText={setText} onSubmitEditing={submit} returnKeyType="search" autoFocus={!initialQuery && !category} placeholder="Search products…" placeholderTextColor={tokens.mutedForeground} style={[type.body, { flex: 1, minWidth: 0, minHeight: 46, color: tokens.foreground }]} />
        {text ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setText('')} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name="X" size={18} color={tokens.mutedForeground} /></Pressable> : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Search" onPress={submit} style={({ pressed }) => ({ height: 46, paddingHorizontal: 14, justifyContent: 'center', borderTopRightRadius: radius.md - 1, borderBottomRightRadius: radius.md - 1, backgroundColor: pressed ? withAlpha(tokens.primary, 0.86) : tokens.primary })}><Text style={{ color: tokens.primaryForeground, fontFamily: fontFamily.title, fontSize: 15 }}>Search</Text></Pressable>
      </View>
      {!query && suggestions.data?.pages[0]?.content.length ? <View><SectionTitle title="Suggestions" />{suggestions.data.pages[0].content.slice(0, 5).map((product, index, list) => <ListItem key={product.id} title={product.name} chevron divider={index < list.length - 1} leading={<Icon name="Search" size={18} color={tokens.mutedForeground} />} onPress={() => router.push(`/product/${encodeURIComponent(product.slug)}`)} />)}</View> : null}
      {!query && recent.length ? <View><SectionTitle title="Recent searches" action="Clear" onAction={() => setRecent([])} />{recent.map((item, index) => <ListItem key={item} title={item} divider={index < recent.length - 1} leading={<Icon name="Clock" size={18} color={tokens.mutedForeground} />} onPress={() => { setText(item); setQuery(item); }} />)}</View> : null}
      {!query && !recent.length && !category ? <View><SectionTitle title="Popular categories" /><View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 8 }}>{(categories.data ?? []).filter((item) => !item.parentId).map((item) => <CategoryChip key={item.id} label={item.name} onPress={() => { setCategory(item.slug); setQuery(''); pushParams({ category: item.slug, q: '' }); }} />)}</View></View> : null}
      {showResults ? <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[type.small, { color: tokens.mutedForeground, flex: 1 }]} numberOfLines={1}><Text style={{ color: tokens.foreground, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{results.data?.pages[0]?.totalElements ?? '—'}</Text> results</Text>
          <ToolbarButton label="Sort" icon="ArrowUpDown" active={sort !== 'relevance'} onPress={() => setSheet('sort')} />
          <ToolbarButton label="Filter" icon="SlidersHorizontal" active={filtersActive} onPress={() => setSheet('filters')} />
        </View>
        {results.isLoading ? <ProductSkeletons count={6} /> : results.isError ? <ErrorState message={getErrorMessage(results.error)} retry={() => void results.refetch()} /> : filtered.length ? <><ProductGrid products={filtered} />{results.isFetchingNextPage ? <ActivityIndicator color={tokens.primary} /> : null}</> : <EmptyState icon="PackageSearch" title="No products found" description="Try a different search or clear your filters." action={<Button title="Clear filters" variant="secondary" onPress={clearFilters} />} />}
      </View> : null}
    </View>
    </ScrollView>
    <BottomSheet visible={sheet === 'sort'} title="Sort products" onClose={() => setSheet(null)}>
      <View>{([['relevance', 'Recommended'], ['newest', 'Newest'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low'], ['best_selling', 'Best selling']] as const).map(([value, label]) => <OptionRow key={value} selected={sort === value} label={label} onPress={() => { setSort(value); pushParams({ sort: value }); setSheet(null); }} />)}</View>
    </BottomSheet>
    <BottomSheet visible={sheet === 'filters'} title="Filter products" onClose={() => setSheet(null)}>
      <View style={{ gap: 4 }}><AppText variant="small" style={{ fontWeight: '600' }}>Category</AppText><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{(categories.data ?? []).map((item) => <CategoryChip key={item.id} label={item.name} selected={category === item.slug} onPress={() => setCategory(category === item.slug ? '' : item.slug)} />)}</ScrollView></View>
      <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><TextField label="Min price (₫)" value={minimum} onChangeText={(value) => setMinimum(value.replace(/\D/g, ''))} keyboardType="number-pad" /></View><View style={{ flex: 1 }}><TextField label="Max price (₫)" value={maximum} onChangeText={(value) => setMaximum(value.replace(/\D/g, ''))} keyboardType="number-pad" /></View></View>
      <TextField label="Minimum rating" value={rating} onChangeText={setRating} keyboardType="decimal-pad" placeholder="4" />
      <TextField label="Seller location" value={location} onChangeText={setLocation} placeholder="HCMC, Hanoi…" />
      <Button title="Show results" onPress={() => { pushParams(); setSheet(null); }} />
    </BottomSheet>
  </Screen>;
}

// ---------------------------------------------------------------------------------------------------------------
// M-12 Categories

export function CategoriesScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const categories = useCategories();
  const rootCategories = useMemo(() => categories.data?.filter((category) => !category.parentId) ?? [], [categories.data]);
  const [selectedId, setSelectedId] = useState('');
  const selected = rootCategories.find((item) => item.id === selectedId) ?? rootCategories[0];
  const subcategories = categories.data?.filter((item) => item.parentId === selected?.id) ?? [];
  const products = useProducts({ category: selected?.slug, size: 12 }, Boolean(selected?.slug));
  const list = products.data?.pages[0]?.content ?? [];
  return <Screen refreshing={products.isRefetching || categories.isRefetching} onRefresh={() => { void categories.refetch(); void products.refetch(); }}>
    <View style={{ gap: 12, paddingBottom: 32 }}><AppHeader title="Categories" />{categories.isLoading ? <View style={{ flexDirection: 'row', gap: 12 }}><Skeleton width={96} height={300} /><View style={{ flex: 1, gap: 12 }}><Skeleton height={24} /><Skeleton height={64} /><Skeleton height={64} /></View></View> : categories.isError ? <ErrorState message={getErrorMessage(categories.error)} retry={() => void categories.refetch()} /> : !rootCategories.length ? <EmptyState icon="LayoutGrid" title="No categories yet" action={<Button title="Explore products" onPress={() => router.push('/search')} />} /> : <View style={{ flexDirection: 'row', gap: 12 }}>
      <View accessibilityRole="tablist" style={{ width: 96, marginLeft: -16, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: tokens.border }}>{rootCategories.map((item) => {
        const active = selected?.id === item.id;
        return <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => setSelectedId(item.id)}
          style={({ pressed }) => ({ minHeight: 56, justifyContent: 'center', paddingVertical: 8, paddingLeft: 16, paddingRight: 8, borderLeftWidth: 3, borderLeftColor: active ? tokens.primary : 'transparent', backgroundColor: active ? withAlpha(tokens.primary, 0.1) : pressed ? tokens.muted : 'transparent' })}>
          <Text numberOfLines={2} style={[type.caption, { color: active ? tokens.primary : tokens.foreground }]}>{item.name}</Text>
        </Pressable>;
      })}</View>
      <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
        <AppText variant="h3" accessibilityRole="header">{selected?.name ?? 'Browse'}</AppText>
        {subcategories.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 8 }}>{subcategories.map((item) => <CategoryChip key={item.id} label={item.name} onPress={() => router.push({ pathname: '/search', params: { category: item.slug } })} />)}</View> : null}
        {products.isLoading ? [0, 1, 2].map((index) => <View key={index} style={{ flexDirection: 'row', gap: 12, paddingVertical: 12 }}><Skeleton width={64} height={64} style={{ borderRadius: radius.lg }} /><View style={{ flex: 1, gap: 6 }}><Skeleton height={14} /><Skeleton width="50%" height={16} /></View></View>) : products.isError ? <ErrorState message={getErrorMessage(products.error)} retry={() => void products.refetch()} /> : list.length ? <View>{list.map((product, index) => <ProductRow key={product.id} product={product} divider={index < list.length - 1} />)}<Button title="See all" accessibilityLabel={`See all in ${selected?.name ?? 'this category'}`} variant="ghost" onPress={() => router.push({ pathname: '/search', params: { category: selected?.slug } })} /></View> : <EmptyState title="Nothing here yet" description="Choose a subcategory or explore all products." action={<Button title="Explore products" variant="secondary" onPress={() => router.push('/search')} />} />}
      </View>
    </View>}</View>
  </Screen>;
}

// ---------------------------------------------------------------------------------------------------------------
// M-13 Product

export function ProductScreen() {
  const { slug: rawSlug } = useLocalSearchParams<{ slug: string }>();
  const slug = queryParams(rawSlug);
  const router = useRouter();
  const tokens = useTokens();
  const { width: windowWidth } = useWindowDimensions();
  const product = useProduct(slug);
  const add = useAddCartItem();
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [imageIndex, setImageIndex] = useState(0);
  const [zoomVisible, setZoomVisible] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [toast, setToast] = useState(false);
  const [barHeight, setBarHeight] = useState(120);
  const item = product.data;
  const variants = item?.variants ?? [];
  const variant = variants.find((v) => v.id === selectedVariant) ?? variants.find((v) => v.stock > 0) ?? variants[0];
  const images = item?.images?.length ? item.images : item?.imageUrl ? [item.imageUrl] : [];
  const galleryWidth = Math.min(windowWidth, 480) - 32;
  const zoomSize = Math.min(windowWidth - 32, 480);
  const addToCart = (targetVariant: Variant, buyNow = false) => {
    if (targetVariant.stock < 1) return;
    add.mutate({ variantId: targetVariant.id, quantity: 1 }, { onSuccess: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (buyNow) router.push('/(tabs)/cart'); else setToast(true);
    } });
  };
  const closeZoom = () => { setZoomVisible(false); setZoomed(false); };
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(false), 3000);
    return () => clearTimeout(timeout);
  }, [toast]);
  return <Screen scroll={false} style={{ padding: 0 }}>
    <View style={{ paddingHorizontal: 16 }}><AppHeader title={item?.seller.name ?? 'Product'} onBack={() => router.back()} /></View>
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
    <View style={contentStyle}>
      {product.isLoading ? <><Skeleton style={{ width: '100%', height: undefined, aspectRatio: 1, borderRadius: radius.lg }} /><Skeleton height={24} /><Skeleton width="50%" height={32} /><Skeleton height={100} /></> : product.isError ? <ErrorState message={getErrorMessage(product.error)} retry={() => void product.refetch()} /> : item ? <>
        <View style={{ gap: 12 }}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ width: galleryWidth, alignSelf: 'center' }} onMomentumScrollEnd={(event) => setImageIndex(Math.round(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width))}>
            {images.length ? images.map((uri, index) => <Pressable key={`${uri}-${index}`} accessibilityRole="imagebutton" accessibilityLabel={`Zoom product image ${index + 1}`} onPress={() => { setImageIndex(index); setZoomVisible(true); }} style={{ width: galleryWidth }}><CatalogImage uri={uri} size={galleryWidth} /></Pressable>) : <CatalogImage uri="" size={galleryWidth} />}
          </ScrollView>
          {images.length > 1 ? <View accessibilityLabel={`Image ${imageIndex + 1} of ${images.length}`} style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>{images.map((_, index) => <View key={index} style={{ width: index === imageIndex ? 16 : 6, height: 6, borderRadius: radius.full, backgroundColor: index === imageIndex ? tokens.primary : tokens.border }} />)}</View> : null}
        </View>
        <View style={{ gap: 8 }}>
          <AppText variant="h2" accessibilityRole="header">{item.name}</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="Star" size={14} color={tokens.foreground} fill={tokens.foreground} /><Text style={[type.small, { color: tokens.foreground, fontWeight: '600' }]}>{item.rating}</Text><Text style={[type.small, { color: tokens.mutedForeground }]}>· {item.ratingCount} reviews · {item.soldCount} sold</Text></View>
          <PriceBlock price={variant?.price ?? item.price} compareAtPrice={variant?.compareAtPrice ?? item.compareAtPrice} size="h1" />
        </View>
        <View>
          <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.border }}>
            <Icon name="Truck" size={20} color={tokens.mutedForeground} />
            {item.shippingEstimate ? <View style={{ flex: 1, gap: 2 }}><Text style={[type.body, { color: tokens.foreground }]}>{item.shippingEstimate.minDays}–{item.shippingEstimate.maxDays} days to {item.shippingEstimate.destination}</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Text style={[type.small, { color: tokens.mutedForeground }]}>Delivery fee</Text><Money amount={item.shippingEstimate.fee} size="small" /></View></View> : <Text style={[type.small, { color: tokens.mutedForeground, flex: 1 }]}>Delivery options and fees are shown at checkout.</Text>}
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Visit shop ${item.seller.name}`} onPress={() => router.push(`/shop/${encodeURIComponent(item.seller.slug)}`)}>
          {({ pressed }) => <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? tokens.muted : tokens.card }}>
            <View style={{ width: 44, height: 44, borderRadius: radius.full, backgroundColor: withAlpha(tokens.primary, 0.1), alignItems: 'center', justifyContent: 'center' }}><Icon name="Store" size={22} color={tokens.primary} /></View>
            <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={[type.body, { color: tokens.foreground, fontWeight: '600' }]}>{item.seller.name}</Text><Text numberOfLines={1} style={[type.small, { color: tokens.mutedForeground }]}>{item.seller.rating} rating · {item.seller.location}</Text></View>
            <Icon name="ChevronRight" size={20} color={tokens.mutedForeground} />
          </Card>}
        </Pressable>
        {item.description ? <View style={{ gap: 8 }}><AppText variant="h3" accessibilityRole="header">About this product</AppText><Text style={[type.body, { color: tokens.foreground }]}>{item.description}</Text></View> : null}
        <View><AppText variant="h3" accessibilityRole="header">Specifications</AppText>{item.specs?.length ? item.specs.map((spec) => <SpecRow key={spec.label} label={spec.label} value={spec.value} />) : item.attributes?.length ? item.attributes.map((attribute) => <SpecRow key={attribute.name} label={attribute.name} value={attribute.value} />) : <Text style={[type.small, { color: tokens.mutedForeground, marginTop: 8 }]}>Specifications are not available for this product.</Text>}</View>
        <View style={{ gap: 12 }}>
          <AppText variant="h3" accessibilityRole="header">Reviews ({item.ratingCount})</AppText>
          {item.ratingBreakdown ? <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
            <View style={{ alignItems: 'center', minWidth: 64 }}><Text style={[type.h1, { color: tokens.foreground, fontVariant: ['tabular-nums'] }]}>{item.rating}</Text><Text style={[type.caption, { color: tokens.mutedForeground }]}>of 5</Text></View>
            <View style={{ flex: 1, gap: 4 }}>{([5, 4, 3, 2, 1] as const).map((score) => <RatingBar key={score} score={score} count={item.ratingBreakdown?.[score] ?? 0} total={item.ratingCount} />)}</View>
          </View> : null}
          {item.reviews?.length ? <View>{item.reviews.map((review, index, list) => <View key={review.id} style={{ gap: 4, paddingVertical: 12, borderBottomWidth: index < list.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: tokens.border }}>
            <View accessibilityLabel={`${review.rating} out of 5 stars`} style={{ flexDirection: 'row', gap: 2 }}>{[1, 2, 3, 4, 5].map((star) => <Icon key={star} name="Star" size={14} color={star <= review.rating ? tokens.foreground : tokens.border} fill={star <= review.rating ? tokens.foreground : 'transparent'} />)}</View>
            {review.title ? <Text style={[type.body, { color: tokens.foreground, fontWeight: '600' }]}>{review.title}</Text> : null}
            <Text style={[type.body, { color: tokens.foreground }]}>{review.body}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Text style={[type.caption, { color: tokens.mutedForeground }]}>{review.displayName}</Text>{review.verifiedPurchase ? <><Icon name="BadgeCheck" size={14} color={tokens.success} /><Text style={[type.caption, { color: tokens.success }]}>Verified purchase</Text></> : null}</View>
          </View>)}</View> : <Text style={[type.small, { color: tokens.mutedForeground }]}>No written reviews yet.</Text>}
        </View>
      </> : <EmptyState icon="PackageSearch" title="Product not found" action={<Button title="Back to search" onPress={() => router.replace('/search')} />} />}
    </View>
    </ScrollView>
    {item ? <View onLayout={(event) => setBarHeight(event.nativeEvent.layout.height)}><ProductPurchaseBar variants={variants} selectedId={variant?.id} loading={add.isPending} error={add.isError ? getErrorMessage(add.error) : undefined} onSelect={(option) => setSelectedVariant(option.id)} onAdd={addToCart} /></View> : null}
    <Modal visible={zoomVisible} transparent animationType="fade" onRequestClose={closeZoom}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, backgroundColor: tokens.background }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close image" onPress={closeZoom} style={{ position: 'absolute', top: 48, right: 16, width: touchTarget, height: touchTarget, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.muted }}><Icon name="X" size={22} color={tokens.foreground} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={zoomed ? 'Zoom out product image' : 'Zoom product image'} onPress={() => setZoomed((value) => !value)} style={{ width: zoomSize, height: zoomSize, transform: [{ scale: zoomed ? 1.7 : 1 }] }}><CatalogImage uri={images[imageIndex] ?? ''} size={zoomSize} /></Pressable>
        <AppText variant="small" tone="muted">Tap the image to {zoomed ? 'zoom out' : 'zoom in'}</AppText>
      </View>
    </Modal>
    <ToastAbove offset={barHeight} visible={toast} message="Added to cart" actionLabel="View cart" onAction={() => router.push('/(tabs)/cart')} onDismiss={() => setToast(false)} />
  </Screen>;
}

function SpecRow({ label, value }: { label: string; value: string }) {
  const tokens = useTokens();
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.border }}><Text style={[type.small, { flex: 1, color: tokens.mutedForeground }]}>{label}</Text><Text style={[type.small, { flex: 1, color: tokens.foreground, textAlign: 'right' }]}>{value}</Text></View>;
}

function RatingBar({ score, count, total }: { score: number; count: number; total: number }) {
  const tokens = useTokens();
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return <View accessibilityLabel={`${score} stars: ${count}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={[type.caption, { width: 12, color: tokens.mutedForeground, fontVariant: ['tabular-nums'] }]}>{score}</Text><View style={{ flex: 1, height: 6, borderRadius: radius.full, overflow: 'hidden', backgroundColor: tokens.muted }}><View style={{ width: `${percent}%`, height: '100%', backgroundColor: tokens.primary }} /></View><Text style={[type.caption, { width: 32, color: tokens.mutedForeground, textAlign: 'right', fontVariant: ['tabular-nums'] }]}>{count}</Text></View>;
}

// ---------------------------------------------------------------------------------------------------------------
// M-14 Shop

export function ShopScreen() {
  const { slug: rawSlug } = useLocalSearchParams<{ slug: string }>();
  const slug = queryParams(rawSlug);
  const router = useRouter();
  const tokens = useTokens();
  const seller = useSeller(slug);
  const products = useProducts({ sellerSlug: slug, size: 12 }, Boolean(slug));
  const categories = useCategories();
  const data = seller.data;
  return <Screen refreshing={seller.isRefetching || products.isRefetching} onRefresh={() => { void seller.refetch(); void products.refetch(); }}>
    <View style={contentStyle}><AppHeader title={data?.name ?? 'Shop'} onBack={() => router.back()} />
      {seller.isLoading ? <><Skeleton height={140} style={{ borderRadius: radius.lg }} /><Skeleton width="60%" height={24} /><ProductSkeletons count={4} /></> : seller.isError ? <ErrorState message={getErrorMessage(seller.error)} retry={() => void seller.refetch()} /> : data ? <>
        <View style={{ gap: 12 }}>
          {data.bannerUrl ? <Image source={{ uri: data.bannerUrl }} accessibilityIgnoresInvertColors style={{ width: '100%', aspectRatio: 2.4, borderRadius: radius.lg, backgroundColor: tokens.muted }} resizeMode="cover" /> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: radius.full, backgroundColor: withAlpha(tokens.primary, 0.1), alignItems: 'center', justifyContent: 'center' }}><Icon name="Store" size={24} color={tokens.primary} /></View>
            <View style={{ flex: 1, minWidth: 0 }}><AppText variant="h2" numberOfLines={2}>{data.name}</AppText><Text style={[type.small, { color: tokens.mutedForeground }]}>{data.location}</Text></View>
          </View>
          {data.description ? <Text style={[type.body, { color: tokens.foreground }]}>{data.description}</Text> : null}
          <View style={{ flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: tokens.border, paddingVertical: 10 }}>
            <ShopStat label="Products" value={String(data.productCount)} />
            <ShopStat label="Response rate" value={`${data.responseRate}%`} />
            <ShopStat label="Rating" value={String(data.rating)} />
          </View>
        </View>
        {categories.data?.length ? <View><SectionTitle title="Shop categories" /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{categories.data.filter((category) => !category.parentId).map((category) => <CategoryChip key={category.id} label={category.name} onPress={() => router.push({ pathname: '/search', params: { sellerSlug: slug, category: category.slug } })} />)}</ScrollView></View> : null}
        <View><SectionTitle title="Products" />{products.isLoading ? <ProductSkeletons count={4} /> : products.isError ? <ErrorState message={getErrorMessage(products.error)} retry={() => void products.refetch()} /> : products.data?.pages[0]?.content.length ? <ProductGrid products={products.data.pages.flatMap((page) => page.content)} /> : <EmptyState icon="PackageSearch" title="No live products yet" description="This shop has not published any products." />}</View>
      </> : <EmptyState icon="Store" title="Shop not found" action={<Button title="Browse products" onPress={() => router.replace('/search')} />} />}
    </View>
  </Screen>;
}

function ShopStat({ label, value }: { label: string; value: string }) {
  const tokens = useTokens();
  return <View style={{ flex: 1, alignItems: 'center', gap: 2 }}><Text style={[type.h3, { color: tokens.foreground, fontVariant: ['tabular-nums'] }]}>{value}</Text><Text style={[type.caption, { color: tokens.mutedForeground }]}>{label}</Text></View>;
}

// ---------------------------------------------------------------------------------------------------------------
// M-15 Cart

export function CartScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const auth = useAuth();
  const cart = useCart(auth.authenticated);
  const recommendations = useProducts({ sort: 'best_selling', size: 4 }, auth.authenticated && !cart.isLoading && !cart.data?.groups.length);
  const update = useUpdateCartItem();
  const remove = useDeleteCartItem();
  const [pendingDelete, setPendingDelete] = useState<CartItem | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [barHeight, setBarHeight] = useState(88);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleGroups = useMemo(() => cart.data?.groups.map((group) => ({ ...group, items: group.items.filter((item) => item.id !== pendingDelete?.id) })).filter((group) => group.items.length) ?? [], [cart.data, pendingDelete]);
  const finalizeDelete = (item: CartItem) => {
    if (timer.current) clearTimeout(timer.current);
    setPendingDelete(null);
    remove.mutate(item.id, { onError: (error) => { setDeleteError(getErrorMessage(error)); void cart.refetch(); } });
  };
  const scheduleDelete = (item: CartItem) => {
    if (pendingDelete) finalizeDelete(pendingDelete);
    setDeleteError('');
    setPendingDelete(item);
    timer.current = setTimeout(() => finalizeDelete(item), 4000);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const updateSelection = async (target: CartSelectionTarget) => {
    const updates = cartSelectionUpdates(cart.data, target);
    try { for (const updateInput of updates) await update.mutateAsync(updateInput); }
    catch { await cart.refetch(); }
  };
  const checkout = () => {
    const selected = selectedCartItemIds(cart.data);
    if (selected.length) router.push({ pathname: '/checkout', params: { cartItemIds: JSON.stringify(selected) } });
  };
  const allSelected = Boolean(cart.data?.groups.length) && Boolean(cart.data?.groups.every((group) => group.items.every((item) => item.selected)));
  const hasItems = Boolean(cart.data?.groups.length);
  return <Screen refreshing={cart.isRefetching} onRefresh={() => void cart.refetch()}>
    <View style={[contentStyle, { paddingBottom: hasItems ? barHeight + 24 : 32 }]}>
      <AppHeader title="Cart" right={hasItems ? <Pressable accessibilityRole="checkbox" accessibilityLabel="Select all items" accessibilityState={{ checked: allSelected, disabled: update.isPending }} disabled={update.isPending} onPress={() => void updateSelection({ type: 'all' })} style={({ pressed }) => ({ minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, marginRight: -8, borderRadius: radius.md, backgroundColor: pressed ? tokens.muted : 'transparent' })}><SelectMark kind="checkbox" selected={allSelected} /><Text style={[type.small, { color: tokens.foreground }]}>All</Text></Pressable> : undefined} />
      {cart.isLoading ? <>{[0, 1, 2].map((index) => <View key={index} style={{ flexDirection: 'row', gap: 12 }}><Skeleton width={72} height={72} style={{ borderRadius: radius.lg }} /><View style={{ flex: 1, gap: 8 }}><Skeleton height={14} /><Skeleton width="40%" height={14} /><Skeleton width="50%" height={18} /></View></View>)}</> : cart.isError ? <ErrorState message={getErrorMessage(cart.error)} retry={() => void cart.refetch()} /> : !hasItems ? <>
        <EmptyState icon="ShoppingCart" title="Your cart is empty" description="Add products to compare options and check out." action={<Button title="Explore products" onPress={() => router.push('/search')} />} />
        {recommendations.isLoading ? <ProductSkeletons count={2} /> : recommendations.data?.pages[0]?.content.length ? <View><SectionTitle title="Popular products" /><ProductGrid products={recommendations.data.pages[0].content} /></View> : null}
      </> : <>
        {visibleGroups.map((group) => {
          const groupSelected = group.items.length > 0 && group.items.every((item) => item.selected);
          return <View key={group.seller.id}>
            <Pressable accessibilityRole="checkbox" accessibilityLabel={`Select all from ${group.seller.name}`} accessibilityState={{ checked: groupSelected, disabled: update.isPending }} disabled={update.isPending} onPress={() => void updateSelection({ type: 'seller', sellerId: group.seller.id })}
              style={({ pressed }) => ({ minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.border, backgroundColor: pressed ? tokens.muted : 'transparent' })}>
              <SelectMark kind="checkbox" selected={groupSelected} /><Icon name="Store" size={18} color={tokens.mutedForeground} /><Text numberOfLines={1} style={[type.body, { color: tokens.foreground, fontWeight: '600', flex: 1 }]}>{group.seller.name}</Text>
            </Pressable>
            {group.items.map((item, index) => <CartRow key={item.id} item={item} divider={index < group.items.length - 1} onRemove={() => scheduleDelete(item)} onQuantity={(quantity) => update.mutate({ id: item.id, quantity })} onSelect={() => void updateSelection({ type: 'item', itemId: item.id })} />)}
          </View>;
        })}
        {deleteError || update.isError ? <Notice tone="destructive">{deleteError || getErrorMessage(update.error)}</Notice> : null}
      </>}
    </View>
    {hasItems && cart.data ? <StickyBar onHeight={setBarHeight}>
      <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={[type.caption, { color: tokens.mutedForeground }]}>Total · {cart.data.selectedCount} item{cart.data.selectedCount === 1 ? '' : 's'}</Text><Money amount={cart.data.selectedSubtotal} size="h3" /></View>
      <Button title="Check out" onPress={checkout} disabled={!cart.data.selectedCount || update.isPending} />
    </StickyBar> : null}
    <ToastAbove offset={hasItems ? barHeight : 0} visible={Boolean(pendingDelete)} message={`${pendingDelete?.name ?? 'Item'} removed`} actionLabel="Undo" onAction={() => { if (timer.current) clearTimeout(timer.current); setPendingDelete(null); }} onDismiss={() => { if (pendingDelete) finalizeDelete(pendingDelete); }} />
  </Screen>;
}

function CartRow({ item, divider, onRemove, onQuantity, onSelect }: { item: CartItem; divider: boolean; onRemove: () => void; onQuantity: (quantity: number) => void; onSelect: () => void }) {
  const tokens = useTokens();
  const [deleteRevealed, setDeleteRevealed] = useState(false);
  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 16 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderRelease: (_, gesture) => { if (gesture.dx < -60) setDeleteRevealed(true); else if (gesture.dx > 30) setDeleteRevealed(false); },
  }), []);
  return <View {...responder.panHandlers} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12, borderBottomWidth: divider ? StyleSheet.hairlineWidth : 0, borderBottomColor: tokens.border }}>
    <Pressable accessibilityRole="checkbox" accessibilityLabel={`Select ${item.name}`} accessibilityState={{ checked: item.selected }} onPress={onSelect} style={{ width: 32, height: 72, justifyContent: 'center' }}><SelectMark kind="checkbox" selected={item.selected} /></Pressable>
    <CatalogImage uri={item.imageUrl} size={72} />
    <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
      <Text numberOfLines={2} style={[type.small, { color: tokens.foreground }]}>{item.name}</Text>
      {item.variantLabel ? <Text numberOfLines={1} style={[type.caption, { color: tokens.mutedForeground }]}>{item.variantLabel}</Text> : null}
      <Money amount={item.unitPrice} size="body" />
      {!item.available ? <Notice tone="destructive">No longer available</Notice> : item.quantity > item.maxQuantity ? <Notice tone="destructive">Only {item.maxQuantity} left</Notice> : item.priceChangedFrom ? <Notice tone="warning">Price changed since you added it</Notice> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <QuantityStepper value={item.quantity} max={Math.max(item.maxQuantity, 1)} onChange={onQuantity} />
        {deleteRevealed ? <Button title="Delete" variant="destructive" onPress={onRemove} /> : <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.name}`} accessibilityHint="Swipe left on the row to remove as well" onPress={onRemove} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? tokens.muted : 'transparent' })}><Icon name="Trash" size={20} color={tokens.mutedForeground} /></Pressable>}
      </View>
    </View>
  </View>;
}

// ---------------------------------------------------------------------------------------------------------------
// M-16 Checkout

export function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ cartItemIds?: string | string[] }>();
  const tokens = useTokens();
  const auth = useAuth();
  const cart = useCart(auth.authenticated);
  const addresses = useAddresses(auth.authenticated);
  const createAddress = useCreateAddress();
  const quote = useQuote();
  const checkout = useCheckout();
  const [addressId, setAddressId] = useState('');
  const [shippingOptionIds, setShippingOptionIds] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'VIETQR' | null>(null);
  const [voucherCode, setVoucherCode] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [addressSheet, setAddressSheet] = useState(false);
  const [addressDraft, setAddressDraft] = useState({ recipient: '', phone: '', address: '' });
  const [addressError, setAddressError] = useState('');
  const [barHeight, setBarHeight] = useState(88);
  const idempotency = useRef({ fingerprint: '', key: '' });
  const rawIds = queryParams(params.cartItemIds);
  const routeIds = useMemo(() => { try { const parsed = JSON.parse(rawIds); return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []; } catch { return []; } }, [rawIds]);
  const cartIds = selectedCartItemIds(cart.data);
  const ids = routeIds.length ? routeIds : cartIds;
  const idsFingerprint = ids.slice().sort().join(',');
  const stableIds = useMemo(() => idsFingerprint ? idsFingerprint.split(',') : [], [idsFingerprint]);
  const defaultAddressId = addresses.data?.find((address) => address.isDefault)?.id ?? addresses.data?.[0]?.id ?? '';
  const selectedAddressId = addressId || defaultAddressId;
  const defaultShippingIds = useMemo(() => quote.data?.groups.reduce<Record<string, string>>((result, group) => { result[group.seller.id] = group.selectedShippingOptionId; return result; }, {}) ?? {}, [quote.data]);
  const effectiveShippingIds = useMemo(() => Object.keys(shippingOptionIds).length ? shippingOptionIds : defaultShippingIds, [shippingOptionIds, defaultShippingIds]);
  const mutateQuote = quote.mutate;
  const quoteResult = quote.data as CheckoutQuote | undefined;
  useEffect(() => {
    if (stableIds.length && selectedAddressId) mutateQuote({ cartItemIds: stableIds, addressId: selectedAddressId, ...(Object.keys(shippingOptionIds).length ? { shippingOptionIds } : {}), ...(voucherCode.trim() ? { voucherCode: voucherCode.trim() } : {}) });
  }, [stableIds, selectedAddressId, shippingOptionIds, voucherCode, mutateQuote]);
  const walletEnough = Boolean(quoteResult && new BigJs(quoteResult.walletAvailable).gte(quoteResult.total));
  const selectedPaymentMethod = paymentMethod ?? (walletEnough ? 'WALLET' : 'VIETQR');
  const addNewAddress = () => {
    setAddressError('');
    createAddress.mutate(addressDraft, { onSuccess: (address) => { setAddressSheet(false); setAddressId(address.id); setAddressDraft({ recipient: '', phone: '', address: '' }); }, onError: (error) => setAddressError(getErrorMessage(error)) });
  };
  const placeOrder = () => {
    if (!quoteResult || !selectedAddressId || !stableIds.length) return;
    const input = { cartItemIds: stableIds, addressId: selectedAddressId, shippingOptionIds: effectiveShippingIds, paymentMethod: selectedPaymentMethod, notes };
    idempotency.current = checkoutRequestKey(idempotency.current, input, createIdempotencyKey);
    checkout.mutate({ input, idempotencyKey: idempotency.current.key }, { onSuccess: (result) => router.push({ pathname: '/pay/[intentId]', params: { intentId: result.paymentIntent.id, parentOrderId: result.parentOrderId, orderNumber: result.orderNumber, total: result.paymentIntent.amount, sellerOrders: JSON.stringify(result.sellerOrders) } }) });
  };
  const selectedAddress = addresses.data?.find((address) => address.id === selectedAddressId);
  const canPlace = Boolean(quoteResult) && Boolean(selectedAddressId) && stableIds.length > 0 && !quote.isPending && !quote.isError && Boolean(quoteResult?.groups.length) && !quoteResult?.groups.some((group) => !effectiveShippingIds[group.seller.id]);
  return <Screen>
    <View style={[contentStyle, { paddingBottom: quoteResult ? barHeight + 24 : 32 }]}><AppHeader title="Checkout" onBack={() => router.back()} />
      {cart.isLoading || addresses.isLoading ? <><Skeleton height={80} style={{ borderRadius: radius.lg }} /><Skeleton height={160} /><Skeleton height={200} /></> : cart.isError || addresses.isError ? <ErrorState message={getErrorMessage(cart.error ?? addresses.error)} retry={() => { void cart.refetch(); void addresses.refetch(); }} /> : !ids.length ? <EmptyState icon="ShoppingCart" title="No items selected" description="Return to your cart and select the items you want to buy." action={<Button title="Back to cart" onPress={() => router.replace('/(tabs)/cart')} />} /> : <>
        <View><SectionTitle title="Deliver to" />{selectedAddress ? <Pressable accessibilityRole="button" accessibilityLabel={`Change delivery address, currently ${selectedAddress.recipient}`} onPress={() => setAddressSheet(true)}>
          {({ pressed }) => <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: pressed ? tokens.muted : tokens.card }}>
            <Icon name="MapPin" size={22} color={tokens.primary} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}><Text style={[type.body, { color: tokens.foreground, fontWeight: '600' }]}>{selectedAddress.recipient} · {selectedAddress.phone}</Text><Text style={[type.small, { color: tokens.mutedForeground }]}>{selectedAddress.address}</Text></View>
            <Icon name="ChevronRight" size={20} color={tokens.mutedForeground} />
          </Card>}
        </Pressable> : <Button title="Add a delivery address" icon="MapPin" variant="secondary" onPress={() => setAddressSheet(true)} />}</View>
        {quote.isPending && !quoteResult ? <><Skeleton height={160} /><Skeleton height={120} /></> : quote.isError ? <ErrorState message={getErrorMessage(quote.error)} retry={() => mutateQuote({ cartItemIds: stableIds, addressId: selectedAddressId, ...(Object.keys(shippingOptionIds).length ? { shippingOptionIds } : {}), ...(voucherCode.trim() ? { voucherCode: voucherCode.trim() } : {}) })} /> : quoteResult ? <>
          {quoteResult.groups.map((group) => <View key={group.seller.id} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 }}><Icon name="Store" size={18} color={tokens.mutedForeground} /><AppText variant="h3" numberOfLines={1} style={{ flex: 1 }}>{group.seller.name}</AppText></View>
            {group.items.map((item) => <View key={item.id} style={{ flexDirection: 'row', gap: 8 }}><Text numberOfLines={2} style={[type.small, { color: tokens.foreground, flex: 1 }]}>{item.name}</Text><Text style={[type.small, { color: tokens.mutedForeground, fontVariant: ['tabular-nums'] }]}>× {item.quantity}</Text></View>)}
            <Divider />
            <AppText variant="caption" tone="muted">Delivery</AppText>
            <View>{group.shippingOptions.map((option) => <OptionRow key={option.id} selected={effectiveShippingIds[group.seller.id] === option.id} label={option.name} detail={`${option.etaDays} day${option.etaDays === 1 ? '' : 's'}`} onPress={() => setShippingOptionIds((current) => ({ ...current, [group.seller.id]: option.id }))} trailing={<Money amount={option.fee} size="small" />} />)}</View>
            <TextField label="Note to seller (optional)" value={notes[group.seller.id] ?? ''} onChangeText={(value) => setNotes((current) => ({ ...current, [group.seller.id]: value }))} placeholder="Delivery instructions…" />
          </View>)}
          <TextField label="Voucher code" value={voucherCode} onChangeText={setVoucherCode} placeholder="Enter a code" autoCapitalize="characters" />
          <View style={{ gap: 8 }}><SectionTitle title="Pay with" />{(['WALLET', 'VIETQR'] as const).map((method) => {
            const enough = method !== 'WALLET' || walletEnough;
            const checked = selectedPaymentMethod === method;
            return <Pressable key={method} accessibilityRole="radio" accessibilityLabel={method === 'WALLET' ? 'Wallet' : 'VietQR'} accessibilityState={{ checked, disabled: !enough }} disabled={!enough} onPress={() => setPaymentMethod(method)}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: checked ? 2 : StyleSheet.hairlineWidth, borderColor: checked ? tokens.primary : tokens.border, padding: checked ? 15 : 16, opacity: enough ? 1 : 0.6 }}>
                <Icon name={method === 'WALLET' ? 'Wallet' : 'QrCode'} size={24} color={checked ? tokens.primary : tokens.mutedForeground} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={[type.body, { color: tokens.foreground, fontWeight: '600' }]}>{method === 'WALLET' ? 'Wallet' : 'VietQR bank transfer'}</Text>
                  {method === 'WALLET' ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Text style={[type.small, { color: tokens.mutedForeground }]}>Available</Text><Money amount={quoteResult.walletAvailable} size="small" tone="muted" /></View> : <Text style={[type.small, { color: tokens.mutedForeground }]}>Pay from your banking app</Text>}
                  {!enough ? <Notice tone="warning">Not enough balance for this order</Notice> : null}
                </View>
                <SelectMark selected={checked} />
              </Card>
            </Pressable>;
          })}{!walletEnough ? <Button title="Top up wallet" icon="Plus" variant="ghost" onPress={() => router.push('/wallet/top-up')} /> : null}</View>
          <View>
            <SectionTitle title="Summary" />
            <SummaryLine label="Items" value={quoteResult.itemsTotal} />
            <SummaryLine label="Delivery" value={quoteResult.shippingTotal} />
            {new BigJs(quoteResult.discount).gt(0) ? <SummaryLine label="Discount" value={quoteResult.discount} discount /> : null}
            <View style={{ marginTop: 8, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tokens.border, gap: 2 }}>
              <AppText variant="small" tone="muted">Total to pay</AppText>
              <Money amount={quoteResult.total} size="display" style={{ textAlign: 'right' }} />
            </View>
            {quoteResult.warnings.length ? <View style={{ gap: 4, marginTop: 8 }}>{quoteResult.warnings.map((warning, index) => <Notice key={index} tone="warning">{warning}</Notice>)}</View> : null}
          </View>
        </> : selectedAddressId ? <Skeleton height={220} /> : <AppText variant="small" tone="muted">Add a delivery address to see delivery options and your total.</AppText>}
        {checkout.isError ? <Notice tone="destructive">{getErrorMessage(checkout.error)}</Notice> : null}
      </>}
    </View>
    {quoteResult ? <StickyBar onHeight={setBarHeight}>
      <View style={{ flex: 1, minWidth: 0 }}><Text style={[type.caption, { color: tokens.mutedForeground }]}>Total</Text><Money amount={quoteResult.total} size="h3" /></View>
      <Button title="Place order" loading={checkout.isPending || quote.isPending} disabled={!canPlace} onPress={placeOrder} />
    </StickyBar> : null}
    <BottomSheet visible={addressSheet} title="Delivery address" onClose={() => setAddressSheet(false)}>
      {addresses.data?.length ? <View>{addresses.data.map((address) => <OptionRow key={address.id} selected={address.id === selectedAddressId} label={`${address.recipient} · ${address.phone}`} detail={address.address} onPress={() => { setAddressId(address.id); setAddressSheet(false); }} />)}</View> : null}
      <AppText variant="small" style={{ fontWeight: '600' }}>Add a new address</AppText>
      <TextField label="Recipient" value={addressDraft.recipient} onChangeText={(recipient) => setAddressDraft((current) => ({ ...current, recipient }))} autoComplete="name" />
      <TextField label="Phone" value={addressDraft.phone} onChangeText={(phone) => setAddressDraft((current) => ({ ...current, phone }))} keyboardType="phone-pad" autoComplete="tel" />
      <TextField label="Address" value={addressDraft.address} onChangeText={(address) => setAddressDraft((current) => ({ ...current, address }))} autoComplete="street-address" />
      {addressError ? <Notice tone="destructive">{addressError}</Notice> : null}
      <Button title="Save address" loading={createAddress.isPending} onPress={addNewAddress} disabled={!addressDraft.recipient || !addressDraft.phone || !addressDraft.address} />
    </BottomSheet>
  </Screen>;
}

function SummaryLine({ label, value, discount = false }: { label: string; value: string; discount?: boolean }) {
  const tokens = useTokens();
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 6 }}><Text style={[type.body, { color: tokens.mutedForeground, flexShrink: 1 }]}>{label}</Text><Money amount={value} size="body" direction={discount ? 'out' : undefined} /></View>;
}

// ---------------------------------------------------------------------------------------------------------------
// M-17 Pay

export function PaymentScreen() {
  const params = useLocalSearchParams<{ intentId?: string; parentOrderId?: string; orderNumber?: string; total?: string; sellerOrders?: string }>();
  const intentId = queryParams(params.intentId);
  const router = useRouter();
  const tokens = useTokens();
  const intentQuery = usePaymentIntent(intentId);
  const cancel = useCancelPayment();
  const confirm = useConfirmPayment();
  const simulate = useSimulatePayment();
  const retry = useRetryPayment();
  const [otp, setOtp] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const routed = useRef(false);
  const paymentRequestKey = useRef({ fingerprint: '', key: '' });
  const intent = intentQuery.data;
  const terminal = intent ? isPaymentTerminal(intent.status) : false;
  const intentIdForTimer = intent?.id;
  const expiryForTimer = intent?.expiresAt;
  const [seconds, setSeconds] = useState(900);
  useEffect(() => {
    if (!intent || intent.status !== 'SUCCEEDED' || routed.current) return;
    routed.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace({ pathname: '/order-success', params: { parentOrderId: intent.parentOrderId, orderNumber: intent.orderNumber, total: intent.amount, sellerOrders: queryParams(params.sellerOrders) } });
  }, [intent, params.sellerOrders, router]);
  useEffect(() => {
    if (!expiryForTimer || terminal) return;
    const interval = setInterval(() => setSeconds(Math.max(0, Math.floor((new Date(expiryForTimer).getTime() - Date.now()) / 1000))), 1000);
    return () => clearInterval(interval);
  }, [intentIdForTimer, expiryForTimer, terminal]);
  const copyReference = async () => { if (!intent?.reference) return; await Clipboard.setStringAsync(intent.reference); setCopied(true); };
  const retryWithOtherMethod = () => {
    if (!intent) return;
    const paymentMethod = intent.method === 'WALLET' ? 'VIETQR' : 'WALLET';
    setError('');
    const fingerprint = `${intent.parentOrderId}:${paymentMethod}`;
    if (paymentRequestKey.current.fingerprint !== fingerprint) paymentRequestKey.current = { fingerprint, key: createIdempotencyKey() };
    retry.mutate({ parentOrderId: intent.parentOrderId, paymentMethod, idempotencyKey: paymentRequestKey.current.key }, { onSuccess: (next) => router.replace({ pathname: '/pay/[intentId]', params: { intentId: next.id, parentOrderId: next.parentOrderId, orderNumber: next.orderNumber, total: next.amount, sellerOrders: queryParams(params.sellerOrders) } }), onError: (failure) => setError(getErrorMessage(failure)) });
  };
  const submitOtp = (code = otp) => {
    if (!intent?.otpId || code.length !== 6 || confirm.isPending) return;
    setError('');
    const fingerprint = `${intent.id}:${intent.otpId}:${code}`;
    if (paymentRequestKey.current.fingerprint !== fingerprint) paymentRequestKey.current = { fingerprint, key: createIdempotencyKey() };
    confirm.mutate({ id: intent.id, otpId: intent.otpId, code, idempotencyKey: paymentRequestKey.current.key }, { onError: (failure) => setError(getErrorMessage(failure)) });
  };
  const simulateTransfer = (outcome: 'SUCCEEDED' | 'FAILED') => {
    if (!intent) return;
    simulate.mutate({ id: intent.id, outcome }, { onError: (failure) => setError(getErrorMessage(failure)) });
  };
  const cancelPayment = () => {
    if (!intent) return;
    setError('');
    cancel.mutate(intent.id, { onError: (failure) => setError(getErrorMessage(failure)) });
  };
  const countdown = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  return <Screen>
    <View style={contentStyle}><AppHeader title="Payment" onBack={() => router.back()} />
      {intentQuery.isLoading ? <><Skeleton width="40%" height={16} /><Skeleton width="70%" height={38} /><Skeleton height={220} style={{ borderRadius: radius.lg }} /></> : intentQuery.isError ? <ErrorState message={getErrorMessage(intentQuery.error)} retry={() => void intentQuery.refetch()} /> : intent ? <>
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={[type.small, { color: tokens.mutedForeground }]}>Order</Text><MonoText selectable>{intent.orderNumber}</MonoText></View>
          <Money amount={intent.amount} size="display" />
          <StatusBadge status={intent.status} />
        </View>
        {intent.status === 'REQUIRES_ACTION' && intent.otpRequired ? <Card style={{ gap: 16 }}>
          <View style={{ gap: 4 }}><AppText variant="h3">Confirm with your wallet code</AppText><AppText variant="small" tone="muted">Enter the 6-digit code we sent to your phone.</AppText></View>
          <OtpInput value={otp} onChange={setOtp} onComplete={(code) => submitOtp(code)} error={Boolean(error)} disabled={confirm.isPending} accessibilityLabel="6-digit wallet code" />
          {__DEV__ ? <Pressable accessibilityRole="button" accessibilityLabel={`Fill dev code ${DEV_OTP}`} onPress={() => { setOtp(DEV_OTP); submitOtp(DEV_OTP); }} style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: radius.full, borderWidth: 1, borderStyle: 'dashed', borderColor: tokens.input, backgroundColor: pressed ? tokens.muted : 'transparent' })}>
            <Text style={[type.small, { color: tokens.mutedForeground }]}>Dev code</Text><MonoText muted={false}>{DEV_OTP}</MonoText><Text style={[type.small, { color: tokens.primary, fontWeight: '600' }]}>Fill</Text>
          </Pressable> : null}
          <Button title="Confirm payment" loading={confirm.isPending} disabled={otp.length !== 6} onPress={() => submitOtp()} />
        </Card> : intent.method === 'VIETQR' && !terminal ? <Card style={{ alignItems: 'center', gap: 16 }}>
          <AppText variant="h3">Scan with your banking app</AppText>
          {/* QR stays dark-on-light in both themes: many bank scanners reject inverted codes. */}
          {intent.qrPayload ? <View accessible accessibilityLabel="VietQR payment code" style={{ padding: 12, borderRadius: radius.md, backgroundColor: lightTokens.surfaceRaised }}><QRCode value={intent.qrPayload} size={200} color={lightTokens.foreground} backgroundColor={lightTokens.surfaceRaised} /></View> : <Skeleton width={224} height={224} style={{ borderRadius: radius.md }} />}
          <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tokens.border }}>
            <View style={{ flex: 1, minWidth: 0 }}><Text style={[type.caption, { color: tokens.mutedForeground }]}>Transfer reference</Text><Text selectable style={[type.body, { color: tokens.foreground, fontFamily: fontFamily.mono }]}>{intent.reference ?? intent.orderNumber}</Text></View>
            <Button title={copied ? 'Copied' : 'Copy'} icon={copied ? 'Check' : 'Copy'} variant="secondary" accessibilityLabel={copied ? 'Reference copied' : 'Copy reference'} onPress={copyReference} />
          </View>
          <View accessibilityLabel={`Time remaining ${countdown}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="Timer" size={16} color={seconds < 60 ? tokens.warning : tokens.mutedForeground} /><Text style={[type.small, { color: seconds < 60 ? tokens.warning : tokens.mutedForeground, fontVariant: ['tabular-nums'] }]}>Expires in {countdown}</Text></View>
          {__DEV__ ? <Button title="Simulate bank transfer (dev)" variant="ghost" onPress={() => simulateTransfer('SUCCEEDED')} loading={simulate.isPending} /> : null}
        </Card> : intent.status === 'PROCESSING' || intent.status === 'CREATED' ? <Card style={{ alignItems: 'center', gap: 12 }}>
          <ActivityIndicator color={tokens.primary} /><AppText variant="body">Waiting for payment confirmation…</AppText>
          {__DEV__ ? <Button title="Simulate bank transfer (dev)" variant="ghost" onPress={() => simulateTransfer('SUCCEEDED')} loading={simulate.isPending} /> : null}
        </Card> : null}
        {intent.status === 'FAILED' || intent.status === 'CANCELLED' ? <View style={{ gap: 12 }}>
          <View style={{ gap: 4 }}><AppText variant="h3">Payment not completed</AppText><AppText variant="small" tone="muted">{intent.failureReason ?? 'Your order stays reserved while the payment window is open.'}</AppText></View>
          <Button title={`Try ${intent.method === 'WALLET' ? 'VietQR' : 'Wallet'} instead`} onPress={retryWithOtherMethod} loading={retry.isPending} />
        </View> : null}
        {intent.status === 'EXPIRED' ? <View style={{ gap: 12 }}>
          <View style={{ gap: 4 }}><AppText variant="h3">Payment window expired</AppText><AppText variant="small" tone="muted">The reservation has ended. Return to your cart to place a new order.</AppText></View>
          <Button title="Continue shopping" onPress={() => router.replace('/search')} />
        </View> : null}
        {error ? <Notice tone="destructive">{error}</Notice> : null}
        {!terminal ? <Button title="Cancel payment" variant="ghost" onPress={cancelPayment} loading={cancel.isPending} /> : null}
      </> : <EmptyState icon="Wallet" title="Payment not found" action={<Button title="Return to cart" onPress={() => router.replace('/(tabs)/cart')} />} />}
    </View>
  </Screen>;
}

// ---------------------------------------------------------------------------------------------------------------
// M-18 Order success — the one orchestrated motion moment (check draws in once, 400 ms; cross-fade on reduce motion)

interface SuccessSellerOrder { id: string; orderNumber: string; seller: { name: string }; total: string }

function SuccessMark() {
  const tokens = useTokens();
  const reducedMotion = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' });
    animation.start();
    return () => animation.stop();
  }, [progress]);
  const scale = reducedMotion ? 1 : progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  return <Animated.View accessible accessibilityRole="image" accessibilityLabel="Payment complete" style={{ alignSelf: 'center', width: 80, height: 80, borderRadius: radius.full, backgroundColor: withAlpha(tokens.success, 0.12), alignItems: 'center', justifyContent: 'center', opacity: progress, transform: [{ scale }] }}>
    <Icon name="Check" size={40} strokeWidth={2.5} color={tokens.success} />
  </Animated.View>;
}

export function OrderSuccessScreen() {
  const params = useLocalSearchParams<{ parentOrderId?: string; orderNumber?: string; total?: string; sellerOrders?: string }>();
  const router = useRouter();
  const tokens = useTokens();
  const parentOrderId = queryParams(params.parentOrderId);
  const parsed = useMemo(() => {
    try { return JSON.parse(queryParams(params.sellerOrders)) as SuccessSellerOrder[]; } catch { return []; }
  }, [params.sellerOrders]);
  const ordersQuery = useOrderList(!parsed.length && Boolean(parentOrderId));
  const sellerOrders = parsed.length ? parsed : (ordersQuery.data?.content.filter((order) => order.parentOrderId === parentOrderId).map((order) => ({ id: order.id, orderNumber: order.orderNumber, seller: order.seller, total: order.total })) ?? []);
  const orderNumber = queryParams(params.orderNumber);
  return <Screen>
    <View style={{ flex: 1, gap: 24 }}>
      <View style={{ alignItems: 'center', gap: 12, paddingTop: 32 }}>
        <SuccessMark />
        <AppText variant="h2" accessibilityRole="header" style={{ textAlign: 'center' }}>Order placed</AppText>
        {params.total ? <Money amount={queryParams(params.total)} size="display" /> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={[type.small, { color: tokens.mutedForeground }]}>{orderNumber ? 'Order' : 'Order confirmed'}</Text>{orderNumber ? <MonoText selectable>{orderNumber}</MonoText> : null}</View>
        <AppText variant="small" tone="muted" style={{ textAlign: 'center', maxWidth: 300 }}>Your money is held safely until you confirm delivery.</AppText>
      </View>
      {ordersQuery.isLoading && !sellerOrders.length ? <Skeleton height={90} /> : sellerOrders.length ? <View>
        <AppText variant="caption" tone="muted" style={{ marginBottom: 4 }}>{sellerOrders.length === 1 ? 'Your order' : `Split into ${sellerOrders.length} shop orders`}</AppText>
        {sellerOrders.map((order, index) => <Pressable key={order.id} accessibilityRole="button" accessibilityLabel={`Open order from ${order.seller.name}`} onPress={() => router.push(`/orders/${order.id}`)}
          style={({ pressed }) => ({ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: index === 0 ? StyleSheet.hairlineWidth : 0, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: tokens.border, backgroundColor: pressed ? tokens.muted : 'transparent' })}>
          <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={[type.body, { color: tokens.foreground, fontWeight: '500' }]}>{order.seller.name}</Text><MonoText selectable>{order.orderNumber}</MonoText></View>
          <Money amount={order.total} size="body" />
          <Icon name="ChevronRight" size={18} color={tokens.mutedForeground} />
        </Pressable>)}
      </View> : parentOrderId && ordersQuery.isError ? <ErrorState message={getErrorMessage(ordersQuery.error)} retry={() => void ordersQuery.refetch()} /> : null}
      <View style={{ flex: 1 }} />
      <View style={{ gap: 8, paddingBottom: 8 }}>
        <Button title="Continue shopping" onPress={() => router.replace('/')} />
        <Button title="Track order" variant="secondary" onPress={() => sellerOrders[0]?.id ? router.push(`/orders/${sellerOrders[0].id}`) : router.push({ pathname: '/orders', params: { parentOrderId } })} />
      </View>
    </View>
  </Screen>;
}

