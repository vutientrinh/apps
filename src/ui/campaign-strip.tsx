import { useRef, useState, type ComponentRef } from 'react';
import { useRouter, type Href } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { Campaign } from '@web/features/commerce/types';
import type { useCampaigns } from '@/lib/campaigns';
import { useReducedMotion } from '@/lib/motion';
import { useTokens } from '@/theme/theme';
import { fontFamily, radius, type } from '@/theme/tokens';
import { BrandGradient } from './brand';
import { PressableScale, Skeleton } from './index';

const HEIGHT = 168;
const GAP = 12;
const PEEK = 24;
const ART = { width: 240, height: 135 } as const;

function svgFromDataUri(uri: string): string | null {
  const match = /^data:image\/svg\+xml(?:;charset=[\w-]+)?,(.*)$/s.exec(uri);
  if (!match) return null;
  try { return decodeURIComponent(match[1] ?? ''); } catch { return null; }
}

/** Transparent artwork on the right edge; `currentColor` follows the card's text colour. */
function Art({ uri, color }: { uri: string; color: string }) {
  const xml = svgFromDataUri(uri);
  return <View pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', right: -40, top: (HEIGHT - ART.height) / 2, ...ART, opacity: 0.9 }}>
    {xml ? <SvgXml xml={xml} width="100%" height="100%" color={color} /> : uri ? <Image source={{ uri }} resizeMode="contain" style={ART} /> : null}
  </View>;
}

function CampaignCard({ campaign, width, onPress }: { campaign: Campaign; width: number; onPress: () => void }) {
  const tokens = useTokens();
  const neutral = campaign.tone === 'neutral';
  const text = neutral ? tokens.foreground : tokens.primaryForeground;
  const accent = campaign.tone === 'deal' ? tokens.deal : tokens.primary;
  const content = <View style={{ flex: 1, minHeight: HEIGHT, padding: 16, justifyContent: 'space-between', gap: 12 }}>
    <Art uri={campaign.image} color={neutral ? tokens.primary : tokens.primaryForeground} />
    <View style={{ gap: 4, marginRight: 112 }}>
      <Text style={[type.h3, { color: text }]}>{campaign.title}</Text>
      <Text style={[type.small, { color: neutral ? tokens.mutedForeground : text }]}>{campaign.subtitle}</Text>
    </View>
    <View style={{ alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center', paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: neutral ? tokens.primary : tokens.primaryForeground }}>
      <Text style={[type.small, { color: neutral ? tokens.primaryForeground : accent, fontFamily: fontFamily.title }]}>{campaign.ctaLabel}</Text>
    </View>
  </View>;
  const box = { flex: 1, borderRadius: radius.lg, overflow: 'hidden' } as const;
  return <PressableScale scaleTo={0.98} accessibilityRole="link" accessibilityLabel={`${campaign.title}. ${campaign.subtitle} ${campaign.ctaLabel}`} onPress={onPress} containerStyle={{ width }} style={{ flex: 1 }}>
    {campaign.tone === 'brand' ? <BrandGradient style={box}>{content}</BrandGradient>
      : <View style={[box, neutral ? { backgroundColor: tokens.card, borderWidth: StyleSheet.hairlineWidth, borderColor: tokens.border } : { backgroundColor: tokens.deal }]}>{content}</View>}
  </PressableScale>;
}

/**
 * Home banner strip (`GET /campaigns`): swipeable, snapping cards with dots; no auto-advance. Put it directly inside
 * a 16 pt padded screen (it runs edge to edge). Renders nothing when there is no campaign or the request fails:
 * the home screen works without it.
 */
export function CampaignStrip({ query }: { query: ReturnType<typeof useCampaigns> }) {
  const router = useRouter();
  const tokens = useTokens();
  const reducedMotion = useReducedMotion();
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  if (query.isLoading) return <Skeleton height={HEIGHT} rounded="lg" />;
  const campaigns = query.data ?? [];
  if (!campaigns.length) return null;
  const cardWidth = Math.max(0, width - 32 - (campaigns.length > 1 ? PEEK : 0));
  const step = cardWidth + GAP;

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    // The last card cannot scroll a full step, so the end of the list counts as the last card.
    const atEnd = contentOffset.x >= contentSize.width - layoutMeasurement.width - 2;
    const next = atEnd ? campaigns.length - 1 : Math.round(contentOffset.x / step);
    if (next !== index && next >= 0 && next < campaigns.length) setIndex(next);
  }

  return <View style={{ marginHorizontal: -16, minHeight: HEIGHT }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
    {width > 0 ? <ScrollView ref={scroller} horizontal showsHorizontalScrollIndicator={false} snapToInterval={step} decelerationRate="fast" onScroll={onScroll} scrollEventThrottle={32} contentContainerStyle={{ gap: GAP, paddingHorizontal: 16 }}>
      {campaigns.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} width={cardWidth} onPress={() => router.push(campaign.href as Href)} />)}
    </ScrollView> : null}
    {campaigns.length > 1 ? <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 2 }}>
      {campaigns.map((campaign, dot) => <Pressable key={campaign.id} accessibilityRole="button" accessibilityLabel={`Show offer ${dot + 1} of ${campaigns.length}`} accessibilityState={{ selected: dot === index }} hitSlop={{ top: 12, bottom: 12 }}
        onPress={() => { setIndex(dot); scroller.current?.scrollTo({ x: dot * step, animated: !reducedMotion }); }} style={{ minWidth: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: dot === index ? 20 : 8, height: 8, borderRadius: radius.full, backgroundColor: dot === index ? tokens.primary : tokens.border }} />
      </Pressable>)}
    </View> : null}
  </View>;
}
