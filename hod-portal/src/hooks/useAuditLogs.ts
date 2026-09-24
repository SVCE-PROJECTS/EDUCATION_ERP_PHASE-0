import { useQuery } from '@tanstack/react-query';
import { auditService, AuditLogFilters } from '../services/audit.service';

export function useAuditLogs(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: ['department-audit-logs', filters],
    queryFn: () => auditService.getDepartmentLogs(filters),
    placeholderData: (prev) => prev,
    staleTime: 15_000,
  });
}
