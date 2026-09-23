import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from '../services/toast';
import allocationService, { CreateAllocationPayload } from '../services/allocation.service';

const ok = (text1: string, text2?: string) => Toast.show({ type: 'success', text1, text2 });
const err = (text1: string, text2?: string) => Toast.show({ type: 'error', text1, text2 });

export function useFacultyAllocations(facultyId?: string) {
  return useQuery({
    queryKey: ['facultyAllocations', facultyId],
    queryFn: () => allocationService.getForFaculty(facultyId as string),
    enabled: !!facultyId,
    retry: false,
  });
}

export function useCreateAllocation(facultyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAllocationPayload) => allocationService.create(facultyId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facultyAllocations', facultyId] });
      ok('Allocation saved');
    },
    onError: (e: any) => {
      err(
        'Could not save allocation',
        e.response?.data?.message || 'This requires the /hod/faculty/:id/allocations backend route.'
      );
    },
  });
}

export function useRemoveAllocation(facultyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (allocationId: string) => allocationService.remove(facultyId, allocationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facultyAllocations', facultyId] });
      ok('Allocation removed');
    },
    onError: (e: any) => {
      err('Could not remove allocation', e.response?.data?.message);
    },
  });
}
