/**
 * Students Screen
 *
 * APIs:
 *   GET /api/students?search=X           → StudentBrief[]
 *   GET /api/students/by-section/:sem/:sec → { students: StudentBrief[] }
 *
 * Features:
 *   - Search bar (calls GET /api/students?search=X)
 *   - Semester/section filter (uses ClassesContext to pick section)
 *   - Tap a student → StudentProfileScreen (GET /api/students/:id/profile)
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import ScreenLayout from '../components/ScreenLayout';
import ClassPicker from '../components/ClassPicker';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import Card from '../components/Card';
import { useClasses } from '../context/ClassesContext';
import { getStudents, getStudentsBySection } from '../services/studentsApi';
import type { FacultyClass } from '../types/faculty';
import type { StudentBrief } from '../types/student';
import { colors, spacing, typography, radius } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Students'>;

type Mode = 'section' | 'search';

const StudentsScreen: React.FC<Props> = ({ navigation }) => {
  const { classes, loading: classesLoading } = useClasses();

  const [mode, setMode] = useState<Mode>('section');
  const [selectedClass, setSelectedClass] = useState<FacultyClass | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<StudentBrief[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load by section when a class is selected
  const loadBySection = useCallback(async (cls: FacultyClass) => {
    setLoadingData(true);
    setError(null);
    try {
      const data = await getStudentsBySection(cls.semester_number, cls.section_name);
      setStudents(data);
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Failed to load students.');
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (mode === 'section' && selectedClass) {
      loadBySection(selectedClass);
    }
  }, [mode, selectedClass, loadBySection]);

  // Search
  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setStudents([]); return; }
    setLoadingData(true);
    setError(null);
    try {
      const data = await getStudents({ search: q.trim(), pageSize: 50 });
      setStudents(data);
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Search failed.');
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Debounce search query
  useEffect(() => {
    if (mode !== 'search') return;
    const t = setTimeout(() => handleSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery, mode, handleSearch]);

  const onRefresh = () => {
    if (mode === 'section' && selectedClass) {
      setRefreshing(true);
      loadBySection(selectedClass);
    }
  };

  return (
    <ScreenLayout navigation={navigation} activeScreen="Students">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>Students</Text>

        {/* Mode tabs */}
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'section' && styles.modeTabActive]}
            onPress={() => { setMode('section'); setStudents([]); setError(null); }}
            accessibilityRole="tab"
          >
            <Text style={[styles.modeTabText, mode === 'section' && styles.modeTabTextActive]}>
              By Class
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'search' && styles.modeTabActive]}
            onPress={() => { setMode('search'); setStudents([]); setError(null); setSelectedClass(null); }}
            accessibilityRole="tab"
          >
            <Text style={[styles.modeTabText, mode === 'search' && styles.modeTabTextActive]}>
              Search
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section mode */}
        {mode === 'section' && (
          <ClassPicker
            classes={classes}
            loading={classesLoading}
            selectedClassId={selectedClass?.class_id ?? null}
            onSelect={setSelectedClass}
            label="Select Class to View Students"
          />
        )}

        {/* Search mode */}
        {mode === 'search' && (
          <View style={styles.searchRow}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name or USN…"
              placeholderTextColor={colors.placeholder}
              returnKeyType="search"
              accessibilityLabel="Search students"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => { setSearchQuery(''); setStudents([]); }}
                accessibilityLabel="Clear search"
              >
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {loadingData && <LoadingIndicator message="Loading students…" />}
        {error && <ErrorMessage message={error} onRetry={() => selectedClass && loadBySection(selectedClass)} />}

        {/* Empty states */}
        {!loadingData && !error && mode === 'section' && !selectedClass && (
          <View style={styles.emptyHint}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>Select a class to view its students.</Text>
          </View>
        )}
        {!loadingData && !error && mode === 'search' && !searchQuery.trim() && (
          <View style={styles.emptyHint}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>Type to search students by name or USN.</Text>
          </View>
        )}
        {!loadingData && !error && students.length === 0 && (searchQuery.trim() || selectedClass) && (
          <EmptyState title="No students found" message="Try a different search term or class." icon="🔎" />
        )}

        {/* Student count */}
        {students.length > 0 && (
          <Text style={styles.countLabel}>{students.length} student{students.length !== 1 ? 's' : ''}</Text>
        )}

        {/* Student list */}
        {students.length > 0 && (
          <Card noPadding>
            {students.map((s, idx) => (
              <TouchableOpacity
                key={s.student_id}
                style={[
                  styles.studentRow,
                  idx < students.length - 1 && styles.rowBorder,
                ]}
                onPress={() =>
                  navigation.navigate('StudentProfile', {
                    studentId: s.student_id,
                    studentName: s.name,
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={`View profile of ${s.name}`}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {s.name.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{s.name}</Text>
                  <Text style={styles.studentMeta}>
                    {s.usn ?? 'No USN'} · Sem {s.semester_number} · Sec {s.section_name}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </Card>
        )}
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  pageTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.lg },

  modeTabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  modeTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  modeTabActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  modeTabText: { ...typography.bodyBold, color: colors.textSecondary },
  modeTabTextActive: { color: colors.white },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchIcon: { fontSize: 18, marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  clearIcon: { fontSize: 16, color: colors.textMuted, padding: spacing.sm },

  emptyHint: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },

  countLabel: { ...typography.smallBold, color: colors.textSecondary, marginBottom: spacing.sm },

  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.bodyBold, color: colors.primary, fontSize: 15 },
  studentInfo: { flex: 1 },
  studentName: { ...typography.bodyBold, color: colors.textPrimary },
  studentMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  chevron: { fontSize: 22, color: colors.textMuted },
});

export default StudentsScreen;
