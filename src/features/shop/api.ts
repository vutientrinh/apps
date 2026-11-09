import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, idempotencyHeaders, jsonBody } from '@/lib/api';
import type { Address, Wallet } from '@web/features/banking/types';
import type {
  Cart, CatalogHome, Category, CheckoutQuote, CheckoutRequest, CheckoutResult,
  PageResponse, PaymentIntent, ProductDetail, ProductSummary, SellerProfile,
} from '@web/features/commerce/types';

export type SearchParams = {
  q?: string; category?: string; minPrice?: string; maxPrice?: string;
  minRating?: string; sellerSlug?: string;
  sort?: 'relevance' | 'newest' | 'price_asc' | 'price_desc' | 'best_selling';
  page?: number; size?: number;
};

function paramsString(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  const result = query.toString();
  return result ? `?${result}` : '';
}

export const shopKeys = {
  home: ['catalog', 'home'] as const,
  categories: ['catalog', 'categories'] as const,
  products: (params: SearchParams) => ['catalog', 'products', params] as const,
  product: (slug: string) => ['catalog', 'product', slug] as const,
  seller: (slug: string) => ['catalog', 'seller', slug] as const,
  cart: ['cart'] as const,
  addresses: ['addresses'] as const,
  wallet: ['wallet', 'me'] as const,
  quote: (input: QuoteInput) => ['checkout', 'quote', input] as const,
  payment: (id: string) => ['payment-intent', id] as const,
  orders: ['orders'] as const,
};

export interface QuoteInput {
  cartItemIds: string[];
  addressId: string;
  shippingOptionIds?: Record<string, string>;
  voucherCode?: string;
}

export function useHome() {
  return useQuery({ queryKey: shopKeys.home, queryFn: () => apiRequest<CatalogHome>('/catalog/home') });
}

export function useCategories() {
  return useQuery({ queryKey: shopKeys.categories, queryFn: () => apiRequest<Category[]>('/catalog/categories') });
}

export function useProducts(params: SearchParams, enabled = true) {
  return useInfiniteQuery({
    queryKey: shopKeys.products(params),
    initialPageParam: 0,
    enabled,
    queryFn: ({ pageParam }) => apiRequest<PageResponse<ProductSummary>>(
      `/catalog/products${paramsString({ ...params, page: pageParam, size: params.size ?? 12 })}`,
    ),
    getNextPageParam: (lastPage) => lastPage.page + 1 < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
}

export function useProduct(slug: string) {
  return useQuery({ queryKey: shopKeys.product(slug), enabled: Boolean(slug), queryFn: () => apiRequest<ProductDetail>(`/catalog/products/${encodeURIComponent(slug)}`) });
}

export function useSeller(slug: string) {
  return useQuery({ queryKey: shopKeys.seller(slug), enabled: Boolean(slug), queryFn: () => apiRequest<SellerProfile>(`/catalog/sellers/${encodeURIComponent(slug)}`) });
}

export function useCart(enabled = true) {
  return useQuery({ queryKey: shopKeys.cart, enabled, queryFn: () => apiRequest<Cart>('/cart') });
}

function useCartMutation<TInput>(mutationFn: (input: TInput) => Promise<Cart>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (cart) => client.setQueryData(shopKeys.cart, cart),
  });
}

export function useAddCartItem() {
  return useCartMutation((input: { variantId: string; quantity: number }) => apiRequest<Cart>('/cart/items', { method: 'POST', body: jsonBody(input) }));
}

export function useUpdateCartItem() {
  return useCartMutation((input: { id: string; quantity?: number; selected?: boolean }) => {
    const { id, ...body } = input;
    return apiRequest<Cart>(`/cart/items/${encodeURIComponent(id)}`, { method: 'PATCH', body: jsonBody(body) });
  });
}

export function useDeleteCartItem() {
  return useCartMutation((id: string) => apiRequest<Cart>(`/cart/items/${encodeURIComponent(id)}`, { method: 'DELETE' }));
}

