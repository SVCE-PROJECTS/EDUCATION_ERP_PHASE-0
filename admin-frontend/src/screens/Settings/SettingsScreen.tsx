// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Snackbar } from 'react-native-paper';
import ScreenLayout from '../../navigation/ScreenLayout';
import InfoCard from '../../components/Card/InfoCard';
import CustomInput from '../../components/Input/CustomInput';
import CustomDropdown from '../../components/Dropdown/CustomDropdown';
import CustomButton from '../../components/Button/CustomButton';
import CustomModal from '../../components/Modal/CustomModal';
import LoadingIndicator from '../../components/Loading/LoadingIndicator';
import {
  useAcademicYear, useUpdateAcademicYear, useDepartments, useCreateDepartment, useSetDepartmentActive,
} from '../../hooks/useSettings';
import { useTheme } from '../../context/ThemeContext';
import {
  spacing, typography, radius,
} from '../../theme';

const SEMESTER_TYPE_OPTIONS = [
  { id: 'ODD', name: 'Odd Semester' },
  { id: 'EVEN', name: 'Even Semester' },
];

const SettingsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { data: academicYear, isLoading: loadingYear } = useAcademicYear();
  const updateYearMutation = useUpdateAcademicYear();

  const { data: departments = [], isLoading: loadingDepts } = useDepartments();
  const createDeptMutation = useCreateDepartment();
  const toggleDeptMutation = useSetDepartmentActive();

  const [yearForm, setYearForm] = useState({ academicYear: '', currentSemesterType: 'ODD' });
  const [deptModalVisible, setDeptModalVisible] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: '', code: '' });
  const [deptError, setDeptError] = useState('');
  const [snackbar, setSnackbar] = useState('');

  useEffect(() => {
    if (academicYear) {
      setYearForm({
        academicYear: academicYear.academicYear || '',
        currentSemesterType: academicYear.currentSemesterType || 'ODD',
      });
    }
  }, [academicYear]);

  const handleSaveYear = async () => {
    if (!yearForm.academicYear) {
      setSnackbar('Academic year is required.');
      return;
    }
    try {
      await updateYearMutation.mutateAsync(yearForm);
      setSnackbar('Academic year settings saved.');
    } catch (err) {
      setSnackbar(err.message || 'Could not save settings.');
    }
  };

  const handleAddDepartment = async () => {
    if (!deptForm.name || !deptForm.code) {
      setDeptError('Name and code are required.');
      return;
    }
    try {
      await createDeptMutation.mutateAsync(deptForm);
      setDeptModalVisible(false);
      setDeptForm({ name: '', code: '' });
      setDeptError('');
      setSnackbar(`Department "${deptForm.name}" added.`);
    } catch (err) {
      setDeptError(err.message || 'Could not add department.');
    }
  };

  const handleToggleDept = async (dept) => {
    try {
      await toggleDeptMutation.mutateAsync({ id: dept.id, isActive: !dept.isActive });
    } catch (err) {
      setSnackbar(err.message || 'Could not update department.');
    }
  };

  return (
    <ScreenLayout navigation={navigation} activeScreen="Settings">
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Academic year configuration and department directory</Text>
        </View>

        <InfoCard title="Academic Year">
          {loadingYear ? (
            <LoadingIndicator label="Loading..." />
          ) : (
            <>
              <CustomInput
                label="Academic Year"
                placeholder="e.g. 2025-26"
                value={yearForm.academicYear}
                onChangeText={(v) => setYearForm((f) => ({ ...f, academicYear: v }))}
                floatingLabel={false}
              />
              <CustomDropdown
                label="Current Semester Type"
                value={yearForm.currentSemesterType}
                options={SEMESTER_TYPE_OPTIONS}
                onSelect={(v) => setYearForm((f) => ({ ...f, currentSemesterType: v }))}
                floatingLabel={false}
              />
              <CustomButton
                label="Save Academic Year"
                onPress={handleSaveYear}
                loading={updateYearMutation.isPending}
                style={styles.saveBtn}
              />
            </>
          )}
        </InfoCard>

        <InfoCard title="Departments">
          {loadingDepts ? (
            <LoadingIndicator label="Loading departments..." />
          ) : (
            <>
              <View style={styles.deptList}>
                {departments.map((dept) => (
                  <View key={dept.id} style={styles.deptRow}>
                    <View style={styles.deptInfo}>
                      <Text style={styles.deptName}>{dept.name}</Text>
                      <Text style={styles.deptCode}>{dept.code}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: dept.isActive ? colors.successBg : colors.dangerBg }]}>
                      <Text style={[styles.statusText, { color: dept.isActive ? colors.success : colors.danger }]}>
                        {dept.isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                    <Text style={styles.actionLink} onPress={() => handleToggleDept(dept)}>
                      {dept.isActive ? 'Deactivate' : 'Activate'}
                    </Text>
                  </View>
                ))}
              </View>
              <CustomButton
                label="Add Department"
                variant="outline"
                onPress={() => { setDeptForm({ name: '', code: '' }); setDeptError(''); setDeptModalVisible(true); }}
                style={styles.saveBtn}
              />
            </>
          )}
        </InfoCard>
      </ScrollView>

      <CustomModal visible={deptModalVisible} onDismiss={() => setDeptModalVisible(false)} title="Add Department">
        <CustomInput
          label="Department Name"
          placeholder="e.g. Artificial Intelligence and Data Science"
          value={deptForm.name}
          onChangeText={(v) => setDeptForm((f) => ({ ...f, name: v }))}
          floatingLabel={false}
        />
        <CustomInput
          label="Department Code"
          placeholder="e.g. AIDS"
          value={deptForm.code}
          onChangeText={(v) => setDeptForm((f) => ({ ...f, code: v }))}
          floatingLabel={false}
        />
        {!!deptError && <Text style={styles.errorText}>{deptError}</Text>}
        <CustomButton
          label="Add Department"
          onPress={handleAddDepartment}
          loading={createDeptMutation.isPending}
          style={styles.saveBtn}
        />
      </CustomModal>

      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')} duration={3000}>
        {snackbar}
      </Snackbar>
    </ScreenLayout>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl, maxWidth: 640 },
  header: { marginBottom: spacing.lg },
  title: { ...typography.h1, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  saveBtn: { marginTop: spacing.sm },
  deptList: { gap: spacing.sm, marginBottom: spacing.md },
  deptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    gap: spacing.sm,
  },
  deptInfo: { flex: 1, minWidth: 0 },
  deptName: { ...typography.bodyBold, color: colors.textPrimary, fontSize: 13 },
  deptCode: { ...typography.caption, color: colors.textSecondary },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  statusText: { ...typography.caption, fontWeight: '600' },
  actionLink: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  errorText: { ...typography.caption, color: colors.danger, marginBottom: spacing.md },
});

export default SettingsScreen;
