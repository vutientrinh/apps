import type { OrderAction, ShopperOrder } from '@web/features/commerce/types';

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
