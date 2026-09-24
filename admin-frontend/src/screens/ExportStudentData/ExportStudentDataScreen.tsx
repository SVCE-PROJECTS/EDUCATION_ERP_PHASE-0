// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Text, ActivityIndicator, Snackbar } from 'react-native-paper';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import InfoCard from '../../components/Card/InfoCard';
import CustomDropdown from '../../components/Dropdown/CustomDropdown';
import CustomButton from '../../components/Button/CustomButton';
import StudentTable from '../../components/Table/StudentTable';
import { useDropdown, useSectionsBySemester } from '../../hooks/useDropdowns';
import { previewExport, downloadExport } from '../../services/exportService';
import { EXPORT_FORMATS } from '../../constants';
import ScreenLayout from '../../navigation/ScreenLayout';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, radius } from '../../theme';

const FormatOption = ({
  icon, title, subtitle, selected, onPress,
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <TouchableOpacity
      style={[styles.formatCard, selected && styles.formatCardSelected]}
      onPress={onPress}
    >
      <Text style={styles.formatIcon}>{icon}</Text>
      <Text style={styles.formatTitle}>{title}</Text>
      <Text style={styles.formatSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
};

const ExportStudentDataScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [programId, setProgramId] = useState();
  const [departmentId, setDepartmentId] = useState();
  const [academicYear, setAcademicYear] = useState();
  const [semester, setSemester] = useState();
  const [sectionId, setSectionId] = useState();
  const [format, setFormat] = useState(EXPORT_FORMATS.EXCEL);
  const [preview, setPreview] = useState({ total: null, sample: [] });
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { data: programs = [] } = useDropdown('program');
  const { data: departments = [] } = useDropdown('department');
  const { data: sections = [] } = useSectionsBySemester(semester);
  const { data: semesters = [] } = useDropdown('semester');

  const filters = {
    programId, departmentId, sectionId, semester, academicYear,
  };
  // Nothing selected yet -> don't fetch or show any total (avoids showing
  // the full unfiltered student count before the user has chosen anything).
  const hasAnyFilter = !!(programId || departmentId || sectionId || semester || academicYear);

  const refreshPreview = async () => {
    if (!hasAnyFilter) {
      setPreview({ total: null, sample: [] });
      return;
    }
    setLoadingPreview(true);
    try {
      const result = await previewExport(filters);
      setPreview(result);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load preview.');
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    refreshPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, departmentId, sectionId, semester, academicYear]);

  useEffect(() => {
    setSectionId(undefined);
  }, [semester]);

  // Screens stay mounted in the background with our flat navigator, so local
  // state (filters, format, last preview) otherwise persists between visits -
  // showing stale numbers from your last session here. Reset everything back
  // to the "nothing selected" state every time this screen comes into focus.
  useFocusEffect(
    useCallback(() => {
      setProgramId(undefined);
      setDepartmentId(undefined);
      setSemester(undefined);
      setSectionId(undefined);
      setAcademicYear(undefined);
      setFormat(EXPORT_FORMATS.EXCEL);
      setPreview({ total: null, sample: [] });
    }, []),
  );

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await downloadExport(filters, format);
      const ext = format === EXPORT_FORMATS.PDF ? 'pdf' : 'xlsx';
      const filename = `students.${ext}`;

      if (Platform.OS === 'web') {
        // Browser download: create an object URL and trigger a click on a
        // temporary anchor tag. No filesystem/sharing APIs needed on web.
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // Native (iOS/Android): write the blob to a cache file, then hand it
        // to the OS share sheet so the user can save/open it.
        const fileUri = `${FileSystem.cacheDirectory}${filename}`;
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64data = reader.result.split(',')[1];
          await FileSystem.writeAsStringAsync(fileUri, base64data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri);
          }
        };
        reader.readAsDataURL(blob);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ScreenLayout navigation={navigation} activeScreen="ExportStudentData">
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Download Student Records</Text>
      <Text style={styles.subheading}>
        Configure filters and format to generate a batch data distribution report.
      </Text>

      <InfoCard title="Hierarchical Filters">
        <CustomDropdown label="Program" value={programId} options={programs} onSelect={setProgramId} floatingLabel={false} />
        <CustomDropdown label="Department" value={departmentId} options={departments} onSelect={setDepartmentId} floatingLabel={false} />
        <CustomDropdown label="Semester" value={semester} options={semesters} onSelect={setSemester} floatingLabel={false} />
        <CustomDropdown label="Section" value={sectionId} options={sections} onSelect={setSectionId} floatingLabel={false} />
      </InfoCard>

      <InfoCard title="Download Format">
        <View style={styles.formatRow}>
          <FormatOption
            icon="📊"
            title="Microsoft Excel"
            subtitle=".xlsx file"
            selected={format === EXPORT_FORMATS.EXCEL}
            onPress={() => setFormat(EXPORT_FORMATS.EXCEL)}
          />
          <FormatOption
            icon="📄"
            title="PDF Document"
            subtitle="Print-ready file"
            selected={format === EXPORT_FORMATS.PDF}
            onPress={() => setFormat(EXPORT_FORMATS.PDF)}
          />
        </View>
      </InfoCard>

      <InfoCard title="Download Summary">
        {!hasAnyFilter ? (
          <Text style={styles.summaryPlaceholder}>
            Select at least one filter above to see how many students match.
          </Text>
        ) : loadingPreview ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Text style={styles.summaryCount}>{preview.total}</Text>
            <Text style={styles.summaryLabel}>TOTAL STUDENTS FOUND</Text>
          </>
        )}
        <View style={styles.summaryActions}>
          <CustomButton
            label="Download Data"
            onPress={handleDownload}
            loading={downloading}
            disabled={!hasAnyFilter}
          />
          <CustomButton
            label="Refresh Preview"
            variant="outline"
            onPress={refreshPreview}
            disabled={!hasAnyFilter}
          />
        </View>
      </InfoCard>

      {hasAnyFilter && preview.sample.length > 0 && (
        <InfoCard title="Sample Preview (Top 5 Records)">
          <StudentTable students={preview.sample} onRowPress={() => {}} />
        </InfoCard>
      )}

      <Snackbar
        visible={!!errorMessage}
        onDismiss={() => setErrorMessage('')}
        duration={4000}
        style={{ backgroundColor: colors.danger }}
      >
        {errorMessage}
      </Snackbar>
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
  heading: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subheading: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  formatRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  formatCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  formatCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  formatIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  formatTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  formatSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  summaryCount: {
    ...typography.h1,
    fontSize: 36,
    color: colors.textPrimary,
  },
  summaryLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  summaryPlaceholder: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  summaryActions: {
    gap: spacing.md,
  },
});

export default ExportStudentDataScreen;
