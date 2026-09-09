import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { neutral, primaryScale } from '../theme/colors';
import { ROUTES } from '../navigation/routes';

export default function NotFound() {
  const navigation = useNavigation<any>();
  return (
    <View style={s.root}>
      <Text style={s.code}>404</Text>
      <Text style={s.title}>Page not found</Text>
      <TouchableOpacity onPress={() => navigation.navigate(ROUTES.FACULTY_DASHBOARD)} style={s.btn}>
        <Text style={s.btnText}>Go to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32, backgroundColor: neutral[50] },
  code: { fontSize: 64, fontWeight: '700', color: neutral[200] },
  title: { fontSize: 18, fontWeight: '600', color: neutral[600] },
  btn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: primaryScale[600], borderRadius: 12 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
