import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import BigJs from 'big.js';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { AppHeader, BottomBar, BottomSheet, Button, CatalogImage, Divider, EmptyState, ErrorState, Icon, Money, Screen, SegmentedTabs, Skeleton, StatusBadge, useTokens } from '@/ui';
import { fontFamily, radius, type, withAlpha } from '@/theme/tokens';
import { formatDate, formatDateTime } from '@/lib/dates';
import { ApiError } from '@/lib/api';
import { useBuyAgain, useOrder, useOrderAction, useOrderCounts, useOrders } from './api';
import { initialOrderTab, orderHeadline, orderProgress, orderSubtotal, primaryOrderAction, statusLabel, terminalOrderStatuses, type ProgressStep } from './logic';
import type { OrderDetail, ShopperOrderTab } from '@web/features/commerce/types';

const tabs: { key: string; label: string; value?: ShopperOrderTab }[] = [
  { key: 'ALL', label: 'All' }, { key: 'TO_PAY', label: 'To pay', value: 'TO_PAY' },
  { key: 'TO_SHIP', label: 'To ship', value: 'TO_SHIP' }, { key: 'SHIPPING', label: 'Shipping', value: 'SHIPPING' },
  { key: 'DELIVERED', label: 'Delivered', value: 'DELIVERED' }, { key: 'RETURNS', label: 'Returns', value: 'RETURNS' },
  { key: 'CANCELLED', label: 'Cancelled', value: 'CANCELLED' },
];
const mono = { fontFamily: fontFamily.mono } as const;
const actionLabels = { PAY: 'Pay now', CONFIRM_RECEIVED: 'Confirm received', TRACK: 'Track order', BUY_AGAIN: 'Buy again' } as const;

