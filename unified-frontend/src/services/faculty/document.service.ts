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

export interface PickedDocumentAsset {
  uri: string;
  name: string;
  mimeType?: string | null;
  /**
   * Present only on web (expo-document-picker returns a real `File` there).
   * Browser FormData needs an actual File/Blob — appending a plain
   * { uri, type, name } object (the React Native shape) silently produces
   * an empty part there, which the backend then rejects as "file required".
   */
  file?: File | null;
}

export const documentService = {
  getMine: async () => {
    const res = await api.get('/faculty/me/documents');
    return res.data;
  },

  upload: async (asset: PickedDocumentAsset) => {
    const fd = new FormData();
    if (asset.file) {
      // Web: real File object.
      fd.append('document', asset.file, asset.name);
    } else {
      // Native: React Native's FormData accepts { uri, type, name } directly,
      // same pattern used for the faculty photo upload elsewhere in the app.
      fd.append('document', {
        uri: asset.uri,
        type: asset.mimeType || 'application/octet-stream',
        name: asset.name,
      } as any);
    }

    const res = await api.post('/faculty/me/documents', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  remove: async (documentId: number) => {
    const res = await api.delete(`/faculty/me/documents/${documentId}`);
    return res.data;
  },
};
