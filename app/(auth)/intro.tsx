import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { completeIntro } from '@/lib/onboarding';
import { useTokens } from '@/theme/theme';
import { fontFamily, radius, touchTarget, type, withAlpha } from '@/theme/tokens';
import { Button, Icon, Screen, type IconName } from '@/ui';

const slides: readonly { title: string; body: string; icon: IconName }[] = [
  { title: 'Shop from local stores', body: 'Everyday products from sellers across Vietnam, with all your orders in one place.', icon: 'Store' },
  { title: 'Your money stays put until it arrives', body: 'Payments are held safely until the seller delivers. Refunds go straight back to your wallet.', icon: 'ShieldCheck' },
  { title: 'Every đồng accounted for', body: 'Your wallet statement shows each top-up, payment and refund, line by line.', icon: 'ReceiptText' },
];

export default function IntroScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const [index, setIndex] = useState(0);
  const lastSlide = index === slides.length - 1;
  const slide = slides[index];

  async function finish(path: '/' | '/register' | '/login') {
    try { await completeIntro(); } catch { /* Keep onboarding usable if secure storage is unavailable. */ }
    router.replace(path);
  }

  async function next() {
    if (lastSlide) {
      await finish('/register');
      return;
    }
    await Haptics.selectionAsync().catch(() => undefined);
    setIndex((current) => Math.min(slides.length - 1, current + 1));
  }

  return <Screen scroll={false}>
    <View style={{ flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', gap: 24 }}>
      <View style={{ minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: tokens.primary, fontFamily: fontFamily.display, fontSize: 18, letterSpacing: -0.2 }}>Payment Shopper</Text>
        {!lastSlide ? <Pressable accessibilityRole="button" accessibilityLabel="Skip introduction" onPress={() => { void finish('/register'); }} style={{ minWidth: touchTarget, minHeight: touchTarget, alignItems: 'flex-end', justifyContent: 'center' }}><Text style={[type.small, { color: tokens.mutedForeground }]}>Skip</Text></Pressable> : null}
      </View>

      <View style={{ flex: 1, justifyContent: 'center', gap: 20 }}>
        <View style={{ width: 72, height: 72, borderRadius: radius.lg, backgroundColor: withAlpha(tokens.primary, 0.1), alignItems: 'center', justifyContent: 'center' }}><Icon name={slide.icon} size={36} strokeWidth={1.75} color={tokens.primary} /></View>
        <Text accessibilityRole="header" style={[type.h1, { color: tokens.foreground }]}>{slide.title}</Text>
        <Text style={[type.body, { color: tokens.mutedForeground, maxWidth: 420 }]}>{slide.body}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 6 }} accessible accessibilityLabel={`Introduction ${index + 1} of ${slides.length}`}>{slides.map((item, slideIndex) => <View key={item.title} style={{ width: slideIndex === index ? 24 : 8, height: 8, borderRadius: radius.full, backgroundColor: slideIndex === index ? tokens.primary : tokens.border }} />)}</View>

      <View style={{ gap: 8 }}>
        <Button title={lastSlide ? 'Create an account' : 'Next'} onPress={() => { void next(); }} />
        {lastSlide
          ? <Link href="/login" asChild onPress={() => { void completeIntro().catch(() => undefined); }}><Pressable accessibilityRole="link" style={{ minHeight: touchTarget, alignItems: 'center', justifyContent: 'center' }}><Text style={[type.body, { color: tokens.primary, fontWeight: '600' }]}>I already have an account</Text></Pressable></Link>
          : <Button title="Browse as guest" variant="ghost" onPress={() => { void finish('/'); }} />}
      </View>
    </View>
  </Screen>;
}
