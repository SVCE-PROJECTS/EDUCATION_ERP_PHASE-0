import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '../../theme/colors';

export default function Hero() {
  const router = useRouter();
  return (
    <View style={styles.hero}>
      <Text style={styles.heading}>Smart Campus{'\n'}Management System</Text>
      <Text style={styles.sub}>
        A complete solution for Students, Faculty, Attendance,
        Assignments, Internal Assessment, Results and Administration.
      </Text>
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/login')}>
          <Text style={styles.primaryBtnText}>Get Started</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>Learn More</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero:            { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 60, alignItems: 'center' },
  heading:         { fontSize: 30, fontWeight: '800', color: Colors.white, textAlign: 'center', lineHeight: 38, marginBottom: 16 },
  sub:             { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  buttons:         { flexDirection: 'row', gap: 12 },
  primaryBtn:      { backgroundColor: Colors.white, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  primaryBtnText:  { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  secondaryBtn:    { borderWidth: 2, borderColor: Colors.white, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  secondaryBtnText:{ color: Colors.white, fontWeight: '700', fontSize: 15 },
});
