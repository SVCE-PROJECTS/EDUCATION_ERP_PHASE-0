/**
 * extractTextFromFile
 *
 * Strategy A — TXT:
 *   Use the global fetch() with the file URI — works on all React Native
 *   URI types (file://, content://, cache://) without any native module.
 *   No expo-file-system needed.
 *
 * Strategy B — PDF:
 *   Upload via multipart/form-data to POST /aichecker/extract.
 *   copyToCacheDirectory:true in the picker already ensures a readable URI.
 *   Do NOT set Content-Type manually — axios sets it with the boundary.
 */
import api from '../services/api';

export interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
}

export async function extractTextFromFile(file: PickedFile): Promise<string> {
  if (!file?.uri) throw new Error('No file provided.');

  const isPDF =
    file.name.toLowerCase().endsWith('.pdf') ||
    file.mimeType === 'application/pdf';

  // ── Strategy A: TXT — fetch directly, no native module ───────────
  if (!isPDF) {
    try {
      const response = await fetch(file.uri);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      if (!text?.trim()) throw new Error('File is empty.');
      return text;
    } catch (err: any) {
      throw new Error(`Could not read text file: ${err.message}`);
    }
  }

  // ── Strategy B: PDF — upload to backend for pdf-parse ────────────
  const formData = new FormData();
  formData.append('file', {
    uri:  file.uri,
    name: file.name,
    type: 'application/pdf',
  } as any);

  try {
    const response = await api.post<{ text: string }>(
      '/aichecker/extract',
      formData,
      { timeout: 30000 }
    );
    const text = response.data?.text ?? '';
    if (!text.trim()) throw new Error('PDF appears to be empty or image-only.');
    return text;
  } catch (err: any) {
    const serverMsg: string | undefined =
      err.response?.data?.message ?? err.response?.data?.error;
    const networkMsg = err.code === 'ECONNABORTED'
      ? 'Request timed out. Make sure the backend is running.'
      : err.message;
    throw new Error(serverMsg ?? networkMsg);
  }
}
