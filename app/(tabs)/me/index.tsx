import { useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import type { User } from '@web/features/banking/types';
import type { ShopperOrderTab } from '@web/features/commerce/types';
import { useOrderCounts } from '@/features/orders/api';
import { useWallet } from '@/features/wallet/api';
import { apiRequest, logout } from '@/lib/api';
import { formatBadgeCount } from '@/lib/badge';
import { queryClient } from '@/lib/query-client';
import { AppHeader, BottomSheet, Button, ErrorState, Icon, IconButton, IconTile, ListGroup, ListItem, Money, PressableScale, Screen, SectionHeader, SegmentedTabs, Skeleton, StatusBadge, type IconName } from '@/ui';
import { InitialsAvatar } from '@/ui/auth';
import { setThemePreference, useThemePreference, useTokens } from '@/theme/theme';
import { fontFamily, radius, type } from '@/theme/tokens';

/** Order shortcuts: the four states a shopper checks most. Counts share the cache of the My orders tabs. */
const orderStates: { tab: ShopperOrderTab; label: string; icon: IconName }[] = [
  { tab: 'TO_PAY', label: 'To pay', icon: 'CreditCard' },
  { tab: 'TO_SHIP', label: 'To ship', icon: 'Package' },
  { tab: 'SHIPPING', label: 'Shipping', icon: 'Truck' },
  { tab: 'DELIVERED', label: 'Delivered', icon: 'PackageCheck' },
];

const accountRows: { href: Href; label: string; icon: IconName }[] = [
  { href: '/me/addresses', label: 'Addresses', icon: 'MapPin' },
  { href: '/notifications', label: 'Notifications', icon: 'Bell' },
  { href: '/me/help', label: 'Help', icon: 'CircleQuestionMark' },
];

function OrderStateTile({ label, icon, count, onPress }: { label: string; icon: IconName; count?: number; onPress: () => void }) {
  const tokens = useTokens();
  const badge = formatBadgeCount(count);
  return <PressableScale accessibilityRole="button" accessibilityLabel={badge ? `${label}, ${badge} orders` : label} onPress={onPress} haptic containerStyle={{ flex: 1 }}
    style={({ pressed }) => ({ minHeight: 72, alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.md, backgroundColor: pressed ? tokens.muted : 'transparent' })}>
    <View>
      <Icon name={icon} size={24} strokeWidth={1.75} color={tokens.foreground} />
      {badge ? <View style={{ position: 'absolute', top: -6, right: -12, minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: radius.full, backgroundColor: tokens.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: tokens.primaryForeground, fontFamily: fontFamily.title, fontSize: 11, lineHeight: 14, fontVariant: ['tabular-nums'] }}>{badge}</Text></View> : null}
    </View>
    <Text numberOfLines={1} style={[type.caption, { color: tokens.foreground }]}>{label}</Text>
  </PressableScale>;
}

export default function MeScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const { preference } = useThemePreference();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const userQuery = useQuery({ queryKey: ['me'], queryFn: () => apiRequest<User>('/me'), staleTime: 30_000 });
  const wallet = useWallet();
  const counts = useOrderCounts(orderStates.map((state) => state.tab));
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => { setConfirmSignOut(false); queryClient.clear(); router.replace('/login'); },
  });
  const user = userQuery.data;
  const verified = (user?.kycTier ?? 0) > 0;
  const refresh = () => { void userQuery.refetch(); void wallet.refetch(); counts.forEach((count) => { void count.refetch(); }); };

  return <Screen refreshing={userQuery.isRefetching} onRefresh={refresh}>
    <AppHeader large title="Me" right={<IconButton icon="Bell" accessibilityLabel="Notifications" onPress={() => router.push('/notifications')} />} />
    <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center', gap: 24, paddingTop: 8, paddingBottom: 32 }}>
      {userQuery.isPending ? <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}><Skeleton width={64} height={64} style={{ borderRadius: radius.full }} /><View style={{ flex: 1, gap: 8 }}><Skeleton width="60%" height={22} /><Skeleton width="40%" height={16} /></View></View> : null}
      {userQuery.isError ? <ErrorState message="Your account details could not be loaded." retry={() => { void userQuery.refetch(); }} /> : null}
      {user ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <InitialsAvatar name={user.fullName || user.phone} size={64} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text numberOfLines={1} style={[type.h2, { color: tokens.foreground }]}>{user.fullName || 'Shopper'}</Text>
          <Text style={[type.small, { color: tokens.mutedForeground, fontVariant: ['tabular-nums'] }]}>{user.phone}</Text>
          <StatusBadge status={verified ? 'VERIFIED' : 'PENDING_REVIEW'} tone={verified ? 'success' : 'warning'} icon={verified ? 'ShieldCheck' : 'ShieldExclamationPoint'} label={verified ? `Verified · Tier ${user.kycTier}` : 'Not verified yet'} />
        </View>
      </View> : null}

      {/* Order states first: the thing a shopper opens Me for. */}
      <View>
        <SectionHeader title="My orders" actionLabel="View all" onAction={() => router.push('/orders')} />
        <View style={{ flexDirection: 'row', gap: 4, marginHorizontal: -4 }}>
          {orderStates.map((state, index) => <OrderStateTile key={state.tab} label={state.label} icon={state.icon} count={counts[index]?.data?.totalElements}
            onPress={() => router.push({ pathname: '/orders', params: { tab: state.tab } })} />)}
        </View>
      </View>

      <ListGroup>
        <ListItem inset dividerInset={68} chevron title="Wallet" onPress={() => router.push('/wallet')} leading={<IconTile icon="Wallet" />}
          trailing={wallet.isPending ? <Skeleton width={96} height={18} /> : wallet.data ? <Money amount={wallet.data.availableBalance} size="body" /> : null} />
        <ListItem inset divider={false} chevron title="Statement" onPress={() => router.push('/wallet/statement')} leading={<IconTile icon="ReceiptText" />} />
      </ListGroup>

      <ListGroup label="Account">
        {accountRows.map((row, index) => <ListItem key={row.label} inset dividerInset={68} divider={index < accountRows.length - 1} chevron title={row.label} onPress={() => router.push(row.href)} leading={<IconTile icon={row.icon} />} />)}
      </ListGroup>

      <View style={{ gap: 8 }}>
        <Text accessibilityRole="header" style={[type.caption, { color: tokens.mutedForeground }]}>Appearance</Text>
        <SegmentedTabs selected={preference} onChange={(value) => { if (value === 'system' || value === 'light' || value === 'dark') void setThemePreference(value); }} items={[{ key: 'system', label: 'Match device' }, { key: 'light', label: 'Light' }, { key: 'dark', label: 'Dark' }]} />
      </View>

      {user ? <ListGroup>
        <ListItem inset divider={false} destructive title="Sign out" onPress={() => setConfirmSignOut(true)} leading={<IconTile icon="LogOut" tone="destructive" />} />
      </ListGroup> : null}
    </View>

    <BottomSheet visible={confirmSignOut} title="Sign out of this device?" onClose={() => setConfirmSignOut(false)}>
      <Text style={[type.body, { color: tokens.mutedForeground }]}>You’ll need your password and possibly a verification code to sign back in.</Text>
      <Button title="Sign out" variant="destructive" loading={logoutMutation.isPending} onPress={() => logoutMutation.mutate()} />
      <Button title="Stay signed in" variant="ghost" onPress={() => setConfirmSignOut(false)} />
    </BottomSheet>
  </Screen>;
}
