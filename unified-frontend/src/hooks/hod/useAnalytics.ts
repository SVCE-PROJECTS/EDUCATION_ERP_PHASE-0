import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../../services/hod/analytics.service';

export const useAnalyticsOverview = () =>
  useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: analyticsService.getOverview,
    staleTime: 60_000,
    // Analytics aggregates data that can change from actions taken outside
    // this exact hook's own cache-invalidation list (another device/session,
    // an Admin/Faculty action, etc.) — always get a fresh read when the
    // screen is actually opened, rather than trusting staleTime/invalidation alone.
    refetchOnMount: 'always',
  });
