import type { Cart, CheckoutRequest, PaymentIntentStatus } from '@web/features/commerce/types';

export interface CheckoutKeyState {
  fingerprint: string;
  key: string;
}

export type CartSelectionTarget =
  | { type: 'item'; itemId: string }
  | { type: 'seller'; sellerId: string }
  | { type: 'all' };

export interface CartSelectionUpdate {
  id: string;
  selected: boolean;
}

export function checkoutRequestKey(state: CheckoutKeyState, input: CheckoutRequest, createKey: () => string): CheckoutKeyState {
  const fingerprint = JSON.stringify(input);
  return state.fingerprint === fingerprint ? state : { fingerprint, key: createKey() };
}

export function selectedCartItemIds(cart: Cart | undefined): string[] {
  return cart?.groups.flatMap((group) => group.items
    .filter((item) => item.selected && item.available && item.quantity <= item.maxQuantity)
    .map((item) => item.id)) ?? [];
}

export function cartSelectionUpdates(cart: Cart | undefined, target: CartSelectionTarget): CartSelectionUpdate[] {
  if (!cart) return [];
  const allItems = cart.groups.flatMap((group) => group.items);
  const targetItems = target.type === 'item'
    ? allItems.filter((item) => item.id === target.itemId)
    : target.type === 'seller'
      ? cart.groups.find((group) => group.seller.id === target.sellerId)?.items ?? []
      : allItems;
  if (!targetItems.length) return [];
  const selected = target.type === 'item' ? !targetItems[0].selected : !targetItems.every((item) => item.selected);
  return targetItems.filter((item) => item.selected !== selected).map((item) => ({ id: item.id, selected }));
}

export function isPaymentTerminal(status: PaymentIntentStatus): boolean {
  return ['SUCCEEDED', 'FAILED', 'EXPIRED', 'CANCELLED'].includes(status);
}
