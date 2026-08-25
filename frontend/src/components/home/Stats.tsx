import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../theme/colors';

interface StatItem {
  icon: string;
  number: string;
  title: string;
}

const stats: StatItem[] = [
  { icon: 'school-outline',   number: '5000+', title: 'Students' },
  { icon: 'person-outline',   number: '250+',  title: 'Faculty' },
  { icon: 'business-outline', number: '10+',   title: 'Departments' },
  { icon: 'book-outline',     number: '20+',   title: 'Courses' },
];

export default function Stats() {
  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {stats.map((item, index) => (
          <View key={index} style={styles.card}>
            <Ionicons name={item.icon as any} size={36} color={Colors.primary} />
            <Text style={styles.number}>{item.number}</Text>
            <Text style={styles.title}>{item.title}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 24 },
  grid:      { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '47%', backgroundColor: Colors.white, borderRadius: 12,
    padding: 20, alignItems: 'center', marginBottom: 16,
    elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  number: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginTop: 8 },
  title:  { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
});
