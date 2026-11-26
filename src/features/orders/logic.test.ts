import type { ShopperOrder } from '@web/features/commerce/types';
import { initialOrderTab, orderHeadline, orderProgress, orderSubtotal, primaryOrderAction } from './logic';

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

const at = '2026-11-06T04:00:00.000Z';
const states = (steps: ReturnType<typeof orderProgress>) => steps.map((step) => `${step.key}:${step.state}`);

describe('orderProgress', () => {
  it('marks PACKED as reached (it used to leave every step grey)', () => {
    const steps = orderProgress({ status: 'PACKED', timeline: [{ status: 'PENDING_PAYMENT', at }, { status: 'PAID', at }, { status: 'CONFIRMED', at }, { status: 'PACKED', at }] });
    expect(states(steps)).toEqual(['PENDING_PAYMENT:done', 'PAID:done', 'CONFIRMED:done', 'PACKED:current', 'SHIPPED:upcoming', 'DELIVERED:upcoming', 'COMPLETED:upcoming']);
    expect(steps[3]?.at).toBe(at);
  });

  it('ends DELIVERY_FAILED with a failed step after Shipped', () => {
    const steps = orderProgress({ status: 'DELIVERY_FAILED', timeline: [{ status: 'SHIPPED', at }] });
    expect(states(steps).slice(-2)).toEqual(['SHIPPED:done', 'DELIVERY_FAILED:failed']);
    expect(steps).toHaveLength(6);
  });

  it('follows a timeline that runs ahead of the status', () => {
    expect(states(orderProgress({ status: 'PAID', timeline: [{ status: 'SHIPPED', at }] }))[4]).toBe('SHIPPED:current');
  });
});

describe('order detail helpers', () => {
  it('writes a headline for every status', () => {
    expect(orderHeadline('SHIPPED')).toBe('On its way to you');
    expect(orderHeadline('DELIVERY_FAILED')).toBe('Delivery did not go through');
  });

  it('sums line totals without floats', () => {
    expect(orderSubtotal([{ lineTotal: '679000' }, { lineTotal: '0.1' }, { lineTotal: '0.2' }])).toBe('679000');
    expect(orderSubtotal([{ lineTotal: '1999999999999999' }, { lineTotal: '1' }])).toBe('2000000000000000');
  });
});

describe('initialOrderTab', () => {
  it.each([
    ['TO_PAY', 'TO_PAY'], ['to_ship', 'TO_SHIP'], ['SHIPPING', 'SHIPPING'], ['DELIVERED', 'DELIVERED'],
    [['TO_SHIP', 'TO_PAY'], 'TO_SHIP'], ['bogus', 'ALL'], [undefined, 'ALL'], ['', 'ALL'],
  ] as const)('maps %p to %s', (param, expected) => {
    expect(initialOrderTab(param as string | string[] | undefined)).toBe(expected);
  });
});
