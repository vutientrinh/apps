import { act, fireEvent, render } from '@testing-library/react-native';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import type { Variant } from '@web/features/commerce/types';
import { discountPercent, ProductPurchaseBar, VariantChips, VariantSheet } from './components';

const variants: Variant[] = [
  { id: 'blue-m', sku: 'BLUE-M', options: { Color: 'Blue', Size: 'M' }, price: '150000', stock: 4, weightGrams: 200 },
  { id: 'red-sold-out', sku: 'RED', options: { Color: 'Red' }, price: '150000', stock: 0, weightGrams: 200 },
  { id: 'green-l', sku: 'GREEN-L', options: { Color: 'Green', Size: 'L' }, price: '160000', stock: 2, weightGrams: 220 },
];

function VariantAddHarness({ onAdd, onSelect }: { onAdd: (variant: Variant) => void; onSelect: (variant: Variant) => void }) {
  const [selected, setSelected] = useState(variants[0]);
  return <>
    <VariantSheet visible variants={variants} selectedId={selected.id} onClose={() => undefined} onSelect={(variant) => { setSelected(variant); onSelect(variant); }} />
    <Pressable accessibilityRole="button" accessibilityLabel="Add to cart" onPress={() => onAdd(selected)}><Text>Add to cart</Text></Pressable>
  </>;
}

describe('VariantSheet', () => {
  it('selects an available variant and prevents choosing an out-of-stock variant', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const view = await render(<VariantSheet visible variants={variants} onClose={onClose} onSelect={onSelect} />);

    await act(async () => { fireEvent.press(view.getByRole('radio', { name: 'Blue / M' })); });
    expect(onSelect).toHaveBeenCalledWith(variants[0]);
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => { fireEvent.press(view.getByRole('radio', { name: 'Red' })); });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('uses the selected bottom-sheet option when adding to cart', async () => {
    const onAdd = jest.fn();
    const onSelect = jest.fn();
    const view = await render(<VariantAddHarness onSelect={onSelect} onAdd={onAdd} />);

    await act(async () => { fireEvent.press(view.getByRole('radio', { name: 'Green / L' })); });
    await act(async () => { fireEvent.press(view.getByText('Add to cart')); });

    expect(onSelect).toHaveBeenCalledWith(variants[2]);
    expect(onAdd).toHaveBeenCalledWith(variants[2]);
  });
});

describe('discountPercent', () => {
  it('returns the whole-percent discount only for a real markdown', () => {
    expect(discountPercent('150000', '200000')).toBe(25);
    expect(discountPercent('199999', '200000')).toBeNull();
    expect(discountPercent('200000', '200000')).toBeNull();
    expect(discountPercent('250000', '200000')).toBeNull();
    expect(discountPercent('150000')).toBeNull();
    expect(discountPercent('150000', 'not-a-number')).toBeNull();
  });
});

describe('VariantChips', () => {
  it('picks a variant in one tap and keeps out-of-stock variants unselectable', async () => {
    const onSelect = jest.fn();
    const view = await render(<VariantChips variants={variants} selectedId="blue-m" onSelect={onSelect} />);

    await act(async () => { fireEvent.press(view.getByRole('radio', { name: 'Green / L' })); });
    expect(onSelect).toHaveBeenCalledWith(variants[2]);

    await act(async () => { fireEvent.press(view.getByRole('radio', { name: 'Red, out of stock' })); });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(view.getByText('Only 4 left')).toBeTruthy();
  });
});

describe('ProductPurchaseBar', () => {
  it('adds the selected variant, or buys it now', async () => {
    const onAdd = jest.fn();
    const view = await render(<ProductPurchaseBar variant={variants[0]} soldOut={false} onAdd={onAdd} onSimilar={jest.fn()} />);

    await act(async () => { fireEvent.press(view.getByRole('button', { name: 'Add to cart' })); });
    await act(async () => { fireEvent.press(view.getByRole('button', { name: 'Buy now' })); });
    expect(onAdd).toHaveBeenNthCalledWith(1, variants[0], false);
    expect(onAdd).toHaveBeenNthCalledWith(2, variants[0], true);
  });

  it('shows an add-to-cart error while keeping both actions available', async () => {
    const view = await render(<ProductPurchaseBar variant={variants[0]} soldOut={false} error="Not enough stock" onAdd={jest.fn()} onSimilar={jest.fn()} />);

    expect(view.getByRole('alert')).toHaveTextContent('Not enough stock');
    expect(view.getByRole('button', { name: 'Add to cart' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Buy now' })).toBeTruthy();
  });

  it('says the product is sold out and offers similar products instead of dead buttons', async () => {
    const onSimilar = jest.fn();
    const view = await render(<ProductPurchaseBar variant={variants[1]} soldOut onAdd={jest.fn()} onSimilar={onSimilar} />);

    expect(view.getByText('Sold out')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Add to cart' })).toBeNull();
    await act(async () => { fireEvent.press(view.getByRole('button', { name: 'See similar' })); });
    expect(onSimilar).toHaveBeenCalled();
  });
});
