import { useInfiniteQuery, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, jsonBody } from '@/lib/api';
import type { Cart, OrderDetail, PageResponse, ShopperOrder, ShopperOrderTab } from '@web/features/commerce/types';

const pageSize = 10;
export const orderKeys = {
  all: ['commerce', 'orders'] as const,
  list: (tab?: ShopperOrderTab) => ['commerce', 'orders', { tab, size: pageSize }] as const,
  detail: (id: string) => ['commerce', 'order', id] as const,
};

function orderQuery(tab: ShopperOrderTab | undefined, page: number, size: number) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (tab) params.set('tab', tab);
  return `/me/orders?${params.toString()}`;
}

export function useOrders(tab?: ShopperOrderTab) {
  return useInfiniteQuery({
    queryKey: orderKeys.list(tab),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => apiRequest<PageResponse<ShopperOrder>>(orderQuery(tab, pageParam, pageSize)),
    getNextPageParam: (lastPage) => lastPage.page + 1 < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
}

export function useOrderCounts(tabs: (ShopperOrderTab | undefined)[]) {
  return useQueries({ queries: tabs.map((tab) => ({
    queryKey: ['commerce', 'orders', { tab, page: 0, size: 1 }],
    queryFn: () => apiRequest<PageResponse<ShopperOrder>>(orderQuery(tab, 0, 1)),
    staleTime: 30_000,
  })) });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => apiRequest<OrderDetail>(`/me/orders/${encodeURIComponent(id)}`),
    enabled: Boolean(id),
  });
}

export function useOrderAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'cancel' | 'confirm-received'; reason?: string }) =>
      apiRequest<OrderDetail>(`/me/orders/${encodeURIComponent(id)}/${action}`, {
        method: 'POST',
        ...(action === 'cancel' ? { body: jsonBody({ reason }) } : {}),
      }),
    onSuccess: (order) => {
      void client.setQueryData(orderKeys.detail(order.id), order);
      void client.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

export function useBuyAgain() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const order = await client.fetchQuery({
        queryKey: orderKeys.detail(orderId),
        queryFn: () => apiRequest<OrderDetail>(`/me/orders/${encodeURIComponent(orderId)}`),
      });
      const restockable = order.items.filter((item) => item.variantId);
      let added = 0;
      let skipped = 0;
      for (const item of restockable) {
        try {
          await apiRequest<Cart>('/cart/items', {
            method: 'POST',
            body: jsonBody({ variantId: item.variantId, quantity: item.quantity }),
          });
          added += 1;
        } catch {
          skipped += 1;
        }
      }
      return { added, skipped: skipped + order.items.length - restockable.length };
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['commerce', 'cart'] }),
  });
}
