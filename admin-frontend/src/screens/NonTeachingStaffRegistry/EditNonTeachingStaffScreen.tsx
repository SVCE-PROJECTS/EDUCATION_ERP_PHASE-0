// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Snackbar } from 'react-native-paper';
import NonTeachingStaffForm from './NonTeachingStaffForm';
import LoadingIndicator from '../../components/Loading/LoadingIndicator';
import EmptyState from '../../components/EmptyState/EmptyState';
import ScreenLayout from '../../navigation/ScreenLayout';
import { useNonTeachingStaffMember, useUpdateNonTeachingStaff } from '../../hooks/useNonTeachingStaff';
import { colors } from '../../theme';

const EditNonTeachingStaffScreen = ({ route, navigation }) => {
  const { staffId } = route.params;
  const { data: staff, isLoading, isError } = useNonTeachingStaffMember(staffId);
  const { mutateAsync, isPending }           = useUpdateNonTeachingStaff();
  const [errorMessage, setErrorMessage]      = useState('');

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

  const handleSubmit = async (form) => {
    try {
      await mutateAsync({ id: staffId, form });
      navigation.navigate('NonTeachingStaffDetails', { staffId });
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update staff member. Please try again.');
    }
  };

  return (
    <ScreenLayout navigation={navigation} activeScreen="NonTeachingStaffList">
      <View style={styles.container}>
        <NonTeachingStaffForm
          breadcrumbLabel="Edit Staff Member"
          initialValues={staff}
          onSubmit={handleSubmit}
          onCancel={() => navigation.goBack()}
          submitLabel="Update Staff Data"
          submitting={isPending}
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

export default EditNonTeachingStaffScreen;
