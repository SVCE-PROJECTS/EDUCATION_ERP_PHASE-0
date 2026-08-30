/**
 * IA Marks types — derived from:
 *   prisma/schema.prisma  (IAMark model)
 *   unified_backend/src/controllers/iaMarksController.js
 *
 * NOTE: `average` is a PostgreSQL GENERATED ALWAYS AS STORED column.
 * The pg driver returns it as a STRING, not a number.
 * Always use Number(average) before arithmetic or toFixed().
 */

export interface IAMark {
  ia_id: number;
  student_id: string;
  class_id: number;
  ia1: number | string | null;
  ia2: number | string | null;
  ia3: number | string | null;
  /** pg returns this as a string — always cast with Number() before use */
  average: number | string | null;
  created_at: string;
  updated_at: string;
  subject_name: string;
  subject_code: string;
  student_name: string;
  usn: string | null;
}

export interface AddIAMarksRequest {
  student_id: string;
  class_id: number;
  ia1?: number | null;
  ia2?: number | null;
  ia3?: number | null;
}

export interface UpdateIAMarksRequest {
  ia1?: number | null;
  ia2?: number | null;
  ia3?: number | null;
}

export interface IAMarkEntry {
  student_id: string;
  name: string;
  usn: string | null;
  ia_id: number | null;
  ia1: string;
  ia2: string;
  ia3: string;
  /** pg returns as string — cast with Number() before display */
  average: number | string | null;
}
