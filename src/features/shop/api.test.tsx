import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import type { CheckoutRequest, CheckoutResult } from '@web/features/commerce/types';
import { apiRequest } from '@/lib/api';
import { useCheckout } from './api';

jest.mock('@/lib/api', () => ({
  apiRequest: jest.fn(),
  idempotencyHeaders: (headers: HeadersInit = {}) => new Headers(headers),
  jsonBody: (value: unknown) => JSON.stringify(value),
}));

const input: CheckoutRequest = {
  cartItemIds: ['cart-item-1'], addressId: 'address-1', shippingOptionIds: { seller: 'standard' }, paymentMethod: 'VIETQR',
};
const result: CheckoutResult = {
  parentOrderId: 'parent-1', orderNumber: 'ORD-1', sellerOrders: [],
  paymentIntent: { id: 'intent-1', parentOrderId: 'parent-1', orderNumber: 'ORD-1', method: 'VIETQR', status: 'CREATED', amount: '50000', expiresAt: '2027-01-01T00:00:00Z' },
};

describe('checkout request idempotency', () => {
  it('sends the same Idempotency-Key when the same checkout is retried', async () => {
    jest.mocked(apiRequest).mockResolvedValue(result as never);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const hook = await renderHook(() => useCheckout(), { wrapper });

    await act(async () => {
      await hook.result.current.mutateAsync({ input, idempotencyKey: 'checkout-key-stable' });
      await hook.result.current.mutateAsync({ input, idempotencyKey: 'checkout-key-stable' });
    });

    const calls = jest.mocked(apiRequest).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls.map(([, init]) => new Headers(init?.headers).get('Idempotency-Key'))).toEqual(['checkout-key-stable', 'checkout-key-stable']);
    expect(calls.every(([path]) => path === '/checkout')).toBe(true);
    queryClient.clear();
  });
});
