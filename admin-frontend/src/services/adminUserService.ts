// @ts-nocheck
import axiosInstance from '../api/axiosInstance';

export const fetchAdminUsers = async () => {
  const response = await axiosInstance.get('/admin-users');
  return response.data;
};

export const createAdminUser = async (payload) => {
  const response = await axiosInstance.post('/admin-users', payload);
  return response.data;
};

export const setAdminUserStatus = async (id, status) => {
  const response = await axiosInstance.patch(`/admin-users/${id}/status`, { status });
  return response.data;
};
