/**
 * ClassesContext — caches the logged-in faculty's assigned classes.
 *
 * Source: GET /api/faculty/me/classes
 * Returns FacultyClass[]: { class_id, academic_year, subject_id, subject_name,
 *   subject_code, section_id, section_name, semester_id, semester_number }
 *
 * This is the central data used to populate dropdowns on:
 *   - Attendance screen (pick subject → class_id → fetch students by section)
 *   - IA Marks screen
 *   - Assignments screen
 *
 * Loaded once after login; re-fetched on explicit refresh.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { getMyClasses } from '../services/facultyApi';
import { useAuth } from './AuthContext';
import type { FacultyClass } from '../types/faculty';

interface ClassesContextValue {
  classes: FacultyClass[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const ClassesContext = createContext<ClassesContextValue | null>(null);

export const ClassesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useAuth();
  const [classes, setClasses] = useState<FacultyClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getMyClasses();
      setClasses(data);
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Failed to load classes.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Load when auth becomes available
  useEffect(() => {
    if (isAuthenticated) {
      load();
    } else {
      setClasses([]);
    }
  }, [isAuthenticated, load]);

  const value = useMemo<ClassesContextValue>(
    () => ({ classes, loading, error, refresh: load }),
    [classes, loading, error, load],
  );

  return (
    <ClassesContext.Provider value={value}>{children}</ClassesContext.Provider>
  );
};

export const useClasses = (): ClassesContextValue => {
  const ctx = useContext(ClassesContext);
  if (!ctx) throw new Error('useClasses must be used within <ClassesProvider>');
  return ctx;
};
