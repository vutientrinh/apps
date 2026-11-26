import { render } from '@testing-library/react-native';
import { darkTokens, lightTokens, mixColor } from '@/theme/tokens';
import { EmptyState, ErrorState, illustrationNames } from './index';
import { themedIllustration } from './illustration';

describe('illustration kit', () => {
  it('ships the 15 scenes the web kit names', () => {
    expect([...illustrationNames].sort()).toEqual([
      'empty-addresses', 'empty-cart', 'empty-notifications', 'empty-orders', 'empty-queue', 'empty-search',
      'empty-seller-products', 'empty-statement', 'empty-wishlist', 'error-generic', 'error-not-found', 'offline',
      'success-order', 'success-payment', 'success-transfer',
    ]);
  });

  it.each([['light', lightTokens], ['dark', darkTokens]] as const)('resolves every colour placeholder in %s', (_name, tokens) => {
    for (const name of illustrationNames) {
      const xml = themedIllustration(name, tokens);
      expect(xml).not.toContain('var(');
      expect(xml).toContain(tokens.primary);
    }
  });

  it('mixes two colours', () => {
    expect(mixColor('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixColor('#006967', '#ffffff', 1)).toBe('#006967');
  });
});

describe('EmptyState and ErrorState art', () => {
  it('picks the scene from a known icon and drops the icon tile', async () => {
    const view = await render(<EmptyState icon="ShoppingCart" title="Your cart is empty" />);
    expect(view.getByTestId('illustration-empty-cart', { includeHiddenElements: true })).toBeTruthy();
    expect(view.queryByTestId('icon-ShoppingCart', { includeHiddenElements: true })).toBeNull();
  });

  it('prefers an explicit scene, and keeps the icon for null or an unmapped icon', async () => {
    const explicit = await render(<EmptyState icon="Package" illustration="empty-statement" title="No activity yet" />);
    expect(explicit.getByTestId('illustration-empty-statement', { includeHiddenElements: true })).toBeTruthy();
    const optedOut = await render(<EmptyState icon="Package" illustration={null} title="None" />);
    expect(optedOut.getByTestId('icon-Package')).toBeTruthy();
    const unmapped = await render(<EmptyState icon="Store" title="Shop not found" />);
    expect(unmapped.getByTestId('icon-Store')).toBeTruthy();
  });

  it('ErrorState is inline unless a scene is asked for', async () => {
    const inline = await render(<ErrorState retry={jest.fn()} />);
    expect(inline.queryByTestId('illustration-error-generic', { includeHiddenElements: true })).toBeNull();
    const full = await render(<ErrorState illustration="offline" retry={jest.fn()} />);
    expect(full.getByTestId('illustration-offline', { includeHiddenElements: true })).toBeTruthy();
  });
});
