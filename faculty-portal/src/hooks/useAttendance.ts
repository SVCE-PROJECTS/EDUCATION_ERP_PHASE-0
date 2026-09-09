import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from '../services/toast';
import { attendanceService, AttendancePayload } from '../services/academic.service';

const ok  = (t: string) => Toast.show({ type: 'success', text1: t });
const err = (t: string, t2?: string) => Toast.show({ type: 'error', text1: t, text2: t2 });

export function useAttendance(params?: { class_id?: number; date?: string; student_id?: string }) {
  return useQuery({
    queryKey: ['attendance', params],
    queryFn: () => attendanceService.getAll(params),
    placeholderData: (prev: unknown) => prev,
    staleTime: 30_000,
  });
}

export function useMarkAttendance(options: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (record: AttendancePayload) => attendanceService.save(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance'] }); ok('Attendance saved'); options.onSuccess?.(); },
    onError: (e: any) => err('Save failed', e.response?.data?.message),
  });
}
