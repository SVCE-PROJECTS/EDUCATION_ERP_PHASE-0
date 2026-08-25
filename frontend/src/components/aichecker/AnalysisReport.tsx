import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../../theme/colors';

interface PickedFile {
  uri:       string;
  name:      string;
  mimeType?: string;
}

interface AnalysisReportProps {
  score: number | null;
  file1: PickedFile | null;
  file2: PickedFile | null;
}

interface SimilarityStatus {
  status:         string;
  color:          string;
  bg:             string;
  recommendation: string;
}

function getStatus(score: number): SimilarityStatus {
  if (score >= 80) return {
    status: 'High Similarity',
    color:  Colors.danger,
    bg:     Colors.dangerLight,
    recommendation: 'Review this submission manually. High plagiarism suspected.',
  };
  if (score >= 50) return {
    status: 'Moderate Similarity',
    color:  Colors.warning,
    bg:     Colors.warningLight,
    recommendation: 'Some similar content detected. Verify before grading.',
  };
  return {
    status: 'Low Similarity',
    color:  Colors.success,
    bg:     Colors.successLight,
    recommendation: 'No significant plagiarism detected.',
  };
}

export default function AnalysisReport({ score, file1, file2 }: AnalysisReportProps) {
  if (score === null) return null;

  const { status, color, bg, recommendation } = getStatus(score);

  // Only show fields with real data — no fabricated word counts
  const rows: { label: string; value: string; isStatus?: boolean }[] = [
    { label: 'Assignment 1',     value: file1?.name ?? '—' },
    { label: 'Assignment 2',     value: file2?.name ?? '—' },
    { label: 'Similarity Score', value: `${score}%` },
    { label: 'Status',           value: status, isStatus: true },
    { label: 'Recommendation',   value: recommendation },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>📋 AI Similarity Report</Text>
      {rows.map((r, i) => (
        <View key={i} style={[styles.row, i % 2 === 0 && styles.rowAlt]}>
          <Text style={styles.label}>{r.label}</Text>
          {r.isStatus ? (
            <View style={[styles.badge, { backgroundColor: bg }]}>
              <Text style={[styles.badgeText, { color }]}>{r.value}</Text>
            </View>
          ) : (
            <Text style={styles.value} numberOfLines={2}>{r.value}</Text>
          )}
        </View>
      ))}
      <Text style={styles.note}>
        Similarity is computed using string comparison of cleaned text content.
        Word-level statistics are not available from this analysis method.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 18, marginTop: 14,
    elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5,
  },
  heading:  { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  row:      { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border, alignItems: 'center' },
  rowAlt:   { backgroundColor: Colors.background },
  label:    { width: 140, fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  value:    { flex: 1, fontSize: 13, color: Colors.textPrimary },
  badge:    { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:{ fontSize: 12, fontWeight: '700' },
  note:     { fontSize: 11, color: Colors.textMuted, marginTop: 12, lineHeight: 17, fontStyle: 'italic' },
});
