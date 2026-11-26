import BigJs from 'big.js';
import type { Transaction, Wallet } from '@web/features/banking/types';

export function transferAmountError(amount: string, wallet: Wallet | undefined): string | undefined {
  if (!/^\d+$/.test(amount) || amount === '0') return 'Enter a positive whole VND amount.';
  if (!wallet) return 'Wallet details are unavailable.';
  const value = new BigJs(amount);
  const available = new BigJs(wallet.availableBalance);
  const remaining = new BigJs(wallet.limits.monthlyOutflow).minus(wallet.limits.monthlyOutflowUsed);
  if (value.gt(available)) return 'Amount exceeds your available balance.';
  if (value.gt(wallet.limits.perTransaction)) return 'Amount exceeds your per-transfer limit.';
  if (value.gt(remaining)) return 'Amount exceeds your remaining monthly limit.';
  return undefined;
}

export function groupTransactionsByMonth(transactions: Transaction[], locale = 'en-US') {
  const groups = new Map<string, Transaction[]>();
  for (const transaction of transactions) {
    const date = new Date(transaction.createdAt);
    const key = Number.isNaN(date.valueOf()) ? 'Unknown date' : new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
    groups.set(key, [...(groups.get(key) ?? []), transaction]);
  }
  return [...groups.entries()];
}

/** Groups transactions by calendar day: "Today", "Yesterday", then a medium date. Keeps input order. */
export function groupTransactionsByDay(transactions: Transaction[], now = new Date(), locale = 'en-US') {
  const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const groups = new Map<string, Transaction[]>();
  for (const transaction of transactions) {
    const date = new Date(transaction.createdAt);
    const key = Number.isNaN(date.valueOf()) ? 'Earlier'
      : dayKey(date) === dayKey(now) ? 'Today'
      : dayKey(date) === dayKey(yesterday) ? 'Yesterday'
      : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
    groups.set(key, [...(groups.get(key) ?? []), transaction]);
  }
  return [...groups.entries()];
}

/** Human row title, e.g. "Sent to Lan Phạm", "Refund". */
export function transactionTitle(transaction: Pick<Transaction, 'type' | 'counterparty'>) {
  const name = transaction.counterparty?.maskedName;
  switch (transaction.type) {
    case 'TRANSFER_OUT': return name ? `Sent to ${name}` : 'Money sent';
    case 'TRANSFER_IN': return name ? `From ${name}` : 'Money received';
    case 'TOP_UP': return 'Top up';
    case 'PAYMENT': return 'Order payment';
    case 'REFUND': return 'Refund';
    case 'WITHDRAWAL': return 'Withdrawal';
    default: return 'Transaction';
  }
}

/** Monthly limit usage as a 0–100 percentage string for a progress fill; nonzero usage shows at least 2%. */
export function limitUsagePercent(used: string, limit: string) {
  const total = new BigJs(limit);
  if (total.lte(0)) return '0%';
  const percent = new BigJs(used).div(total).times(100);
  if (percent.gte(100)) return '100%';
  if (percent.gt(0) && percent.lt(2)) return '2%';
  return `${percent.toFixed(2)}%`;
}

export function filterTransactions(transactions: Transaction[], search: string) {
  const needle = search.trim().toLocaleLowerCase();
  if (!needle) return transactions;
  return transactions.filter((transaction) => [transaction.reference, transaction.note, transaction.counterparty?.maskedName, transaction.counterparty?.maskedPhone, transaction.type].some((value) => value?.toLocaleLowerCase().includes(needle)));
}

export function remainingMonthlyLimit(wallet: Wallet) {
  return new BigJs(wallet.limits.monthlyOutflow).minus(wallet.limits.monthlyOutflowUsed).toFixed(0);
}

export function transferStepForResponse(response: { status: string; otpId?: string }) {
  return response.status === 'OTP_REQUIRED' && response.otpId ? 'otp' as const : 'success' as const;
}

/** Lucide icon name per transaction type, so a row says what happened before you read it. */
export function transactionIcon(transaction: Pick<Transaction, 'type' | 'direction'>) {
  switch (transaction.type) {
    case 'TOP_UP': return 'Plus' as const;
    case 'PAYMENT': return 'ShoppingBag' as const;
    case 'REFUND': return 'Undo2' as const;
    case 'WITHDRAWAL': return 'Landmark' as const;
    case 'TRANSFER_IN': return 'ArrowDownLeft' as const;
    case 'TRANSFER_OUT': return 'ArrowUpRight' as const;
    default: return transaction.direction === 'IN' ? 'ArrowDownLeft' as const : 'ArrowUpRight' as const;
  }
}

/** Time only ("4:51 PM"), for rows already grouped under a day header. */
export function formatTime(value: string, locale = 'en-US') {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '' : new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(date);
}

/** Short day + time ("Nov 10, 4:51 PM"), for rows grouped by month. */
export function formatDayTime(value: string, locale = 'en-US') {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '' : new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

/** Number of statement filters that differ from the defaults (shown on the Filters button). */
export function activeFilterCount(filters: { type: string; direction: string; from: string; to: string }) {
  return [filters.type !== 'ALL', filters.direction !== 'ALL', Boolean(filters.from || filters.to)].filter(Boolean).length;
}
