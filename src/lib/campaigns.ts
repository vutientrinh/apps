import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import type { Campaign } from '@web/features/commerce/types';
import { apiRequest } from './api';

/** Contract: `docs/product/api/campaigns.md` (`GET /campaigns`, public, read-only). */
const campaignSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string(),
  ctaLabel: z.string().min(1),
  // App-relative destinations only: never open an external URL from marketing data.
  href: z.string().regex(/^\/(?!\/)/),
  image: z.string(),
  tone: z.enum(['brand', 'deal', 'neutral']).catch('brand'),
});

/** Keeps the valid entries; one bad campaign never hides the others. */
export function parseCampaigns(data: unknown): Campaign[] {
  return z.array(z.unknown()).parse(data).flatMap((entry) => {
    const result = campaignSchema.safeParse(entry);
    return result.success ? [result.data] : [];
  });
}

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => parseCampaigns(await apiRequest<unknown>('/campaigns')),
    staleTime: 5 * 60_000,
  });
}
