// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import SearchBar from '../../components/SearchBar/SearchBar';
import StudentTable from '../../components/Table/StudentTable';
import EmptyState from '../../components/EmptyState/EmptyState';
import LoadingIndicator from '../../components/Loading/LoadingIndicator';
import { useStudents } from '../../hooks/useStudents';
import ScreenLayout from '../../navigation/ScreenLayout';
import { colors, spacing, typography } from '../../theme';

const SearchStudentScreen = ({ navigation }) => {
  const [query, setQuery] = useState('');

  const { data, isFetching } = useStudents(
    { search: query.trim(), pageSize: 20 },
  );

  const results = query.trim() ? (data?.data || []) : [];

  return (
    <ScreenLayout navigation={navigation} activeScreen="SearchStudent">
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          onSubmit={() => {}}
        />
      </View>

      {!query.trim() ? (
        <EmptyState
          icon="account-search-outline"
          title="Student Record Search"
          description="Search for a student to view their master record, attendance history, and academic performance."
          footnote="Type to search instantly"
        />
      ) : isFetching ? (
        <LoadingIndicator label="Searching..." />
      ) : results.length === 0 ? (
        <EmptyState
          icon="account-off-outline"
          title="No matching students"
          description={`No results for "${query}". Try a different name, USN, or Library ID.`}
        />
      ) : (
        <StudentTable
          students={results}
          onRowPress={(item) => navigation.navigate('StudentDetails', { studentId: item.id })}
          showStatus={false}
        />
      )}
    </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchWrap: {
    padding: spacing.lg,
  },
});

export default SearchStudentScreen;
