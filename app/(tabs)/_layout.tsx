import { Tabs } from 'expo-router';
import { StyleSheet, type ColorValue } from 'react-native';
import { useCart } from '@/features/shop/api';
import { formatBadgeCount } from '@/lib/badge';
import { useAuth } from '@/lib/session';
import { useTokens } from '@/theme/theme';
import { fontFamily, radius } from '@/theme/tokens';
import { Icon, type IconName } from '@/ui';

export default function TabLayout() {
  const auth = useAuth();
  const tokens = useTokens();
  const cart = useCart(auth.authenticated);
  const cartLines = cart.data?.groups.reduce((total, group) => total + group.items.length, 0);
  const icon = (name: IconName) => function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Icon name={name} size={24} color={String(color)} strokeWidth={focused ? 2.25 : 1.75} />;
  };
  const badge = auth.authenticated ? formatBadgeCount(cartLines) : undefined;
  return <Tabs screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: tokens.primary,
    tabBarInactiveTintColor: tokens.mutedForeground,
    tabBarStyle: { backgroundColor: tokens.card, borderTopColor: tokens.border, borderTopWidth: StyleSheet.hairlineWidth },
    tabBarLabelStyle: { fontFamily: fontFamily.medium, fontSize: 11, letterSpacing: 0.1 },
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
