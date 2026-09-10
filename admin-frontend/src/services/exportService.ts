// @ts-nocheck
import axiosInstance from '../api/axiosInstance';

export const previewExport = async (filters) => {
  const response = await axiosInstance.get('/export/preview', { params: filters });
  return response.data; // { total, sample }
};

// The axios interceptor unwraps every response to response.data. For this
// endpoint the body IS the binary file (not the { success, data } envelope),
// so the resolved value here is the Blob itself, ready to save/share.
export const downloadExport = async (filters, format) => axiosInstance.post(
  '/export',
  { ...filters, format },
  { responseType: 'blob' },
);
