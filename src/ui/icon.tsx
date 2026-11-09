import type { ComponentType } from 'react';
import * as icons from 'lucide-react-native/icons';
import type { LucideProps } from 'lucide-react-native';

export type IconName = keyof typeof icons;

const registry: Record<IconName, ComponentType<LucideProps>> = icons;

/**
 * Lucide icon by typed PascalCase name: `<Icon name="ShoppingCart" color={tokens.primary} />`.
 * Defaults: 24 pt, stroke 2. Always pass a token colour; pair status icons with a text label.
 */
export function Icon({ name, ...props }: LucideProps & { name: IconName }) {
  const Glyph = registry[name];
  return <Glyph size={24} strokeWidth={2} {...props} />;
}
