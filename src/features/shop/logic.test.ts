import type { Cart, CheckoutRequest } from '@web/features/commerce/types';
import { cartSelectionUpdates, checkoutRequestKey, isPaymentTerminal, selectedCartItemIds } from './logic';

const cart: Cart = {
  groups: [
    { seller: { id: 's1', slug: 'one', name: 'One', location: 'HCMC', rating: '4.8' }, items: [
      { id: 'a', variantId: 'va', productSlug: 'a', name: 'Available selected', variantLabel: 'M', imageUrl: '', unitPrice: '100', quantity: 2, stock: 5, maxQuantity: 5, selected: true, available: true },
      { id: 'b', variantId: 'vb', productSlug: 'b', name: 'Unselected', variantLabel: 'L', imageUrl: '', unitPrice: '100', quantity: 1, stock: 5, maxQuantity: 5, selected: false, available: true },
    ] },
    { seller: { id: 's2', slug: 'two', name: 'Two', location: 'Hanoi', rating: '4.6' }, items: [
      { id: 'c', variantId: 'vc', productSlug: 'c', name: 'Unavailable', variantLabel: 'One size', imageUrl: '', unitPrice: '100', quantity: 1, stock: 0, maxQuantity: 0, selected: true, available: false },
      { id: 'd', variantId: 'vd', productSlug: 'd', name: 'Over stock', variantLabel: 'One size', imageUrl: '', unitPrice: '100', quantity: 4, stock: 2, maxQuantity: 2, selected: true, available: true },
    ] },
  ], selectedCount: 2, selectedSubtotal: '200',
};

const checkout: CheckoutRequest = {
  cartItemIds: ['a'], addressId: 'address-1', shippingOptionIds: { s1: 'standard' }, paymentMethod: 'VIETQR',
};

describe('shopping flow logic', () => {
  it('keeps cart grouping while selecting only available, in-stock chosen lines', () => {
    expect(cart.groups.map((group) => group.seller.name)).toEqual(['One', 'Two']);
    expect(selectedCartItemIds(cart)).toEqual(['a']);
    expect(selectedCartItemIds(undefined)).toEqual([]);
  });

  it('toggles one cart item without changing its seller neighbors', () => {
    expect(cartSelectionUpdates(cart, { type: 'item', itemId: 'b' })).toEqual([{ id: 'b', selected: true }]);
    expect(cartSelectionUpdates(cart, { type: 'item', itemId: 'missing' })).toEqual([]);
  });

  it('selects or clears only the requested seller group', () => {
    expect(cartSelectionUpdates(cart, { type: 'seller', sellerId: 's1' })).toEqual([{ id: 'b', selected: true }]);
    expect(cartSelectionUpdates(cart, { type: 'seller', sellerId: 's2' })).toEqual([
      { id: 'c', selected: false }, { id: 'd', selected: false },
    ]);
    expect(cartSelectionUpdates(cart, { type: 'seller', sellerId: 'missing' })).toEqual([]);
  });

  it('selects all across seller groups, then deselects all', () => {
    expect(cartSelectionUpdates(cart, { type: 'all' })).toEqual([{ id: 'b', selected: true }]);
    const fullySelected = { ...cart, groups: cart.groups.map((group) => ({ ...group, items: group.items.map((item) => ({ ...item, selected: true })) })) };
    expect(cartSelectionUpdates(fullySelected, { type: 'all' })).toEqual([
      { id: 'a', selected: false }, { id: 'b', selected: false }, { id: 'c', selected: false }, { id: 'd', selected: false },
    ]);
  });

  it('reuses the checkout idempotency key for an identical payload and rotates it when payload changes', () => {
    const state = { fingerprint: '', key: '' };
    const createKey = jest.fn().mockReturnValueOnce('key-1').mockReturnValueOnce('key-2');
    const first = checkoutRequestKey(state, checkout, createKey);
    const retry = checkoutRequestKey(first, checkout, createKey);
    const changed = checkoutRequestKey(retry, { ...checkout, paymentMethod: 'WALLET' }, createKey);
    expect(first.key).toBe('key-1');
    expect(retry.key).toBe('key-1');
    expect(changed.key).toBe('key-2');
    expect(createKey).toHaveBeenCalledTimes(2);
  });

  it('stops payment polling only at a terminal payment status', () => {
    expect(isPaymentTerminal('PROCESSING')).toBe(false);
    expect(isPaymentTerminal('REQUIRES_ACTION')).toBe(false);
    expect(isPaymentTerminal('SUCCEEDED')).toBe(true);
    expect(isPaymentTerminal('FAILED')).toBe(true);
  });
});
