import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '../../theme/colors';

export default function Navbar() {
  const router = useRouter();
  return (
    <View style={styles.navbar}>
      <Text style={styles.logo}>🎓 Student ERP</Text>
      <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
        <Text style={styles.loginBtnText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  logo:         { fontSize: 20, fontWeight: '800', color: Colors.white },
  loginBtn:     { backgroundColor: Colors.white, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 8 },
  loginBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
});
