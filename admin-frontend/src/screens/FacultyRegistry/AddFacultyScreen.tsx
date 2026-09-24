// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Snackbar } from 'react-native-paper';
import FacultyForm from './FacultyForm';
import ScreenLayout from '../../navigation/ScreenLayout';
import { useCreateFaculty } from '../../hooks/useFaculty';
import { colors } from '../../theme';

const AddFacultyScreen = ({ navigation }) => {
  const { mutateAsync, isPending } = useCreateFaculty();
  const [continuing, setContinuing]       = useState(false);
  const [errorMessage, setErrorMessage]   = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (form) => {
    try {
      const created = await mutateAsync(form);
      navigation.navigate('FacultyDetails', { facultyId: created.id ?? created.facultyId });
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save faculty. Please try again.');
    }
  };

  const handleSaveAndContinue = async (form) => {
    setContinuing(true);
    try {
      const created = await mutateAsync(form);
      setSuccessMessage(`${created.name} saved. Ready for the next entry.`);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save faculty. Please try again.');
    } finally {
      setContinuing(false);
    }
  };

  return (
    <ScreenLayout navigation={navigation} activeScreen="FacultyList">
      <View style={styles.container}>
        <FacultyForm
          breadcrumbLabel="Add Faculty"
          onSubmit={handleSubmit}
          onSaveAndContinue={handleSaveAndContinue}
          onCancel={() => navigation.goBack()}
          submitting={isPending && !continuing}
          continuing={continuing}
        />
        <Snackbar visible={!!errorMessage} onDismiss={() => setErrorMessage('')}
          duration={4000} style={{ backgroundColor: colors.danger }}>
          {errorMessage}
        </Snackbar>
        <Snackbar visible={!!successMessage} onDismiss={() => setSuccessMessage('')}
          duration={3000} style={{ backgroundColor: colors.success }}>
          {successMessage}
        </Snackbar>
      </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});

export default AddFacultyScreen;
