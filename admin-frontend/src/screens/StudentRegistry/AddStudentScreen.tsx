// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';
import StudentForm from './StudentForm';
import ScreenLayout from '../../navigation/ScreenLayout';
import { useCreateStudent } from '../../hooks/useStudents';
import { useTheme } from '../../context/ThemeContext';

const AddStudentScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { mutateAsync, isPending } = useCreateStudent();
  const queryClient = useQueryClient();
  const [continuing, setContinuing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Primary action: save this student, then jump to their detail page to confirm it stuck.
  const handleSubmit = async (form) => {
    try {
      const created = await mutateAsync(form);
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
      navigation.navigate('StudentDetails', { studentId: created.id });
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save student. Please try again.');
    }
  };

  // Continuous-entry action: save, clear the form, stay right here for the next student.
  const handleSaveAndContinue = async (form) => {
    setContinuing(true);
    try {
      const created = await mutateAsync(form);
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
      setSuccessMessage(`${created.name} saved. Ready for the next student.`);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save student. Please try again.');
    } finally {
      setContinuing(false);
    }
  };

  return (
    <ScreenLayout navigation={navigation} activeScreen="StudentList">
      <View style={styles.container}>
        <StudentForm
          breadcrumbLabel="Add Student"
          onSubmit={handleSubmit}
          onSaveAndContinue={handleSaveAndContinue}
          onCancel={() => navigation.goBack()}
          submitting={isPending && !continuing}
          continuing={continuing}
        />
        <Snackbar
          visible={!!errorMessage}
          onDismiss={() => setErrorMessage('')}
          duration={4000}
          style={{ backgroundColor: colors.danger }}
        >
          {errorMessage}
        </Snackbar>
        <Snackbar
          visible={!!successMessage}
          onDismiss={() => setSuccessMessage('')}
          duration={3000}
          style={{ backgroundColor: colors.success }}
        >
          {successMessage}
        </Snackbar>
      </View>
    </ScreenLayout>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default AddStudentScreen;
