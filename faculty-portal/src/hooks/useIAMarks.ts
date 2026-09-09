import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from '../services/toast';
import { iaMarksService, IAMarksPayload } from '../services/academic.service';

const ok  = (t: string) => Toast.show({ type: 'success', text1: t });
const err = (t: string, t2?: string) => Toast.show({ type: 'error', text1: t, text2: t2 });

export function useIAMarks(params?: { student_id?: string; class_id?: number }) {
  return useQuery({
    queryKey: ['ia-marks', params],
    queryFn: () => iaMarksService.getAll(params),
    placeholderData: (prev: unknown) => prev,
    staleTime: 30_000,
  });
}

export function useCreateIAMarks(options: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: IAMarksPayload) => iaMarksService.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ia-marks'] }); ok('IA marks saved'); options.onSuccess?.(); },
    onError: (e: any) => err('Save failed', e.response?.data?.message),
  });
}

export function useUpdateIAMarks(id: number, options: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { ia1?: number; ia2?: number; ia3?: number }) => iaMarksService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ia-marks'] }); ok('IA marks updated'); options.onSuccess?.(); },
    onError: (e: any) => err('Update failed', e.response?.data?.message),
  });
}

export function useDeleteIAMarks(options: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => iaMarksService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ia-marks'] }); ok('IA marks deleted'); options.onSuccess?.(); },
    onError: (e: any) => err('Delete failed', e.response?.data?.message),
  });
}
