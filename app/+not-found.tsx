import { useRouter } from 'expo-router';
import { Button, EmptyState, Screen } from '@/ui';

export default function NotFoundScreen() {
  const router = useRouter();
  return <Screen>
    <EmptyState icon="SearchX" title="This page doesn't exist" description="The link may be old or mistyped." action={<Button title="Go to Home" onPress={() => router.replace('/')} />} />
  </Screen>;
}
