import BigJs from 'big.js';
import type { OrderAction, OrderDetail, SellerOrderStatus, ShopperOrder } from '@web/features/commerce/types';

export type PrimaryOrderAction = 'PAY' | 'CONFIRM_RECEIVED' | 'TRACK' | 'BUY_AGAIN' | null;

export function primaryOrderAction(order: ShopperOrder): PrimaryOrderAction {
  if (order.actions.includes('PAY')) return 'PAY';
  if (order.actions.includes('CONFIRM_RECEIVED')) return 'CONFIRM_RECEIVED';
  if (order.actions.includes('TRACK')) return 'TRACK';
  if (['COMPLETED', 'CANCELLED', 'REFUNDED', 'RETURNED'].includes(order.status)) return 'BUY_AGAIN';
  return null;
}

export function canOrderAction(order: ShopperOrder, action: OrderAction): boolean {
  return order.actions.includes(action);
}

const orderTabKeys = ['ALL', 'TO_PAY', 'TO_SHIP', 'SHIPPING', 'DELIVERED', 'RETURNS', 'CANCELLED'] as const;
export type OrderTabKey = (typeof orderTabKeys)[number];

/** Initial My orders tab from the `?tab=` route param (e.g. `/orders?tab=TO_SHIP` from Me). Unknown or missing → ALL. */
export function initialOrderTab(param: string | string[] | undefined): OrderTabKey {
  const value = (Array.isArray(param) ? param[0] : param)?.toUpperCase();
  return orderTabKeys.find((key) => key === value) ?? 'ALL';
}

/** The happy path an order walks, in order. */
export const progressSteps = ['PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'COMPLETED'] as const;
export type ProgressStepKey = (typeof progressSteps)[number] | 'DELIVERY_FAILED';
export type ProgressState = 'done' | 'current' | 'upcoming' | 'failed';
export interface ProgressStep { key: ProgressStepKey; label: string; state: ProgressState; at?: string }

const stepLabels: Record<ProgressStepKey, string> = {
  PENDING_PAYMENT: 'Ordered', PAID: 'Paid', CONFIRMED: 'Confirmed by seller', PACKED: 'Packed',
  SHIPPED: 'Shipped', DELIVERED: 'Delivered', COMPLETED: 'Completed', DELIVERY_FAILED: 'Delivery failed',
};

export function statusLabel(status: string): string {
  return stepLabels[status as ProgressStepKey] ?? status.toLowerCase().replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase());
}

/** Statuses after which the delivery stepper no longer applies (the badge and headline say it all). */
export const terminalOrderStatuses: SellerOrderStatus[] = ['CANCELLED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED'];

/**
 * Progress for the order stepper. The reached step is the furthest of the current status and any timeline event,
 * so statuses the stepper does not list (or a timeline that runs ahead) never leave every step grey.
 * Steps before the reached one are `done`, the reached one is `current` (the latest thing that happened).
 * DELIVERY_FAILED replaces "Delivered" with a failed step and stops there.
 */
export function orderProgress(order: Pick<OrderDetail, 'status' | 'timeline'>): ProgressStep[] {
  const index = (status: string) => progressSteps.indexOf(status as (typeof progressSteps)[number]);
  const failed = order.status === 'DELIVERY_FAILED';
  const reached = Math.max(failed ? index('SHIPPED') : index(order.status), ...order.timeline.map((event) => index(event.status)));
  const at = (status: string) => [...order.timeline].reverse().find((event) => event.status === status)?.at;
  const steps: ProgressStep[] = progressSteps.map((key, position) => ({
    key, label: stepLabels[key], at: at(key),
    state: position < reached ? 'done' : position === reached ? (failed ? 'done' : 'current') : 'upcoming',
  }));
  if (!failed) return steps;
  const deliveredAt = steps.findIndex((step) => step.key === 'DELIVERED');
  return [...steps.slice(0, deliveredAt), { key: 'DELIVERY_FAILED', label: stepLabels.DELIVERY_FAILED, state: 'failed', at: at('DELIVERY_FAILED') }];
}

/** One plain sentence about where the order is, for the top of the order detail screen. */
export function orderHeadline(status: SellerOrderStatus): string {
  switch (status) {
    case 'PENDING_PAYMENT': return 'Waiting for your payment';
    case 'PAID': return 'Paid. Waiting for the seller to confirm';
    case 'CONFIRMED': return 'The seller is preparing your order';
    case 'PACKED': return 'Packed and ready to ship';
    case 'SHIPPED': return 'On its way to you';
    case 'DELIVERED': return 'Delivered. Check it and confirm';
    case 'COMPLETED': return 'Order completed';
    case 'CANCELLED': return 'Order cancelled';
    case 'RETURN_REQUESTED': return 'Return requested';
    case 'RETURNED': return 'Returned to the seller';
    case 'REFUNDED': return 'Refunded';
    case 'DELIVERY_FAILED': return 'Delivery did not go through';
    default: return statusLabel(status);
  }
}

/** Sum of line totals, as a decimal string (big.js, never floats). */
export function orderSubtotal(items: Pick<OrderDetail['items'][number], 'lineTotal'>[]): string {
  return items.reduce((sum, item) => sum.plus(item.lineTotal), new BigJs(0)).toFixed(0);
}
