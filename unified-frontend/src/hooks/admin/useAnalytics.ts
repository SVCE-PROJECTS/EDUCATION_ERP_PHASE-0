// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { fetchAnalyticsOverview } from '../../services/admin/analyticsService';

export const useAnalyticsOverview = () =>
  useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: fetchAnalyticsOverview,
    staleTime: 60_000,
    // Analytics aggregates data that can change from actions taken outside
    // this exact hook's own cache-invalidation list (another device/session,
    // an HOD/Faculty action, etc.) — always get a fresh read when the screen
    // is actually opened, rather than trusting staleTime/invalidation alone.
    refetchOnMount: 'always',
  });
