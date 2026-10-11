/**
 * Real-Time Industry Projects — HOD Portal
 *
 * UX: Projects are first-class cards. Students are added per-project
 * via a separate "+" icon on the card.
 *
 * Data model (backend):
 *   Each "project" is a group of activities rows sharing the same
 *   title + academic_year. A header row (student_id IS NULL) is
 *   created when the HOD creates the project. Each student added via
 *   POST /:id/students becomes its own row in that group.
 *
 * Grouping key: title (case-insensitive) + academic_year.
 * Representative / "header" row: the one with student_id == null,
 * OR the first row in the group if no header exists (legacy data).
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useForm, Controller } from 'react-hook-form';
import {
  Plus, Pencil, Trash2, Users, ChevronDown, ChevronUp, X, Check,
} from '../../../components/hod/icons';
import { useTheme } from '../../../context/hod/ThemeContext';
import { colors, shadows, ThemeColors } from '../../../theme/hod/colors';
import {
  useIndustryProjectList,
  useCreateIndustryProject,
  useUpdateIndustryProject,
  useDeleteIndustryProject,
  useAddProjectStudent,
  useRemoveProjectStudent,
} from '../../../hooks/hod/useActivities';
import { searchStudentsByName, StudentSearchResult } from '../../../services/hod/studentSearch.service';
import { useDebounce } from '../../../hooks/hod/useDebounce';
import ConfirmDialog from '../../../components/hod/ui/ConfirmDialog';
import SearchBar from '../../../components/hod/ui/SearchBar';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = colors.violet[500];
const LIMIT = 50;

const STATUS_OPTIONS = [
  { label: 'Ongoing',   value: 'ONGOING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Paused',    value: 'PAUSED' },
];

const DOMAIN_OPTIONS = [
  { label: 'Web Development',  value: 'WEB' },
  { label: 'Mobile Development', value: 'MOBILE' },
  { label: 'AI / ML',          value: 'AI_ML' },
  { label: 'Data Science',     value: 'DATA' },
  { label: 'Embedded / IoT',   value: 'EMBEDDED' },
  { label: 'Cloud / DevOps',   value: 'CLOUD' },
  { label: 'Cybersecurity',    value: 'SECURITY' },
  { label: 'Other',            value: 'OTHER' },
];

const STATUS_LABEL_TO_VALUE: Record<string, string> = {
  Ongoing: 'ONGOING', ongoing: 'ONGOING',
  Completed: 'COMPLETED', completed: 'COMPLETED',
  Paused: 'PAUSED', paused: 'PAUSED',
};

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS: number[] = Array.from(
  { length: 8 },
  (_, i) => CURRENT_YEAR - 5 + i,
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawRow {
  id: string | number;
  activity_id?: string | number;
  student_id?: string | null;
  student_name?: string | null;
  usn?: string | null;
  title?: string | null;
  status?: string | null;
  academic_year?: string | null;
  description?: string | null;
  [key: string]: unknown;
}

interface StudentRow {
  activityId: string | number;
  studentId: string | null;
  name: string | null;
  usn: string | null;
  semester: string | number | null;
  section: string | null;
}

interface ProjectGroup {
  /** The header row (student_id === null) or first row for legacy data */
  header: RawRow;
  /** All rows in the group (header + student rows) */
  allRows: RawRow[];
  students: StudentRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDesc(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object') return value as Record<string, any>;
  try { return JSON.parse(value as string) || {}; } catch { return {}; }
}

function groupKey(item: RawRow): string {
  return `${String(item.title ?? '').trim().toLowerCase()}|${String(item.academic_year ?? '').trim().toLowerCase()}`;
}

function buildGroups(rows: RawRow[]): ProjectGroup[] {
  const map = new Map<string, ProjectGroup>();
  rows.forEach((row) => {
    const key = groupKey(row);
    if (!map.has(key)) {
      map.set(key, { header: row, allRows: [row], students: [] });
    } else {
      map.get(key)!.allRows.push(row);
    }
  });

  // For each group: pick the header row (student_id null) as representative;
  // fall back to first row if no header exists (legacy data without header).
  // Build the students list from rows that DO have a student.
  for (const [, group] of map) {
    const header = group.allRows.find((r) => r.student_id == null);
    if (header) group.header = header;
    else group.header = group.allRows[0];

    const seen = new Set<string>();
    for (const row of group.allRows) {
      if (!row.student_id) continue;
      const desc = parseDesc(row.description);
      const key = String(row.student_id);
      if (seen.has(key)) continue;
      seen.add(key);
      group.students.push({
        activityId: row.id,
        studentId: String(row.student_id),
        name: row.student_name ?? null,
        usn: row.usn ?? null,
        semester: desc.semester ?? null,
        section: desc.section ?? null,
      });
    }
  }

  return Array.from(map.values());
}

