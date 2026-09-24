import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal as RNModal,
  KeyboardTypeOptions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useForm, Controller, Control, FieldErrors } from 'react-hook-form';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ChevronDown, Check, X, ArrowLeft, User } from '../../components/icons';
import { useQuery } from '@tanstack/react-query';
import { facultyService } from '../../services/faculty.service';
import { useCreateFaculty, useUpdateFaculty } from '../../hooks/useFaculty';
import { useTheme } from '../../context/ThemeContext';
import { colors, ThemeColors, shadows } from '../../theme/colors';
import { ROUTES } from '../../navigation/routes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FacultyStatus } from '../../types';

// ─── Static option lists ───────────────────────────────────────────────────────

const DESIGNATION_OPTIONS = [
  'Professor',
  'Associate Professor',
  'Assistant Professor',
  'Senior Lecturer',
  'Lecturer',
  'Teaching Assistant',
];

const QUALIFICATION_OPTIONS = ['Ph.D', 'M.Tech', 'M.E', 'M.Sc', 'MBA', 'MCA', 'B.Tech', 'B.E'];

const STATUS_OPTIONS: { label: string; value: FacultyStatus }[] = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
  { label: 'On Leave', value: 'ON_LEAVE' },
];

const EXPERIENCE_OPTIONS = Array.from({ length: 41 }, (_, i) => ({
  label: i === 0 ? 'Less than 1 year' : `${i} year${i > 1 ? 's' : ''}`,
  value: String(i),
}));

type SelectOption = string | { label: string; value: string };

interface FormValues {
  name: string;
  email: string;
  phone: string;
  employeeId: string;
  designation: string;
  qualification: string;
  specialization: string;
  experience: string;
  joiningDate: string;
  status: FacultyStatus;
}

// ─── Reusable sub-components ──────────────────────────────────────────────────

function SectionTitle({ title }: { title: string }) {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  return <Text style={s.sectionTitle}>{title}</Text>;
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  return (
    <Text style={s.label}>
      {label}
      {required && <Text style={{ color: colors.red[500] }}> *</Text>}
    </Text>
  );
}

function ErrorMsg({ msg }: { msg?: string }) {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  return msg ? <Text style={s.errorMsg}>{msg}</Text> : null;
}

// Controlled TextInput field
interface InputFieldProps {
  name: keyof FormValues;
  label: string;
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
  required?: boolean;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
  multiline?: boolean;
}

function InputField({
  name,
  label,
  control,
  errors,
  required,
  placeholder,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  multiline,
}: InputFieldProps) {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  return (
    <View style={s.fieldGroup}>
      <FieldLabel label={label} required={required} />
      <Controller
        control={control}
        name={name}
        rules={required ? { required: `${label} is required` } : {}}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[s.input, multiline && s.inputMulti, errors[name] && s.inputError]}
            onChangeText={onChange}
            onBlur={onBlur}
            value={value ?? ''}
            placeholder={placeholder ?? `Enter ${label.toLowerCase()}`}
            placeholderTextColor={theme.placeholder}
            keyboardType={keyboardType ?? 'default'}
            autoCapitalize={autoCapitalize ?? 'words'}
            secureTextEntry={secureTextEntry}
            multiline={multiline}
            numberOfLines={multiline ? 3 : 1}
            textAlignVertical={multiline ? 'top' : 'center'}
            autoCorrect={false}
          />
        )}
      />
      <ErrorMsg msg={errors[name]?.message as string | undefined} />
    </View>
  );
}

// Controlled select picker (bottom-sheet modal)
interface SelectFieldProps {
  name: keyof FormValues;
  label: string;
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
  required?: boolean;
  options: SelectOption[];
}

