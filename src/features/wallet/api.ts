import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, apiRequestWithResponse, jsonBody } from '@/lib/api';
import type { Page, Recipient, TopUp, Transaction, Transfer, Wallet } from '@web/features/banking/types';

export type TransactionFilters = { type?: string; direction?: string; from?: string; to?: string };
const statementSize = 20;
export const walletKeys = {
  wallet: ['wallet'] as const,
  recent: ['wallet', 'transactions', { page: 0, size: 5 }] as const,
  transactions: ['wallet', 'transactions'] as const,
  contacts: ['wallet', 'contacts'] as const,
  recipient: (phone: string) => ['wallet', 'recipient', phone] as const,
  transaction: (id: string) => ['wallet', 'transaction', id] as const,
  topUp: (id: string) => ['topup', id] as const,
  qr: ['wallet', 'qr'] as const,
};

export function useWallet() {
  return useQuery({ queryKey: walletKeys.wallet, queryFn: () => apiRequest<Wallet>('/wallets/me') });
}

export function useTransactions(params: TransactionFilters = {}, size = 5) {
  const search = new URLSearchParams({ page: '0', size: String(size) });
  Object.entries(params).forEach(([key, value]) => { if (value) search.set(key, value); });
  return useQuery({ queryKey: ['wallet', 'transactions', { ...params, page: 0, size }], queryFn: () => apiRequest<Page<Transaction>>(`/wallets/me/transactions?${search}`) });
}

export function useStatement(params: TransactionFilters) {
  return useInfiniteQuery({
    queryKey: ['wallet', 'transactions', { ...params, size: statementSize }],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => {
      const search = new URLSearchParams({ page: String(pageParam), size: String(statementSize) });
      Object.entries(params).forEach(([key, value]) => { if (value) search.set(key, value); });
      return apiRequest<Page<Transaction>>(`/wallets/me/transactions?${search}`);
    },
    getNextPageParam: (lastPage) => lastPage.page + 1 < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
}

export function useTransaction(id: string) {
  return useQuery({ queryKey: walletKeys.transaction(id), queryFn: () => apiRequest<Transaction>(`/wallets/me/transactions/${encodeURIComponent(id)}`), enabled: Boolean(id) });
}

export function useContacts() {
  return useQuery({ queryKey: walletKeys.contacts, queryFn: () => apiRequest<Recipient[]>('/wallets/me/contacts') });
}

export function useRecipient(phone: string) {
  const normalized = phone.replace(/\D/g, '');
  return useQuery({ queryKey: walletKeys.recipient(normalized), queryFn: () => apiRequest<Recipient>(`/wallets/recipients/lookup?q=${encodeURIComponent(normalized)}`), enabled: false });
}

export function useQr() {
  return useQuery({ queryKey: walletKeys.qr, queryFn: () => apiRequest<{ payload: string; userId: string; maskedName: string }>('/wallets/me/qr') });
}

export function useTopUp(id: string) {
  return useQuery({
    queryKey: walletKeys.topUp(id),
    queryFn: () => apiRequest<TopUp>(`/top-ups/${encodeURIComponent(id)}`),
    enabled: Boolean(id),
    refetchInterval: (query) => query.state.data?.status === 'PENDING' ? 2_000 : false,
  });
}

export function useCreateTopUp() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ amount, idempotencyKey }: { amount: string; idempotencyKey: string }) =>
      apiRequest<TopUp>('/wallets/me/top-ups', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: jsonBody({ amount, method: 'VIETQR' }) }),
    onSuccess: (topUp) => client.invalidateQueries({ queryKey: walletKeys.topUp(topUp.id) }),
  });
}

export function useSimulateTopUp() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ wallet, topUp, idempotencyKey }: { wallet: Wallet; topUp: TopUp; idempotencyKey: string }) => {
      const accounts = await apiRequest<{ id: string; accountNo: string; balance: string }[]>('/bank-sim/accounts');
      const source = accounts.find((account) => account.id === wallet.id);
      if (!source) throw new Error('Mock bank account is unavailable for this wallet.');
      return apiRequest<{ id: string; status: string; reference: string }>('/bank-sim/transfers', {
        method: 'POST', headers: { 'Idempotency-Key': idempotencyKey },
        body: jsonBody({ fromAccountId: source.id, toReference: topUp.reference, amount: topUp.amount }),
      });
    },
    onSuccess: (_, input) => {
      void client.invalidateQueries({ queryKey: walletKeys.topUp(input.topUp.id) });
      void client.invalidateQueries({ queryKey: walletKeys.wallet });
      void client.invalidateQueries({ queryKey: walletKeys.transactions });
    },
  });
}

export function useSendTransfer() {
  return useMutation({
    mutationFn: async ({ recipientUserId, amount, note, key }: { recipientUserId: string; amount: string; note: string; key: string }) => {
      const { data, response } = await apiRequestWithResponse<Transfer>('/wallets/me/transfers', { method: 'POST', headers: { 'Idempotency-Key': key }, body: jsonBody({ recipientUserId, amount, note }) });
      // The mock backend returns the one-time code in this header in dev only; real backends never send it.
      return { ...data, devOtp: response.headers.get('X-Mock-OTP') ?? undefined };
    },
  });
}

export function useConfirmTransfer() {
  return useMutation({
    mutationFn: ({ transferId, otpId, code, key }: { transferId: string; otpId: string; code: string; key: string }) =>
      apiRequest<Transfer>(`/transfers/${encodeURIComponent(transferId)}/confirm`, { method: 'POST', headers: { 'Idempotency-Key': key }, body: jsonBody({ otpId, code }) }),
  });
}

export function useInvalidateWalletAfterTransfer() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: walletKeys.wallet });
    void client.invalidateQueries({ queryKey: walletKeys.transactions });
    void client.invalidateQueries({ queryKey: walletKeys.contacts });
  };
}