export function useAddresses(enabled: boolean) {
  return useQuery({ queryKey: shopKeys.addresses, enabled, queryFn: () => apiRequest<Address[]>('/me/addresses') });
}

export function useCreateAddress() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: Pick<Address, 'recipient' | 'phone' | 'address'>) => apiRequest<Address>('/me/addresses', { method: 'POST', body: jsonBody(input) }),
    onSuccess: () => client.invalidateQueries({ queryKey: shopKeys.addresses }),
  });
}

export function useWallet(enabled: boolean) {
  return useQuery({ queryKey: shopKeys.wallet, enabled, queryFn: () => apiRequest<Wallet>('/wallets/me') });
}

export function useQuote() {
  return useMutation({ mutationFn: (input: QuoteInput) => apiRequest<CheckoutQuote>('/checkout/quote', { method: 'POST', body: jsonBody(input) }) });
}

export function useCheckout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: CheckoutRequest; idempotencyKey: string }) => apiRequest<CheckoutResult>('/checkout', {
      method: 'POST', headers: idempotencyHeaders({ 'Idempotency-Key': idempotencyKey }), body: jsonBody(input),
    }),
    onSuccess: () => client.invalidateQueries({ queryKey: shopKeys.cart }),
  });
}

export function usePaymentIntent(id: string) {
  return useQuery({
    queryKey: shopKeys.payment(id), enabled: Boolean(id), queryFn: () => apiRequest<PaymentIntent>(`/payment-intents/${encodeURIComponent(id)}`),
    refetchInterval: (query) => query.state.data && ['CREATED', 'PROCESSING', 'REQUIRES_ACTION'].includes(query.state.data.status) ? 2500 : false,
    refetchIntervalInBackground: false,
  });
}

export function useConfirmPayment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, otpId, code, idempotencyKey }: { id: string; otpId: string; code: string; idempotencyKey: string }) => apiRequest<PaymentIntent>(`/payment-intents/${encodeURIComponent(id)}/confirm`, { method: 'POST', headers: idempotencyHeaders({ 'Idempotency-Key': idempotencyKey }), body: jsonBody({ otpId, code }) }),
    onSuccess: (intent) => client.setQueryData(shopKeys.payment(intent.id), intent),
  });
}

export function useCancelPayment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<PaymentIntent>(`/payment-intents/${encodeURIComponent(id)}/cancel`, { method: 'POST' }),
    onSuccess: (intent) => client.setQueryData(shopKeys.payment(intent.id), intent),
  });
}

export function useSimulatePayment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: 'SUCCEEDED' | 'FAILED' }) => apiRequest<PaymentIntent>(`/dev/payment-intents/${encodeURIComponent(id)}/simulate`, { method: 'POST', body: jsonBody({ outcome }) }),
    onSuccess: (intent) => client.setQueryData(shopKeys.payment(intent.id), intent),
  });
}

export function useRetryPayment() {
  return useMutation({
    mutationFn: ({ parentOrderId, paymentMethod, idempotencyKey }: { parentOrderId: string; paymentMethod: 'WALLET' | 'VIETQR'; idempotencyKey: string }) => apiRequest<PaymentIntent>(`/me/orders/${encodeURIComponent(parentOrderId)}/pay`, { method: 'POST', headers: idempotencyHeaders({ 'Idempotency-Key': idempotencyKey }), body: jsonBody({ paymentMethod }) }),
  });
}

export function useOrderList(enabled = true) {
  return useQuery({
    queryKey: [...shopKeys.orders, 'TO_SHIP'],
    enabled,
    queryFn: () => apiRequest<PageResponse<{ id: string; orderNumber: string; parentOrderId: string; total: string; status: string; seller: { name: string }; itemsPreview: { name: string; imageUrl: string; quantity: number; variantLabel: string }[] }>>('/me/orders?tab=TO_SHIP&page=0&size=50'),
  });
}

export function paymentError(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Try again.';
}
