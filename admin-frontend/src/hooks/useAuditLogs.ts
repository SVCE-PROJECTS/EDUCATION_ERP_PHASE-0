// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { fetchAuditLogs } from '../services/auditService';

export const useAuditLogs = (filters) => useQuery({
  queryKey: ['audit-logs', filters],
  queryFn: () => fetchAuditLogs(filters),
  keepPreviousData: true,
});
