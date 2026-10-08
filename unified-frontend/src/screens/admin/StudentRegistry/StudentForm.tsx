// @ts-nocheck
import React, { useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Text, Icon } from 'react-native-paper';
import CustomInput from '../../../components/Input/CustomInput';
import CustomDropdown from '../../../components/Dropdown/CustomDropdown';
import CustomButton from '../../../components/Button/CustomButton';
import InfoCard from '../../../components/Card/InfoCard';
import { useDropdown, useSectionsBySemester } from '../../../hooks/admin/useDropdowns';
import { useTheme } from '../../../context/admin/ThemeContext';
import { spacing, typography, radius } from '../../../theme';

const DEFAULTS = {
  name: '',
  phone: '',
  gender: undefined,
  academicYear: '',
  academicYearFrom: '',
  academicYearTo: '',
  programId: undefined,
  departmentId: undefined,
  semester: undefined,
  sectionId: undefined,
  libraryId: '',
  usn: '',
  admissionCategory: undefined,
  rank: '',
};

// Generate year options: current year ± 5
const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = -5; i <= 5; i++) {
    const year = currentYear + i;
    years.push({
      id: String(year),
      name: String(year),
    });
  }
  return years;
};

// Admission categories
const ADMISSION_CATEGORIES = [
  { id: 'CET', name: 'CET' },
  { id: 'COMEDK', name: 'COMEDK' },
  { id: 'AICTE', name: 'AICTE' },
  { id: 'Management', name: 'Management' },
];

const IconBadge = ({ name }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.iconBadge}>
      <Icon source={name} size={18} color={colors.primary} />
    </View>
  );
};

