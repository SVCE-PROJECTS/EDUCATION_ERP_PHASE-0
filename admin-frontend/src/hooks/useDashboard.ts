
// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { fetchDashboardStats } from '../services/dashboardService';

export const useDashboard = () =>
  useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: fetchDashboardStats,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

