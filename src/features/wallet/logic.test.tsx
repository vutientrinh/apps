import { fireEvent, render } from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';
import BigJs from 'big.js';
import type { Wallet, Transaction } from '@web/features/banking/types';
import { AmountKeypad } from './screens';
import { filterTransactions, groupTransactionsByDay, groupTransactionsByMonth, limitUsagePercent, transactionTitle, transferAmountError, transferStepForResponse } from './logic';

const wallet: Wallet = { id: 'u1', status: 'ACTIVE', currency: 'VND', ledgerBalance: '8000000', heldAmount: '0', availableBalance: '8000000', kycTier: 1, limits: { maxBalance: '100000000', perTransaction: '5000000', monthlyOutflow: '10000000', monthlyOutflowUsed: '7000000' } };
const transaction = (id: string, createdAt: string, reference = id): Transaction => ({ id, type: 'TRANSFER_OUT', direction: 'OUT', status: 'COMPLETED', amount: '1000', balanceAfter: '9000', reference, note: '', createdAt, journalId: '', timeline: [] });

describe('wallet flows', () => {
  it('uses keypad taps to enter and clear digits', async () => {
    function KeypadHarness() {
      const [amount, setAmount] = useState('');
      return <><Text accessibilityLabel="Current amount">{amount || '0'}</Text><AmountKeypad amount={amount} setAmount={setAmount} onEdit={() => undefined} /></>;
    }
    const { getByLabelText } = await render(<KeypadHarness />);
    await fireEvent.press(getByLabelText('4'));
    expect(getByLabelText('Current amount').props.children).toBe('4');
    await fireEvent.press(getByLabelText('Clear amount'));
    expect(getByLabelText('Current amount').props.children).toBe('0');
  });

  it.each([
    ['', 'Enter a positive whole VND amount.'],
    ['0', 'Enter a positive whole VND amount.'],
    ['8000001', 'Amount exceeds your available balance.'],
    ['5000001', 'Amount exceeds your per-transfer limit.'],
    ['4000000', 'Amount exceeds your remaining monthly limit.'],
    ['3000000', undefined],
  ])('validates transfer amount %s', (amount, expected) => {
    expect(transferAmountError(amount, wallet)).toBe(expected);
  });

  it('moves an above-threshold transfer into the OTP step when the server requires it', () => {
    const amount = '2000001';
    const mockOtpThreshold = '2000000';
    const serverResponse = new BigJs(amount).gt(mockOtpThreshold)
      ? { status: 'OTP_REQUIRED', otpId: 'otp-1' }
      : { status: 'COMPLETED' };
    expect(transferStepForResponse(serverResponse)).toBe('otp');
    expect(transferStepForResponse({ status: 'COMPLETED' })).toBe('success');
  });

  it('groups statement rows by month and filters loaded rows locally', () => {
    const rows = [transaction('a', '2026-11-06T12:00:00.000Z', 'ABC-1'), transaction('b', '2026-10-01T12:00:00.000Z', 'XYZ-2')];
    expect(groupTransactionsByMonth(rows, 'en-US').map(([month]) => month)).toEqual(['November 2026', 'October 2026']);
    expect(filterTransactions(rows, 'abc')).toEqual([rows[0]]);
  });

  it('groups wallet-home rows into Today, Yesterday and dated days', () => {
    const now = new Date(2026, 10, 9, 15, 0);
    const rows = [transaction('a', new Date(2026, 10, 9, 9).toISOString()), transaction('b', new Date(2026, 10, 8, 20).toISOString()), transaction('c', new Date(2026, 10, 2, 8).toISOString())];
    expect(groupTransactionsByDay(rows, now).map(([day, items]) => [day, items.length])).toEqual([['Today', 1], ['Yesterday', 1], ['Nov 2, 2026', 1]]);
  });

  it('titles rows by what happened, not by the raw type', () => {
    expect(transactionTitle({ type: 'TRANSFER_OUT', counterparty: { userId: 'u2', maskedName: 'Lan P.', maskedPhone: '09***12' } })).toBe('Sent to Lan P.');
    expect(transactionTitle({ type: 'TRANSFER_IN', counterparty: undefined })).toBe('Money received');
    expect(transactionTitle({ type: 'REFUND', counterparty: undefined })).toBe('Refund');
  });

  it.each([
    ['0', '10000000', '0.00%'],
    ['100', '10000000', '2%'],
    ['4200000', '10000000', '42.00%'],
    ['12000000', '10000000', '100%'],
    ['5', '0', '0%'],
  ])('shows limit usage %s of %s as %s without floats', (used, limit, expected) => {
    expect(limitUsagePercent(used, limit)).toBe(expected);
  });
});
