/**
 * AI Checker API
 *
 * Backend: unified_backend/src/routes/aiCheckerRoutes.js
 *          unified_backend/src/controllers/aiCheckerController.js
 *
 * Endpoint:
 *   POST /api/ai-checker/extract
 *     - multipart/form-data
 *     - field name: "file"
 *     - accepted types: .txt (text/plain), .pdf (application/pdf)
 *     - max size: 10 MB
 *     - returns: { text: string, filename: string }
 *
 * Note: The backend only extracts text — no similarity computation.
 * Similarity is computed client-side via computeSimilarity() helper below.
 *
 * No authentication middleware is on this route.
 */

import axiosInstance from '../api/axiosInstance';
import { API_BASE_URL } from '../config/api';
import { getToken } from '../api/tokenStore';
import type { ExtractTextResponse, SimilarityResult } from '../types';

/**
 * POST /api/ai-checker/extract
 * Upload a .txt or .pdf file; receive its extracted plain text.
 *
 * @param fileUri   Local URI from expo-document-picker
 * @param fileName  Original file name (e.g. "assignment.pdf")
 * @param mimeType  MIME type (e.g. "application/pdf" or "text/plain")
 */
export const extractTextFromFile = async (
  fileUri: string,
  fileName: string,
  mimeType: string,
): Promise<ExtractTextResponse> => {
  const formData = new FormData();
  // React Native's FormData accepts an object with uri/name/type
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);

  // Use fetch directly for multipart — axios can have issues with RN FormData
  const token = getToken(); // static import — no dynamic import needed

  const response = await fetch(`${API_BASE_URL}/ai-checker/extract`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Do NOT set Content-Type manually — let fetch set the boundary
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Upload failed.' }));
    throw { message: err.message ?? 'Text extraction failed.', status: response.status };
  }

  return response.json() as Promise<ExtractTextResponse>;
};

// ─── Client-side similarity computation ──────────────────────────────────────

/**
 * Tokenise a string into lowercase word tokens.
 */
const tokenise = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

/**
 * Jaccard similarity between two token sets: |A ∩ B| / |A ∪ B|
 */
export const computeSimilarity = (
  textA: string,
  textB: string,
): SimilarityResult => {
  const tokensA = tokenise(textA);
  const tokensB = tokenise(textB);

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersection = 0;
  setA.forEach((t) => { if (setB.has(t)) intersection++; });
  const union = setA.size + setB.size - intersection;

  const similarity = union === 0 ? 0 : Math.round((intersection / union) * 100);

  const label =
    similarity >= 70 ? 'High' : similarity >= 40 ? 'Medium' : 'Low';

  return {
    similarity,
    label,
    wordCountA: tokensA.length,
    wordCountB: tokensB.length,
  };
};
