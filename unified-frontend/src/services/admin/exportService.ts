// @ts-nocheck
import axiosInstance from '../../api/axiosInstance';

// entity: 'students' | 'faculty' | 'non-teaching-staff'
export const previewExport = async (entity, filters) => {
  const response = await axiosInstance.get(`/export/${entity}/preview`, { params: filters });
  return response.data; // { total, sample }
};

// The axios interceptor unwraps every response to response.data. For this
// endpoint the body IS the binary file (not the { success, data } envelope),
// so the resolved value here is the Blob itself, ready to save/share.
export const downloadExport = async (entity, filters, format) => axiosInstance.post(
  `/export/${entity}`,
  { ...filters, format },
  { responseType: 'blob' },
);
