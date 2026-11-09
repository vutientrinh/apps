import { useState } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Text } from 'react-native';
import TabLayout from '../../app/(tabs)/_layout';
import { Money, OtpInput, StatusBadge } from './index';

describe('Money (ledger numerals)', () => {
  it('formats decimal money exactly with Vietnamese grouping and the mark after the number', async () => {
    const view = await render(<Money amount="1959000" currency="VND" />);
    expect(view.getByText('₫')).toBeTruthy();
    expect(view.getByLabelText('1,959,000 dong')).toBeTruthy();
    expect(view.toJSON()).toMatchObject({ children: expect.arrayContaining(['1.959.000']) });
  });

  it('uses U+2212 for outgoing and + for incoming amounts', async () => {
    const out = await render(<Money amount="-250000" />);
    expect(out.getByLabelText('minus 250,000 dong')).toBeTruthy();
    expect(JSON.stringify(out.toJSON())).toContain('−');
    const incoming = await render(<Money amount="250000" direction="in" />);
    expect(JSON.stringify(incoming.toJSON())).toContain('"+"');
  });

  it('renders a dash instead of crashing on an invalid amount', async () => {
    const view = await render(<Money amount="abc" />);
    expect(view.getByText('—')).toBeTruthy();
  });
});

describe('StatusBadge', () => {
  it('shows status with an icon and a human label', async () => {
    const view = await render(<StatusBadge status="PAYMENT_FAILED" />);
    expect(view.getByText('Payment failed')).toBeTruthy();
    expect(view.getByLabelText('Payment failed, failed')).toBeTruthy();
  });
});

describe('OtpInput', () => {
  function Harness({ onComplete }: { onComplete: (value: string) => void }) {
    const [value, setValue] = useState('');
    return <OtpInput value={value} onChange={setValue} onComplete={onComplete} autoFocus={false} />;
  }

  it('keeps digits only and completes once six are entered (typing or paste)', async () => {
    const onComplete = jest.fn();
    const view = await render(<Harness onComplete={onComplete} />);
    await fireEvent.changeText(view.getByTestId('otp-input'), '12a3');
    expect(onComplete).not.toHaveBeenCalled();
    await fireEvent.changeText(view.getByTestId('otp-input'), '123 456 789');
    expect(onComplete).toHaveBeenCalledWith('123456');
    expect(view.getByText('6', { includeHiddenElements: true })).toBeTruthy();
    expect(view.getByTestId('otp-input').props.accessibilityValue).toEqual({ text: '1 2 3 4 5 6' });
  });
});

describe('tab shell', () => {
  it('renders the five destinations with no cart badge for guests', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await renderRouter({
      '(tabs)/_layout': () => <QueryClientProvider client={client}><TabLayout /></QueryClientProvider>,
      '(tabs)/index': () => <Text>Home content</Text>,
      '(tabs)/categories/index': () => <Text>Categories content</Text>,
      '(tabs)/wallet/index': () => <Text>Wallet content</Text>,
      '(tabs)/cart/index': () => <Text>Cart content</Text>,
      '(tabs)/me/index': () => <Text>Me content</Text>,
    }, { initialUrl: '/' });
    expect(screen.getByText('Home content')).toBeTruthy();
    for (const label of ['Categories', 'Wallet', 'Cart', 'Me']) expect(screen.getByText(label)).toBeTruthy();
    expect(screen.queryByText('0')).toBeNull();
  });
});
