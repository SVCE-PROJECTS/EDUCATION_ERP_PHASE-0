/**
 * useClasses Hook
 * Fetches classes assigned to the logged-in faculty
 */
import { useQuery } from '@tanstack/react-query';
import { classService } from '../services/class.service';

export function useMyClasses() {
  return useQuery({
    queryKey: ['myClasses'],
    queryFn: () => classService.getMyClasses(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
