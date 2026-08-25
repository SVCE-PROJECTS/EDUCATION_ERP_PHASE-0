import { Link, Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Page not found</Text>
        <Link href="/login" style={styles.link}>Go to Login</Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title:     { fontSize: 20, fontWeight: '700', marginBottom: 12, color: '#1E293B' },
  link:      { color: '#2563EB', fontSize: 15 },
});
