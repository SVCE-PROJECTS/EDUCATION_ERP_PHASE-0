
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
      // On web, expo-document-picker provides the real File
      // object through document.file.
      if (document.file) {
        formData.append(
          'supportingDocument',
          document.file,
          document.name || 'supporting-document',
        );
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