function getStatusLabel(value: unknown): string {
  const v = String(value ?? '');
  if (v === 'ONGOING'   || v.toLowerCase() === 'ongoing')   return 'Ongoing';
  if (v === 'COMPLETED' || v.toLowerCase() === 'completed') return 'Completed';
  if (v === 'PAUSED'    || v.toLowerCase() === 'paused')    return 'Paused';
  return v || '—';
}

function getDomainLabel(value: unknown): string {
  const opt = DOMAIN_OPTIONS.find((o) => o.value === value || o.label === value);
  return opt?.label ?? (String(value) || '—');
}

function formatAcademicYear(header: RawRow): string {
  return String(header.academic_year ?? '');
}

// ─── Inline Select Sheet ──────────────────────────────────────────────────────

interface SelectSheetProps {
  visible: boolean;
  title: string;
  options: { label: string; value: string | number }[];
  value: string | number;
  onSelect: (v: string | number) => void;
  onClose: () => void;
  theme: ThemeColors;
}

function SelectSheet({ visible, title, options, value, onSelect, onClose, theme }: SelectSheetProps) {
  const s = useMemo(() => sheetStyles(theme), [theme]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={s.sheet}>
        <Text style={s.sheetTitle}>{title}</Text>
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 280 }}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[s.option, opt.value === value && s.optionActive]}
              onPress={() => { onSelect(opt.value); onClose(); }}
              activeOpacity={0.75}
            >
              <Text style={[s.optionText, opt.value === value && s.optionTextActive]}>
                {opt.label}
              </Text>
              {opt.value === value && <Check size={14} color={ACCENT} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Project Form Modal ───────────────────────────────────────────────────────

interface ProjectFormValues {
  projectName: string;
  status: string;
  domain: string;
  academicYearFrom: string;
  academicYearTo: string;
}

interface ProjectFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormValues) => void;
  initialValues?: Partial<ProjectFormValues> | null;
  loading?: boolean;
  theme: ThemeColors;
}

