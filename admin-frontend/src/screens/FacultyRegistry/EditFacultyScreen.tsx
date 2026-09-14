// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Snackbar } from 'react-native-paper';
import FacultyForm from './FacultyForm';
import LoadingIndicator from '../../components/Loading/LoadingIndicator';
import EmptyState from '../../components/EmptyState/EmptyState';
import ScreenLayout from '../../navigation/ScreenLayout';
import { useFacultyMember, useUpdateFaculty } from '../../hooks/useFaculty';
import { colors } from '../../theme';

const EditFacultyScreen = ({ route, navigation }) => {
  const { facultyId } = route.params;
  const { data: faculty, isLoading, isError } = useFacultyMember(facultyId);
  const { mutateAsync, isPending } = useUpdateFaculty();
  const [errorMessage, setErrorMessage] = useState('');

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

  const handleSubmit = async (form) => {
    // strip blank password so backend won't re-hash an empty string
    const payload = { ...form };
    if (!payload.password) delete payload.password;
    try {
      await mutateAsync({ id: facultyId, form: payload });
      navigation.navigate('FacultyDetails', { facultyId });
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update faculty. Please try again.');
    }
  };

  return (
    <ScreenLayout navigation={navigation} activeScreen="FacultyList">
      <View style={styles.container}>
        <FacultyForm
          breadcrumbLabel="Edit Faculty"
          initialValues={faculty}
          onSubmit={handleSubmit}
          onCancel={() => navigation.goBack()}
          submitLabel="Update Faculty Data"
          submitting={isPending}
          isEdit
        />
        <Snackbar visible={!!errorMessage} onDismiss={() => setErrorMessage('')}
          duration={4000} style={{ backgroundColor: colors.danger }}>
          {errorMessage}
        </Snackbar>
      </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});

export default EditFacultyScreen;
