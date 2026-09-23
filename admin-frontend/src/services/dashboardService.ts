// @ts-nocheck
import axiosInstance from '../api/axiosInstance';

export const fetchDashboardStats = async () => {
  return axiosInstance.get('/dashboard/stats');
};
