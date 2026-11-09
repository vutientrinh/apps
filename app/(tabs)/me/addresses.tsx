import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import type { Address } from '@web/features/banking/types';
import { apiRequest } from '@/lib/api';
import { useTokens } from '@/theme/theme';
import { AppHeader, Button, EmptyState, ErrorState, Icon, ListItem, Screen, Skeleton, StatusBadge } from '@/ui';

export default function AddressesScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const query = useQuery({ queryKey: ['me', 'addresses'], queryFn: () => apiRequest<Address[]>('/me/addresses'), staleTime: 30_000 });
  return <Screen refreshing={query.isRefetching} onRefresh={() => { void query.refetch(); }}>
    <AppHeader title="Addresses" onBack={() => router.back()} />
    {query.isPending ? <View style={{ gap: 20, paddingTop: 16 }}>{[0, 1, 2].map((key) => <View key={key} style={{ gap: 8 }}><Skeleton width="45%" height={18} /><Skeleton width="85%" height={14} /></View>)}</View> : null}
    {query.isError ? <ErrorState message="Saved addresses could not be loaded." retry={() => { void query.refetch(); }} /> : null}
    {query.data?.length === 0 ? <EmptyState icon="MapPin" title="No saved addresses" description="You can add one at checkout. It will show up here for next time." action={<Button title="Continue shopping" variant="secondary" onPress={() => router.replace('/')} />} /> : null}
    {query.data?.length ? <View style={{ paddingTop: 4 }}>{query.data.map((address, index) => <ListItem key={address.id} divider={index < query.data.length - 1} leading={<Icon name="MapPin" size={20} color={tokens.mutedForeground} />} title={address.recipient} subtitle={`${address.phone}\n${address.address}`} trailing={address.isDefault ? <StatusBadge status="DEFAULT" label="Default" tone="info" icon="Star" /> : undefined} />)}</View> : null}
  </Screen>;
}
