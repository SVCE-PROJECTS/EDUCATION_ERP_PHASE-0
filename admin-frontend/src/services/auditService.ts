// @ts-nocheck
import axiosInstance from '../api/axiosInstance';

export const fetchAuditLogs = async (filters = {}) => {
  const response = await axiosInstance.get('/audit-logs', { params: filters });
  return response; // { data: [...], meta: {...} } (unwrapped by interceptor down to response.data)
};
