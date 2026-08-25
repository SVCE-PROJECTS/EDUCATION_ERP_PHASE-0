import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../../theme/colors';

interface SimilarityResultProps {
  score: number | null;
}

interface Level {
  label: string;
  bg: string;
  color: string;
  barColor: string;
}

function getLevel(score: number): Level {
  if (score >= 80) return { label: 'High Similarity',     bg: Colors.dangerLight,  color: Colors.danger,  barColor: Colors.danger  };
  if (score >= 50) return { label: 'Moderate Similarity', bg: Colors.warningLight, color: Colors.warning, barColor: Colors.warning };
  return                   { label: 'Low Similarity',     bg: Colors.successLight, color: Colors.success, barColor: Colors.success };
}

export default function SimilarityResult({ score }: SimilarityResultProps) {
  if (score === null) return null;
  const level = getLevel(score);

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Similarity Analysis</Text>
      <View style={[styles.alert, { backgroundColor: level.bg }]}>
        <Text style={[styles.alertLabel, { color: level.color }]}>{level.label}</Text>
        <Text style={[styles.alertScore, { color: level.color }]}>Similarity Score: {score}%</Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${Math.max(score, 8)}%` as any, backgroundColor: level.barColor }]} />
      </View>
      <View style={styles.barLabelRow}>
        <Text style={[styles.barLabel, { color: level.barColor }]}>{score}% similarity</Text>
        <Text style={styles.barSub}>out of 100%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 18, marginBottom: 14,
    elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5,
  },
  heading:     { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  alert:       { borderRadius: 10, padding: 14, marginBottom: 14 },
  alertLabel:  { fontSize: 15, fontWeight: '700' },
  alertScore:  { fontSize: 13, marginTop: 4 },
  barBg:       { height: 12, backgroundColor: Colors.border, borderRadius: 6, overflow: 'hidden', marginBottom: 6 },
  barFill:     { height: '100%', borderRadius: 6 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barLabel:    { fontSize: 13, fontWeight: '700' },
  barSub:      { fontSize: 11, color: Colors.textMuted },
});
