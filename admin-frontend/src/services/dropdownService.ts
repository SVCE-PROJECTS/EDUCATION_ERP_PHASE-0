// @ts-nocheck
import axiosInstance from '../api/axiosInstance';

export const fetchDropdown = async (type) => {
  const response = await axiosInstance.get(`/dropdown/${type}`);
  return response.data; // array of { id, name }
};

export const fetchSectionsBySemester = async (semesterId) => {
  const response = await axiosInstance.get(`/dropdown/sections/${semesterId}`);
  return response.data;
};
