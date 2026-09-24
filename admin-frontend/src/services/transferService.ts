
// @ts-nocheck

import { Platform } from 'react-native';
import axiosInstance from '../api/axiosInstance';

export const transferStudent = async ({
  studentId,
  newProgramId,
  newDepartmentId,
  newSemester,
  newSectionId,
  remarks,
  document,
}) => {
  const formData = new FormData();

  formData.append('studentId', String(studentId));
  formData.append('newProgramId', String(newProgramId));
  formData.append('newDepartmentId', String(newDepartmentId));
  formData.append('newSemester', String(newSemester));
  formData.append('newSectionId', String(newSectionId));

  if (remarks) {
    formData.append('remarks', remarks);
  }

  if (document) {
    if (Platform.OS === 'web') {
      // On web, expo-document-picker returns assets with a uri (blob URL)
      // We need to fetch the blob and append it as a File
      if (document.file) {
        // If File object is directly available
        formData.append('supportingDocument', document.file, document.name || 'supporting-document');
      } else if (document.uri) {
        // Fetch the blob from the blob URI and append
        try {
          const response = await fetch(document.uri);
          const blob = await response.blob();
          const file = new File([blob], document.name || 'supporting-document', {
            type: document.mimeType || blob.type || 'application/octet-stream',
          });
          formData.append('supportingDocument', file, document.name || 'supporting-document');
        } catch (e) {
          // fallback: append uri directly
          formData.append('supportingDocument', document.uri);
        }
      }
    } else {
      formData.append('supportingDocument', {
        uri: document.uri,
        name: document.name || 'supporting-document',
        type: document.mimeType || 'application/octet-stream',
      });
    }
  }

  // IMPORTANT:
  // Backend route is POST /api/transfer
  const response = await axiosInstance.post(
    '/transfer',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  // axiosInstance already unwraps response.data.
  // Backend response format is:
  // { success: true, data: {...} }
  return response?.data || response;
};

export const fetchTransferHistory = async (studentId) => {
  // Backend route is GET /api/transfer/:id/history
  const response = await axiosInstance.get(
    `/transfer/${studentId}/history`,
  );

  return response?.data || response;
};

// GET /api/transfer — every transfer ever made, newest first, with both the
// previous and new department/program/semester/section for each student.
// Backs the Dashboard's "Transferred Students" tap-to-view detail screen.
export const fetchAllTransfers = async () => {
  const response = await axiosInstance.get('/transfer');
  return response?.data || response;
};

// responseType: 'blob' — the interceptor unwraps to response.data, so the
// resolved value here is the Blob itself, ready to save/share (same pattern
// as exportService.downloadExport).
export const downloadTransferExport = async (format) => axiosInstance.get(
  '/transfer/export',
  { params: { format }, responseType: 'blob' },
);

