/**
 * Faculty Portal — Activity Log Service
 *
 * Backed by GET /api/audit-logs/me — the backend resolves the actor id from
 * the verified JWT (req.user.id), so faculty members can only ever see their
 * own entries. The client never supplies a user id.
 */
import api from './api';

export interface ActivityLogEntry {
  id: string;
  action: string;
  module: string | null;
  recordId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  createdAt: string;
  departmentId: number | null;
  performedBy: string | null;
}

export interface ActivityLogFilters {
  page?: number;
  pageSize?: number;
  module?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ActivityLogResponse {
  success: boolean;
  data: ActivityLogEntry[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const activityLogService = {
  /**
   * Returns only the calling faculty member's own audit log entries.
   * No retry — 401/500 are terminal (matches project convention).
   */
  getMyLogs: async (filters?: ActivityLogFilters): Promise<ActivityLogResponse> => {
    const res = await api.get('/audit-logs/me', { params: filters });
    return res.data;
  },
};
