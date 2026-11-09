import { formatBadgeCount } from './badge';
import { formatMoney, formatMoneyParts } from './money';
import { isProtectedPath, returnPath } from './auth-guard';
import { darkTokens, lightTokens, withAlpha } from '../theme/tokens';

describe('money', () => {
  it('rounds exactly and groups with dots', () => {
    expect(formatMoneyParts('1250000.4')).toEqual({ negative: false, number: '1.250.000', symbol: '₫', zero: false });
    expect(formatMoneyParts('0.0001').zero).toBe(true);
    expect(formatMoney('-90000')).toBe('−90.000 ₫');
    expect(formatMoneyParts('12.345', 'USD').number).toBe('12,35');
  });

  it('rejects non-decimal input', () => {
    expect(() => formatMoneyParts('1e5')).toThrow(RangeError);
    expect(() => formatMoneyParts('')).toThrow(RangeError);
  });
});

describe('badge', () => {
  it('hides zero and caps at 99+', () => {
    expect(formatBadgeCount(0)).toBeUndefined();
    expect(formatBadgeCount(undefined)).toBeUndefined();
    expect(formatBadgeCount(7)).toBe('7');
    expect(formatBadgeCount(100)).toBe('99+');
  });
});

describe('auth guard', () => {
  it('protects account routes and keeps browse routes public', () => {
    for (const path of ['/cart', '/wallet', '/wallet/send', '/me', '/me/addresses', '/orders', '/orders/abc', '/checkout', '/pay/1', '/order-success', '/notifications']) {
      expect(isProtectedPath(path)).toBe(true);
    }
    for (const path of ['/', '/categories', '/search', '/product/ao-dai', '/shop/hanoi-home', '/login', '/walletish']) {
      expect(isProtectedPath(path)).toBe(false);
    }
  });

  it('keeps the query but drops dynamic segment params from the return path', () => {
    expect(returnPath('/orders', { status: 'PAID' })).toBe('/orders?status=PAID');
    expect(returnPath('/orders/abc', { id: 'abc' })).toBe('/orders/abc');
  });
});

describe('tokens', () => {
  it('match DESIGN.md primary values and expose the same keys in both schemes', () => {
    expect(lightTokens.primary).toBe('#006967');
    expect(darkTokens.primary).toBe('#5dc9c0');
    expect(Object.keys(darkTokens).sort()).toEqual(Object.keys(lightTokens).sort());
  });

  it('withAlpha builds rgba from hex', () => {
    expect(withAlpha('#006967', 0.1)).toBe('rgba(0, 105, 103, 0.1)');
    expect(withAlpha('#fff', 2)).toBe('rgba(255, 255, 255, 1)');
  });
});
