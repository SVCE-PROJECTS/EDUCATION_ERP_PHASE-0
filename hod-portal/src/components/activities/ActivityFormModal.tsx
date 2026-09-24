/**
 * ActivityFormModal — generic form driven by a `fields` descriptor array.
 * Uses react-hook-form Controller API (required for React Native TextInput).
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal as RNModal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useForm, Controller, Control, FieldErrors, RegisterOptions } from 'react-hook-form';
import { X, ChevronDown, Check } from '../../components/icons';
import Button from '../ui/Button';
import { colors, shadows, ThemeColors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useDebounce } from '../../hooks/useDebounce';
import { searchStudentsByName, StudentSearchResult } from '../../services/studentSearch.service';

export type FieldType = 'text' | 'number' | 'email' | 'multiline' | 'select' | 'date' | 'student-search';

export interface FieldOption {
  label: string;
  value: string | number;
}

export interface FieldDescriptor {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: FieldType;
  options?: FieldOption[];
  validation?: RegisterOptions;
}

// ─── Field renderers ──────────────────────────────────────────────────────────

interface FieldLabelProps {
  label: string;
  required?: boolean;
  styles: ReturnType<typeof getStyles>;
}

function FieldLabel({ label, required, styles: fs }: FieldLabelProps) {
  return (
    <Text style={fs.label}>
      {label}
      {required && <Text style={{ color: colors.red[500] }}> *</Text>}
    </Text>
  );
}

interface TextFieldProps {
  field: FieldDescriptor;
  control: Control<any>;
  errors: FieldErrors<any>;
  type?: FieldType;
  theme: ThemeColors;
  styles: ReturnType<typeof getStyles>;
}

function TextField({ field, control, errors, type, theme, styles: fs }: TextFieldProps) {
  const isMultiline = type === 'multiline';
  const isNumber = type === 'number';
  const isEmail = type === 'email';

  return (
    <Controller
      control={control}
      name={field.name}
      rules={field.validation ?? (field.required ? { required: `${field.label} is required` } : {})}
      render={({ field: { onChange, onBlur, value } }) => (
        <TextInput
          style={[fs.input, isMultiline && fs.inputMulti, errors[field.name] && fs.inputError]}
          value={value?.toString() ?? ''}
          onChangeText={onChange}
          onBlur={onBlur}
          placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`}
          placeholderTextColor={theme.textMuted}
          keyboardType={isNumber ? 'numeric' : isEmail ? 'email-address' : 'default'}
          autoCapitalize={isEmail ? 'none' : 'sentences'}
          multiline={isMultiline}
          numberOfLines={isMultiline ? 3 : 1}
          textAlignVertical={isMultiline ? 'top' : 'center'}
          autoCorrect={false}
        />
      )}
    />
  );
}

interface SelectFieldProps {
  field: FieldDescriptor;
  control: Control<any>;
  errors: FieldErrors<any>;
  theme: ThemeColors;
  styles: ReturnType<typeof getStyles>;
}

function SelectField({ field, control, errors, theme, styles: fs }: SelectFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <Controller
      control={control}
      name={field.name}
      rules={field.required ? { required: `${field.label} is required` } : {}}
      render={({ field: { onChange, value } }) => {
        const selected = field.options?.find((o) => o.value === value);
        return (
          <>
            <TouchableOpacity
              style={[fs.input, fs.selectTrigger, errors[field.name] && fs.inputError]}
              onPress={() => setOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={selected ? fs.selectValue : fs.selectPlaceholder} numberOfLines={1}>
                {selected?.label ?? `Select ${field.label}`}
              </Text>
              <ChevronDown size={15} color={theme.textMuted} />
            </TouchableOpacity>

            <RNModal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
              <TouchableOpacity style={fs.selectBackdrop} activeOpacity={1} onPress={() => setOpen(false)} />
              <View style={fs.selectSheet}>
                <Text style={fs.selectSheetTitle}>{field.label}</Text>
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 280 }}>
                  {field.options?.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[fs.selectOption, opt.value === value && fs.selectOptionActive]}
                      onPress={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={[fs.selectOptionText, opt.value === value && fs.selectOptionTextActive]}>
                        {opt.label}
                      </Text>
                      {opt.value === value && <Check size={14} color={theme.primary} />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </RNModal>
          </>
        );
      }}
    />
  );
}

interface StudentSearchFieldProps extends SelectFieldProps {
  // The record being edited, if any — used to show the already-assigned
  // student's name/USN. Reassigning the student on an existing row isn't
  // supported by the backend, so the field is read-only while editing.
  initialValues?: Record<string, unknown> | null;
  isOpen: boolean;
}

function StudentSearchField({ field, control, errors, theme, styles: fs, initialValues, isOpen }: StudentSearchFieldProps) {
  const isEditing = !!initialValues;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StudentSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<{ usn: string; name: string } | null>(null);
  const debouncedQuery = useDebounce(query, 300);

  // Every time the modal is opened fresh (new "Add" or a different record
  // to edit), drop whatever was left over from the previous time it was open.
  useEffect(() => {
    setSheetOpen(false);
    setQuery('');
    setResults([]);
    setSelected(null);
  }, [isOpen]);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    searchStudentsByName(trimmed)
      .then((data) => { if (!cancelled) setResults(data); })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const editingLabel = initialValues?.student_name && initialValues?.usn
    ? `${initialValues.student_name} (${initialValues.usn})`
    : (initialValues?.usn as string | undefined) ?? '';

  return (
    <Controller
      control={control}
      name={field.name}
      rules={!isEditing && field.required ? { required: `${field.label} is required` } : {}}
      render={({ field: { onChange } }) => {
        const triggerLabel = isEditing ? editingLabel : (selected ? `${selected.name} (${selected.usn})` : '');
        return (
          <>
            <TouchableOpacity
              style={[fs.input, fs.selectTrigger, errors[field.name] && fs.inputError, isEditing && fs.inputDisabled]}
              onPress={() => !isEditing && setSheetOpen(true)}
              activeOpacity={isEditing ? 1 : 0.8}
              disabled={isEditing}
            >
              <Text style={triggerLabel ? fs.selectValue : fs.selectPlaceholder} numberOfLines={1}>
                {triggerLabel || 'Search by student name'}
              </Text>
              {!isEditing && <ChevronDown size={15} color={theme.textMuted} />}
            </TouchableOpacity>

            <RNModal visible={sheetOpen} transparent animationType="fade" onRequestClose={() => setSheetOpen(false)}>
              <TouchableOpacity style={fs.selectBackdrop} activeOpacity={1} onPress={() => setSheetOpen(false)} />
              <View style={fs.selectSheet}>
                <Text style={fs.selectSheetTitle}>{field.label}</Text>
                <TextInput
                  style={fs.studentSearchInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Type at least 2 letters of the student's name"
                  placeholderTextColor={theme.textMuted}
                  autoFocus
                  autoCorrect={false}
                />
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 260 }} keyboardShouldPersistTaps="handled">
                  {loading && <Text style={fs.studentSearchHint}>Searching…</Text>}
                  {!loading && query.trim().length >= 2 && results.length === 0 && (
                    <Text style={fs.studentSearchHint}>No students found.</Text>
                  )}
                  {!loading && query.trim().length < 2 && (
                    <Text style={fs.studentSearchHint}>Keep typing to search…</Text>
                  )}
                  {results.map((s) => (
                    <TouchableOpacity
                      key={String(s.library_id)}
                      style={fs.selectOption}
                      onPress={() => {
                        onChange(s.usn);
                        setSelected({ usn: s.usn, name: s.name });
                        setSheetOpen(false);
                      }}
                      activeOpacity={0.75}
                    >
                      <View>
                        <Text style={fs.selectOptionText}>{s.name}</Text>
                        <Text style={fs.studentSearchSub}>
                          {s.usn}{s.section_name ? ` • Sem ${s.semester_number} • ${s.section_name}` : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </RNModal>
          </>
        );
      }}
    />
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export interface ActivityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
  title?: string;
  fields?: FieldDescriptor[];
  initialValues?: Record<string, unknown> | null;
  loading?: boolean;
  accentColor?: string;
}

export default function ActivityFormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  fields = [],
  initialValues,
  loading,
  accentColor,
}: ActivityFormModalProps) {
  const { colors: theme } = useTheme();
  const fs = getStyles(theme);
  const accent = accentColor ?? theme.primary;
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  // Populate form when editing
  useEffect(() => {
    if (isOpen) {
      const defaults: Record<string, unknown> = {};
      fields.forEach((f) => {
        defaults[f.name] = initialValues?.[f.name] ?? '';
      });
      reset(defaults);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialValues]);

  return (
    <RNModal visible={isOpen} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={fs.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={fs.sheet}>
          {/* Header */}
          <View style={fs.header}>
            <Text style={fs.headerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={fs.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            style={fs.body}
            contentContainerStyle={fs.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {fields.map((field) => (
              <View key={field.name} style={fs.fieldWrap}>
                <FieldLabel label={field.label} required={field.required} styles={fs} />

                {field.type === 'select' ? (
                  <SelectField field={field} control={control} errors={errors} theme={theme} styles={fs} />
                ) : field.type === 'student-search' ? (
                  <StudentSearchField
                    field={field}
                    control={control}
                    errors={errors}
                    theme={theme}
                    styles={fs}
                    initialValues={initialValues}
                    isOpen={isOpen}
                  />
                ) : (
                  <TextField field={field} control={control} errors={errors} type={field.type} theme={theme} styles={fs} />
                )}

                {errors[field.name] && (
                  <Text style={fs.errorText}>{errors[field.name]?.message as string}</Text>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={fs.footer}>
            <Button variant="outline" onPress={onClose} disabled={loading} style={fs.footerBtn}>
              Cancel
            </Button>
            <Button
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              style={[fs.footerBtn, { backgroundColor: accent }]}
            >
              {initialValues ? 'Update' : 'Add'}
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const getStyles = (theme: ThemeColors) => StyleSheet.create({
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
  footerBtn: { flex: 1 },
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
  inputMulti: { height: 80, textAlignVertical: 'top' },
  inputError: { borderColor: colors.red[400] },
  inputDisabled: { backgroundColor: theme.background, opacity: 0.7 },
  errorText: { fontSize: 11, color: colors.red[500] },
  studentSearchInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: theme.textPrimary,
    marginBottom: 10,
  },
  studentSearchHint: { fontSize: 12, color: theme.textMuted, textAlign: 'center', paddingVertical: 14 },
  studentSearchSub: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectValue: { flex: 1, fontSize: 14, color: theme.textPrimary },
  selectPlaceholder: { flex: 1, fontSize: 14, color: theme.textMuted },
  selectBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.overlay,
  },
  selectSheet: {
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
  selectSheetTitle: { fontSize: 15, fontWeight: '600', color: theme.textPrimary, marginBottom: 12 },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  selectOptionActive: { backgroundColor: theme.primarySoft, borderRadius: 8, paddingHorizontal: 8 },
  selectOptionText: { fontSize: 14, color: theme.textSecondary },
  selectOptionTextActive: { color: theme.primary, fontWeight: '600' },
});
