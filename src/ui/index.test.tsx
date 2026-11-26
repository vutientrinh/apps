import { useState } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text } from 'react-native';
import TabLayout from '../../app/(tabs)/_layout';
import { BottomBar, Button, CatalogImage, EmptyState, Icon, IconButton, ListItem, Money, OtpInput, SectionHeader, SegmentedTabs, Skeleton, StatusBadge, TextField } from './index';
import { PasswordStrength } from './auth';

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

describe('TASK-027 kit additions', () => {
  it('Button presses through the scale wrapper and blocks presses while loading', async () => {
    const onPress = jest.fn();
    const view = await render(<><Button title="Pay now" onPress={onPress} /><Button title="Buy again" size="sm" loading onPress={onPress} /></>);
    await fireEvent.press(view.getByLabelText('Pay now'));
    expect(onPress).toHaveBeenCalledTimes(1);
    await fireEvent.press(view.getByLabelText('Buy again'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('IconButton announces its badge and SectionHeader shows its action link', async () => {
    const onAction = jest.fn();
    const view = await render(<><IconButton icon="Bell" accessibilityLabel="Notifications" badge="3" /><SectionHeader title="My orders" actionLabel="View all" onAction={onAction} /></>);
    expect(view.getByLabelText('Notifications, 3')).toBeTruthy();
    expect(view.getByRole('header', { name: 'My orders' })).toBeTruthy();
    await fireEvent.press(view.getByText('View all'));
    expect(onAction).toHaveBeenCalled();
  });

  it('ListItem renders a destructive row, EmptyState a header, Skeleton a loading label', async () => {
    const onPress = jest.fn();
    const view = await render(<><ListItem inset destructive title="Sign out" onPress={onPress} /><EmptyState title="No saved addresses" /><Skeleton /></>);
    await fireEvent.press(view.getByText('Sign out'));
    expect(onPress).toHaveBeenCalled();
    expect(view.getByRole('header', { name: 'No saved addresses' })).toBeTruthy();
    expect(view.getByLabelText('Loading')).toBeTruthy();
  });

  it('PasswordStrength stays hidden until the user types', async () => {
    const empty = await render(<PasswordStrength password="" />);
    expect(empty.toJSON()).toBeNull();
    const typed = await render(<PasswordStrength password="abc12345" />);
    expect(typed.getByText('Good')).toBeTruthy();
  });
});

describe('TASK-027 F1 kit additions', () => {
  it('global lucide mock renders icons as testID views', async () => {
    const view = await render(<Icon name="ShoppingCart" />);
    expect(view.getByTestId('icon-ShoppingCart')).toBeTruthy();
  });

  it('Skeleton aspectRatio drops the fixed height (real square on web)', async () => {
    const view = await render(<Skeleton aspectRatio={1} rounded="lg" />);
    const style = StyleSheet.flatten(view.getByLabelText('Loading').props.style);
    expect(style).toMatchObject({ width: '100%', aspectRatio: 1, borderRadius: 14 });
    expect(style.height).toBeUndefined();
  });

  it('CatalogImage shows a placeholder icon without an image and a square box with fill', async () => {
    const view = await render(<CatalogImage uri="" size={56} accessibilityLabel="Home item 2" />);
    expect(view.getByTestId('icon-ImageOff')).toBeTruthy();
    expect(StyleSheet.flatten(view.getByLabelText('Home item 2').props.style)).toMatchObject({ width: 56, height: 56 });
    const filled = await render(<CatalogImage uri="" fill accessibilityLabel="Gallery" />);
    expect(StyleSheet.flatten(filled.getByLabelText('Gallery').props.style)).toMatchObject({ width: '100%', aspectRatio: 1 });
  });

  it('BottomBar shows the total and runs the primary action (no safe-area provider needed)', async () => {
    const onPress = jest.fn();
    const view = await render(<BottomBar amount="1959000" caption="2 items" action={{ title: 'Check out', onPress }} />);
    expect(view.getByText('Total')).toBeTruthy();
    expect(view.getByLabelText('1,959,000 dong')).toBeTruthy();
    await fireEvent.press(view.getByLabelText('Check out'));
    expect(onPress).toHaveBeenCalled();
  });

  it('TextField moves the focus ring to its wrapper', async () => {
    const view = await render(<TextField label="Phone number" />);
    const input = view.getByLabelText('Phone number');
    const wrapper = () => StyleSheet.flatten(view.getByLabelText('Phone number').parent?.props.style);
    expect(wrapper().boxShadow).toBeUndefined();
    await fireEvent(input, 'focus');
    expect(wrapper().boxShadow).toContain('0 0 0 1px');
    expect(StyleSheet.flatten(input.props.style).borderWidth).toBe(0);
  });
});

describe('SegmentedTabs', () => {
  it('scrolls an off-screen selected tab into view, and leaves a visible one alone', async () => {
    const scrollTo = jest.spyOn(ScrollView.prototype as unknown as { scrollTo: (options: unknown) => void }, 'scrollTo');
    const items = [{ key: 'ALL', label: 'All' }, { key: 'DELIVERED', label: 'Delivered' }];
    const view = await render(<SegmentedTabs items={items} selected="DELIVERED" onChange={jest.fn()} />);
    const layout = (x: number, width: number) => ({ nativeEvent: { layout: { x, y: 0, width, height: 40 } } });
    await fireEvent(view.root!, 'layout', layout(0, 200));
    await fireEvent(view.getByRole('tab', { name: 'All' }), 'layout', layout(0, 60));
    expect(scrollTo).not.toHaveBeenCalled();
    await fireEvent(view.getByRole('tab', { name: 'Delivered' }), 'layout', layout(400, 90));
    expect(scrollTo).toHaveBeenCalledWith({ x: 376, animated: false });
    scrollTo.mockRestore();
  });
});
