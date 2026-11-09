import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { AppHeader, BottomSheet, Button, Divider, EmptyState, ErrorState, Icon, Money, Screen, SegmentedTabs, Skeleton, StatusBadge, useTokens } from '@/ui';
import { fontFamily, radius, type } from '@/theme/tokens';
import { formatDate, formatDateTime } from '@/lib/dates';
import { ApiError } from '@/lib/api';
import { useBuyAgain, useOrder, useOrderAction, useOrderCounts, useOrders } from './api';
import { primaryOrderAction } from './logic';
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
  const [selected, setSelected] = useState('ALL');
  const tab = tabs.find((item) => item.key === selected)?.value;
  const orders = useOrders(tab);
  const counts = useOrderCounts(tabs.map((item) => item.value));
  const buyAgain = useBuyAgain();
  const rows = useMemo(() => orders.data?.pages.flatMap((page) => page.content) ?? [], [orders.data]);
  const unauthorized = orders.error instanceof ApiError && orders.error.status === 401;

  return <Screen scroll={false} style={{ padding: 0 }}>
    <View style={{ paddingHorizontal: 16 }}><AppHeader title="My orders" /></View>
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
          <Pressable accessibilityRole="button" accessibilityLabel={`Order ${item.orderNumber} from ${item.seller.name}`} onPress={() => router.push(`/orders/${item.id}`)} style={({ pressed }) => ({ paddingHorizontal: 16, paddingTop: 14, paddingBottom: action ? 8 : 14, gap: 6, backgroundColor: pressed ? colors.muted : 'transparent' })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text numberOfLines={1} style={[type.body, { color: colors.foreground, fontWeight: '600', flex: 1 }]}>{item.seller.name}</Text>
              <View style={{ flexShrink: 0 }}><StatusBadge status={item.status} /></View>
            </View>
            <Text numberOfLines={1} style={[type.small, { color: colors.mutedForeground }]}>{formatDate(item.createdAt)} · <Text style={mono}>{item.orderNumber}</Text></Text>
            {first ? <Text numberOfLines={2} style={[type.small, { color: colors.foreground }]}>{first.name}{first.variantLabel ? ` · ${first.variantLabel}` : ''} × {first.quantity}{item.itemsPreview.length > 1 ? `, +${item.itemsPreview.length - 1} more` : ''}</Text> : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
              <Text style={[type.small, { color: colors.mutedForeground }]}>{item.itemCount} {item.itemCount === 1 ? 'item' : 'items'}</Text>
              <Money amount={item.total} />
            </View>
          </Pressable>
          {action ? <View style={{ paddingHorizontal: 16, paddingBottom: 14, alignItems: 'flex-end' }}><Button
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
const terminalStatuses: string[] = ['CANCELLED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED'];
const steps = ['PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED'];
const stepLabels: Record<string, string> = { PENDING_PAYMENT: 'Awaiting payment', PAID: 'Paid', CONFIRMED: 'Confirmed by seller', SHIPPED: 'Shipped', DELIVERED: 'Delivered', COMPLETED: 'Completed' };

function OrderStepper({ order }: { order: OrderDetail }) {
  const colors = useTokens();
  const currentIndex = steps.indexOf(order.status);
  return <View accessibilityLabel={`Order progress: ${stepLabels[order.status] ?? order.status}`}>
    {steps.map((step, index) => {
      const reached = currentIndex >= index;
      const current = currentIndex === index;
      const event = order.timeline.find((entry) => entry.status === step);
      return <View key={step} style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ width: 20, alignItems: 'center' }}>
          <Icon name={reached ? 'CircleCheck' : 'Circle'} size={20} color={reached ? colors.primary : colors.border} />
          {index < steps.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 12, backgroundColor: currentIndex > index ? colors.primary : colors.border }} /> : null}
        </View>
        <View style={{ flex: 1, paddingBottom: 12 }}>
          <Text style={[type.body, { color: reached ? colors.foreground : colors.mutedForeground, fontWeight: current ? '600' : '400' }]}>{stepLabels[step]}</Text>
          {event ? <Text style={[type.small, { color: colors.mutedForeground }]}>{formatDateTime(event.at)}</Text> : null}
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

function Row({ label, children }: { label: string; children: ReactNode }) {
  const colors = useTokens();
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 16 }}>
    <Text style={[type.body, { color: colors.mutedForeground }]}>{label}</Text>
    <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>{typeof children === 'string' ? <Text style={[type.body, { color: colors.foreground, textAlign: 'right' }]}>{children}</Text> : children}</View>
  </View>;
}

export function OrderDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useTokens();
  const query = useOrder(id);
  const action = useOrderAction();
  const [sheet, setSheet] = useState<'confirm' | 'cancel' | null>(null);
  const [reason, setReason] = useState('');
  const order = query.data;
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
  const activity = order ? [
    ...order.timeline.map((event) => ({ status: event.status, at: event.at, detail: event.note ?? '' })),
    ...(order.shipment?.events ?? []).map((event) => ({ status: event.status, at: event.at, detail: event.location })),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)) : [];
  return <Screen>
    <AppHeader title="Order details" onBack={() => router.back()} />
    {query.isLoading ? <View style={{ gap: 12, paddingTop: 24 }}><Skeleton width="60%" height={24} /><Skeleton width="40%" height={16} /><Skeleton height={200} /><Skeleton height={120} /></View> : null}
    {query.isError ? <ErrorState message="Could not load this order." retry={() => void query.refetch()} /> : null}
    {order ? <View style={{ gap: 24, paddingTop: 20 }}>
      <View style={{ gap: 6 }}>
        <Text selectable style={[type.h2, { color: colors.foreground }, mono]}>{order.orderNumber}</Text>
        <Text style={[type.small, { color: colors.mutedForeground }]}>{order.seller.name} · {formatDate(order.createdAt)}</Text>
        <View style={{ marginTop: 4 }}><StatusBadge status={order.status} /></View>
      </View>

      {!terminalStatuses.includes(order.status) ? <Section title="Progress"><OrderStepper order={order} /></Section> : null}

      <Section title={`Items (${order.items.length})`}>
        {order.items.map((item, index) => <View key={`${item.name}-${index}`} style={{ gap: 2 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <Text numberOfLines={2} style={[type.body, { color: colors.foreground, flex: 1 }]}>{item.name}</Text>
            <Money amount={item.lineTotal} />
          </View>
          <Text style={[type.small, { color: colors.mutedForeground }]}>{item.variantLabel ? `${item.variantLabel} · ` : ''}{item.quantity} × <Money amount={item.unitPrice} size="small" tone="muted" /></Text>
        </View>)}
        <View style={{ marginTop: 4 }}><Row label="Total"><Money amount={order.total} size="h2" /></Row></View>
      </Section>

      <Section title="Delivery">
        <View style={{ gap: 2 }}>
          <Text style={[type.body, { color: colors.foreground }]}>{order.shippingAddress.recipient} · {order.shippingAddress.phone}</Text>
          <Text style={[type.small, { color: colors.mutedForeground }]}>{order.shippingAddress.address}</Text>
        </View>
        {order.shipment ? <Row label={order.shipment.carrier}><Text selectable style={[type.small, { color: colors.foreground }, mono]}>{order.shipment.trackingNo}</Text></Row> : null}
      </Section>

      <Section title="Payment">
        <Row label={order.payment.method.replaceAll('_', ' ')}><StatusBadge status={order.payment.status} /></Row>
      </Section>

      {activity.length ? <Section title="Activity">
        {activity.map((event, index) => <View key={`${event.at}-${event.status}-${index}`} style={{ gap: 2 }}>
          <Text style={[type.body, { color: colors.foreground }]}>{stepLabels[event.status] ?? event.status.toLowerCase().replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase())}</Text>
          <Text style={[type.small, { color: colors.mutedForeground }]}>{formatDateTime(event.at)}{event.detail ? ` · ${event.detail}` : ''}</Text>
        </View>)}
      </Section> : null}

      {order.actions.includes('PAY') || order.actions.includes('CONFIRM_RECEIVED') || order.actions.includes('CANCEL') || order.actions.includes('RETURN') ? <View style={{ gap: 12 }}>
        {order.actions.includes('PAY') ? <Button title="Pay now" onPress={() => router.push({ pathname: '/pay/[intentId]', params: { intentId: order.paymentIntentId, parentOrderId: order.parentOrderId, orderNumber: order.orderNumber, total: order.total } })} /> : null}
        {order.actions.includes('CONFIRM_RECEIVED') ? <Button title="Confirm received" onPress={() => openSheet('confirm')} /> : null}
        {order.actions.includes('CANCEL') ? <Button title="Cancel order" variant="secondary" onPress={() => openSheet('cancel')} /> : null}
        {order.actions.includes('RETURN') ? <Text style={[type.small, { color: colors.mutedForeground }]}>Returns open here once the return service is live.</Text> : null}
      </View> : null}
    </View> : null}

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
          return <Pressable key={option} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setReason(option)} style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, marginHorizontal: -8, borderRadius: radius.md, backgroundColor: pressed ? colors.muted : 'transparent' })}>
            <Icon name={selected ? 'CircleDot' : 'Circle'} size={20} color={selected ? colors.primary : colors.input} />
            <Text style={[type.body, { color: colors.foreground }]}>{option}</Text>
          </Pressable>;
        })}
      </View>
      {action.isError ? <Text accessibilityRole="alert" style={[type.small, { color: colors.destructive }]}>Could not cancel this order. Try again.</Text> : null}
      <Button title="Cancel order" variant="destructive" disabled={!reason} loading={action.isPending} onPress={() => void cancel().catch(() => undefined)} />
    </BottomSheet>
  </Screen>;
}
