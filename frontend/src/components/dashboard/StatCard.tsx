import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../theme/colors';

interface StatCardProps {
  title:      string;
  value:      string;
  iconName?:  string;
  color:      string;
}

export default function StatCard({ title, value, iconName, color }: StatCardProps) {
  return (
    <View style={[styles.card, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={[styles.value, { color }]}>{value}</Text>
      </View>
      <View style={[styles.iconBg, { backgroundColor: color + '22' }]}>
        {iconName ? (
          <Ionicons name={iconName as any} size={22} color={color} />
        ) : (
          <View style={[styles.fallbackDot, { backgroundColor: color }]} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5,
  },
  body:        { flex: 1 },
  title:       { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  value:       { fontSize: 30, fontWeight: '800', marginTop: 4 },
  iconBg:      { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  fallbackDot: { width: 12, height: 12, borderRadius: 6 },
});
