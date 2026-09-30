// @ts-nocheck
import axiosInstance from '../../api/axiosInstance';

export const fetchDashboardStats = async () => {
  const res = await axiosInstance.get('/dashboard/stats');
  // axiosInstance interceptor already returns response.data.
  // Backend may wrap in { data: {...} } or return the object directly.
  return res?.data ?? res;
};
