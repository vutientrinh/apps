import BigJs from 'big.js';

/** Unicode minus (U+2212) — DESIGN.md §1 uses it instead of a hyphen for outgoing amounts. */
export const MINUS = '−';
/** Narrow no-break space between the number and the currency mark, so the amount never wraps. */
export const MONEY_GAP = ' ';

export interface MoneyParts {
  negative: boolean;
  /** Grouped absolute value, e.g. `1.250.000` (Vietnamese grouping: `.` thousands, `,` decimals). */
  number: string;
  /** Currency mark shown after the number, e.g. `₫`. */
  symbol: string;
  /** True when the rounded value is exactly zero. */
  zero: boolean;
}

function currencyDigits(currency: string): number {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

function currencySymbol(currency: string): string {
  if (currency === 'VND') return '₫';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
      .formatToParts(0).find((part) => part.type === 'currency')?.value ?? currency;
  } catch {
    return currency;
  }
}

/**
 * Splits a decimal-string amount into ledger parts with exact decimal rounding (no floating point).
 * Throws `RangeError` for anything that is not a plain decimal string.
 */
export function formatMoneyParts(amount: string, currency = 'VND'): MoneyParts {
  const trimmed = amount.trim();
  if (!/^[-+]?\d+(?:\.\d+)?$/.test(trimmed)) throw new RangeError('Invalid decimal amount');
  const digits = currencyDigits(currency);
  const rounded = new BigJs(trimmed).round(digits, BigJs.roundHalfUp);
  const zero = rounded.eq(0);
  const fixed = rounded.abs().toFixed(digits);
  const [whole = '0', fraction = ''] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return {
    negative: rounded.lt(0),
    number: fraction ? `${grouped},${fraction}` : grouped,
    symbol: currencySymbol(currency),
    zero,
  };
}

/**
 * Plain-string ledger amount (`1.250.000 ₫`, `−250.000 ₫`) for places that cannot render the `Money` component,
 * such as accessibility labels or share text. Screens should render `<Money>` instead.
 */
export function formatMoney(amount: string, currency = 'VND'): string {
  const parts = formatMoneyParts(amount, currency);
  return `${parts.negative ? MINUS : ''}${parts.number}${MONEY_GAP}${parts.symbol}`;
}
