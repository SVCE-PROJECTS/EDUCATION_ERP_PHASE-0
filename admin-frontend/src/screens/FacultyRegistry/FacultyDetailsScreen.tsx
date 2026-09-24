// @ts-nocheck
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import InfoCard from '../../components/Card/InfoCard';
import CustomButton from '../../components/Button/CustomButton';
import ConfirmationDialog from '../../components/Dialog/ConfirmationDialog';
import LoadingIndicator from '../../components/Loading/LoadingIndicator';
import EmptyState from '../../components/EmptyState/EmptyState';
import ScreenLayout from '../../navigation/ScreenLayout';
import { useFacultyMember, useDeleteFaculty } from '../../hooks/useFaculty';
import { colors, spacing, typography } from '../../theme';

const STATUS_STYLE = {
  ACTIVE:   { bg: colors.successBg, text: colors.success },
  ON_LEAVE: { bg: colors.warningBg, text: colors.warning },
  INACTIVE: { bg: colors.dangerBg,  text: colors.danger  },
};

const Field = ({ label, value }) => (
  <View style={styles.fieldRow}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Text style={styles.fieldValue}>{value || '—'}</Text>
  </View>
);

const FacultyDetailsScreen = ({ route, navigation }) => {
  const { facultyId } = route.params;
  const { data: faculty, isLoading, isError } = useFacultyMember(facultyId);
  const { mutateAsync: deleteFaculty, isPending: deleting } = useDeleteFaculty();
  const [confirmVisible, setConfirmVisible] = useState(false);

  if (isLoading) {
    return (
      <ScreenLayout navigation={navigation} activeScreen="FacultyList">
        <LoadingIndicator fullscreen label="Loading faculty details..." />
      </ScreenLayout>
    );
  }
  if (isError || !faculty) {
    return (
      <ScreenLayout navigation={navigation} activeScreen="FacultyList">
        <EmptyState icon="alert-circle-outline" title="Faculty member not found" />
      </ScreenLayout>
    );
  }

  const statusStyle = STATUS_STYLE[faculty.status] || { bg: colors.border, text: colors.textSecondary };

  const handleDelete = async () => {
    await deleteFaculty(facultyId);
    setConfirmVisible(false);
    navigation.navigate('FacultyList');
  };

  return (
    <ScreenLayout navigation={navigation} activeScreen="FacultyList">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{faculty.name}</Text>
            <Text style={styles.employeeId}>{faculty.employeeId}</Text>
          </View>
          <Chip
            style={{ backgroundColor: statusStyle.bg }}
            textStyle={{ color: statusStyle.text, fontWeight: '600' }}
          >
            {faculty.status}
          </Chip>
        </View>

        {/* Professional */}
        <InfoCard title="Professional Information">
          <Field label="Designation"   value={faculty.designation} />
          <Field label="Qualification" value={faculty.qualification} />
          <Field label="Specialization" value={faculty.specialization} />
          <Field label="Experience"    value={faculty.experienceYears != null ? `${faculty.experienceYears} years` : null} />
          <Field label="Department"    value={faculty.departmentName} />
          <Field label="Joining Date"  value={faculty.joiningDate ? new Date(faculty.joiningDate).toLocaleDateString() : null} />
        </InfoCard>

        {/* Personal */}
        <InfoCard title="Personal Information">
          <Field label="Email"    value={faculty.email} />
          <Field label="Phone"    value={faculty.phone} />
          <Field label="Gender"   value={faculty.gender} />
          <Field label="Username" value={faculty.username} />
        </InfoCard>

        {/* Actions */}
        <View style={styles.actions}>
          <CustomButton
            label="Edit"
            variant="outline"
            onPress={() => navigation.navigate('EditFaculty', { facultyId })}
          />
          <CustomButton
            label="Delete"
            variant="text"
            onPress={() => setConfirmVisible(true)}
            style={styles.deleteButton}
          />
        </View>

        <ConfirmationDialog
          visible={confirmVisible}
          title="Delete faculty member?"
          message={`This will permanently remove ${faculty.name}'s record. This action cannot be undone.`}
          confirmLabel="Delete"
          destructive
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmVisible(false)}
        />
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background },
  content:      { padding: spacing.lg, paddingBottom: spacing.xxl },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: spacing.lg,
  },
  name:         { ...typography.h1, color: colors.textPrimary },
  employeeId:   { ...typography.body, color: colors.primary, marginTop: spacing.xs },
  fieldRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  fieldLabel:   { ...typography.body, color: colors.textSecondary, flex: 1 },
  fieldValue:   { ...typography.body, color: colors.textPrimary, flex: 1.5, textAlign: 'right' },
  actions:      { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  deleteButton: { marginLeft: spacing.sm },
});

export default FacultyDetailsScreen;
