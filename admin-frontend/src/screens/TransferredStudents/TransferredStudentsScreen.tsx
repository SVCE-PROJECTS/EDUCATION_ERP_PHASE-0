// @ts-nocheck
import React, { useState, useMemo } from 'react';
import {
  View, ScrollView, StyleSheet, Platform, TouchableOpacity, TextInput,
} from 'react-native';
import { Text, ActivityIndicator, Snackbar, Icon } from 'react-native-paper';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosInstance';
import ScreenLayout from '../../navigation/ScreenLayout';
import { colors, spacing, typography, radius } from '../../theme';

const fetchTransferredStudents = async () => {
  const res = await axiosInstance.get('/transfer/all');
  return res.data || res;
};

const downloadTransferReport = async (format) => {
  return axiosInstance.get('/transfer/report', {
    params: { format },
    responseType: 'blob',
  });
};

// ── Arrow badge: "FROM dept → TO dept" ───────────────────────────────────────
const TransferArrow = ({ from, to }) => (
  <View style={card.arrowRow}>
    <View style={card.deptBadge}>
      <Text style={card.deptText} numberOfLines={1}>{from || '—'}</Text>
    </View>
    <Icon source="arrow-right" size={14} color={colors.textMuted} />
    <View style={[card.deptBadge, card.deptBadgeNew]}>
      <Text style={[card.deptText, card.deptTextNew]} numberOfLines={1}>{to || '—'}</Text>
    </View>
  </View>
);

// ── Single transfer record card ───────────────────────────────────────────────
const TransferCard = ({ record, onPress }) => {
  const date = record.transfer_date
    ? new Date(record.transfer_date).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : null;

  return (
    <TouchableOpacity style={card.wrap} onPress={onPress} activeOpacity={0.75}>
      {/* Left accent strip */}
      <View style={card.accent} />

      <View style={card.body}>
        {/* Top row: name + date */}
        <View style={card.topRow}>
          <View style={card.avatarCircle}>
            <Text style={card.avatarLetter}>
              {record.student_name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={card.name} numberOfLines={1}>{record.student_name || '—'}</Text>
            <Text style={card.usn}>{record.usn || 'No USN'}</Text>
          </View>
          {date && (
            <View style={card.dateBadge}>
              <Icon source="calendar-outline" size={11} color={colors.textMuted} />
              <Text style={card.dateText}>{date}</Text>
            </View>
          )}
        </View>

        {/* Transfer route */}
        <TransferArrow from={record.old_department} to={record.new_department} />

        {/* Bottom row: sem/sec chips + doc indicator */}
        <View style={card.bottomRow}>
          <Chip label={`Sem ${record.old_semester || '—'}`} />
          <Chip label={`Sec ${record.old_section || '—'}`} />
          <Icon source="arrow-right" size={12} color={colors.textMuted} />
          <Chip label={`Sem ${record.new_semester || '—'}`} color={colors.primary} />
          <Chip label={`Sec ${record.new_section || '—'}`} color={colors.primary} />
          {record.document_url && (
            <View style={card.docChip}>
              <Icon source="paperclip" size={11} color="#16a34a" />
              <Text style={card.docText}>Doc</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const Chip = ({ label, color }) => (
  <View style={[chip.wrap, color && { borderColor: color, backgroundColor: color + '14' }]}>
    <Text style={[chip.text, color && { color }]}>{label}</Text>
  </View>
);

const chip = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  text: { fontSize: 10, color: colors.textSecondary, fontWeight: '500' },
});

const card = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  accent: {
    width: 4,
    backgroundColor: '#7C3AED',
  },
  body: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7C3AED',
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  usn: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  dateText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deptBadge: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  deptBadgeNew: {
    backgroundColor: '#DCFCE7',
  },
  deptText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },
  deptTextNew: {
    color: '#16a34a',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  docChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  docText: { fontSize: 10, color: '#16a34a', fontWeight: '600' },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

const TransferredStudentsScreen = ({ navigation }) => {
  const [downloading, setDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['students', 'transferred'],
    queryFn: fetchTransferredStudents,
    staleTime: 0,
  });

  const records = data?.data || data || [];

  // Filter by name, USN, or department
  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.trim().toLowerCase();
    return records.filter(r =>
      r.student_name?.toLowerCase().includes(q) ||
      r.usn?.toLowerCase().includes(q) ||
      r.old_department?.toLowerCase().includes(q) ||
      r.new_department?.toLowerCase().includes(q),
    );
  }, [records, search]);

  const handleDownload = async (format) => {
    setDownloading(true);
    try {
      const blob = await downloadTransferReport(format);
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      const filename = `transferred_students.${ext}`;

      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setSuccessMessage(`${filename} downloaded successfully.`);
      } else {
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
    <ScreenLayout navigation={navigation} activeScreen="TransferStudent">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Transferred Students</Text>
            <Text style={styles.subtitle}>
              {isLoading
                ? 'Loading...'
                : `${records.length} transfer record${records.length !== 1 ? 's' : ''}`}
            </Text>
          </View>
          <View style={styles.downloadRow}>
            <TouchableOpacity
              style={[styles.downloadBtn, downloading && styles.downloadBtnDisabled]}
              onPress={() => handleDownload('excel')}
              disabled={downloading}
            >
              <Icon source="microsoft-excel" size={15} color="#fff" />
              <Text style={styles.downloadBtnText}>Excel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.downloadBtn, styles.downloadBtnPdf, downloading && styles.downloadBtnDisabled]}
              onPress={() => handleDownload('pdf')}
              disabled={downloading}
            >
              <Icon source="file-pdf-box" size={15} color="#fff" />
              <Text style={styles.downloadBtnText}>PDF</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Search bar ── */}
        <View style={styles.searchWrap}>
          <Icon source="magnify" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, USN, or department…"
            placeholderTextColor={colors.placeholder}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon source="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Results count when searching ── */}
        {search.trim().length > 0 && !isLoading && (
          <Text style={styles.filterHint}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"
          </Text>
        )}

        {/* ── Download progress ── */}
        {downloading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.loadingText}>Preparing download…</Text>
          </View>
        )}

        {/* ── Content ── */}
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : isError ? (
          <View style={styles.emptyWrap}>
            <Icon source="alert-circle-outline" size={48} color={colors.danger} />
            <Text style={styles.emptyText}>Failed to load transfer records.</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Icon source="swap-horizontal" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              {search.trim() ? 'No results match your search.' : 'No transfer records yet.'}
            </Text>
          </View>
        ) : (
          <View>
            {filtered.map((r, idx) => (
              <TransferCard
                key={r.transfer_id || idx}
                record={r}
                onPress={() => navigation.navigate('StudentDetails', { studentId: r.library_id })}
              />
            ))}
          </View>
        )}

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
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  title: { ...typography.h1, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },

  downloadRow: { flexDirection: 'row', gap: spacing.sm },
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: '#16a34a',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  downloadBtnPdf: { backgroundColor: '#dc2626' },
  downloadBtnDisabled: { opacity: 0.5 },
  downloadBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 46,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    padding: 0,
  },
  filterHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    marginLeft: 4,
  },

  loadingRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm, marginBottom: spacing.md,
  },
  loadingText: { ...typography.caption, color: colors.textSecondary },

  emptyWrap: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyText: {
    ...typography.body, color: colors.textMuted,
    textAlign: 'center', marginTop: spacing.md,
  },
});

export default TransferredStudentsScreen;
