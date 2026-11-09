import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { User } from '@web/features/banking/types';
import { apiRequest, logout } from '@/lib/api';
import { queryClient } from '@/lib/query-client';
import { AppHeader, BottomSheet, Button, ErrorState, Icon, Screen, SegmentedTabs, Skeleton, StatusBadge, type IconName } from '@/ui';
import { InitialsAvatar } from '@/ui/auth';
import { setThemePreference, useThemePreference, useTokens } from '@/theme/theme';
import { radius, type, withAlpha } from '@/theme/tokens';

const shortcuts: { href: '/orders' | '/wallet' | '/me/addresses' | '/notifications' | '/me/help'; label: string; detail: string; icon: IconName }[] = [
  { href: '/orders', label: 'My orders', detail: 'Track deliveries and returns', icon: 'ReceiptText' },
  { href: '/wallet', label: 'Wallet', detail: 'Balance, top-ups and transfers', icon: 'Wallet' },
  { href: '/me/addresses', label: 'Addresses', detail: 'Where we deliver your orders', icon: 'MapPin' },
  { href: '/notifications', label: 'Notifications', detail: 'Order and account updates', icon: 'Bell' },
  { href: '/me/help', label: 'Help', detail: 'Answers about orders and payments', icon: 'CircleQuestionMark' },
];

function ShortcutRow({ href, label, detail, icon, last }: (typeof shortcuts)[number] & { last: boolean }) {
  const tokens = useTokens();
  const router = useRouter();
  return <Pressable accessibilityRole="link" accessibilityLabel={`${label}. ${detail}`} onPress={() => router.push(href)} style={({ pressed }) => ({ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, backgroundColor: pressed ? tokens.muted : 'transparent' })}>
    <View style={{ width: 40, height: 40, borderRadius: radius.full, backgroundColor: withAlpha(tokens.primary, 0.1), alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={20} color={tokens.primary} /></View>
    <View style={{ flex: 1, gap: 2, alignSelf: 'stretch', justifyContent: 'center', borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: tokens.border, paddingVertical: 12 }}>
      <Text style={[type.body, { color: tokens.foreground, fontWeight: '500' }]}>{label}</Text>
      <Text style={[type.small, { color: tokens.mutedForeground }]}>{detail}</Text>
    </View>
    <Icon name="ChevronRight" size={20} color={tokens.mutedForeground} />
  </Pressable>;
}

function SectionLabel({ children }: { children: string }) {
  const tokens = useTokens();
  return <Text accessibilityRole="header" style={[type.caption, { color: tokens.mutedForeground, paddingHorizontal: 16, marginBottom: 4 }]}>{children}</Text>;
}

export default function MeScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const { preference } = useThemePreference();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const userQuery = useQuery({ queryKey: ['me'], queryFn: () => apiRequest<User>('/me'), staleTime: 30_000 });
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => { setConfirmSignOut(false); queryClient.clear(); router.replace('/login'); },
  });
  const user = userQuery.data;
  const verified = (user?.kycTier ?? 0) > 0;

  return <Screen refreshing={userQuery.isRefetching} onRefresh={() => { void userQuery.refetch(); }}>
    <AppHeader title="Me" />
    <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center', gap: 28, paddingTop: 20, paddingBottom: 32 }}>
      {userQuery.isPending ? <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}><Skeleton width={64} height={64} style={{ borderRadius: radius.full }} /><View style={{ flex: 1, gap: 8 }}><Skeleton width="60%" height={22} /><Skeleton width="40%" height={16} /></View></View> : null}
      {userQuery.isError ? <ErrorState message="Your account details could not be loaded." retry={() => { void userQuery.refetch(); }} /> : null}
      {user ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <InitialsAvatar name={user.fullName || user.phone} size={64} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text accessibilityRole="header" numberOfLines={1} style={[type.h2, { color: tokens.foreground }]}>{user.fullName || 'Shopper'}</Text>
          <Text style={[type.small, { color: tokens.mutedForeground, fontVariant: ['tabular-nums'] }]}>{user.phone}</Text>
          <StatusBadge status={verified ? 'VERIFIED' : 'PENDING_REVIEW'} tone={verified ? 'success' : 'warning'} icon={verified ? 'ShieldCheck' : 'ShieldExclamationPoint'} label={verified ? `Verified · Tier ${user.kycTier}` : 'Not verified yet'} />
        </View>
      </View> : null}

      {/* Full-bleed list (DESIGN.md §4): rows with dividers, not a card per item. */}
      <View style={{ marginHorizontal: -16 }}>
        <SectionLabel>Account</SectionLabel>
        <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: tokens.border, backgroundColor: tokens.card }}>
          {shortcuts.map((shortcut, index) => <ShortcutRow key={shortcut.href} {...shortcut} last={index === shortcuts.length - 1} />)}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text accessibilityRole="header" style={[type.caption, { color: tokens.mutedForeground }]}>Appearance</Text>
        <SegmentedTabs selected={preference} onChange={(value) => { if (value === 'system' || value === 'light' || value === 'dark') void setThemePreference(value); }} items={[{ key: 'system', label: 'Match device' }, { key: 'light', label: 'Light' }, { key: 'dark', label: 'Dark' }]} />
      </View>

      {user ? <Button title="Sign out" variant="secondary" icon="LogOut" onPress={() => setConfirmSignOut(true)} /> : null}
    </View>

    <BottomSheet visible={confirmSignOut} title="Sign out of this device?" onClose={() => setConfirmSignOut(false)}>
      <Text style={[type.body, { color: tokens.mutedForeground }]}>You’ll need your password and possibly a verification code to sign back in.</Text>
      <Button title="Sign out" variant="destructive" loading={logoutMutation.isPending} onPress={() => logoutMutation.mutate()} />
      <Button title="Stay signed in" variant="ghost" onPress={() => setConfirmSignOut(false)} />
    </BottomSheet>
  </Screen>;
}
