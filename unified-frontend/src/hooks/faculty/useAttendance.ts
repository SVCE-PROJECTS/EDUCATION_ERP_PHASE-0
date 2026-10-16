import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from '../../services/faculty/toast';
import { attendanceService, AttendancePayload } from '../../services/faculty/academic.service';

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

// Dashboard tiles/charts (faculty-dashboard stats, weekly attendance trend,
// per-class attendance chart) and the Analytics overview all cache their own
// data separately from the Attendance screen — without invalidating these
// too, marking attendance saved correctly but both kept showing stale
// numbers until their own staleTime window happened to expire.
const invalidateDashboard = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['faculty-dashboard'] });
  qc.invalidateQueries({ queryKey: ['weekly-attendance'] });
  qc.invalidateQueries({ queryKey: ['class-attendance-statistics'] });
  qc.invalidateQueries({ queryKey: ['analytics', 'overview'] });
};

export function useMarkAttendance(options: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (record: AttendancePayload) => attendanceService.save(record),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
      invalidateDashboard(qc);
      ok('Attendance saved successfully');
      options.onSuccess?.();
    },
    onError: (e: any) => {
      const errorMsg = e.response?.data?.message || e.message || 'Unknown error occurred';
      err('Failed to save attendance', errorMsg);
    },
  });
}

export function useMarkAttendanceBulk(options: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (records: AttendancePayload[]) => attendanceService.saveBulk(records),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
      invalidateDashboard(qc);
      options.onSuccess?.();
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message || e.message || 'Failed to save attendance';
      err('Save failed', msg);
    },
  });
}