export function OrdersScreen() {
  const router = useRouter();
  const colors = useTokens();
  const params = useLocalSearchParams<{ tab?: string }>();
  const tabParam = initialOrderTab(params.tab);
  const [selected, setSelected] = useState<string>(tabParam);
  // A new ?tab= (e.g. Me → "To ship" while this screen is still mounted) switches the tab (state adjusted during render).
  const [seenParam, setSeenParam] = useState(tabParam);
  if (seenParam !== tabParam) { setSeenParam(tabParam); setSelected(tabParam); }
  const tab = tabs.find((item) => item.key === selected)?.value;
  const orders = useOrders(tab);
  const counts = useOrderCounts(tabs.map((item) => item.value));
  const buyAgain = useBuyAgain();
  const rows = useMemo(() => orders.data?.pages.flatMap((page) => page.content) ?? [], [orders.data]);
  const unauthorized = orders.error instanceof ApiError && orders.error.status === 401;

  return <Screen scroll={false} style={{ padding: 0 }}>
    <View style={{ paddingHorizontal: 16 }}><AppHeader large title="My orders" onBack /></View>
    <FlatList
      data={rows}
      keyExtractor={(order) => order.id}
      contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
      ListHeaderComponent={<View style={{ paddingVertical: 12, gap: 12 }}>
        {!unauthorized ? <View style={{ paddingHorizontal: 16 }}><SegmentedTabs items={tabs.map((item, index) => ({ key: item.key, label: item.label, count: counts[index]?.data?.totalElements || undefined }))} selected={selected} onChange={setSelected} /></View> : null}
        {orders.isLoading ? <View style={{ paddingHorizontal: 16, gap: 16 }}><Skeleton height={120} /><Skeleton height={120} /><Skeleton height={120} /></View> : null}
        {orders.isError ? unauthorized
          ? <EmptyState icon="Package" title="Sign in to see your orders" description="Track deliveries and confirm receipt from here." action={<Button title="Sign in" onPress={() => router.push('/(auth)/login')} />} />
          : <View style={{ paddingHorizontal: 16 }}><ErrorState message="Could not load your orders." retry={() => void orders.refetch()} /></View> : null}
        {!orders.isLoading && !orders.isError && rows.length === 0 ? <EmptyState icon="Package" title={selected === 'ALL' ? 'No orders yet' : `Nothing in “${tabs.find((item) => item.key === selected)?.label}”`} description={selected === 'ALL' ? 'Orders you place show up here.' : undefined} action={selected === 'ALL' ? <Button title="Start shopping" onPress={() => router.push('/')} /> : <Button title="Show all orders" variant="secondary" onPress={() => setSelected('ALL')} />} /> : null}
      </View>}
      ItemSeparatorComponent={() => <Divider />}
      renderItem={({ item }) => {
        const action = primaryOrderAction(item);
        const first = item.itemsPreview[0];
        return <View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Order ${item.orderNumber} from ${item.seller.name}`} onPress={() => router.push(`/orders/${item.id}`)} style={({ pressed }) => ({ paddingHorizontal: 16, paddingTop: 16, paddingBottom: action ? 8 : 16, gap: 10, backgroundColor: pressed ? colors.muted : 'transparent' })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="Store" size={18} color={colors.mutedForeground} />
              <Text numberOfLines={1} style={[type.body, { color: colors.foreground, fontWeight: '600', flex: 1 }]}>{item.seller.name}</Text>
              <View style={{ flexShrink: 0 }}><StatusBadge status={item.status} /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <CatalogImage uri={first?.imageUrl ?? ''} size={56} />
              <View style={{ flex: 1, gap: 2 }}>
                {first ? <Text numberOfLines={1} style={[type.body, { color: colors.foreground }]}>{first.name}</Text> : null}
                <Text numberOfLines={1} style={[type.small, { color: colors.mutedForeground }]}>{first?.variantLabel ? `${first.variantLabel} · ` : ''}×{first?.quantity ?? item.itemCount}{item.itemsPreview.length > 1 ? `, +${item.itemsPreview.length - 1} more` : ''}</Text>
                <Text numberOfLines={1} style={[type.caption, { color: colors.mutedForeground }]}>{formatDate(item.createdAt)} · <Text style={mono}>{item.orderNumber}</Text></Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'baseline', gap: 8 }}>
              <Text style={[type.small, { color: colors.mutedForeground }]}>{item.itemCount} {item.itemCount === 1 ? 'item' : 'items'} · Total</Text>
              <Money amount={item.total} />
            </View>
          </Pressable>
          {action ? <View style={{ paddingHorizontal: 16, paddingBottom: 16, alignItems: 'flex-end' }}><Button
            title={actionLabels[action]}
            variant={action === 'PAY' || action === 'CONFIRM_RECEIVED' ? 'primary' : 'secondary'}
            loading={action === 'BUY_AGAIN' && buyAgain.isPending && buyAgain.variables === item.id}
            onPress={() => {
              if (action === 'PAY') router.push({ pathname: '/pay/[intentId]', params: { intentId: item.paymentIntentId, parentOrderId: item.parentOrderId, orderNumber: item.orderNumber, total: item.total } });
              else if (action === 'CONFIRM_RECEIVED' || action === 'TRACK') router.push(`/orders/${item.id}`);
              else buyAgain.mutate(item.id, { onSuccess: async ({ added, skipped }) => { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined); if (added) { Alert.alert('Added to cart', skipped ? `${added} added. ${skipped} unavailable items were skipped.` : `${added} items added.`); router.push('/(tabs)/cart'); } else Alert.alert('Items unavailable', 'These items are no longer sold.'); }, onError: () => Alert.alert('Could not add to cart', 'Try again from the order details.') });
            }}
          /></View> : null}
        </View>;
      }}
      onRefresh={() => void orders.refetch()}
      refreshing={orders.isRefetching && !orders.isFetchingNextPage}
      onEndReached={() => { if (orders.hasNextPage && !orders.isFetchingNextPage) void orders.fetchNextPage(); }}
      onEndReachedThreshold={0.4}
      ListFooterComponent={orders.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ padding: 16 }} /> : undefined}
    />
  </Screen>;
}

const reasonOptions = ['Changed my mind', 'Ordered by mistake', 'Found a better price', 'Delivery takes too long'];

function StepMarker({ state }: { state: ProgressStep['state'] }) {
  const colors = useTokens();
  if (state === 'failed') return <Icon name="CircleX" size={22} color={colors.destructive} />;
  if (state === 'upcoming') return <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 12, height: 12, borderRadius: radius.full, borderWidth: 2, borderColor: colors.border }} /></View>;
  if (state === 'current') return <View style={{ width: 22, height: 22, borderRadius: radius.full, backgroundColor: withAlpha(colors.primary, 0.16), alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 10, height: 10, borderRadius: radius.full, backgroundColor: colors.primary }} /></View>;
  return <Icon name="CircleCheck" size={22} color={colors.primary} />;
}

/** Vertical tracker: filled rail up to the latest step, the latest step bold with a halo, failures in destructive. */
function OrderStepper({ order }: { order: OrderDetail }) {
  const colors = useTokens();
  const steps = orderProgress(order);
  return <View accessibilityLabel={`Order progress: ${steps.filter((step) => step.state !== 'upcoming').map((step) => step.label).join(', ')}`}>
    {steps.map((step, index) => {
      const next = steps[index + 1];
      const railReached = next ? next.state !== 'upcoming' : false;
      const strong = step.state === 'current' || step.state === 'failed';
      return <View key={step.key} style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ width: 22, alignItems: 'center' }}>
          <StepMarker state={step.state} />
          {next ? <View style={{ width: 2, flex: 1, minHeight: 14, marginVertical: 2, borderRadius: radius.full, backgroundColor: railReached ? colors.primary : colors.border }} /> : null}
        </View>
        <View style={{ flex: 1, paddingBottom: next ? 14 : 0, minHeight: 22 }}>
          <Text style={[type.body, { lineHeight: 22, color: step.state === 'failed' ? colors.destructive : step.state === 'upcoming' ? colors.mutedForeground : colors.foreground, fontWeight: strong ? '600' : '400' }]}>{step.label}</Text>
          {step.at ? <Text style={[type.small, { color: colors.mutedForeground }]}>{formatDateTime(step.at)}</Text> : null}
        </View>
      </View>;
    })}
  </View>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const colors = useTokens();
  return <View style={{ gap: 12 }}>
    <View style={{ marginHorizontal: -16 }}><Divider /></View>
    <Text accessibilityRole="header" style={[type.h3, { color: colors.foreground }]}>{title}</Text>
    {children}
  </View>;
}

function Row({ label, children, strong = false }: { label: string; children: ReactNode; strong?: boolean }) {
  const colors = useTokens();
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 16 }}>
    <Text style={[type.body, { color: strong ? colors.foreground : colors.mutedForeground, fontWeight: strong ? '600' : '400' }]}>{label}</Text>
    <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>{typeof children === 'string' ? <Text style={[type.body, { color: colors.foreground, textAlign: 'right' }]}>{children}</Text> : children}</View>
  </View>;
}

const isZero = (value: string | undefined) => !value || new BigJs(value).eq(0);

export function OrderDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useTokens();
  const query = useOrder(id);
  const action = useOrderAction();
  const [sheet, setSheet] = useState<'confirm' | 'cancel' | null>(null);
  const [reason, setReason] = useState('');
  const [copied, setCopied] = useState(false);
  const [barHeight, setBarHeight] = useState(0);
  useEffect(() => { if (!copied) return; const timer = setTimeout(() => setCopied(false), 2000); return () => clearTimeout(timer); }, [copied]);
  const order = query.data;
  const notFound = query.error instanceof ApiError && query.error.status === 404;
  const openSheet = (value: 'confirm' | 'cancel') => { action.reset(); setSheet(value); };
  const confirm = async () => {
    if (!order) return;
    await action.mutateAsync({ id: order.id, action: 'confirm-received' });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setSheet(null);
  };
  const cancel = async () => {
    if (!order || !reason) return;
    await action.mutateAsync({ id: order.id, action: 'cancel', reason });
    setSheet(null);
  };
  const copyNumber = () => {
    if (!order) return;
    void Clipboard.setStringAsync(order.orderNumber);
    void Haptics.selectionAsync().catch(() => undefined);
    setCopied(true);
  };
  const pay = () => { if (order) router.push({ pathname: '/pay/[intentId]', params: { intentId: order.paymentIntentId, parentOrderId: order.parentOrderId, orderNumber: order.orderNumber, total: order.total } }); };
  const activity = order ? [
    ...order.timeline.map((event) => ({ status: event.status as string, at: event.at, detail: event.note ?? '' })),
    ...(order.shipment?.events ?? []).map((event) => ({ status: event.status, at: event.at, detail: event.location })),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)) : [];
  // The one action that moves the order forward sits in a bar at the bottom (thumb zone); the rest stay in the page.
  const primary = order?.actions.includes('PAY') ? { title: 'Pay now', onPress: pay }
    : order?.actions.includes('CONFIRM_RECEIVED') ? { title: 'Confirm received', onPress: () => openSheet('confirm') } : null;

  // With the bar showing, Screen leaves the bottom edge to it, so the safe-area inset applies once.
  return <Screen scroll={false} style={{ padding: 0 }} edges={order && primary ? ['top', 'left', 'right'] : undefined}>
    <View style={{ paddingHorizontal: 16 }}><AppHeader title="Order details" onBack={() => router.back()} /></View>
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: primary ? barHeight + 16 : 32, flexGrow: 1 }} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.primary} colors={[colors.primary]} />}>
      {query.isLoading ? <View style={{ gap: 12, paddingTop: 8 }}><Skeleton width={96} height={24} /><Skeleton width="80%" height={28} /><Skeleton width="50%" height={16} /><Skeleton height={200} style={{ marginTop: 12 }} /><Skeleton height={120} /></View> : null}
      {query.isError ? notFound
        ? <EmptyState icon="PackageSearch" title="Order not found" description="It may belong to another account, or the link is out of date." action={<Button title="Go to my orders" variant="secondary" onPress={() => router.replace('/orders')} />} />
        : <ErrorState message="Could not load this order." retry={() => void query.refetch()} /> : null}
      {order ? <View style={{ gap: 24, paddingTop: 8 }}>
        <View style={{ gap: 8, alignItems: 'flex-start' }}>
          <StatusBadge status={order.status} />
          <Text accessibilityRole="header" style={[type.h2, { color: colors.foreground }]}>{orderHeadline(order.status)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 6, rowGap: 2, flexWrap: 'wrap' }}>
            <Text style={[type.small, { color: colors.mutedForeground }]}>{order.seller.name} · {formatDate(order.createdAt)}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={copied ? 'Order number copied' : `Copy order number ${order.orderNumber}`} onPress={copyNumber} hitSlop={12} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: pressed ? 0.6 : 1 })}>
              <Text style={[type.small, { color: colors.foreground }, mono]}>{order.orderNumber}</Text>
              <Icon name={copied ? 'Check' : 'Copy'} size={14} color={copied ? colors.success : colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        {!terminalOrderStatuses.includes(order.status) ? <Section title="Progress"><OrderStepper order={order} /></Section> : null}

        <Section title={`Items (${order.items.length})`}>
          {order.items.map((item, index) => <View key={`${item.name}-${index}`} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <CatalogImage uri={item.imageUrl} size={56} />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <Text numberOfLines={2} style={[type.body, { color: colors.foreground, flex: 1 }]}>{item.name}</Text>
                <Money amount={item.lineTotal} />
              </View>
              <Text style={[type.small, { color: colors.mutedForeground }]}>{item.variantLabel ? `${item.variantLabel} · ` : ''}{item.quantity} × <Money amount={item.unitPrice} size="small" tone="muted" /></Text>
            </View>
          </View>)}
          <View style={{ gap: 8, marginTop: 4 }}>
            <Row label="Subtotal"><Money amount={orderSubtotal(order.items)} /></Row>
            <Row label="Shipping">{isZero(order.shippingFee) ? 'Free' : <Money amount={order.shippingFee} />}</Row>
            {!isZero(order.discount) ? <Row label="Discount"><Money amount={new BigJs(order.discount).abs().toFixed()} direction="out" /></Row> : null}
            <View style={{ marginTop: 4 }}><Row label="Total" strong><Money amount={order.total} size="h2" /></Row></View>
          </View>
        </Section>

        <Section title="Delivery">
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Icon name="MapPin" size={20} color={colors.mutedForeground} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[type.body, { color: colors.foreground }]}>{order.shippingAddress.recipient} · {order.shippingAddress.phone}</Text>
              <Text style={[type.small, { color: colors.mutedForeground }]}>{order.shippingAddress.address}</Text>
            </View>
          </View>
          {order.shipment ? <View style={{ flexDirection: 'row', gap: 12 }}>
            <Icon name="Truck" size={20} color={colors.mutedForeground} />
            <View style={{ flex: 1 }}><Row label={order.shipment.carrier}><Text selectable style={[type.small, { color: colors.foreground }, mono]}>{order.shipment.trackingNo}</Text></Row></View>
          </View> : null}
        </Section>

        <Section title="Payment">
          <Row label={statusLabel(order.payment.method)}><StatusBadge status={order.payment.status} /></Row>
        </Section>

        {activity.length ? <Section title="Activity">
          {activity.map((event, index) => <View key={`${event.at}-${event.status}-${index}`} style={{ gap: 2 }}>
            <Text style={[type.body, { color: colors.foreground }]}>{statusLabel(event.status)}</Text>
            <Text style={[type.small, { color: colors.mutedForeground }]}>{formatDateTime(event.at)}{event.detail ? ` · ${event.detail}` : ''}</Text>
          </View>)}
        </Section> : null}

        {order.actions.includes('CANCEL') || order.actions.includes('RETURN') ? <View style={{ gap: 12 }}>
          {order.actions.includes('CANCEL') ? <Button title="Cancel order" variant="secondary" onPress={() => openSheet('cancel')} /> : null}
          {order.actions.includes('RETURN') ? <Text style={[type.small, { color: colors.mutedForeground }]}>Returns open here once the return service is live.</Text> : null}
        </View> : null}
      </View> : null}
    </ScrollView>

    <BottomSheet visible={sheet === 'confirm'} title="Got your order?" onClose={() => setSheet(null)}>
      <Text style={[type.body, { color: colors.foreground }]}>Confirming releases your payment to the seller. Only confirm once everything arrived as described.</Text>
      {action.isError ? <Text accessibilityRole="alert" style={[type.small, { color: colors.destructive }]}>Could not confirm receipt. Try again.</Text> : null}
      <Button title="Confirm received" loading={action.isPending} onPress={() => void confirm().catch(() => undefined)} />
    </BottomSheet>
    <BottomSheet visible={sheet === 'cancel'} title="Cancel this order?" onClose={() => setSheet(null)}>
      <Text style={[type.small, { color: colors.mutedForeground }]}>Pick a reason. If you already paid, the money goes back to where it came from.</Text>
      <View accessibilityRole="radiogroup">
        {reasonOptions.map((option) => {
          const selected = reason === option;
          return <Pressable key={option} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => { setReason(option); void Haptics.selectionAsync().catch(() => undefined); }} style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, marginHorizontal: -8, borderRadius: radius.md, backgroundColor: pressed ? colors.muted : 'transparent' })}>
            <Icon name={selected ? 'CircleDot' : 'Circle'} size={20} color={selected ? colors.primary : colors.input} />
            <Text style={[type.body, { color: colors.foreground }]}>{option}</Text>
          </Pressable>;
        })}
      </View>
      {action.isError ? <Text accessibilityRole="alert" style={[type.small, { color: colors.destructive }]}>Could not cancel this order. Try again.</Text> : null}
      <Button title="Cancel order" variant="destructive" disabled={!reason} loading={action.isPending} onPress={() => void cancel().catch(() => undefined)} />
    </BottomSheet>
    {order && primary ? <BottomBar amount={order.total} action={primary} onHeight={setBarHeight} /> : null}
  </Screen>;
}
