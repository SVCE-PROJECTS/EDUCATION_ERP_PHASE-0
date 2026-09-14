// @ts-nocheck
import React, { useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { Text, Icon } from 'react-native-paper';
import CustomInput from '../../components/Input/CustomInput';
import CustomDropdown from '../../components/Dropdown/CustomDropdown';
import CustomButton from '../../components/Button/CustomButton';
import InfoCard from '../../components/Card/InfoCard';
import { useDropdown } from '../../hooks/useDropdowns';
import { colors, spacing, typography, radius } from '../../theme';

const DEFAULTS = {
  employeeId:     '',
  name:           '',
  email:          '',
  phone:          '',
  gender:         undefined,
  designation:    '',
  qualification:  '',
  specialization: '',
  experienceYears: '',
  departmentId:   undefined,
  joiningDate:    '',
  status:         'ACTIVE',
  username:       '',
  password:       '',
};

const FACULTY_STATUSES = [
  { id: 'ACTIVE',   name: 'Active' },
  { id: 'INACTIVE', name: 'Inactive' },
  { id: 'ON_LEAVE', name: 'On Leave' },
];

const IconBadge = ({ name }) => (
  <View style={styles.iconBadge}>
    <Icon source={name} size={18} color={colors.primary} />
  </View>
);

const FacultyForm = ({
  initialValues, onSubmit, onSaveAndContinue, onCancel,
  submitLabel = 'Save Faculty Data', submitting = false, continuing = false,
  breadcrumbLabel = 'Add Faculty', isEdit = false,
}) => {
  const {
    control, handleSubmit, reset, formState: { errors },
  } = useForm({ defaultValues: initialValues || DEFAULTS });

  useEffect(() => {
    if (initialValues) reset(initialValues);
  }, [initialValues, reset]);

  const handleSaveAndContinue = handleSubmit(async (data) => {
    await onSaveAndContinue(data);
    reset(DEFAULTS);
  });

  const { data: departments = [], isLoading: loadingDepts } = useDropdown('department');
  const { data: genders = [] } = useDropdown('gender');

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.breadcrumb}>
        Faculty Registry <Text style={styles.breadcrumbActive}>›  {breadcrumbLabel}</Text>
      </Text>
      <Text style={styles.heading}>{isEdit ? 'Edit Faculty Member' : 'Register New Faculty'}</Text>
      <Text style={styles.subheading}>
        Fill in the faculty member's personal and professional details.
      </Text>

      {/* ── Personal Info ── */}
      <InfoCard title="Personal Information" icon={<IconBadge name="account-outline" />}>
        <View style={styles.row}>
          <View style={styles.col}>
            <Controller
              control={control} name="name"
              rules={{ required: 'Name is required' }}
              render={({ field }) => (
                <CustomInput label="Full Name" value={field.value} onChangeText={field.onChange}
                  onBlur={field.onBlur} error={errors.name?.message} />
              )}
            />
          </View>
          <View style={styles.col}>
            <Controller
              control={control} name="gender"
              render={({ field }) => (
                <CustomDropdown label="Gender" value={field.value} options={genders}
                  onSelect={field.onChange} error={errors.gender?.message} />
              )}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Controller
              control={control} name="email"
              rules={{ required: 'Email is required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' } }}
              render={({ field }) => (
                <CustomInput label="Email" value={field.value} onChangeText={field.onChange}
                  onBlur={field.onBlur} keyboardType="email-address" error={errors.email?.message} />
              )}
            />
          </View>
          <View style={styles.col}>
            <Controller
              control={control} name="phone"
              render={({ field }) => (
                <CustomInput label="Phone" value={field.value} onChangeText={field.onChange}
                  onBlur={field.onBlur} keyboardType="phone-pad" error={errors.phone?.message} />
              )}
            />
          </View>
        </View>
      </InfoCard>

      {/* ── Professional Info ── */}
      <InfoCard title="Professional Details" icon={<IconBadge name="briefcase-outline" />}>
        <View style={styles.row}>
          <View style={styles.col}>
            <Controller
              control={control} name="designation"
              rules={{ required: 'Designation is required' }}
              render={({ field }) => (
                <CustomInput label="Designation" placeholder="e.g. Assistant Professor"
                  value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
                  error={errors.designation?.message} />
              )}
            />
          </View>
          <View style={styles.col}>
            <Controller
              control={control} name="qualification"
              render={({ field }) => (
                <CustomInput label="Qualification" placeholder="e.g. M.Tech, Ph.D"
                  value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} />
              )}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Controller
              control={control} name="specialization"
              render={({ field }) => (
                <CustomInput label="Specialization" placeholder="e.g. Machine Learning"
                  value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} />
              )}
            />
          </View>
          <View style={styles.col}>
            <Controller
              control={control} name="experienceYears"
              render={({ field }) => (
                <CustomInput label="Experience (years)" value={field.value}
                  onChangeText={field.onChange} onBlur={field.onBlur} keyboardType="numeric" />
              )}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Controller
              control={control} name="departmentId"
              rules={{ required: 'Department is required' }}
              render={({ field }) => (
                <CustomDropdown label="Department" value={field.value} options={departments}
                  loading={loadingDepts} onSelect={field.onChange} error={errors.departmentId?.message} />
              )}
            />
          </View>
          <View style={styles.col}>
            <Controller
              control={control} name="joiningDate"
              render={({ field }) => (
                <CustomInput label="Joining Date" placeholder="YYYY-MM-DD"
                  value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} />
              )}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Controller
              control={control} name="status"
              render={({ field }) => (
                <CustomDropdown label="Status" value={field.value} options={FACULTY_STATUSES}
                  onSelect={field.onChange} />
              )}
            />
          </View>
          <View style={styles.col} />
        </View>
      </InfoCard>

      {/* ── Login Credentials (hide password field on edit) ── */}
      <InfoCard title="Login Credentials" icon={<IconBadge name="lock-outline" />}>
        <View style={styles.row}>
          <View style={styles.col}>
            <Controller
              control={control} name="employeeId"
              rules={{ required: 'Employee ID is required' }}
              render={({ field }) => (
                <CustomInput label="Employee ID" placeholder="e.g. FAC001"
                  value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
                  error={errors.employeeId?.message} />
              )}
            />
          </View>
          <View style={styles.col}>
            <Controller
              control={control} name="username"
              rules={!isEdit ? { required: 'Username is required' } : {}}
              render={({ field }) => (
                <CustomInput label="Username" value={field.value}
                  onChangeText={field.onChange} onBlur={field.onBlur}
                  error={errors.username?.message} />
              )}
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.col}>
            <Controller
              control={control} name="password"
              rules={!isEdit ? { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } } : {}}
              render={({ field }) => (
                <CustomInput label={isEdit ? 'New Password (leave blank to keep)' : 'Password'}
                  value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
                  secureTextEntry error={errors.password?.message} />
              )}
            />
          </View>
          <View style={styles.col} />
        </View>
      </InfoCard>

      <View style={styles.actions}>
        <CustomButton label="Cancel" variant="text" onPress={onCancel} />
        {onSaveAndContinue && (
          <CustomButton label="Save & Continue" variant="outline"
            onPress={handleSaveAndContinue} loading={continuing} />
        )}
        <CustomButton label={submitLabel} onPress={handleSubmit(onSubmit)}
          loading={submitting} style={styles.submitButton} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView:       { flex: 1, width: '100%' },
  scrollContent:    { padding: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 },
  heading:          { ...typography.h1, color: colors.textPrimary },
  breadcrumb:       { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  breadcrumbActive: { color: colors.primary, fontWeight: '600' },
  subheading:       { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  iconBadge: {
    width: 32, height: 32, borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  row:          { flexDirection: 'row', gap: spacing.lg },
  col:          { flex: 1 },
  actions:      { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  submitButton: { minWidth: 160 },
});

export default FacultyForm;