const StudentForm = ({
  initialValues, onSubmit, onSaveAndContinue, onCancel,
  submitLabel = 'Save Student Data', submitting = false, continuing = false,
  breadcrumbLabel = 'Add Student',
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const {
    control, handleSubmit, reset, formState: { errors }, setValue, watch,
  } = useForm({ defaultValues: initialValues || DEFAULTS });

  // Watch semester to filter sections
  const selectedSemester = useWatch({ control, name: 'semester' });
  
  // Watch academic year from/to to combine them
  const academicYearFrom = watch('academicYearFrom');
  const academicYearTo = watch('academicYearTo');

  useEffect(() => {
    if (initialValues) {
      // If editing, parse academicYear into from/to
      if (initialValues.academicYear && typeof initialValues.academicYear === 'string') {
        const [from, to] = initialValues.academicYear.split('-');
        reset({
          ...initialValues,
          academicYearFrom: from || '',
          academicYearTo: to || '',
        });
      } else {
        reset(initialValues);
      }
    }
  }, [initialValues, reset]);

  // Combine academicYearFrom and academicYearTo into academicYear before submission
  useEffect(() => {
    if (academicYearFrom && academicYearTo) {
      setValue('academicYear', `${academicYearFrom}-${academicYearTo}`);
    } else {
      setValue('academicYear', '');
    }
  }, [academicYearFrom, academicYearTo, setValue]);

  useEffect(() => {
    if (initialValues) reset(initialValues);
  }, [initialValues, reset]);

  const handleSaveAndContinue = handleSubmit(async (data) => {
    await onSaveAndContinue(data);
    reset(DEFAULTS); // clear the form so the next student can be entered right away
  });

  const { data: programs = [], isLoading: loadingPrograms } = useDropdown('program');
  const { data: departments = [], isLoading: loadingDepartments } = useDropdown('department');
  const { data: genders = [] } = useDropdown('gender');
  const { data: semesters = [] } = useDropdown('semester');

  // sections filtered by selected semester (semester id = semester number 1-8)
  const { data: sections = [], isLoading: loadingSections } = useSectionsBySemester(selectedSemester);

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.breadcrumb}>
        Student Registry <Text style={styles.breadcrumbActive}>›  {breadcrumbLabel}</Text>
      </Text>
      <Text style={styles.heading}>Register New Student</Text>
      <Text style={styles.subheading}>
        Fill in the student&apos;s personal and academic details.
      </Text>

      <InfoCard title="Student Information" icon={<IconBadge name="account-outline" />}>
        <View style={styles.row}>
          <View style={styles.col}>
            <Controller
              control={control}
              name="name"
              rules={{ required: 'Name is required' }}
              render={({ field }) => (
                <CustomInput
                  label="Name"
                  value={field.value}
                  onChangeText={(text) => field.onChange(text.replace(/[^a-zA-Z\s.]/g, ''))}
                  onBlur={field.onBlur}
                  error={errors.name?.message}
                />
              )}
            />
          </View>
          <View style={styles.col}>
            <Controller
              control={control}
              name="gender"
              rules={{ required: 'Gender is required' }}
              render={({ field }) => (
                <CustomDropdown
                  label="Gender"
                  value={field.value}
                  options={genders}
                  onSelect={field.onChange}
                  error={errors.gender?.message}
                />
              )}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Controller
              control={control}
              name="phone"
              rules={{
                pattern: { value: /^[0-9+\-\s]{10}$/, message: 'Enter a valid phone number' },
              }}
              render={({ field }) => (
                <CustomInput
                  label="Phone"
                  value={field.value}
                  onChangeText={(text) => field.onChange(text.replace(/[^0-9+\-\s]/g, ''))}
                  onBlur={field.onBlur}
                  keyboardType="phone-pad"
                  maxLength={15}
                  error={errors.phone?.message}
                />
              )}
            />
          </View>
          <View style={styles.col} />
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Controller
              control={control}
              name="academicYearFrom"
              rules={{ required: 'Academic year (from) is required' }}
              render={({ field }) => (
                <CustomDropdown
                  label="Academic Year From"
                  value={field.value}
                  options={generateYearOptions()}
                  onSelect={field.onChange}
                  error={errors.academicYearFrom?.message}
                />
              )}
            />
          </View>
          <View style={styles.col}>
            <Controller
              control={control}
              name="academicYearTo"
              rules={{ 
                required: 'Academic year (to) is required',
                validate: (value) => {
                  if (!academicYearFrom || !value) return true;
                  return Number(value) > Number(academicYearFrom) || '"To" year must be after "From" year';
                },
              }}
              render={({ field }) => (
                <CustomDropdown
                  label="Academic Year To"
                  value={field.value}
                  options={generateYearOptions().filter(y => !academicYearFrom || Number(y.id) > Number(academicYearFrom))}
                  onSelect={field.onChange}
                  error={errors.academicYearTo?.message}
                />
              )}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Controller
              control={control}
              name="programId"
              rules={{ required: 'Program is required' }}
              render={({ field }) => (
                <CustomDropdown
                  label="Program"
                  value={field.value}
                  options={programs}
                  loading={loadingPrograms}
                  onSelect={field.onChange}
                  error={errors.programId?.message}
                />
              )}
            />
          </View>
          <View style={styles.col} />
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Controller
              control={control}
              name="admissionCategory"
              rules={{ required: 'Admission category is required' }}
              render={({ field }) => (
                <CustomDropdown
                  label="Admission Category"
                  value={field.value}
                  options={ADMISSION_CATEGORIES}
                  onSelect={field.onChange}
                  error={errors.admissionCategory?.message}
                />
              )}
            />
          </View>
          <View style={styles.col}>
            <Controller
              control={control}
              name="rank"
              rules={{
                validate: (val) => {
                  if (!val) return true;
                  const num = Number(val);
                  return !isNaN(num) && num > 0 || 'Enter a valid rank';
                },
              }}
              render={({ field }) => (
                <CustomInput
                  label="Rank (if applicable)"
                  value={field.value}
                  onChangeText={(text) => field.onChange(text.replace(/[^0-9]/g, ''))}
                  onBlur={field.onBlur}
                  keyboardType="numeric"
                  error={errors.rank?.message}
                />
              )}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Controller
              control={control}
              name="departmentId"
              rules={{ required: 'Department is required' }}
              render={({ field }) => (
                <CustomDropdown
                  label="Department"
                  value={field.value}
                  options={departments}
                  loading={loadingDepartments}
                  onSelect={field.onChange}
                  error={errors.departmentId?.message}
                />
              )}
            />
          </View>
          <View style={styles.col}>
            <Controller
              control={control}
              name="semester"
              rules={{ required: 'Semester is required' }}
              render={({ field }) => (
                <CustomDropdown
                  label="Semester"
                  value={field.value}
                  options={semesters}
                  onSelect={field.onChange}
                  error={errors.semester?.message}
                />
              )}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Controller
              control={control}
              name="sectionId"
              rules={{ required: 'Section is required' }}
              render={({ field }) => (
                <CustomDropdown
                  label="Section"
                  value={field.value}
                  options={sections}
                  loading={loadingSections}
                  onSelect={field.onChange}
                  error={errors.sectionId?.message}
                />
              )}
            />
          </View>
          <View style={styles.col} />
        </View>
      </InfoCard>

      <InfoCard title="Student IDs" icon={<IconBadge name="card-account-details-outline" />}>
        <Controller
          control={control}
          name="libraryId"
          rules={{ required: 'Library ID is required' }}
          render={({ field }) => (
            <CustomInput
              label="Library ID"
              value={field.value}
              onChangeText={(text) => field.onChange(text.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())}
              onBlur={field.onBlur}
              autoCapitalize="none"
              error={errors.libraryId?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="usn"
          render={({ field }) => (
            <CustomInput
              label="USN"
              value={field.value}
              onChangeText={(text) => field.onChange(text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
              onBlur={field.onBlur}
              autoCapitalize="characters"
              error={errors.usn?.message}
            />
          )}
        />
      </InfoCard>

      <View style={styles.actions}>
        <CustomButton label="Cancel" variant="text" onPress={onCancel} />
        {onSaveAndContinue && (
          <CustomButton
            label="Save & Continue"
            variant="outline"
            onPress={handleSaveAndContinue}
            loading={continuing}
          />
        )}
        <CustomButton
          label={submitLabel}
          onPress={handleSubmit(onSubmit)}
          loading={submitting}
          style={styles.submitButton}
        />
      </View>
    </ScrollView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  heading: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  breadcrumb: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  breadcrumbActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  subheading: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  col: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  submitButton: {
    minWidth: 180,
  },
});

export default StudentForm;
