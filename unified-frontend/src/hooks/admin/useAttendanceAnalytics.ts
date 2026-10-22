// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { fetchAdminAttendanceSummary } from '../../services/admin/attendanceAnalyticsService';

const academicYearStart = (): string => {
  const now  = new Date();
  const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-08-01`;
};

const todayStr = (): string => new Date().toISOString().slice(0, 10);

export const useAdminAttendanceSummary = (from?: string, to?: string) =>
  useQuery({
    queryKey: ['adminAttendanceAnalytics', 'summary', from, to],
    queryFn: () => fetchAdminAttendanceSummary(
      from || academicYearStart(),
      to   || todayStr(),
    ),
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
