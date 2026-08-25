import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../../theme/colors';

interface MatchedSentencesProps {
  text1: string;
  text2: string;
}

export default function MatchedSentences({ text1, text2 }: MatchedSentencesProps) {
  if (!text1 || !text2) return null;

  const sentences1 = text1.split('.').map(s => s.trim()).filter(Boolean);
  const sentences2 = text2.split('.').map(s => s.trim()).filter(Boolean);
  const matches    = sentences1.filter(s => sentences2.includes(s));

  if (matches.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.heading}>📑 Matching Sentences</Text>
        <Text style={styles.noMatch}>No matching sentences found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>📑 Matching Sentences ({matches.length})</Text>
      {matches.map((s, i) => (
        <View key={i} style={styles.match}>
          <Text style={styles.matchText}>{s}.</Text>
        </View>
      ))}
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
  noMatch:  { color: Colors.textSecondary, fontSize: 14 },
  match:    { backgroundColor: Colors.warningLight, borderRadius: 8, padding: 12, marginBottom: 8 },
  matchText:{ fontSize: 13, color: Colors.textPrimary, lineHeight: 20 },
});
