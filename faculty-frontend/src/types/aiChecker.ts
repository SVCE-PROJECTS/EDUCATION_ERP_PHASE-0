/**
 * AI Checker types — derived from:
 *   unified_backend/src/controllers/aiCheckerController.js
 *   unified_backend/src/routes/aiCheckerRoutes.js
 *
 * POST /api/ai-checker/extract
 *   - multipart/form-data, field name: "file"
 *   - Accepted types: .txt, .pdf (max 10 MB)
 *   - Returns: { text: string, filename: string }
 *
 * NOTE: The backend only extracts text — it does NOT compute a similarity
 * score internally.  Similarity comparison must be done client-side by
 * extracting two files and comparing their texts.
 */

/**
 * Response from POST /api/ai-checker/extract
 */
export interface ExtractTextResponse {
  text: string;
  filename: string;
}

/**
 * Frontend state for one uploaded document
 */
export interface CheckerDocument {
  uri: string;
  name: string;
  mimeType: string;
  extractedText: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Similarity result computed on the frontend from two extracted texts
 */
export interface SimilarityResult {
  similarity: number;   // 0–100 percentage
  label: string;        // 'Low' | 'Medium' | 'High'
  wordCountA: number;
  wordCountB: number;
}
