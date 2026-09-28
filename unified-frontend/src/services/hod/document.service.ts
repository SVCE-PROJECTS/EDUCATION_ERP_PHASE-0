import api from './api';

export interface FacultyDocument {
  id: number;
  employeeId: string;
  documentName: string;
  filePath: string;
  fileType: string | null;
  fileSize: number | null;
  uploadedAt: string;
}

/** HOD-side, read-only: documents are uploaded by the faculty member themselves. */
export const documentService = {
  getForFaculty: async (employeeId: string) => {
    const res = await api.get(`/faculty/${employeeId}/documents`);
    return res.data;
  },
};