function ProjectFormModal({ visible, onClose, onSubmit, initialValues, loading, theme }: ProjectFormModalProps) {
  const s = useMemo(() => formStyles(theme), [theme]);

  const { control, handleSubmit, reset, formState: { errors }, watch } = useForm<ProjectFormValues>({
    defaultValues: {
      projectName: '',
      status: '',
      domain: '',
      academicYearFrom: '',
      academicYearTo: '',
    },
  });

  // Populate when opening
  React.useEffect(() => {
    if (!visible) return;
    // Parse "2025-2026" → from: "2025", to: "2026"
    let from = '';
    let to = '';
    if (initialValues?.academicYearFrom) {
      from = String(initialValues.academicYearFrom);
    } else if (initialValues && (initialValues as any).academicYear) {
      const ay = String((initialValues as any).academicYear || '');
      const parts = ay.split('-');
      if (parts.length === 2) { from = parts[0]; to = parts[1]; }
      else if (parts.length === 1 && parts[0]) { from = parts[0]; }
    }
    if (initialValues?.academicYearTo) to = String(initialValues.academicYearTo);

    reset({
      projectName: initialValues?.projectName ?? '',
      status: initialValues?.status ?? '',
      domain: initialValues?.domain ?? '',
      academicYearFrom: from,
      academicYearTo: to,
    });
  }, [visible, initialValues]);

  const [statusOpen, setStatusOpen] = useState(false);
  const [domainOpen, setDomainOpen] = useState(false);
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const watchFrom = watch('academicYearFrom');
  const watchTo   = watch('academicYearTo');

  const toYearOptions = useMemo(
    () => YEAR_OPTIONS.filter((y) => !watchFrom || y > Number(watchFrom)),
    [watchFrom],
  );

  const isEditing = !!initialValues;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={s.sheet}>
          {/* Header */}
          <View style={s.header}>
            <Text style={s.headerTitle}>
              {isEditing ? 'Edit Real-Time Industry Project' : 'Add Real-Time Industry Project'}
            </Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={s.body}
            contentContainerStyle={s.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Project Title */}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Project Title <Text style={{ color: colors.red[500] }}>*</Text></Text>
              <Controller
                control={control}
                name="projectName"
                rules={{ required: 'Project title is required' }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[s.input, errors.projectName && s.inputError]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Enter project title"
                    placeholderTextColor={theme.textMuted}
                    autoCorrect={false}
                  />
                )}
              />
              {errors.projectName && <Text style={s.errText}>{errors.projectName.message}</Text>}
            </View>

            {/* Status */}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Status <Text style={{ color: colors.red[500] }}>*</Text></Text>
              <Controller
                control={control}
                name="status"
                rules={{ required: 'Status is required' }}
                render={({ field: { onChange, value } }) => {
                  const selected = STATUS_OPTIONS.find((o) => o.value === value);
                  return (
                    <>
                      <TouchableOpacity
                        style={[s.input, s.selectTrigger, errors.status && s.inputError]}
                        onPress={() => setStatusOpen(true)}
                        activeOpacity={0.8}
                      >
                        <Text style={selected ? s.selectValue : s.selectPlaceholder} numberOfLines={1}>
                          {selected?.label ?? 'Select Status'}
                        </Text>
                        <ChevronDown size={15} color={theme.textMuted} />
                      </TouchableOpacity>
                      <SelectSheet
                        visible={statusOpen}
                        title="Status"
                        options={STATUS_OPTIONS}
                        value={value}
                        onSelect={onChange}
                        onClose={() => setStatusOpen(false)}
                        theme={theme}
                      />
                    </>
                  );
                }}
              />
              {errors.status && <Text style={s.errText}>{errors.status.message}</Text>}
            </View>

            {/* Domain */}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Domain</Text>
              <Controller
                control={control}
                name="domain"
                render={({ field: { onChange, value } }) => {
                  const selected = DOMAIN_OPTIONS.find((o) => o.value === value);
                  return (
                    <>
                      <TouchableOpacity
                        style={[s.input, s.selectTrigger]}
                        onPress={() => setDomainOpen(true)}
                        activeOpacity={0.8}
                      >
                        <Text style={selected ? s.selectValue : s.selectPlaceholder} numberOfLines={1}>
                          {selected?.label ?? 'Select Domain'}
                        </Text>
                        <ChevronDown size={15} color={theme.textMuted} />
                      </TouchableOpacity>
                      <SelectSheet
                        visible={domainOpen}
                        title="Domain"
                        options={DOMAIN_OPTIONS}
                        value={value}
                        onSelect={onChange}
                        onClose={() => setDomainOpen(false)}
                        theme={theme}
                      />
                    </>
                  );
                }}
              />
            </View>

            {/* Academic Year — From / To */}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Academic Year</Text>
              <View style={s.yearRow}>
                <View style={s.yearCol}>
                  <Text style={s.yearLabel}>From</Text>
                  <Controller
                    control={control}
                    name="academicYearFrom"
                    render={({ field: { onChange, value } }) => {
                      const selected = YEAR_OPTIONS.find((y) => String(y) === String(value));
                      return (
                        <>
                          <TouchableOpacity
                            style={[s.input, s.selectTrigger]}
                            onPress={() => setFromOpen(true)}
                            activeOpacity={0.8}
                          >
                            <Text style={selected != null ? s.selectValue : s.selectPlaceholder} numberOfLines={1}>
                              {selected != null ? String(selected) : 'Year'}
                            </Text>
                            <ChevronDown size={15} color={theme.textMuted} />
                          </TouchableOpacity>
                          <SelectSheet
                            visible={fromOpen}
                            title="From Year"
                            options={YEAR_OPTIONS.map((y) => ({ label: String(y), value: String(y) }))}
                            value={String(value)}
                            onSelect={onChange}
                            onClose={() => setFromOpen(false)}
                            theme={theme}
                          />
                        </>
                      );
                    }}
                  />
                </View>
                <View style={s.yearCol}>
                  <Text style={s.yearLabel}>To</Text>
                  <Controller
                    control={control}
                    name="academicYearTo"
                    rules={{
                      validate: (v) => {
                        if (!watchFrom || !v) return true;
                        return Number(v) > Number(watchFrom) || '"To" must be after "From"';
                      },
                    }}
                    render={({ field: { onChange, value } }) => {
                      const selected = toYearOptions.find((y) => String(y) === String(value));
                      return (
                        <>
                          <TouchableOpacity
                            style={[s.input, s.selectTrigger, errors.academicYearTo && s.inputError]}
                            onPress={() => setToOpen(true)}
                            activeOpacity={0.8}
                          >
                            <Text style={selected != null ? s.selectValue : s.selectPlaceholder} numberOfLines={1}>
                              {selected != null ? String(selected) : 'Year'}
                            </Text>
                            <ChevronDown size={15} color={theme.textMuted} />
                          </TouchableOpacity>
                          <SelectSheet
                            visible={toOpen}
                            title="To Year"
                            options={toYearOptions.map((y) => ({ label: String(y), value: String(y) }))}
                            value={String(value)}
                            onSelect={onChange}
                            onClose={() => setToOpen(false)}
                            theme={theme}
                          />
                        </>
                      );
                    }}
                  />
                  {errors.academicYearTo && <Text style={s.errText}>{errors.academicYearTo.message}</Text>}
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={s.footer}>
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={onClose}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.submitBtn, { backgroundColor: ACCENT }, loading && s.btnDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={s.submitText}>{isEditing ? 'Update' : 'Add'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Add Student Modal ────────────────────────────────────────────────────────

interface AddStudentModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (student: StudentSearchResult) => void;
  existingStudentIds: Set<string>;
  loading?: boolean;
  theme: ThemeColors;
}

