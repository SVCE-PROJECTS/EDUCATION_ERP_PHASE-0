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
import { useNonTeachingStaffMember, useDeleteNonTeachingStaff } from '../../hooks/useNonTeachingStaff';
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

const NonTeachingStaffDetailsScreen = ({ route, navigation }) => {
  const { staffId } = route.params;
  const { data: staff, isLoading, isError } = useNonTeachingStaffMember(staffId);
  const { mutateAsync: deleteStaff, isPending: deleting } = useDeleteNonTeachingStaff();
  const [confirmVisible, setConfirmVisible] = useState(false);

  if (isLoading) {
    return (
      <ScreenLayout navigation={navigation} activeScreen="NonTeachingStaffList">
        <LoadingIndicator fullscreen label="Loading staff details..." />
      </ScreenLayout>
    );
  }
  if (isError || !staff) {
    return (
      <ScreenLayout navigation={navigation} activeScreen="NonTeachingStaffList">
        <EmptyState icon="alert-circle-outline" title="Staff member not found" />
      </ScreenLayout>
    );
  }

  const statusStyle = STATUS_STYLE[staff.status] || { bg: colors.border, text: colors.textSecondary };

  const handleDelete = async () => {
    await deleteStaff(staffId);
    setConfirmVisible(false);
    navigation.navigate('NonTeachingStaffList');
  };

  return (
    <ScreenLayout navigation={navigation} activeScreen="NonTeachingStaffList">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{staff.name}</Text>
            <Text style={styles.employeeId}>{staff.employeeId}</Text>
          </View>
          <Chip
            style={{ backgroundColor: statusStyle.bg }}
            textStyle={{ color: statusStyle.text, fontWeight: '600' }}
          >
            {staff.status}
          </Chip>
        </View>

        {/* Employment */}
        <InfoCard title="Employment Information">
          <Field label="Designation"   value={staff.designation} />
          <Field label="Department"    value={staff.departmentName} />
          <Field label="Qualification" value={staff.qualification} />
          <Field label="Joining Date"  value={staff.joiningDate ? new Date(staff.joiningDate).toLocaleDateString() : null} />
        </InfoCard>

        {/* Personal */}
        <InfoCard title="Personal Information">
          <Field label="Email"  value={staff.email} />
          <Field label="Phone"  value={staff.phone} />
          <Field label="Gender" value={staff.gender} />
        </InfoCard>

        {/* Actions */}
        <View style={styles.actions}>
          <CustomButton
            label="Edit"
            variant="outline"
            onPress={() => navigation.navigate('EditNonTeachingStaff', { staffId })}
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
          title="Delete staff member?"
          message={`This will permanently remove ${staff.name}'s record. This action cannot be undone.`}
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

export default NonTeachingStaffDetailsScreen;
