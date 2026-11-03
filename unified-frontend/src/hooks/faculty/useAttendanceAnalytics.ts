/**
 * Attendance Analytics Hooks — Faculty Portal
 *
 * React Query wrappers for the Step C analytics endpoints.
 * Each hook is disabled when classId is missing/invalid (enabled: false)
 * so the UI can render safely before a class is selected.
 *
 * Cache keys are namespaced under ['attendanceAnalytics'] so they are
 * distinct from the existing ['attendance'] and ['analytics', 'overview'] caches
 * and are not accidentally invalidated by attendance mutations.
 *
 * staleTime: 2 minutes — analytics data is refreshed by the backend pipeline
 * on a configurable schedule, so frequent client-side refetching adds no value.
 * The freshness endpoint is queried separately with a 30-second staleTime.
 */

import { useQuery } from '@tanstack/react-query';
import {
  attendanceAnalyticsService,
  SummaryParams,
  RisksParams,
  TrendsParams,
  RecoveryParams,
} from '../../services/faculty/attendanceAnalytics.service';

const STALE_MS = 2 * 60 * 1000;  // 2 minutes

// ── Date helpers ──────────────────────────────────────────────────────────────

/** Returns YYYY-MM-DD for the first day of the current academic semester (Aug 1) */
export const academicYearStart = (): string => {
  const now  = new Date();
  const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-08-01`;
};

/** Returns today as YYYY-MM-DD */
export const today = (): string => new Date().toISOString().slice(0, 10);

// ── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * Class-level attendance summary (total rows, present/absent, risk band counts).
 */
export const useClassSummary = (params: Partial<SummaryParams>) => {
  const { classId, from, to } = params;
  const enabled = !!classId && classId > 0;
  return useQuery({
    queryKey: ['attendanceAnalytics', 'summary', classId, from, to],
    queryFn:  () => attendanceAnalyticsService.getSummary({
      classId: classId!,
      from: from || academicYearStart(),
      to:   to   || today(),
    }),
    enabled,
    staleTime: STALE_MS,
    retry: 1,
  });
};

/**
 * Paginated student risk list for a class.
 */
export const useStudentRisks = (params: Partial<RisksParams>) => {
  const { classId, from, to, page, pageSize, riskBand } = params;
  const enabled = !!classId && classId > 0;
  return useQuery({
    queryKey: ['attendanceAnalytics', 'risks', classId, from, to, page, pageSize, riskBand],
    queryFn:  () => attendanceAnalyticsService.getRisks({
      classId:  classId!,
      from:     from     || academicYearStart(),
      to:       to       || today(),
      page:     page     || 1,
      pageSize: pageSize || 50,
      riskBand,
    }),
    enabled,
    staleTime: STALE_MS,
    retry: 1,
  });
};

/**
 * Date-bucketed attendance trend for a class.
 */
export const useAttendanceTrend = (params: Partial<TrendsParams>) => {
  const { classId, from, to } = params;
  const enabled = !!classId && classId > 0;
  return useQuery({
    queryKey: ['attendanceAnalytics', 'trends', classId, from, to],
    queryFn:  () => attendanceAnalyticsService.getTrends({
      classId: classId!,
      from: from || academicYearStart(),
      to:   to   || today(),
    }),
    enabled,
    staleTime: STALE_MS,
    retry: 1,
  });
};

/**
 * Recovery projection for one student.
 * Only enabled when all required params are present.
 */
export const useRecoveryProjection = (params: Partial<RecoveryParams> & { enabled?: boolean }) => {
  const { classId, studentId, future, target, from, to } = params;
  const canRun = !!classId && !!studentId && future != null && future >= 0 && (params.enabled !== false);
  return useQuery({
    queryKey: ['attendanceAnalytics', 'recovery', classId, studentId, future, target, from, to],
    queryFn:  () => attendanceAnalyticsService.getRecovery({
      classId:   classId!,
      studentId: studentId!,
      future:    future!,
      target:    target ?? 0.75,
      from:      from   || academicYearStart(),
      to:        to     || today(),
    }),
    enabled: canRun,
    staleTime: STALE_MS,
    retry: 1,
  });
};

/**
 * Analytics freshness / health info.
 * Refreshed every 30 seconds so the freshness badge stays current.
 */
export const useAnalyticsFreshness = () =>
  useQuery({
    queryKey: ['attendanceAnalytics', 'freshness'],
    queryFn:  () => attendanceAnalyticsService.getFreshness(),
    staleTime: 30_000,
    retry: 1,
  });
