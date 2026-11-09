import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useTokens } from '@/theme/theme';
import { AppHeader, Icon, ListItem, Screen, type IconName } from '@/ui';

const helpTopics: { title: string; subtitle: string; icon: IconName; href?: '/orders' | '/wallet' }[] = [
  { title: 'Orders and delivery', subtitle: 'Track a parcel or ask for a return in My orders.', icon: 'Truck', href: '/orders' },
  { title: 'Payments and wallet', subtitle: 'Every top-up, payment and refund is listed in your wallet statement.', icon: 'Wallet', href: '/wallet' },
  { title: 'Account access', subtitle: 'New devices ask for a one-time code sent to your phone.', icon: 'ShieldCheck' },
];

export default function HelpScreen() {
  const router = useRouter();
  const tokens = useTokens();
  return <Screen>
    <AppHeader title="Help" onBack={() => router.back()} />
    <View style={{ paddingTop: 4 }}>{helpTopics.map((topic, index) => <ListItem key={topic.title} chevron={Boolean(topic.href)} divider={index < helpTopics.length - 1} onPress={topic.href ? () => router.push(topic.href!) : undefined} leading={<Icon name={topic.icon} size={20} color={tokens.primary} />} title={topic.title} subtitle={topic.subtitle} />)}</View>
  </Screen>;
}
