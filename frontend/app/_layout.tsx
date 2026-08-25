import React, { Component, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/context/AuthContext';

// ── Error boundary — catches any render crash and shows exact error ─
class AppErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AppErrorBoundary]', error.message, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <ScrollView contentContainerStyle={eb.container}>
          <Text style={eb.emoji}>⚠️</Text>
          <Text style={eb.title}>App crashed</Text>
          <View style={eb.box}>
            <Text style={eb.name}>{this.state.error.name}</Text>
            <Text style={eb.msg}>{this.state.error.message}</Text>
            <Text style={eb.stack} numberOfLines={30}>
              {this.state.error.stack}
            </Text>
          </View>
          <TouchableOpacity style={eb.btn} onPress={() => this.setState({ error: null })}>
            <Text style={eb.btnText}>Retry</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const eb = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  emoji:  { fontSize: 40, marginBottom: 10 },
  title:  { fontSize: 20, fontWeight: '800', color: '#DC2626', marginBottom: 14 },
  box:    { width: '100%', backgroundColor: '#FEF2F2', borderRadius: 10, padding: 14, marginBottom: 16 },
  name:   { fontSize: 14, fontWeight: '700', color: '#991B1B', marginBottom: 4 },
  msg:    { fontSize: 13, color: '#DC2626', marginBottom: 8 },
  stack:  { fontSize: 10, color: '#7F1D1D' },
  btn:    { backgroundColor: '#2563EB', paddingHorizontal: 32, paddingVertical: 13, borderRadius: 10 },
  btnText:{ color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ── Auth guard ─────────────────────────────────────────────────────
function RootGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  const router   = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;
    const inApp   = segments[0] === '(app)';
    const isAtRoot = !segments[0];
    const onLogin  = segments[0] === 'login' || isAtRoot;

    if (!isAuthenticated && inApp) {
      router.replace('/login');
    } else if (isAuthenticated && (onLogin || segments[0] === 'index')) {
      router.replace('/(app)/dashboard');
    }
  }, [isAuthenticated, isLoading, segments]);

  return null;
}

// ── Main content ───────────────────────────────────────────────────
function RootLayoutContent() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <RootGuard />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

// ── Root layout ────────────────────────────────────────────────────
export default function RootLayout() {
  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <RootLayoutContent />
        </AuthProvider>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading:     { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FB' },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 14 },
});
