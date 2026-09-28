// @ts-nocheck
import axiosInstance from '../../api/axiosInstance';

// POST /api/auth/login -> { token, user: { id, username, fullName, role } }
export const loginRequest = async ({ username, password }) => {
  const response = await axiosInstance.post('/auth/login', { username, password });
  return response.data;
};
