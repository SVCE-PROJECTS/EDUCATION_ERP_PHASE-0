// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Icon, Snackbar } from 'react-native-paper';
import ScreenLayout from '../../navigation/ScreenLayout';
import CustomButton from '../../components/Button/CustomButton';
import LoadingIndicator from '../../components/Loading/LoadingIndicator';
import EmptyState from '../../components/EmptyState/EmptyState';
import { useAllTransfers } from '../../hooks/useTransferStudent';
import { downloadTransferExport } from '../../services/transferService';
import { downloadBlob } from '../../utils/downloadBlob';
import { useTheme } from '../../context/ThemeContext';
import {
  spacing, typography, radius, shadows,
} from '../../theme';

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

const PlacementChip = ({ label, department, semester, section, accent }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const palette = colors.accent[accent] || colors.accent.blue;
  return (
    <View style={[styles.chip, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[styles.chipLabel, { color: palette.icon }]}>{label}</Text>
      <Text style={styles.chipDept}>{department || '—'}</Text>
      <Text style={styles.chipMeta}>Sem {semester ?? '—'} · Sec {section || '—'}</Text>
    </View>
  );
};

const TransferRow = ({ item }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <View>
          <Text style={styles.studentName}>{item.studentName}</Text>
          <Text style={styles.studentMeta}>{item.usn || item.studentId}</Text>
        </View>
        <Text style={styles.dateText}>{formatDate(item.transferDate)}</Text>
      </View>

      <View style={styles.placementRow}>
        <PlacementChip
          label="PREVIOUS"
          department={item.oldDepartmentName}
          semester={item.oldSemester}
          section={item.oldSectionName}
          accent="rose"
        />
        <Icon source="arrow-right-thin" size={20} color={colors.textMuted} />
        <PlacementChip
          label="NEW"
          department={item.newDepartmentName}
          semester={item.newSemester}
          section={item.newSectionName}
          accent="teal"
        />
      </View>

      {!!item.reason && <Text style={styles.reasonText}>Reason: {item.reason}</Text>}
    </View>
  );
};

const TransferredStudentsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { data, isLoading } = useAllTransfers();
  const [downloading, setDownloading] = useState('');
  const [snackbar, setSnackbar] = useState('');

  const transfers = data || [];

  const handleDownload = async (format) => {
    setDownloading(format);
    try {
      const blob = await downloadTransferExport(format);
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      await downloadBlob(blob, `transferred-students.${ext}`);
    } catch (err) {
      setSnackbar(err.message || 'Download failed. Please try again.');
    } finally {
      setDownloading('');
    }
  };

  return (
    <ScreenLayout navigation={navigation} activeScreen="TransferredStudents">
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Transferred Students</Text>
            <Text style={styles.subtitle}>
              Every student transfer, with their previous and new department placement
            </Text>
          </View>
          <View style={styles.downloadActions}>
            <CustomButton
              label="Excel"
              variant="outline"
              onPress={() => handleDownload('excel')}
              loading={downloading === 'excel'}
              disabled={!!downloading}
            />
            <CustomButton
              label="PDF"
              variant="outline"
              onPress={() => handleDownload('pdf')}
              loading={downloading === 'pdf'}
              disabled={!!downloading}
            />
          </View>
        </View>

        <View style={styles.listCard}>
          {isLoading ? (
            <LoadingIndicator label="Loading transfer records..." />
          ) : transfers.length === 0 ? (
            <EmptyState
              icon="swap-horizontal"
              title="No transfers yet"
              description="Students who are transferred between departments will show up here, with their previous and new placement."
            />
          ) : (
            transfers.map((item) => <TransferRow key={item.id} item={item} />)
          )}
        </View>
      </ScrollView>

      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')} duration={4000}>
        {snackbar}
      </Snackbar>
    </ScreenLayout>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg, flexWrap: 'wrap', gap: spacing.md,
  },
  title: { ...typography.h1, color: colors.textPrimary },
  subtitle: {
    ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, maxWidth: 420,
  },
  downloadActions: { flexDirection: 'row', gap: spacing.sm },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  row: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  rowHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  studentName: { ...typography.bodyBold, color: colors.textPrimary, fontSize: 15 },
  studentMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  dateText: { ...typography.caption, color: colors.textMuted },
  placementRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap',
  },
  chip: {
    flex: 1, minWidth: 160, borderRadius: radius.sm, borderWidth: 1, padding: spacing.sm,
  },
  chipLabel: { ...typography.caption, fontWeight: '700', letterSpacing: 0.4, fontSize: 10 },
  chipDept: {
    ...typography.bodyBold, color: colors.textPrimary, fontSize: 13, marginTop: 2,
  },
  chipMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
  reasonText: { ...typography.caption, color: colors.textSecondary, fontStyle: 'italic' },
});

export default TransferredStudentsScreen;
