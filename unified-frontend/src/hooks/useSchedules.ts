// @ts-nocheck
/**
 * Shared Schedules Hook
 * Single source of truth for schedule data across all portals.
 * 
 * CACHING STRATEGY:
 * - Fetches once per month (keyed by year and month primitives)
 * - In-flight guard prevents duplicate fetches for the same month
 * - Mutations update local state optimistically and refetch affected month only
 * - NO automatic retries on error (401, 429, 500 are terminal)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { scheduleService, Schedule, CreateScheduleInput, UpdateScheduleInput } from '../services/schedule.service';

interface MonthKey {
  year: number;
  month: number;
}

interface CachedMonth {
  schedules: Schedule[];
  error: string | null;
  loading: boolean;
}

// Module-level cache shared across all hook instances
const cache = new Map<string, CachedMonth>();
const inFlightRequests = new Map<string, Promise<Schedule[]>>();
// Subscribers that need to be notified when cache is invalidated
const cacheListeners = new Map<string, Set<() => void>>();

/**
 * Wipe every cached month, all in-flight requests and all listeners.
 * Must be called on logout so the next user never sees stale data.
 * Called by AuthContext.logout() before clearing the token.
 */
export function clearScheduleCache(): void {
  cache.clear();
  inFlightRequests.clear();
  cacheListeners.clear();
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function getMonthDateRange(year: number, month: number) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

// Invalidate cache and notify all subscribers
function invalidateMonth(year: number, month: number) {
  const key = monthKey(year, month);
  cache.delete(key);
  // Also clear any in-flight request so listeners start a fresh fetch
  inFlightRequests.delete(key);
  
  // Notify all subscribers for this month to refetch
  const listeners = cacheListeners.get(key);
  if (listeners) {
    listeners.forEach(listener => listener());
  }
}

/**
 * Hook to get schedules for a specific month.
 * Fetches once per month. Shares cached data across all components.
 */
export function useMonthSchedules(year: number, month: number) {
  const key = monthKey(year, month);
  const [state, setState] = useState<CachedMonth>(() => {
    return cache.get(key) || { schedules: [], error: null, loading: false };
  });

  // Track if component is mounted
  const isMounted = useRef(true);
  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const fetchMonth = useCallback(async () => {
    const key = monthKey(year, month);
    
    // Check if already loading
    const inFlight = inFlightRequests.get(key);
    if (inFlight) {
      try {
        const schedules = await inFlight;
        if (isMounted.current) {
          const newState = { schedules, error: null, loading: false };
          cache.set(key, newState);
          setState(newState);
        }
      } catch (err: any) {
        if (isMounted.current) {
          const errorMsg = err?.message || 'Failed to load schedules';
          const newState = { schedules: [], error: errorMsg, loading: false };
          cache.set(key, newState);
          setState(newState);
        }
      }
      return;
    }

    // Check cache first
    const cached = cache.get(key);
    if (cached && !cached.loading && !cached.error) {
      if (isMounted.current) {
        setState(cached);
      }
      return;
    }

    // Start fetch
    const loadingState = { schedules: cached?.schedules || [], error: null, loading: true };
    cache.set(key, loadingState);
    if (isMounted.current) {
      setState(loadingState);
    }

    const { from, to } = getMonthDateRange(year, month);
    const promise = scheduleService.getSchedules(from, to);
    inFlightRequests.set(key, promise);

    try {
      const schedules = await promise;
      const successState = { schedules, error: null, loading: false };
      cache.set(key, successState);
      if (isMounted.current) {
        setState(successState);
      }
    } catch (err: any) {
      // Terminal errors: do NOT retry
      const errorMsg = err?.message || 'Failed to load schedules';
      const errorState = { schedules: [], error: errorMsg, loading: false };
      cache.set(key, errorState);
      if (isMounted.current) {
        setState(errorState);
      }
    } finally {
      inFlightRequests.delete(key);
    }
  }, [year, month]);

  // Fetch on mount or when month changes
  useEffect(() => {
    fetchMonth();
    
    // Register this component as a listener for cache invalidation
    const key = monthKey(year, month);
    if (!cacheListeners.has(key)) {
      cacheListeners.set(key, new Set());
    }
    cacheListeners.get(key)!.add(fetchMonth);
    
    return () => {
      // Cleanup listener on unmount
      const listeners = cacheListeners.get(key);
      if (listeners) {
        listeners.delete(fetchMonth);
        if (listeners.size === 0) {
          cacheListeners.delete(key);
        }
      }
    };
  }, [fetchMonth, year, month]);

  return {
    schedules: state.schedules,
    loading: state.loading,
    error: state.error,
    refetch: fetchMonth,
  };
}

/**
 * Create a new schedule
 */
export function useCreateSchedule() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSchedule = useCallback(async (input: CreateScheduleInput) => {
    setLoading(true);
    setError(null);
    try {
      const schedule = await scheduleService.createSchedule(input);
      
      // Invalidate the affected month cache and trigger refetch
      const [year, month] = schedule.date.split('-').map(Number);
      invalidateMonth(year, month);
      
      setLoading(false);
      return schedule;
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to create schedule';
      setError(errorMsg);
      setLoading(false);
      throw err;
    }
  }, []);

  return { createSchedule, loading, error };
}

