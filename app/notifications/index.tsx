import { useRouter } from 'expo-router';
import { AppHeader, Button, EmptyState, Screen } from '@/ui';

export default function NotificationsScreen() {
  const router = useRouter();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/me'));
  return <Screen>
    <AppHeader title="Notifications" onBack={back} />
    <EmptyState icon="BellOff" title="You're all caught up" description="Order updates and account alerts will appear here." action={<Button title="View my orders" variant="secondary" onPress={() => router.push('/orders')} />} />
  </Screen>;
}
