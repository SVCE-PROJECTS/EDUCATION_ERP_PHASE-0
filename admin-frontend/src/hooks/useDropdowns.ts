// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { fetchDropdown, fetchSectionsBySemester } from '../services/dropdownService';

// type: 'program' | 'department' | 'section' | 'semester' | 'gender'
export const useDropdown = (type) => useQuery({
  queryKey: ['dropdown', type],
  queryFn: () => fetchDropdown(type),
  staleTime: 1000 * 60 * 30, // lookups rarely change - cache for 30 min
});

export const useSectionsBySemester = (semesterId) => useQuery({
  queryKey: ['dropdown', 'sections', semesterId],
  queryFn: () => fetchSectionsBySemester(semesterId),
  enabled: !!semesterId,
  staleTime: 1000 * 60 * 30,
});
