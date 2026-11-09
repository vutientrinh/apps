import '../global.css';
import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { BeVietnamPro_500Medium } from '@expo-google-fonts/be-vietnam-pro/500Medium';
import { BeVietnamPro_600SemiBold } from '@expo-google-fonts/be-vietnam-pro/600SemiBold';
import { BeVietnamPro_700Bold } from '@expo-google-fonts/be-vietnam-pro/700Bold';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuthGuard } from '@/lib/auth-guard';
import { queryClient } from '@/lib/query-client';
import { runStartup } from '@/lib/startup';
import { useThemePreference, useTokens } from '@/theme/theme';
import { type } from '@/theme/tokens';

export { ErrorBoundary } from 'expo-router';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Renders the navigator and hides protected routes from guests while `useAuthGuard` sends them to login. */
function GuardedStack() {
  const blocked = useAuthGuard();
  const tokens = useTokens();
  return <View style={{ flex: 1, backgroundColor: tokens.background }}>
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tokens.background } }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
    {blocked ? <View accessibilityLiveRegion="polite" style={[StyleSheet.absoluteFill, { backgroundColor: tokens.background, alignItems: 'center', justifyContent: 'center', gap: 12 }]}>
      <ActivityIndicator color={tokens.primary} />
      <Text style={[type.small, { color: tokens.mutedForeground }]}>Checking your session…</Text>
    </View> : null}
  </View>;
}

export default function RootLayout() {
  const { colorScheme } = useThemePreference();
  const tokens = useTokens();
  const { setColorScheme } = useColorScheme();
  const router = useRouter();
  const [launchReady, setLaunchReady] = useState(false);
  // Be Vietnam Pro for display, titles and money; body text stays on the platform font (DESIGN.md §3).
  const [fontsLoaded, fontError] = useFonts({ BeVietnamPro_500Medium, BeVietnamPro_600SemiBold, BeVietnamPro_700Bold });
  const ready = launchReady && (fontsLoaded || Boolean(fontError));

  useEffect(() => {
    setColorScheme(colorScheme);
  }, [colorScheme, setColorScheme]);

  useEffect(() => {
    let active = true;
    void runStartup((route) => router.replace(route), () => { if (active) setLaunchReady(true); });
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    if (fontError) console.warn('Be Vietnam Pro failed to load; falling back to the platform font.', fontError);
  }, [fontError]);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: tokens.background, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color={tokens.primary} /></View>;
  }

  return <QueryClientProvider client={queryClient}>
    <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    <GuardedStack />
  </QueryClientProvider>;
}