function SelectField({ name, label, control, errors, required, options }: SelectFieldProps) {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  const [open, setOpen] = useState(false);
  return (
    <View style={s.fieldGroup}>
      <FieldLabel label={label} required={required} />
      <Controller
        control={control}
        name={name}
        rules={required ? { required: `${label} is required` } : {}}
        render={({ field: { onChange, value } }) => {
          const display = Array.isArray(options)
            ? typeof options[0] === 'string'
              ? (options as string[]).includes(value) ? value : null
              : (options as { label: string; value: string }[]).find((o) => o.value === value)?.label
            : null;

          return (
            <>
              <TouchableOpacity
                style={[s.input, s.selectTrigger, errors[name] && s.inputError]}
                onPress={() => setOpen(true)}
                activeOpacity={0.8}
              >
                <Text style={display ? s.selectValue : s.selectPlaceholder} numberOfLines={1}>
                  {display ?? `Select ${label}`}
                </Text>
                <ChevronDown size={16} color={theme.textMuted} />
              </TouchableOpacity>

              <RNModal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <TouchableOpacity style={s.sheetBackdrop} activeOpacity={1} onPress={() => setOpen(false)} />
                <View style={s.sheetContainer}>
                  <View style={s.sheetHeader}>
                    <Text style={s.sheetTitle}>{label}</Text>
                    <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <X size={18} color={theme.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
                    {(Array.isArray(options) ? options : []).map((opt, i) => {
                      const optVal = typeof opt === 'string' ? opt : opt.value;
                      const optLabel = typeof opt === 'string' ? opt : opt.label;
                      const active = optVal === value;
                      return (
                        <TouchableOpacity
                          key={i}
                          style={[s.sheetOption, active && s.sheetOptionActive]}
                          onPress={() => {
                            onChange(optVal);
                            setOpen(false);
                          }}
                          activeOpacity={0.75}
                        >
                          <Text style={[s.sheetOptionText, active && s.sheetOptionTextActive]}>{optLabel}</Text>
                          {active && <Check size={14} color={theme.primary} />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </RNModal>
            </>
          );
        }}
      />
      <ErrorMsg msg={errors[name]?.message as string | undefined} />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

interface PhotoAsset {
  uri: string;
  type: string;
  name: string;
}

export default function AddEditFaculty() {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  // If route has an id param → Edit mode
  const facultyId: string | null = route.params?.id ?? null;
  const isEdit = Boolean(facultyId);

  const [photoAsset, setPhotoAsset] = useState<PhotoAsset | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Fetch existing faculty data in edit mode
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['faculty', facultyId],
    queryFn: () => facultyService.getById(facultyId as string),
    enabled: isEdit,
    staleTime: 0,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      employeeId: '',
      designation: '',
      qualification: '',
      specialization: '',
      experience: '0',
      joiningDate: '',
      status: 'ACTIVE',
    },
  });

  // Populate form when editing an existing faculty
  useEffect(() => {
    if (isEdit && (existing as any)?.data) {
      const f = (existing as any).data;
      reset({
        name: f.name ?? '',
        email: f.email ?? '',
        phone: f.phone ?? '',
        employeeId: f.employeeId ?? '',
        designation: f.designation ?? '',
        qualification: f.qualification ?? '',
        specialization: f.specialization ?? '',
        experience: String(f.experience ?? 0),
        joiningDate: f.joiningDate ?? '',
        status: f.status ?? 'ACTIVE',
      });
      if (f.photo) setPhotoPreview(f.photo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing, isEdit, reset]);

  // Mutations
  const createMutation = useCreateFaculty({
    onSuccess: () => navigation.navigate(ROUTES.HOD_FACULTY),
  });
  const updateMutation = useUpdateFaculty(facultyId as string, {
    onSuccess: () => navigation.navigate(ROUTES.FACULTY_PROFILE, { id: facultyId }),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Photo picker — uses expo-image-picker, no <input type="file">
  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setPhotoPreview(asset.uri);
      // Shape required by axios multipart/form-data in React Native
      setPhotoAsset({
        uri: asset.uri,
        type: asset.mimeType ?? 'image/jpeg',
        name: asset.fileName ?? `photo_${Date.now()}.jpg`,
      });
    }
  };

  const onSubmit = (formValues: FormValues) => {
    // Build a FormData object — works with axios multipart/form-data in RN
    const fd = new FormData();

    Object.entries(formValues).forEach(([key, val]) => {
      if (val !== '' && val != null) fd.append(key, val as string);
    });

    if (photoAsset) {
      // React Native FormData accepts { uri, type, name } directly
      fd.append('photo', photoAsset as any);
    }

    if (isEdit) {
      updateMutation.mutate(fd);
    } else {
      createMutation.mutate(fd);
    }
  };

  // ── Loading existing faculty ──
  if (isEdit && loadingExisting) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[s.root, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* ── Header bar ──────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={20} color={theme.textSecondary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{isEdit ? 'Edit Faculty' : 'Add New Faculty'}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Scrollable form ─────────────────────────────────────────── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.form, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Photo picker ──────────────────────────────────────────── */}
        <View style={s.photoSection}>
          <TouchableOpacity onPress={handlePickPhoto} style={s.photoWrap} activeOpacity={0.8}>
            {photoPreview ? (
              <Image source={{ uri: photoPreview }} style={s.photoImg} />
            ) : (
              <View style={s.photoPlaceholder}>
                <User size={36} color={theme.textMuted} />
              </View>
            )}
            <View style={s.cameraBtn}>
              <Camera size={14} color={colors.white} />
            </View>
          </TouchableOpacity>
          <Text style={s.photoHint}>{photoPreview ? 'Tap to change photo' : 'Tap to upload photo'}</Text>
        </View>

        {/* ── Personal Information ─────────────────────────────────── */}
        <View style={s.card}>
          <SectionTitle title="PERSONAL INFORMATION" />

          <InputField name="name" label="Full Name" required control={control} errors={errors} placeholder="e.g. Dr. Priya Sharma" />
          <InputField
            name="email"
            label="Email Address"
            required
            control={control}
            errors={errors}
            placeholder="faculty@college.edu"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <InputField
            name="phone"
            label="Phone Number"
            control={control}
            errors={errors}
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
          <InputField
            name="employeeId"
            label="Employee ID"
            required
            control={control}
            errors={errors}
            placeholder="e.g. FAC001"
            autoCapitalize="characters"
          />
        </View>

        {/* ── Academic Details ─────────────────────────────────────── */}
        <View style={s.card}>
          <SectionTitle title="ACADEMIC DETAILS" />

          <SelectField name="designation" label="Designation" required control={control} errors={errors} options={DESIGNATION_OPTIONS} />
          <SelectField
            name="qualification"
            label="Highest Qualification"
            required
            control={control}
            errors={errors}
            options={QUALIFICATION_OPTIONS}
          />
          <InputField
            name="specialization"
            label="Specialization"
            control={control}
            errors={errors}
            placeholder="e.g. Machine Learning, VLSI"
          />
          <SelectField name="experience" label="Years of Experience" control={control} errors={errors} options={EXPERIENCE_OPTIONS} />
          <InputField
            name="joiningDate"
            label="Joining Date (YYYY-MM-DD)"
            control={control}
            errors={errors}
            placeholder="e.g. 2020-07-15"
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
          />
        </View>

        {/* ── Status (Edit mode only) ──────────────────────────────── */}
        {isEdit && (
          <View style={s.card}>
            <SectionTitle title="STATUS" />
            <SelectField name="status" label="Employment Status" control={control} errors={errors} options={STATUS_OPTIONS} />
          </View>
        )}

        {/* ── Submit button ────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={isPending}
          style={[s.submitBtn, isPending && s.submitDisabled]}
          activeOpacity={0.85}
        >
          {isPending ? (
            <ActivityIndicator color={colors.white} size={18} />
          ) : (
            <Text style={s.submitText}>{isEdit ? 'Save Changes' : 'Add Faculty'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },

  // Form layout
  scroll: { flex: 1 },
  form: { padding: 16, gap: 16 },

  // Photo
  photoSection: { alignItems: 'center', paddingVertical: 8 },
  photoWrap: { position: 'relative', marginBottom: 8 },
  photoImg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: theme.surface,
    ...shadows.soft,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: theme.surface,
    ...shadows.card,
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.surface,
  },
  photoHint: { fontSize: 12, color: theme.textMuted },

  // Section card
  card: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 20,
    gap: 16,
    ...shadows.card,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  // Field
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: '500', color: theme.textSecondary },
  errorMsg: { fontSize: 11, color: colors.red[500] },

  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.textPrimary,
    backgroundColor: theme.surface,
    minHeight: 44,
  },
  inputMulti: { height: 80, textAlignVertical: 'top', paddingTop: 10 },
  inputError: { borderColor: colors.red[400] },

  // Select
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectValue: { flex: 1, fontSize: 14, color: theme.textPrimary },
  selectPlaceholder: { flex: 1, fontSize: 14, color: theme.placeholder },

  // Bottom sheet
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.overlay },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    ...shadows.soft,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: theme.textPrimary },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  sheetOptionActive: {
    backgroundColor: theme.primarySoft,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  sheetOptionText: { fontSize: 14, color: theme.textSecondary },
  sheetOptionTextActive: { color: theme.primary, fontWeight: '600' },

  // Submit
  submitBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
