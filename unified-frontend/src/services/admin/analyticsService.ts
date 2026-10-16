// @ts-nocheck
import axiosInstance from '../../api/axiosInstance';

export const fetchAnalyticsOverview = async () => {
  const res = await axiosInstance.get('/analytics/overview');
  return res?.data ?? res;
};
