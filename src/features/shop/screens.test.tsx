import { fireEvent, render } from '@testing-library/react-native';
import type { PaymentIntent } from '@web/features/commerce/types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCancelPayment, useConfirmPayment, useOrderList, usePaymentIntent, useRetryPayment, useSimulatePayment } from './api';
import { OrderSuccessScreen, PaymentScreen } from './screens';

// lucide-react-native ships ESM that the shared Jest config cannot load yet (mobile-dev owns jest.config.js).
jest.mock('@/ui/icon', () => {
  const { View } = jest.requireActual('react-native');
  return { Icon: ({ name }: { name: string }) => <View testID={`icon-${name}`} /> };
});

jest.mock('./api', () => ({
  useCancelPayment: jest.fn(), useConfirmPayment: jest.fn(), useOrderList: jest.fn(),
  usePaymentIntent: jest.fn(), useRetryPayment: jest.fn(), useSimulatePayment: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

jest.mock('expo-haptics', () => ({ notificationAsync: jest.fn(), NotificationFeedbackType: { Success: 'success' } }));

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockRetryPayment = jest.fn();
const router = { push: mockPush, replace: mockReplace, back: jest.fn() };
const seller = { id: 'seller-1', slug: 'shop', name: 'Test shop', location: 'HCMC', rating: '4.8' };
function pendingIntent(status: PaymentIntent['status']): PaymentIntent {
  return { id: 'intent-1', parentOrderId: 'parent-1', orderNumber: 'ORD-1', method: 'WALLET', status, amount: '50000', expiresAt: '2027-01-01T00:00:00Z' };
}

function configurePaymentMocks(intent: PaymentIntent) {
  jest.mocked(useLocalSearchParams).mockReturnValue({ intentId: intent.id, parentOrderId: intent.parentOrderId, orderNumber: intent.orderNumber, total: intent.amount, sellerOrders: '' } as never);
  jest.mocked(usePaymentIntent).mockReturnValue({ data: intent, isLoading: false, isError: false, refetch: jest.fn() } as never);
  jest.mocked(useCancelPayment).mockReturnValue({ mutate: jest.fn(), isPending: false } as never);
  jest.mocked(useConfirmPayment).mockReturnValue({ mutate: jest.fn(), isPending: false } as never);
  jest.mocked(useRetryPayment).mockReturnValue({ mutate: mockRetryPayment, isPending: false } as never);
  jest.mocked(useSimulatePayment).mockReturnValue({ mutate: jest.fn(), isPending: false } as never);
  jest.mocked(useOrderList).mockReturnValue({ data: { content: [] }, isLoading: false, isError: false, refetch: jest.fn() } as never);
  jest.mocked(useRouter).mockReturnValue(router as never);
}

describe('shopping screen flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useRouter).mockReturnValue(router as never);
  });

  it('moves a pending intent to the success route and renders the order success screen', async () => {
    configurePaymentMocks(pendingIntent('PROCESSING'));
    const view = await render(<PaymentScreen />);
    const succeeded = pendingIntent('SUCCEEDED');
    jest.mocked(usePaymentIntent).mockReturnValue({ data: succeeded, isLoading: false, isError: false, refetch: jest.fn() } as never);
    await view.rerender(<PaymentScreen />);
    expect(mockReplace).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/order-success', params: expect.objectContaining({ parentOrderId: 'parent-1', orderNumber: 'ORD-1' }) }));

    jest.mocked(useLocalSearchParams).mockReturnValue({ parentOrderId: 'parent-1', orderNumber: 'ORD-1', total: '50000', sellerOrders: JSON.stringify([{ id: 'seller-order-1', orderNumber: 'ORD-1-A', seller, total: '50000' }]) } as never);
    const successView = await render(<OrderSuccessScreen />);
    expect(successView.getByText('Order placed')).toBeTruthy();
    expect(successView.getByText('ORD-1-A')).toBeTruthy();
  });

  it('offers an alternate payment method after failure and reuses its retry key', async () => {
    const failed = pendingIntent('FAILED');
    configurePaymentMocks(failed);
    const view = await render(<PaymentScreen />);
    const retryButton = view.getByText('Try VietQR instead');
    await fireEvent.press(retryButton);
    await fireEvent.press(retryButton);

    expect(mockRetryPayment).toHaveBeenCalledTimes(2);
    const firstRequest = mockRetryPayment.mock.calls[0][0];
    const secondRequest = mockRetryPayment.mock.calls[1][0];
    expect(firstRequest).toEqual({ parentOrderId: 'parent-1', paymentMethod: 'VIETQR', idempotencyKey: expect.any(String) });
    expect(secondRequest.idempotencyKey).toBe(firstRequest.idempotencyKey);
  });

  it('confirms a wallet OTP from the dev-code chip without typing', async () => {
    const otpIntent = { ...pendingIntent('REQUIRES_ACTION'), otpRequired: true, otpId: 'otp-1' } as PaymentIntent;
    configurePaymentMocks(otpIntent);
    const mockConfirm = jest.fn();
    jest.mocked(useConfirmPayment).mockReturnValue({ mutate: mockConfirm, isPending: false } as never);
    const view = await render(<PaymentScreen />);
    await fireEvent.press(view.getByRole('button', { name: 'Fill dev code 123456' }));
    expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ id: 'intent-1', otpId: 'otp-1', code: '123456', idempotencyKey: expect.any(String) }), expect.anything());
  });
});
