import { fireEvent, render } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import type { Campaign } from '@web/features/commerce/types';
import { parseCampaigns } from '@/lib/campaigns';
import { CampaignStrip } from './campaign-strip';

jest.mock('expo-router', () => ({ useRouter: jest.fn(), router: { push: jest.fn() } }));

const push = jest.fn();
const campaign = (id: string, extra: Partial<Campaign> = {}): Campaign => ({
  id, title: `Title ${id}`, subtitle: 'Subtitle.', ctaLabel: 'Shop now', href: `/search?category=${id}`,
  image: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10z" fill="currentColor"/></svg>')}`,
  tone: 'brand', ...extra,
});

describe('parseCampaigns', () => {
  it('drops external or broken entries and falls back to the brand tone', () => {
    const result = parseCampaigns([
      campaign('a'),
      campaign('b', { href: 'https://example.com' }),
      campaign('c', { href: '//example.com' }),
      { id: 'd' },
      { ...campaign('e'), tone: 'teal' },
    ]);
    expect(result.map((item) => [item.id, item.tone])).toEqual([['a', 'brand'], ['e', 'brand']]);
  });

  it('rejects a response that is not a list', () => {
    expect(() => parseCampaigns({ content: [] })).toThrow();
  });
});

describe('CampaignStrip', () => {
  beforeEach(() => jest.mocked(useRouter).mockReturnValue({ push } as never));

  it('lays out every campaign with dots and opens its link', async () => {
    const view = await render(<CampaignStrip query={{ isLoading: false, data: [campaign('a'), campaign('b', { tone: 'deal' }), campaign('c', { tone: 'neutral' })] } as never} />);
    await fireEvent(view.root!, 'layout', { nativeEvent: { layout: { width: 375, height: 168 } } });
    expect(view.getByText('Title c')).toBeTruthy();
    expect(view.getByLabelText('Show offer 3 of 3')).toBeTruthy();
    await fireEvent.press(view.getByRole('link', { name: 'Title b. Subtitle. Shop now' }));
    expect(push).toHaveBeenCalledWith('/search?category=b');
  });

  it('shows a placeholder while loading and nothing without campaigns', async () => {
    const loading = await render(<CampaignStrip query={{ isLoading: true } as never} />);
    expect(loading.getByLabelText('Loading')).toBeTruthy();
    const empty = await render(<CampaignStrip query={{ isLoading: false, data: undefined } as never} />);
    expect(empty.toJSON()).toBeNull();
  });
});
