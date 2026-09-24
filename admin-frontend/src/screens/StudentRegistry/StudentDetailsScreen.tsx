// @ts-nocheck
import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet, Platform, Linking,
} from 'react-native';
import { Text } from 'react-native-paper';
import InfoCard from '../../components/Card/InfoCard';
import CustomButton from '../../components/Button/CustomButton';
import ConfirmationDialog from '../../components/Dialog/ConfirmationDialog';
import LoadingIndicator from '../../components/Loading/LoadingIndicator';
import EmptyState from '../../components/EmptyState/EmptyState';
import { useStudent, useDeleteStudent } from '../../hooks/useStudents';
import { useTransferHistory } from '../../hooks/useTransferStudent';
import ScreenLayout from '../../navigation/ScreenLayout';
import { formatStudentId } from '../../utils/formatStudentId';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography } from '../../theme';
import { API_ORIGIN } from '../../constants';

const Field = ({ label, value }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || '-'}</Text>
    </View>
  );
};

const StudentDetailsScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { studentId } = route.params;
  const { data: student, isLoading, isError } = useStudent(studentId);
  const { data: history = [] } = useTransferHistory(studentId);
  const { mutateAsync: deleteStudent, isPending: deleting } = useDeleteStudent();
  const [confirmVisible, setConfirmVisible] = useState(false);

  const openDocument = (relativeUrl) => {
    const fullUrl = `${API_ORIGIN}${relativeUrl}`;
    if (Platform.OS === 'web') {
      // New tab, not an iframe: sidesteps X-Frame-Options/CSP frame-ancestors
      // entirely (those only restrict framing, not top-level navigation) and
      // avoids browser security extensions flagging cross-origin iframes.
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(fullUrl);
    }
  };

  if (isLoading) {
    return (
      <ScreenLayout navigation={navigation} activeScreen="StudentList">
        <LoadingIndicator fullscreen label="Loading student details..." />
      </ScreenLayout>
    );
  }
  if (isError || !student) {
    return (
      <ScreenLayout navigation={navigation} activeScreen="StudentList">
        <EmptyState icon="alert-circle-outline" title="Student not found" />
      </ScreenLayout>
    );
  }

  const handleDelete = async () => {
    await deleteStudent(studentId);
    setConfirmVisible(false);
    navigation.navigate('StudentList');
  };

  return (
    <ScreenLayout navigation={navigation} activeScreen="StudentList">
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.name}>{student.name}</Text>
          <Text style={styles.usn}>{formatStudentId(student)}</Text>
        </View>
      </View>

      <InfoCard title="Academic Information">
        <Field label="Program" value={student.programName} />
        <Field label="Department" value={student.departmentName} />
        <Field label="Semester" value={`Semester ${student.semester}`} />
        <Field label="Section" value={student.sectionName} />
        <Field label="Academic Year" value={student.academicYear} />
      </InfoCard>

      <InfoCard title="Personal Information">
        <Field label="Gender" value={student.gender} />
        <Field label="Phone" value={student.phone} />
        <Field label="Library ID" value={student.libraryId} />
        <Field label="USN" value={student.usn} />
      </InfoCard>

      {history.length > 0 && (
        <InfoCard title="Transfer History">
          {history.map((t) => (
            <View key={t.id} style={styles.historyItem}>
              <View style={styles.historyTextBlock}>
                <Text style={styles.historyText}>
                  {t.previousDepartmentName || '—'} (Sem {t.previousSemester || '—'}) → {t.newDepartmentName} (Sem {t.newSemester})
                </Text>
                <Text style={styles.historyDate}>
                  {new Date(t.transferredAt).toLocaleDateString()}
                </Text>
              </View>
              {t.supportingDocumentUrl && (
                <Text
                  style={styles.viewDocumentLink}
                  onPress={() => openDocument(t.supportingDocumentUrl)}
                >
                  👁  View Document
                </Text>
              )}
            </View>
          ))}
        </InfoCard>
      )}


      <View style={styles.actions}>
        <CustomButton
          label="Edit"
          variant="outline"
          onPress={() => navigation.navigate('EditStudent', { studentId })}
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
        title="Delete student?"
        message={`This will permanently remove ${student.name}'s record. This action cannot be undone.`}
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

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  name: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  usn: {
    ...typography.body,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fieldLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  fieldValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyTextBlock: {
    flex: 1,
  },
  historyText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  historyDate: {
    ...typography.caption,
    color: colors.textMuted,
  },
  viewDocumentLink: {
    ...typography.bodyBold,
    color: colors.primary,
    marginLeft: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  deleteButton: {
    marginLeft: 'auto',
  },
});

export default StudentDetailsScreen;
