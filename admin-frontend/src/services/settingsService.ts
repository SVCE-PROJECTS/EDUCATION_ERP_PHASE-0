// @ts-nocheck
import axiosInstance from '../api/axiosInstance';

export const fetchAcademicYear = async () => {
  const response = await axiosInstance.get('/settings/academic-year');
  return response.data;
};

export const updateAcademicYear = async (payload) => {
  const response = await axiosInstance.put('/settings/academic-year', payload);
  return response.data;
};

export const fetchDepartments = async () => {
  const response = await axiosInstance.get('/settings/departments');
  return response.data;
};

export const createDepartment = async (payload) => {
  const response = await axiosInstance.post('/settings/departments', payload);
  return response.data;
};

export const setDepartmentActive = async (id, isActive) => {
  const response = await axiosInstance.patch(`/settings/departments/${id}/status`, { isActive });
  return response.data;
};