function AddStudentModal({ visible, onClose, onSelect, existingStudentIds, loading, theme }: AddStudentModalProps) {
  const s = useMemo(() => formStyles(theme), [theme]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StudentSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [dupMsg, setDupMsg] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  React.useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
      setDupMsg('');
    }
  }, [visible]);

  React.useEffect(() => {
    const trimmed = debouncedQuery.trim();
    setDupMsg('');
    if (trimmed.length < 2) { setResults([]); return; }
    let cancelled = false;
    setSearching(true);
    searchStudentsByName(trimmed)
      .then((data) => { if (!cancelled) setResults(data); })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setSearching(false); });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const handleSelect = useCallback((student: StudentSearchResult) => {
    // Prevent duplicate — check by usn
    if (existingStudentIds.has(student.usn)) {
      setDupMsg(`${student.name} is already in this project.`);
      return;
    }
    onSelect(student);
  }, [existingStudentIds, onSelect]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={s.sheet}>
          {/* Header */}
          <View style={s.header}>
            <Text style={s.headerTitle}>Add Student</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            <TextInput
              style={s.studentSearchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search by student name"
              placeholderTextColor={theme.textMuted}
              autoFocus
              autoCorrect={false}
            />
          </View>

          {dupMsg ? (
            <Text style={[s.studentHint, { color: colors.red[500], paddingHorizontal: 20 }]}>{dupMsg}</Text>
          ) : null}

          <ScrollView
            style={{ maxHeight: 320, paddingHorizontal: 20 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {searching && <Text style={s.studentHint}>Searching…</Text>}
            {!searching && debouncedQuery.trim().length >= 2 && results.length === 0 && (
              <Text style={s.studentHint}>No students found.</Text>
            )}
            {!searching && debouncedQuery.trim().length < 2 && (
              <Text style={s.studentHint}>Type at least 2 letters to search.</Text>
            )}
            {results.map((st) => {
              const isDup = existingStudentIds.has(st.usn);
              return (
                <TouchableOpacity
                  key={String(st.library_id)}
                  style={[s.studentResult, isDup && s.studentResultDup]}
                  onPress={() => handleSelect(st)}
                  activeOpacity={isDup ? 1 : 0.75}
                  disabled={loading}
                >
                  <Text style={[s.studentResultName, isDup && { color: theme.textMuted }]}>
                    {st.name}
                  </Text>
                  <Text style={s.studentResultSub}>
                    {st.usn}
                    {st.semester_number != null ? ` - Sem ${st.semester_number}` : ''}
                    {st.section_name ? ` - ${st.section_name}` : ''}
                    {isDup ? '  (already added)' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={s.footer}>
            <TouchableOpacity style={[s.cancelBtn, { flex: 1 }]} onPress={onClose} activeOpacity={0.8}>
              <Text style={s.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────

interface ProjectCardProps {
  group: ProjectGroup;
  onEditProject: (group: ProjectGroup) => void;
  onDeleteProject: (group: ProjectGroup) => void;
  onAddStudent: (group: ProjectGroup) => void;
  onEditStudent: (group: ProjectGroup, student: StudentRow) => void;
  onDeleteStudent: (group: ProjectGroup, student: StudentRow) => void;
  theme: ThemeColors;
}

function ProjectCard({
  group, onEditProject, onDeleteProject, onAddStudent,
  onEditStudent, onDeleteStudent, theme,
}: ProjectCardProps) {
  const s = useMemo(() => cardStyles(theme), [theme]);
  const { header, students } = group;
  const [expanded, setExpanded] = useState(false);

  const desc = parseDesc(header.description);
  const domain = desc.domain || (header as any).domain;
  const status = header.status || desc.projectStatus;
  const academicYear = formatAcademicYear(header);

  return (
    <View style={[s.card, { borderLeftColor: ACCENT }]}>
      {/* Card header row: title + edit + plus */}
      <View style={s.cardTop}>
        <Text style={s.cardTitle} numberOfLines={2}>{header.title || '—'}</Text>
        <View style={s.cardActions}>
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => onEditProject(group)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Pencil size={14} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: ACCENT + '20' }]}
            onPress={() => onAddStudent(group)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Plus size={14} color={ACCENT} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chips */}
      <View style={s.chips}>
        {domain ? (
          <View style={s.chip}>
            <Text style={s.chipLabel}>Domain</Text>
            <Text style={[s.chipValue, { color: ACCENT }]}>{getDomainLabel(domain)}</Text>
          </View>
        ) : null}
        {status ? (
          <View style={s.chip}>
            <Text style={s.chipLabel}>Status</Text>
            <Text style={s.chipValue}>{getStatusLabel(status)}</Text>
          </View>
        ) : null}
        {academicYear ? (
          <View style={s.chip}>
            <Text style={s.chipLabel}>Academic Year</Text>
            <Text style={s.chipValue}>{academicYear}</Text>
          </View>
        ) : null}
      </View>

      {/* Students toggle */}
      <TouchableOpacity
        style={s.studentToggle}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.75}
      >
        <View style={s.studentToggleLeft}>
          <Users size={15} color={ACCENT} />
          <Text style={s.studentCount}>STUDENTS ({students.length})</Text>
        </View>
        {expanded ? <ChevronUp size={16} color={theme.textMuted} /> : <ChevronDown size={16} color={theme.textMuted} />}
      </TouchableOpacity>

      {/* Expanded student table */}
      {expanded && (
        <View style={s.tableWrap}>
          {students.length === 0 ? (
            <Text style={s.noStudents}>No students added yet. Tap + to add.</Text>
          ) : (
            <View style={s.table}>
              <View style={s.tableHeaderRow}>
                <Text style={[s.tableHeader, s.colName]}>STUDENT NAME</Text>
                <Text style={[s.tableHeader, s.colUsn]}>USN</Text>
                <Text style={[s.tableHeader, s.colSem]}>SEM</Text>
                <Text style={[s.tableHeader, s.colSec]}>SEC</Text>
                <Text style={[s.tableHeader, s.colAct]} />
              </View>
              {students.map((student, idx) => (
                <View
                  key={`${student.activityId ?? student.studentId ?? idx}`}
                  style={s.tableRow}
                >
                  <Text style={[s.tableCell, s.colName]} numberOfLines={1}>
                    {student.name || '—'}
                  </Text>
                  <Text style={[s.tableCell, s.colUsn]} numberOfLines={1}>
                    {student.usn || '—'}
                  </Text>
                  <Text style={[s.tableCell, s.colSem]} numberOfLines={1}>
                    {student.semester != null ? String(student.semester) : '—'}
                  </Text>
                  <Text style={[s.tableCell, s.colSec]} numberOfLines={1}>
                    {student.section || '—'}
                  </Text>
                  <View style={[s.colAct, s.cellActions]}>
                    <TouchableOpacity
                      style={s.studentActionBtn}
                      onPress={() => onEditStudent(group, student)}
                      hitSlop={6}
                    >
                      <Pencil size={11} color={theme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.studentActionBtn, s.deleteBtnSmall]}
                      onPress={() => onDeleteStudent(group, student)}
                      hitSlop={6}
                    >
                      <Trash2 size={11} color={colors.red[500]} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RealTimeIndustryProjects() {
  const { colors: theme } = useTheme();
  const s = useMemo(() => screenStyles(theme), [theme]);

  // List / search / page
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 350);
  const params = { page, limit: LIMIT, search: debouncedSearch || undefined };
  const { data, isLoading, isFetching, refetch } = useIndustryProjectList(params);
  const rawItems: RawRow[] = (data as any)?.data || [];
  const groups = useMemo(() => buildGroups(rawItems), [rawItems]);

  // Project form state
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ProjectGroup | null>(null);

  // Student form state
  const [studentFormOpen, setStudentFormOpen] = useState(false);
  const [studentTarget, setStudentTarget] = useState<ProjectGroup | null>(null);
  // For editing a student: replace mode
  const [replacingStudent, setReplacingStudent] = useState<StudentRow | null>(null);

  // Delete state
  const [deleteProjectTarget, setDeleteProjectTarget] = useState<ProjectGroup | null>(null);
  const [deleteStudentTarget, setDeleteStudentTarget] = useState<{ group: ProjectGroup; student: StudentRow } | null>(null);

  // Mutations
  const createMutation = useCreateIndustryProject({
    onSuccess: () => { setProjectFormOpen(false); setPage(1); },
  });
  const updateMutation = useUpdateIndustryProject(
    String(editingGroup?.header.id ?? ''),
    { onSuccess: () => { setProjectFormOpen(false); setEditingGroup(null); } },
  );
  // addStudent needs the project id at hook call time
  const [addStudentProjectId, setAddStudentProjectId] = useState<string>('');
  const addStudentMutation = useAddProjectStudent(addStudentProjectId, {
    onSuccess: () => { setStudentFormOpen(false); setStudentTarget(null); setReplacingStudent(null); },
  });
  const removeStudentMutation = useRemoveProjectStudent({
    onSuccess: () => setDeleteStudentTarget(null),
  });
  const deleteProjectMutation = useDeleteIndustryProject({
    onSuccess: () => setDeleteProjectTarget(null),
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);

  const openAddProject = useCallback(() => {
    setEditingGroup(null);
    setProjectFormOpen(true);
  }, []);

  const openEditProject = useCallback((group: ProjectGroup) => {
    setEditingGroup(group);
    setProjectFormOpen(true);
  }, []);

  const openAddStudent = useCallback((group: ProjectGroup) => {
    setReplacingStudent(null);
    setStudentTarget(group);
    setAddStudentProjectId(String(group.header.id));
    setStudentFormOpen(true);
  }, []);

  const openEditStudent = useCallback((group: ProjectGroup, student: StudentRow) => {
    // "Edit student" = replace: remove old + add new. We open the search, then
    // on selection we remove the old row and add the new one.
    setReplacingStudent(student);
    setStudentTarget(group);
    setAddStudentProjectId(String(group.header.id));
    setStudentFormOpen(true);
  }, []);

  const handleProjectSubmit = useCallback((data: ProjectFormValues) => {
    // Build academicYear string "YYYY-YYYY"
    const ay =
      data.academicYearFrom && data.academicYearTo
        ? `${data.academicYearFrom}-${data.academicYearTo}`
        : data.academicYearFrom || data.academicYearTo || '';

    const payload = {
      projectName: data.projectName,
      status: data.status,
      domain: data.domain,
      academicYear: ay,
    };

    if (editingGroup) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  }, [editingGroup, createMutation, updateMutation]);

  const handleStudentSelect = useCallback((student: StudentSearchResult) => {
    if (replacingStudent) {
      // Remove the old student row first, then add the new one
      removeStudentMutation.mutate(
        { projectId: String(studentTarget!.header.id), studentId: String(replacingStudent.studentId) },
        {
          onSuccess: () => {
            addStudentMutation.mutate({ student_id: student.usn });
          },
        },
      );
    } else {
      addStudentMutation.mutate({ student_id: student.usn });
    }
  }, [replacingStudent, studentTarget, removeStudentMutation, addStudentMutation]);

  const confirmDeleteProject = useCallback(() => {
    if (!deleteProjectTarget) return;
    // Delete the header row — service layer will cascade to all student rows
    deleteProjectMutation.mutate(String(deleteProjectTarget.header.id));
  }, [deleteProjectTarget, deleteProjectMutation]);

  const confirmDeleteStudent = useCallback(() => {
    if (!deleteStudentTarget) return;
    removeStudentMutation.mutate({
      projectId: String(deleteStudentTarget.group.header.id),
      studentId: String(deleteStudentTarget.student.studentId),
    });
  }, [deleteStudentTarget, removeStudentMutation]);

  // ── Project form initial values ────────────────────────────────────────────

  const projectFormInitialValues = useMemo<Partial<ProjectFormValues> | null>(() => {
    if (!editingGroup) return null;
    const { header } = editingGroup;
    const desc = parseDesc(header.description);
    const rawStatus = String(header.status ?? '');
    const statusValue = STATUS_LABEL_TO_VALUE[rawStatus] ?? rawStatus.toUpperCase();
    // Parse academic year
    const ay = String(header.academic_year ?? '');
    const ayParts = ay.split('-');
    return {
      projectName: String(header.title ?? ''),
      status: statusValue,
      domain: desc.domain ?? (header as any).domain ?? '',
      academicYearFrom: ayParts[0] ?? '',
      academicYearTo: ayParts[1] ?? '',
    };
  }, [editingGroup]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const ListHeader = useMemo(() => (
    <View style={s.filterRow}>
      <SearchBar value={search} onChange={handleSearch} placeholder="Search projects..." style={s.search} />
      <TouchableOpacity
        onPress={openAddProject}
        style={[s.addBtn, { backgroundColor: ACCENT }]}
        activeOpacity={0.85}
      >
        <Plus size={18} color={colors.white} />
      </TouchableOpacity>
    </View>
  ), [search, handleSearch, openAddProject, s]);

  const ListEmpty = !isLoading ? (
    <Animated.View entering={FadeInUp.delay(100).duration(400)} style={s.empty}>
      <Text style={s.emptyText}>
        {debouncedSearch ? `No results for "${debouncedSearch}"` : 'No industry projects recorded yet.'}
      </Text>
      <TouchableOpacity onPress={openAddProject} style={[s.emptyAddBtn, { borderColor: ACCENT }]}>
        <Text style={[s.emptyAddText, { color: ACCENT }]}>+ Add First Project</Text>
      </TouchableOpacity>
    </Animated.View>
  ) : null;

  return (
    <View style={s.root}>
      {/* Page header */}
      <Animated.View entering={FadeIn.duration(300)} style={s.pageHeader}>
        <Text style={s.pageTitle}>Real-Time Industry Projects</Text>
        {!isLoading && (
          <View style={s.countBadge}>
            <Text style={s.countText}>{groups.length}</Text>
          </View>
        )}
      </Animated.View>

      <FlatList
        data={isLoading ? [] : groups}
        keyExtractor={(g) => String(g.header.id)}
        renderItem={({ item: group }) => (
          <ProjectCard
            group={group}
            onEditProject={openEditProject}
            onDeleteProject={(g) => setDeleteProjectTarget(g)}
            onAddStudent={openAddStudent}
            onEditStudent={openEditStudent}
            onDeleteStudent={(g, st) => setDeleteStudentTarget({ group: g, student: st })}
            theme={theme}
          />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={ACCENT}
            colors={[ACCENT]}
          />
        }
      />

      {/* Project Form Modal */}
      <ProjectFormModal
        visible={projectFormOpen}
        onClose={() => { setProjectFormOpen(false); setEditingGroup(null); }}
        onSubmit={handleProjectSubmit}
        initialValues={projectFormInitialValues}
        loading={createMutation.isPending || updateMutation.isPending}
        theme={theme}
      />

      {/* Add / Replace Student Modal */}
      {studentTarget && (
        <AddStudentModal
          visible={studentFormOpen}
          onClose={() => { setStudentFormOpen(false); setStudentTarget(null); setReplacingStudent(null); }}
          onSelect={handleStudentSelect}
          existingStudentIds={
            replacingStudent
              ? new Set(
                  studentTarget.students
                    .filter((s) => s.usn !== replacingStudent.usn)
                    .map((s) => s.usn ?? '')
                    .filter(Boolean),
                )
              : new Set(studentTarget.students.map((s) => s.usn ?? '').filter(Boolean))
          }
          loading={addStudentMutation.isPending || removeStudentMutation.isPending}
          theme={theme}
        />
      )}

      {/* Delete Project Confirm */}
      <ConfirmDialog
        isOpen={!!deleteProjectTarget}
        onClose={() => setDeleteProjectTarget(null)}
        onConfirm={confirmDeleteProject}
        loading={deleteProjectMutation.isPending}
        title="Delete Project"
        message={`Delete "${deleteProjectTarget?.header.title}"? This will also remove all ${deleteProjectTarget?.students.length ?? 0} student(s) in this project. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />

      {/* Delete Student Confirm */}
      <ConfirmDialog
        isOpen={!!deleteStudentTarget}
        onClose={() => setDeleteStudentTarget(null)}
        onConfirm={confirmDeleteStudent}
        loading={removeStudentMutation.isPending}
        title="Remove Student"
        message={`Remove ${deleteStudentTarget?.student.name ?? 'this student'} from "${deleteStudentTarget?.group.header.title}"?`}
        confirmLabel="Remove"
        variant="danger"
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const screenStyles = (theme: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  pageTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: theme.textPrimary },
  countBadge: {
    backgroundColor: theme.textMuted,
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: { fontSize: 12, fontWeight: '600', color: colors.white },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  search: { flex: 1 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: { paddingBottom: 32 },
  empty: { padding: 40, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, color: theme.textMuted, textAlign: 'center' },
  emptyAddBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  emptyAddText: { fontSize: 13, fontWeight: '600' },
});

const cardStyles = (theme: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    borderLeftWidth: 3,
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 14,
    gap: 10,
    ...shadows.card,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.textPrimary },
  cardActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  actionBtn: {
    padding: 7,
    borderRadius: 8,
    backgroundColor: theme.primarySoft,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.background,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipLabel: { fontSize: 10, color: theme.textMuted, fontWeight: '500' },
  chipValue: { fontSize: 11, color: theme.textSecondary, fontWeight: '600' },
  studentToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 10,
  },
  studentToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  studentCount: { fontSize: 11, fontWeight: '700', color: theme.textSecondary, letterSpacing: 0.2 },
  tableWrap: { borderWidth: 1, borderColor: theme.border, borderRadius: 10, overflow: 'hidden' },
  table: { width: '100%' },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: theme.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingVertical: 9,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tableHeader: { fontSize: 9, fontWeight: '700', color: theme.textSecondary },
  tableCell: { fontSize: 11, color: theme.textPrimary },
  colName: { flex: 1.55 },
  colUsn: { flex: 1.05 },
  colSem: { flex: 0.55, textAlign: 'center' },
  colSec: { flex: 0.65, textAlign: 'center' },
  colAct: { flex: 0.7 },
  cellActions: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  studentActionBtn: { padding: 5, borderRadius: 7, backgroundColor: theme.primarySoft },
  deleteBtnSmall: { backgroundColor: colors.red[50] },
  noStudents: { padding: 14, fontSize: 12, color: theme.textMuted, textAlign: 'center' },
});

const formStyles = (theme: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    ...shadows.soft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
  closeBtn: { padding: 4 },
  body: { flexShrink: 1 },
  bodyContent: { padding: 20, gap: 14, paddingBottom: 8 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  fieldWrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '500', color: theme.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.textPrimary,
    backgroundColor: theme.surface,
  },
  inputError: { borderColor: colors.red[400] },
  errText: { fontSize: 11, color: colors.red[500] },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectValue: { flex: 1, fontSize: 14, color: theme.textPrimary },
  selectPlaceholder: { flex: 1, fontSize: 14, color: theme.textMuted },
  yearRow: { flexDirection: 'row', gap: 10 },
  yearCol: { flex: 1, gap: 4 },
  yearLabel: { fontSize: 12, color: theme.textMuted },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '600', color: theme.textSecondary },
  submitBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { fontSize: 14, fontWeight: '600', color: colors.white },
  btnDisabled: { opacity: 0.6 },
  studentSearchInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.textPrimary,
    marginBottom: 10,
  },
  studentHint: { fontSize: 12, color: theme.textMuted, textAlign: 'center', paddingVertical: 14 },
  studentResult: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  studentResultDup: { opacity: 0.5 },
  studentResultName: { fontSize: 14, color: theme.textPrimary, fontWeight: '500' },
  studentResultSub: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  // SelectSheet (rendered as separate Modal)
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.overlay },
  sheetTitle: { fontSize: 15, fontWeight: '600', color: theme.textPrimary, marginBottom: 12 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  optionActive: { backgroundColor: theme.primarySoft, borderRadius: 8, paddingHorizontal: 8 },
  optionText: { fontSize: 14, color: theme.textSecondary },
  optionTextActive: { color: theme.primary, fontWeight: '600' },
});

const sheetStyles = (theme: ThemeColors) => StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.overlay },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    ...shadows.soft,
  },
  sheetTitle: { fontSize: 15, fontWeight: '600', color: theme.textPrimary, marginBottom: 12 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  optionActive: { backgroundColor: theme.primarySoft, borderRadius: 8, paddingHorizontal: 8 },
  optionText: { fontSize: 14, color: theme.textSecondary },
  optionTextActive: { color: theme.primary, fontWeight: '600' },
});
