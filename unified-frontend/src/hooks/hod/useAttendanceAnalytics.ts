/**
 * HOD Attendance Analytics Hook
 * React Query wrapper for the HOD department-level attendance summary.
 */

import { useQuery } from '@tanstack/react-query';
import { hodAttendanceAnalyticsService } from '../../services/hod/attendanceAnalytics.service';

/** Returns YYYY-MM-DD for Aug 1 of the current academic year */
const academicYearStart = (): string => {
  const now  = new Date();
  const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-08-01`;
};

const todayStr = (): string => new Date().toISOString().slice(0, 10);

export const useHODAttendanceSummary = (from?: string, to?: string) =>
  useQuery({
    queryKey: ['hodAttendanceAnalytics', 'summary', from, to],
    queryFn: () => hodAttendanceAnalyticsService.getDeptSummary(
      from || academicYearStart(),
      to   || todayStr(),
    ),
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
