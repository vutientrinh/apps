import type { ShopperOrder } from '@web/features/commerce/types';
import { primaryOrderAction } from './logic';

function order(status: ShopperOrder['status'], actions: ShopperOrder['actions']): ShopperOrder {
  return { id: 'o1', orderNumber: 'ORD-1', parentOrderId: 'p1', paymentIntentId: 'pi1', seller: { id: 's1', slug: 'shop', name: 'Shop', location: '', rating: '5' }, status, itemsPreview: [], itemCount: 0, total: '0', createdAt: '2026-01-01T00:00:00.000Z', actions };
}

describe('primaryOrderAction', () => {
  it.each([
    ['PENDING_PAYMENT', ['PAY'], 'PAY'],
    ['DELIVERED', ['CONFIRM_RECEIVED', 'TRACK'], 'CONFIRM_RECEIVED'],
    ['SHIPPED', ['TRACK'], 'TRACK'],
    ['COMPLETED', [], 'BUY_AGAIN'],
    ['CANCELLED', [], 'BUY_AGAIN'],
    ['PAID', [], null],
  ] as const)('selects the allowed primary action for %s', (status, actions, expected) => {
    expect(primaryOrderAction(order(status, [...actions]))).toBe(expected);
  });
});
