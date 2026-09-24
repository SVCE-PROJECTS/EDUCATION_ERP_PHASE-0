
// @ts-nocheck

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';

import { Text, Snackbar, Icon } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { useQueryClient } from '@tanstack/react-query';

import SearchBar from '../../components/SearchBar/SearchBar';
import InfoCard from '../../components/Card/InfoCard';
import CustomDropdown from '../../components/Dropdown/CustomDropdown';
import CustomButton from '../../components/Button/CustomButton';
import EmptyState from '../../components/EmptyState/EmptyState';
import ConfirmationDialog from '../../components/Dialog/ConfirmationDialog';

import { useStudents } from '../../hooks/useStudents';
import { useDropdown, useSectionsBySemester } from '../../hooks/useDropdowns';
import { useTransferStudent } from '../../hooks/useTransferStudent';

import ScreenLayout from '../../navigation/ScreenLayout';
import { formatStudentId } from '../../utils/formatStudentId';
import { useTheme } from '../../context/ThemeContext';

import {
  spacing,
  typography,
  radius,
} from '../../theme';


// ---------------------------------------------------------
// Detail Box
// ---------------------------------------------------------
// A single boxed read-only value, e.g.
// "Program: Bachelor of Engineering"
const DetailBox = ({ label, value, style }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={[styles.detailBox, style]}>
      <Text style={styles.detailLabel}>
        {label}
      </Text>

      <Text style={styles.detailValue}>
        {value || '-'}
      </Text>
    </View>
  );
};


// ---------------------------------------------------------
// Icon Badge
// ---------------------------------------------------------
const IconBadge = ({ name }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.iconBadge}>
      <Icon
        source={name}
        size={16}
        color={colors.primary}
      />
    </View>
  );
};


