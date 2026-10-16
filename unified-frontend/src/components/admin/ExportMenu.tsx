// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { previewExport, downloadExport } from '../../services/admin/exportService';
import { downloadBlob } from '../../utils/admin/downloadBlob';
import { showError } from '../../utils/confirmDialog';
import { useTheme } from '../../context/admin/ThemeContext';
import { spacing, radius, shadows } from '../../theme';

interface ExportMenuProps {
  // 'students' | 'faculty' | 'non-teaching-staff'
  entity: string;
  // Current filters/search of the calling screen — exported file matches
  // exactly what's on screen, not the full unfiltered table.
  filters: Record<string, any>;
  filenameBase: string;
}

// Small "Export" button + Excel/PDF picker, reused by all three registry
// tabs so each exports against its own current filters instead of needing a
// separate "Download Data" screen.
export default function ExportMenu({ entity, filters, filenameBase }: ExportMenuProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [open, setOpen] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  const handleExport = async (format: 'excel' | 'pdf') => {
    setOpen(false);
    setDownloadingFormat(format);
    try {
      // Cheap existence check first — avoids generating/downloading an empty
      // file when the current filters match nothing.
      const { total } = await previewExport(entity, filters);
      if (!total) {
        showError('Nothing to export', 'No records match the current search/filters.');
        return;
      }
      const blob = await downloadExport(entity, filters, format);
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      await downloadBlob(blob, `${filenameBase}.${ext}`);
    } catch (err: any) {
      showError('Export failed', err?.message || 'Could not generate the file. Please try again.');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const busy = !!downloadingFormat;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[styles.button, { borderColor: colors.border }]}
        onPress={() => setOpen((v) => !v)}
        disabled={busy}
        activeOpacity={0.7}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Icon source="tray-arrow-down" size={18} color={colors.primary} />
        )}
        <Text style={[styles.buttonText, { color: colors.primary }]}>
          {busy ? 'Exporting…' : 'Export'}
        </Text>
        <Icon source={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </TouchableOpacity>

      {open && (
        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.option} onPress={() => handleExport('excel')} activeOpacity={0.7}>
            <Text style={styles.optionIcon}>📊</Text>
            <Text style={[styles.optionText, { color: colors.textPrimary }]}>Microsoft Excel (.xlsx)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.option} onPress={() => handleExport('pdf')} activeOpacity={0.7}>
            <Text style={styles.optionIcon}>📄</Text>
            <Text style={[styles.optionText, { color: colors.textPrimary }]}>PDF Document</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  wrap: { position: 'relative' },
  button: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.sm, borderWidth: 1,
  },
  buttonText: { fontSize: 13, fontWeight: '700' },
  panel: {
    position: 'absolute', top: '100%', right: 0, marginTop: spacing.xs,
    borderWidth: 1, borderRadius: radius.sm, minWidth: 220, zIndex: 20,
    ...shadows.sm,
  },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  optionIcon: { fontSize: 16 },
  optionText: { fontSize: 13, fontWeight: '600' },
});
