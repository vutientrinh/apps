import { useContext } from 'react';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, type ColorValue } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useCart } from '@/features/shop/api';
import { formatBadgeCount } from '@/lib/badge';
import { useAuth } from '@/lib/session';
import { useTokens } from '@/theme/theme';
import { fontFamily, radius } from '@/theme/tokens';
import { Icon, type IconName } from '@/ui';

export default function TabLayout() {
  const auth = useAuth();
  const tokens = useTokens();
  const bottomInset = useContext(SafeAreaInsetsContext)?.bottom ?? 0;
  const cart = useCart(auth.authenticated);
  const cartLines = cart.data?.groups.reduce((total, group) => total + group.items.length, 0);
  const icon = (name: IconName) => function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Icon name={name} size={24} color={String(color)} strokeWidth={focused ? 2.25 : 1.75} />;
  };
  const badge = auth.authenticated ? formatBadgeCount(cartLines) : undefined;
  return <Tabs screenListeners={{ tabPress: () => { if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => undefined); } }} screenOptions={{
    headerShown: false,
    tabBarHideOnKeyboard: true,
    tabBarActiveTintColor: tokens.primary,
    tabBarInactiveTintColor: tokens.mutedForeground,
    // 56 pt fits the 24 pt icon and the label without clipping its descenders (the default 49 pt does not).
    tabBarStyle: { height: 56 + bottomInset, backgroundColor: tokens.card, borderTopColor: tokens.border, borderTopWidth: StyleSheet.hairlineWidth },
    tabBarLabelStyle: { fontFamily: fontFamily.medium, fontSize: 11, lineHeight: 14, letterSpacing: 0.1 },
    tabBarItemStyle: { minHeight: 48 },
    tabBarBadgeStyle: { backgroundColor: tokens.primary, color: tokens.primaryForeground, fontFamily: fontFamily.title, fontSize: 11, minWidth: 18, height: 18, lineHeight: 18, borderRadius: radius.full },
  }}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('House') }} />
    <Tabs.Screen name="categories" options={{ title: 'Categories', tabBarIcon: icon('LayoutGrid') }} />
    <Tabs.Screen name="wallet" options={{ title: 'Wallet', tabBarIcon: icon('Wallet') }} />
    <Tabs.Screen name="cart" options={{ title: 'Cart', tabBarBadge: badge, tabBarAccessibilityLabel: badge ? `Cart, ${badge} items` : 'Cart', tabBarIcon: icon('ShoppingCart') }} />
    <Tabs.Screen name="me" options={{ title: 'Me', tabBarIcon: icon('CircleUserRound') }} />
  </Tabs>;
}
