// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import Papa from 'papaparse';
import CustomModal from '../Modal/CustomModal';
import CustomButton from '../Button/CustomButton';
import { createStudent } from '../../services/studentService';
import { useTheme } from '../../context/ThemeContext';
import {
  spacing, typography, radius,
} from '../../theme';

// Matches exactly what POST /api/students requires (see createStudentRules
// on the backend) — usn/phone stay optional there too.
const REQUIRED_FIELDS = ['libraryId', 'name', 'gender', 'academicYear', 'programId', 'departmentId', 'semester', 'sectionId'];

const CsvImportModal = ({ visible, onDismiss, onComplete }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState(null); // { success, failed: [{row, libraryId, error}] }

  const reset = () => {
    setFileName('');
    setRows([]);
    setParseError('');
    setImporting(false);
    setProgress({ done: 0, total: 0 });
    setResults(null);
  };

  const handleClose = () => {
    reset();
    onDismiss();
  };

  const handlePickFile = async () => {
    setParseError('');
    setResults(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      setFileName(asset.name);

      // On web, expo-document-picker exposes a real browser File on `.file`.
      // Falling back to fetch(uri) covers native and any web edge case.
      const text = asset.file
        ? await asset.file.text()
        : await (await fetch(asset.uri)).text();

      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      if (parsed.errors?.length) {
        setParseError(parsed.errors[0].message);
        return;
      }

      const normalized = parsed.data.map((row) => {
        const out = {};
        Object.keys(row).forEach((key) => { out[key.trim()] = String(row[key] ?? '').trim(); });
        return out;
      });

      const missingHeaders = REQUIRED_FIELDS.filter((f) => !(f in (normalized[0] || {})));
      if (missingHeaders.length) {
        setParseError(`CSV is missing required column(s): ${missingHeaders.join(', ')}`);
        return;
      }

      setRows(normalized);
    } catch (err) {
      setParseError(err.message || 'Could not read that file.');
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setProgress({ done: 0, total: rows.length });
    const failed = [];
    let success = 0;

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      try {
        await createStudent({
          libraryId: row.libraryId,
          name: row.name,
          usn: row.usn || undefined,
          phone: row.phone || undefined,
          gender: row.gender,
          academicYear: row.academicYear,
          programId: row.programId,
          departmentId: row.departmentId,
          semester: row.semester,
          sectionId: row.sectionId,
        });
        success += 1;
      } catch (err) {
        // +2: header row consumed the first line, and rows are 1-indexed for humans
        failed.push({ row: i + 2, libraryId: row.libraryId, error: err.message || 'Failed' });
      }
      setProgress({ done: i + 1, total: rows.length });
    }

    setResults({ success, failed });
    setImporting(false);
    if (success > 0) onComplete?.();
  };

  return (
    <CustomModal visible={visible} onDismiss={handleClose} title="Import Students from CSV">
      <Text style={styles.hint}>
        CSV must include columns: libraryId, name, gender, academicYear, programId, departmentId,
        semester, sectionId (usn and phone are optional). Program/Department/Section must be the
        numeric ids used elsewhere in this app.
      </Text>

      <CustomButton
        label={fileName || 'Choose CSV File'}
        variant="outline"
        onPress={handlePickFile}
        style={styles.pickBtn}
      />

      {!!parseError && (
        <View style={styles.errorRow}>
          <Icon source="alert-circle-outline" size={16} color={colors.danger} />
          <Text style={styles.errorText}>{parseError}</Text>
        </View>
      )}

      {rows.length > 0 && !results && (
        <View style={styles.previewBox}>
          <Text style={styles.previewText}>{rows.length} row(s) ready to import.</Text>
        </View>
      )}

      {importing && (
        <Text style={styles.progressText}>Importing {progress.done} / {progress.total}...</Text>
      )}

      {results && (
        <View style={styles.resultsBox}>
          <Text style={styles.resultsSuccess}>{results.success} student(s) imported successfully.</Text>
          {results.failed.length > 0 && (
            <>
              <Text style={styles.resultsFailedTitle}>{results.failed.length} row(s) failed:</Text>
              {results.failed.slice(0, 8).map((f) => (
                <Text key={f.row} style={styles.resultsFailedRow}>
                  Row {f.row} ({f.libraryId || '—'}): {f.error}
                </Text>
              ))}
              {results.failed.length > 8 && (
                <Text style={styles.resultsFailedRow}>...and {results.failed.length - 8} more</Text>
              )}
            </>
          )}
        </View>
      )}

      {rows.length > 0 && !results && (
        <CustomButton
          label={`Import ${rows.length} Student(s)`}
          onPress={handleImport}
          loading={importing}
          style={styles.importBtn}
        />
      )}

      {results && (
        <CustomButton label="Done" onPress={handleClose} style={styles.importBtn} />
      )}
    </CustomModal>
  );
};

const getStyles = (colors) => StyleSheet.create({
  hint: {
    ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 17,
  },
  pickBtn: { marginBottom: spacing.sm },
  errorRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, marginBottom: spacing.md,
  },
  errorText: { ...typography.caption, color: colors.danger, flex: 1 },
  previewBox: {
    backgroundColor: colors.primarySoft, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.md,
  },
  previewText: { ...typography.bodyBold, color: colors.primary },
  progressText: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
  resultsBox: { marginBottom: spacing.md, gap: 4 },
  resultsSuccess: { ...typography.bodyBold, color: colors.success },
  resultsFailedTitle: { ...typography.bodyBold, color: colors.danger, marginTop: spacing.sm },
  resultsFailedRow: { ...typography.caption, color: colors.textSecondary },
  importBtn: { marginTop: spacing.sm },
});

export default CsvImportModal;