/**
 * Update an existing schedule
 */
export function useUpdateSchedule() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSchedule = useCallback(async (id: number, input: UpdateScheduleInput) => {
    setLoading(true);
    setError(null);
    try {
      const schedule = await scheduleService.updateSchedule(id, input);
      
      // Invalidate the affected month cache and trigger refetch
      const [year, month] = schedule.date.split('-').map(Number);
      invalidateMonth(year, month);
      
      setLoading(false);
      return schedule;
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to update schedule';
      setError(errorMsg);
      setLoading(false);
      throw err;
    }
  }, []);

  return { updateSchedule, loading, error };
}

/**
 * Complete a schedule (mark as completed)
 */
export function useCompleteSchedule() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completeSchedule = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const schedule = await scheduleService.completeSchedule(id);
      
      // Invalidate the affected month cache and trigger refetch
      const [year, month] = schedule.date.split('-').map(Number);
      invalidateMonth(year, month);
      
      setLoading(false);
      return schedule;
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to complete schedule';
      setError(errorMsg);
      setLoading(false);
      throw err;
    }
  }, []);

  return { completeSchedule, loading, error };
}

/**
 * Mark schedule as pending
 */
export function useMarkPendingSchedule() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markPendingSchedule = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const schedule = await scheduleService.markPendingSchedule(id);
      
      // Invalidate the affected month cache and trigger refetch
      const [year, month] = schedule.date.split('-').map(Number);
      invalidateMonth(year, month);
      
      setLoading(false);
      return schedule;
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to mark schedule as pending';
      setError(errorMsg);
      setLoading(false);
      throw err;
    }
  }, []);

  return { markPendingSchedule, loading, error };
}

/**
 * Toggle schedule status (complete/pending)
 */
export function useToggleScheduleStatus() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleStatus = useCallback(async (schedule: Schedule) => {
    setLoading(true);
    setError(null);
    try {
      const updated = schedule.status === 'pending'
        ? await scheduleService.completeSchedule(schedule.id)
        : await scheduleService.markPendingSchedule(schedule.id);
      
      // Invalidate the affected month cache and trigger refetch
      const [year, month] = updated.date.split('-').map(Number);
      invalidateMonth(year, month);
      
      setLoading(false);
      return updated;
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to toggle schedule status';
      setError(errorMsg);
      setLoading(false);
      throw err;
    }
  }, []);

  return { toggleStatus, loading, error };
}

/**
 * Delete a schedule
 */
export function useDeleteSchedule() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteSchedule = useCallback(async (schedule: Schedule) => {
    setLoading(true);
    setError(null);
    try {
      await scheduleService.deleteSchedule(schedule.id);
      
      // Invalidate the affected month cache and trigger refetch
      const [year, month] = schedule.date.split('-').map(Number);
      invalidateMonth(year, month);
      
      setLoading(false);
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to delete schedule';
      setError(errorMsg);
      setLoading(false);
      throw err;
    }
  }, []);

  return { deleteSchedule, loading, error };
}

/**
 * Helper to get dot color for a date (for calendar markers)
 * Returns 'red' if date has pending schedules, 'blue' if all completed, null otherwise
 */
export function getDotForDate(schedules: Schedule[], dateString: string): 'red' | 'blue' | null {
  const daySchedules = schedules.filter(s => s.date === dateString);
  
  if (daySchedules.length === 0) return null;
  
  const hasPending = daySchedules.some(s => s.status === 'pending');
  return hasPending ? 'red' : 'blue';
}

/**
 * Helper to get schedules for a specific date
 */
export function getSchedulesForDate(schedules: Schedule[], dateString: string): Schedule[] {
  return schedules.filter(s => s.date === dateString);
}
