import { useRef, useState, type ComponentRef } from 'react';
import { Link, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { completeIntro } from '@/lib/onboarding';
import { useReducedMotion } from '@/lib/motion';
import { useTokens } from '@/theme/theme';
import { fontFamily, radius, touchTarget, type } from '@/theme/tokens';
import { Button, Illustration, Screen, Wordmark, type IllustrationName } from '@/ui';

/** The three promises of the product (DESIGN-PLAN-v2 §5.3). */
const slides: readonly { title: string; body: string; art: IllustrationName }[] = [
  { title: 'Shop from many sellers', body: 'Everyday products from many shops, with all your orders in one place.', art: 'empty-cart' },
  { title: 'Pay with your wallet', body: 'Top up once, pay at checkout and follow every payment in your statement.', art: 'success-transfer' },
  { title: 'Money held safely until delivery', body: 'Sellers are paid after your order arrives. Refunds go straight back to your wallet.', art: 'empty-orders' },
];

/** The art takes what the text leaves free, within these bounds. */
const artHeight = (pageHeight: number) => Math.max(120, Math.min(280, Math.round(pageHeight * 0.52)));

export default function IntroScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const reducedMotion = useReducedMotion();
  const pager = useRef<ComponentRef<typeof ScrollView>>(null);
  const [page, setPage] = useState({ width: 0, height: 0 });
  const pageWidth = page.width;
  const [index, setIndex] = useState(0);
  const lastSlide = index === slides.length - 1;

  async function finish(path: '/' | '/register') {
    try { await completeIntro(); } catch { /* Keep onboarding usable if secure storage is unavailable. */ }
    router.replace(path);
  }

  function goTo(next: number) {
    setIndex(next);
    pager.current?.scrollTo({ x: next * pageWidth, animated: !reducedMotion });
  }

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!pageWidth) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    if (next !== index && next >= 0 && next < slides.length) {
      setIndex(next);
      void Haptics.selectionAsync().catch(() => undefined);
    }
  }

  return <Screen scroll={false} style={{ paddingHorizontal: 0 }}>
    <View style={{ flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center' }}>
      <View style={{ minHeight: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Wordmark />
        {!lastSlide ? <Pressable accessibilityRole="button" accessibilityLabel="Skip introduction" onPress={() => goTo(slides.length - 1)} style={({ pressed }) => ({ minWidth: touchTarget, minHeight: touchTarget, alignItems: 'flex-end', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}><Text style={[type.small, { color: tokens.mutedForeground, fontFamily: fontFamily.medium }]}>Skip</Text></Pressable> : null}
      </View>

      <View style={{ flex: 1 }} onLayout={(event) => { const { width, height } = event.nativeEvent.layout; setPage({ width, height }); }}>
        {pageWidth > 0 ? <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={32} style={{ flex: 1 }}>
          {slides.map((slide, slideIndex) => <View key={slide.title} accessibilityElementsHidden={slideIndex !== index} importantForAccessibility={slideIndex === index ? 'auto' : 'no-hide-descendants'} style={{ width: pageWidth, minHeight: page.height, flex: 1, paddingHorizontal: 16, justifyContent: 'center', gap: 32 }}>
            <Illustration name={slide.art} height={artHeight(page.height)} />
            <View style={{ gap: 12 }}>
              <Text accessibilityRole="header" style={[type.h1, { color: tokens.foreground }]}>{slide.title}</Text>
              <Text style={[type.body, { color: tokens.mutedForeground, maxWidth: 420 }]}>{slide.body}</Text>
            </View>
          </View>)}
        </ScrollView> : null}
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 20 }}>
        <View style={{ flexDirection: 'row', gap: 6, alignSelf: 'center' }} accessible accessibilityRole="adjustable" accessibilityLabel={`Page ${index + 1} of ${slides.length}`}>
          {slides.map((item, slideIndex) => <Pressable key={item.title} accessibilityLabel={`Go to page ${slideIndex + 1}`} onPress={() => goTo(slideIndex)} hitSlop={10} style={{ width: slideIndex === index ? 24 : 8, height: 8, borderRadius: radius.full, backgroundColor: slideIndex === index ? tokens.primary : tokens.border }} />)}
        </View>
        <View style={{ gap: 4 }}>
          <Button title={lastSlide ? 'Create an account' : 'Next'} onPress={() => { if (lastSlide) void finish('/register'); else goTo(index + 1); }} />
          {lastSlide
            ? <Link href="/login" asChild onPress={() => { void completeIntro().catch(() => undefined); }}><Pressable accessibilityRole="link" style={{ minHeight: touchTarget, alignItems: 'center', justifyContent: 'center' }}><Text style={[type.body, { color: tokens.primary, fontFamily: fontFamily.title }]}>I already have an account</Text></Pressable></Link>
            : <Button title="Browse as guest" variant="ghost" onPress={() => { void finish('/'); }} />}
        </View>
      </View>
    </View>
  </Screen>;
}
