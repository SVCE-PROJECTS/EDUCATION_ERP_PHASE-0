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
    mutationFn: (record: AttendancePayload) => {
      console.log('=== ATTENDANCE API CALL ===');
      console.log('Sending to backend:', record);
      return attendanceService.save(record);
    },
    onSuccess: (data) => { 
      console.log('Attendance save successful:', data);
      qc.invalidateQueries({ queryKey: ['attendance'] }); 
      ok('Attendance saved successfully'); 
      options.onSuccess?.(); 
    },
    onError: (e: any) => {
      console.error('=== ATTENDANCE SAVE ERROR ===');
      console.error('Error object:', e);
      console.error('Response data:', e.response?.data);
      console.error('Response status:', e.response?.status);
      
      const errorMsg = e.response?.data?.message || e.message || 'Unknown error occurred';
      err('Failed to save attendance', errorMsg);
    },
  });
}