// ---------------------------------------------------------
// Transfer Student Screen
// ---------------------------------------------------------
const TransferStudentScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  // -------------------------------------------------------
  // React Query client
  // -------------------------------------------------------
  // Used to refresh dashboard/student data after a transfer.
  const queryClient = useQueryClient();


  // -------------------------------------------------------
  // State
  // -------------------------------------------------------
  const [query, setQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [newProgramId, setNewProgramId] = useState();
  const [newDepartmentId, setNewDepartmentId] = useState();
  const [newSemester, setNewSemester] = useState();
  const [newSectionId, setNewSectionId] = useState();

  const [document, setDocument] = useState(null);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [previewVisible, setPreviewVisible] = useState(false);


  // -------------------------------------------------------
  // Student Search
  // -------------------------------------------------------
  const { data: searchResults } = useStudents({
    search: query,
    pageSize: 5,
  });


  // -------------------------------------------------------
  // Dropdown Data
  // -------------------------------------------------------
  const { data: programs = [] } = useDropdown('program');
  const { data: departments = [] } = useDropdown('department');
  const { data: semesters = [] } = useDropdown('semester');

  // sections filtered by the selected target semester
  const { data: sections = [] } = useSectionsBySemester(newSemester);


  // -------------------------------------------------------
  // Transfer Mutation
  // -------------------------------------------------------
  const {
    mutateAsync: transfer,
    isPending,
  } = useTransferStudent();


  // -------------------------------------------------------
  // Search Suggestions
  // -------------------------------------------------------
  const suggestions =
  query && !selectedStudent
    ? (searchResults?.data || searchResults || [])
    : [];


  // -------------------------------------------------------
  // Pick Supporting Document
  // -------------------------------------------------------
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'image/jpeg',
          'image/png',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        setDocument(result.assets[0]);
      }
    } catch (err) {
      setErrorMessage(
        err.message || 'Unable to select document.',
      );
    }
  };


  // -------------------------------------------------------
  // Confirm Transfer
  // -------------------------------------------------------
  const handleConfirmTransfer = async () => {
    try {

      // ---------------------------------------------------
      // Perform transfer
      // ---------------------------------------------------
      const result = await transfer({
        studentId: selectedStudent.id,
        newProgramId,
        newDepartmentId,
        newSemester,
        newSectionId,
        document,
      });


      // ---------------------------------------------------
      // Close confirmation dialog
      // ---------------------------------------------------
      setPreviewVisible(false);


      // ---------------------------------------------------
      // Update current student on this screen
      // ---------------------------------------------------
      setSelectedStudent(result.student);


      // ---------------------------------------------------
      // Clear transfer form
      // ---------------------------------------------------
      setNewProgramId(undefined);
      setNewDepartmentId(undefined);
      setNewSemester(undefined);
      setNewSectionId(undefined);
      setDocument(null);


      // ---------------------------------------------------
      // IMPORTANT:
      // Refresh dashboard statistics.
      //
      // The transfer changes the database, so the cached
      // dashboard statistics must be marked stale.
      // This causes /api/dashboard/stats to be requested
      // again when the dashboard is displayed.
      // ---------------------------------------------------
      await queryClient.invalidateQueries({
        queryKey: ['dashboard', 'stats'],
      });


      // ---------------------------------------------------
      // Refresh student-related cached queries.
      // ---------------------------------------------------
      await queryClient.invalidateQueries({
        queryKey: ['students'],
      });


      // ---------------------------------------------------
      // Success message
      // ---------------------------------------------------
      setSuccessMessage(
        `${result.student.name} transferred successfully.`,
      );

    } catch (err) {

      setErrorMessage(
        err.message ||
        'Transfer failed. Please try again.',
      );
    }
  };


  // -------------------------------------------------------
  // Submit Validation
  // -------------------------------------------------------
  const canSubmit =
    selectedStudent &&
    newProgramId &&
    newDepartmentId &&
    newSemester &&
    newSectionId &&
    document;


  // -------------------------------------------------------
  // Selected Destination Names
  // -------------------------------------------------------
  const newProgramName =
    programs.find(
      (p) =>
        String(p.id) === String(newProgramId),
    )?.name;


  const newDepartmentName =
    departments.find(
      (d) =>
        String(d.id) === String(newDepartmentId),
    )?.name;


  const newSectionName =
    sections.find(
      (s) =>
        String(s.id) === String(newSectionId),
    )?.name;


  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------
  return (
    <ScreenLayout
      navigation={navigation}
      activeScreen="TransferStudent"
    >

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >

        {/* Page Heading */}
        <Text style={styles.heading}>
          Transfer Student
        </Text>

        <Text style={styles.subheading}>
          Initiate academic department or section transfers for registered students.
        </Text>


        {/* -------------------------------------------------
            Student Search
        ------------------------------------------------- */}
        <SearchBar
          value={
            selectedStudent
              ? selectedStudent.name
              : query
          }

          onChangeText={(text) => {
            setSelectedStudent(null);
            setQuery(text);
          }}

          onSubmit={() => {}}

          placeholder="Enter Student Name or Registration ID (e.g. STU-2023-4421)"
        />


        {/* -------------------------------------------------
            Search Suggestions
        ------------------------------------------------- */}
        {suggestions.length > 0 && (
          <View style={styles.suggestionsBox}>

            {suggestions.map((s) => (
              <Text
                key={s.id}
                style={styles.suggestionItem}

                onPress={() => {
                  setSelectedStudent(s);
                  setQuery('');
                }}
              >
                {s.name} · {formatStudentId(s)}
              </Text>
            ))}

          </View>
        )}


        {/* -------------------------------------------------
            No Student Selected
        ------------------------------------------------- */}
        {!selectedStudent ? (

          <EmptyState
            icon="account-search-outline"
            title="Search for a student"
            description="Find the student you'd like to transfer using the search bar above."
          />

        ) : (

          /* -------------------------------------------------
             Student Selected
          ------------------------------------------------- */
          <View style={styles.columns}>

            {/* ------------------------------------------------
                Current Academic Details
            ------------------------------------------------ */}
            <InfoCard
              title="Current Academic Details"
              icon={
                <IconBadge
                  name="card-account-details-outline"
                />
              }
              style={styles.column}
            >

              <View style={styles.studentBox}>

                <Text style={styles.studentName}>
                  {selectedStudent.name}
                </Text>

                <Text style={styles.studentId}>
                  {formatStudentId(selectedStudent)}
                </Text>

              </View>


              <DetailBox
                label="Program"
                value={selectedStudent.programName}
              />


              <View style={styles.row}>

                <DetailBox
                  label="Department"
                  value={selectedStudent.departmentName}
                  style={styles.col}
                />

                <DetailBox
                  label="Semester"
                  value={`Semester ${selectedStudent.semester}`}
                  style={styles.col}
                />

              </View>


              <DetailBox
                label="Section"
                value={selectedStudent.sectionName}
              />

            </InfoCard>


            {/* ------------------------------------------------
                Transfer To
            ------------------------------------------------ */}
            <InfoCard
              title="Transfer To"
              icon={
                <IconBadge
                  name="swap-horizontal"
                />
              }
              style={styles.column}
            >

              {/* Program */}
              <CustomDropdown
                label="Program"
                value={newProgramId}
                options={programs}
                onSelect={setNewProgramId}
                floatingLabel={false}
              />


              {/* Department + Semester */}
              <View style={styles.row}>

                <View style={styles.col}>

                  <CustomDropdown
                    label="Department"
                    value={newDepartmentId}
                    options={departments}
                    onSelect={setNewDepartmentId}
                    floatingLabel={false}
                  />

                </View>


                <View style={styles.col}>

                  <CustomDropdown
                    label="Semester"
                    value={newSemester}
                    options={semesters}
                    onSelect={(val) => {
                      setNewSemester(val);
                      setNewSectionId(undefined); // reset section when semester changes
                    }}
                    floatingLabel={false}
                  />

                </View>

              </View>


              {/* Section */}
              <CustomDropdown
                key={`section-${newSemester}`}
                label="Section"
                value={newSectionId}
                options={sections}
                onSelect={setNewSectionId}
                floatingLabel={false}
              />


              {/* Supporting Documents */}
              <Text style={styles.dropzoneLabel}>
                Supporting Documents
              </Text>

              <Pressable
                onPress={handlePickDocument}
                style={styles.dropzone}
              >

                <Icon
                  source="cloud-upload-outline"
                  size={28}
                  color={colors.textSecondary}
                />

                <Text style={styles.dropzoneText}>
                  {document
                    ? document.name
                    : 'Drag and drop student request letter or committee approval'}
                </Text>

                <Text style={styles.dropzoneHint}>
                  Supported: PDF, JPG up to 10MB
                </Text>

              </Pressable>

            </InfoCard>

          </View>
        )}


        {/* -------------------------------------------------
            Confirm Button
        ------------------------------------------------- */}
        {selectedStudent && (

          <View style={styles.actions}>

            <CustomButton
              label="Confirm Transfer"
              onPress={() => setPreviewVisible(true)}
              disabled={!canSubmit}
            />

          </View>

        )}


        {/* -------------------------------------------------
            Error Snackbar
        ------------------------------------------------- */}
        <Snackbar
          visible={!!errorMessage}
          onDismiss={() => setErrorMessage('')}
          duration={4000}
          style={{
            backgroundColor: colors.danger,
          }}
        >
          {errorMessage}
        </Snackbar>


        {/* -------------------------------------------------
            Success Snackbar
        ------------------------------------------------- */}
        <Snackbar
          visible={!!successMessage}
          onDismiss={() => setSuccessMessage('')}
          duration={3000}
          style={{
            backgroundColor: colors.success,
          }}
        >
          {successMessage}
        </Snackbar>

      </ScrollView>


      {/* ---------------------------------------------------
          Confirmation Dialog
      --------------------------------------------------- */}
      {selectedStudent && (

        <ConfirmationDialog
          visible={previewVisible}

          title="Confirm these changes?"

          message={
            `${selectedStudent.name} will move from ` +
            `${selectedStudent.programName} · ` +
            `${selectedStudent.departmentName} · ` +
            `Semester ${selectedStudent.semester} · ` +
            `${selectedStudent.sectionName}  to  ` +
            `${newProgramName} · ` +
            `${newDepartmentName} · ` +
            `Semester ${newSemester} · ` +
            `${newSectionName}.`
          }

          confirmLabel="Confirm Transfer"

          loading={isPending}

          onConfirm={handleConfirmTransfer}

          onCancel={() => setPreviewVisible(false)}
        />

      )}

    </ScreenLayout>
  );
};


// ---------------------------------------------------------
// Styles
// ---------------------------------------------------------
const getStyles = (colors) => StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  heading: {
    ...typography.h1,
    color: colors.textPrimary,
  },

  subheading: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },

  suggestionsBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },

  suggestionItem: {
    ...typography.body,
    color: colors.textPrimary,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  columns: {
    flexDirection: 'row',
    gap: spacing.lg,
    flexWrap: 'wrap',
  },

  column: {
    flex: 1,
    minWidth: 320,
  },

  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  studentBox: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  studentName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },

  studentId: {
    ...typography.caption,
    color: colors.primary,
    marginTop: 2,
  },

  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  col: {
    flex: 1,
  },

  detailBox: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },

  detailLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },

  detailValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },

  dropzoneLabel: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },

  dropzone: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },

  dropzoneText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  dropzoneHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },

});

export default TransferStudentScreen;

