import api from './api';

export interface AuditLogEntry {
  id: string;
  action: string;
  module: string;
  recordId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  createdAt: string;
  departmentId: number | null;
  performedBy: string | null;
}

export interface AuditLogFilters {
  page?: number;
  pageSize?: number;
  module?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AuditLogResponse {
  success: boolean;
  data: AuditLogEntry[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Backed by GET /audit-logs/department — scope is resolved server-side from
 * the caller's own JWT, so this always returns only the HOD's own
 * department's activity, never a client-chosen one.
 */
export const auditService = {
  getDepartmentLogs: async (filters?: AuditLogFilters): Promise<AuditLogResponse> => {
    const res = await api.get('/audit-logs/department', { params: filters });
    return res.data;
  },
};
