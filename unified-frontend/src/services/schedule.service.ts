// @ts-nocheck
/**
 * Schedule Service
 * Shared across all portals (Admin, HOD, Faculty).
 * Uses the unified axiosInstance that automatically attaches the correct token.
 */

import axiosInstance from '../api/axiosInstance';

export interface Schedule {
  id: number;
  title: string;
  date: string;        // YYYY-MM-DD
  time?: string;       // HH:mm format (derived from start_time)
  description?: string;
  status: 'pending' | 'completed';
}

export interface CreateScheduleInput {
  title: string;
  description?: string;
  date: string;        // YYYY-MM-DD
  start_time?: string; // HH:mm:ss or HH:mm
}

export interface UpdateScheduleInput {
  title: string;
  description?: string;
  date: string;
  start_time?: string;
  status?: 'pending' | 'completed';
}

// Helper to convert backend format to frontend format
function toSchedule(raw: any): Schedule {
  return {
    id: raw.id || raw.schedule_id, // Backend returns 'id' (aliased from schedule_id)
    title: raw.title,
    date: raw.date,
    time: raw.time || (raw.start_time ? raw.start_time.substring(0, 5) : undefined), // HH:mm or HH:mm:ss -> HH:mm
    description: raw.description || undefined,
    status: raw.status,
  };
}

export const scheduleService = {
  /**
   * Get schedules for the logged-in user within a date range.
   * Backend returns a plain array of rows.
   */
  async getSchedules(from?: string, to?: string): Promise<Schedule[]> {
    const params: any = {};
    if (from) params.from = from;
    if (to) params.to = to;

    const data = await axiosInstance.get('/schedules', { params });
    if (Array.isArray(data)) {
      return data.map(toSchedule);
    }
    return [];
  },

  /** Create a new schedule. Backend returns the created row directly. */
  async createSchedule(input: CreateScheduleInput): Promise<Schedule> {
    const data = await axiosInstance.post('/schedules', input);
    return toSchedule(data);
  },

  /** Update an existing schedule. Backend returns the updated row directly. */
  async updateSchedule(id: number, input: UpdateScheduleInput): Promise<Schedule> {
    const data = await axiosInstance.put(`/schedules/${id}`, input);
    return toSchedule(data);
  },

  /** Toggle status between completed and pending. */
  async completeSchedule(id: number): Promise<Schedule> {
    const data = await axiosInstance.patch(`/schedules/${id}/complete`);
    return toSchedule(data);
  },

  /** Mark a schedule as pending. */
  async markPendingSchedule(id: number): Promise<Schedule> {
    const data = await axiosInstance.patch(`/schedules/${id}/pending`);
    return toSchedule(data);
  },

  /** Delete a schedule. */
  async deleteSchedule(id: number): Promise<void> {
    await axiosInstance.delete(`/schedules/${id}`);
  },
};
