/**
 * Global Jest setup (owner: mobile-dev).
 *
 * Lucide icons: every `lucide-react-native` icon renders as `<View testID="icon-<Name>" />`, so feature tests no
 * longer need a local `jest.mock('@/ui/icon', …)` stub. Query icons with `getByTestId('icon-ShoppingCart')`.
 * A test that needs the real SVG icons can call `jest.unmock('lucide-react-native/icons')`.
 */
function mockLucideModule() {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const cache = new Map<string, unknown>();
  const iconFor = (name: string) => {
    if (!cache.has(name)) {
      const MockIcon = (props: { testID?: string }) => React.createElement(View, { testID: props.testID ?? `icon-${name}` });
      MockIcon.displayName = `MockIcon(${name})`;
      cache.set(name, MockIcon);
    }
    return cache.get(name);
  };
  // `__esModule` makes Babel's `import * as icons` hand back this proxy as-is, so any icon name resolves.
  return new Proxy({}, { get: (_target, key) => (key === '__esModule' ? true : typeof key === 'string' ? iconFor(key) : undefined) });
}

jest.mock('lucide-react-native/icons', () => mockLucideModule());
jest.mock('lucide-react-native', () => mockLucideModule());
