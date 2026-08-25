import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../theme/colors';

interface Feature {
  icon: string;
  title: string;
  desc: string;
}

const features: Feature[] = [
  { icon: 'checkbox-outline',      title: 'Attendance',  desc: 'Track student attendance efficiently.' },
  { icon: 'book-outline',          title: 'Assignments',  desc: 'Create and manage assignments easily.' },
  { icon: 'bar-chart-outline',     title: 'IA Marks',     desc: 'Manage internal assessment marks.' },
  { icon: 'hardware-chip-outline', title: 'AI Checker',   desc: 'Detect plagiarism using AI.' },
];

export default function Features() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Why Choose Our ERP?</Text>
      <View style={styles.grid}>
        {features.map((item, index) => (
          <View key={index} style={styles.card}>
            <Ionicons name={item.icon as any} size={36} color={Colors.primary} />
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingBottom: 40 },
  heading:   { fontSize: 22, fontWeight: '700', textAlign: 'center', color: Colors.textPrimary, marginBottom: 20 },
  grid:      { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '47%', backgroundColor: Colors.white, borderRadius: 14,
    padding: 20, alignItems: 'center', marginBottom: 16,
    elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5,
  },
  title: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginTop: 10, textAlign: 'center' },
  desc:  { fontSize: 12, color: Colors.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 18 },
});
