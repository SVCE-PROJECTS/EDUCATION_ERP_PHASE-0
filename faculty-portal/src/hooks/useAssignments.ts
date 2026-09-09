import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from '../services/toast';
import { assignmentService, AssignmentPayload } from '../services/academic.service';

const ok  = (t: string) => Toast.show({ type: 'success', text1: t });
const err = (t: string, t2?: string) => Toast.show({ type: 'error', text1: t, text2: t2 });

export function useAssignments(params?: { class_id?: number; status?: string }) {
  return useQuery({
    queryKey: ['assignments', params],
    queryFn: () => assignmentService.getAll(params),
    placeholderData: (prev: unknown) => prev,
    staleTime: 30_000,
  });
}

export function useCreateAssignment(options: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AssignmentPayload) => assignmentService.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assignments'] }); ok('Assignment created'); options.onSuccess?.(); },
    onError: (e: any) => err('Create failed', e.response?.data?.message),
  });
}

export function useUpdateAssignment(id: number, options: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AssignmentPayload>) => assignmentService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assignments'] }); ok('Assignment updated'); options.onSuccess?.(); },
    onError: (e: any) => err('Update failed', e.response?.data?.message),
  });
}

export function useDeleteAssignment(options: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => assignmentService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assignments'] }); ok('Assignment deleted'); options.onSuccess?.(); },
    onError: (e: any) => err('Delete failed', e.response?.data?.message),
  });
}
