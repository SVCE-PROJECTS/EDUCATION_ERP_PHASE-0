/**
 * (app)/_layout.tsx — Protected app layout
 *
 * Independently verifies authentication before rendering any app screen.
 * This is a second line of defence — if someone navigates directly to
 * /(app)/dashboard, this layout will catch them before the root guard does.
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, Redirect } from 'expo-router';
import TopNavbar from '../../src/components/common/TopNavbar';
import Sidebar from '../../src/components/common/Sidebar';
import { useAuth } from '../../src/context/AuthContext';
import Colors from '../../src/theme/colors';

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Still restoring auth — wait (root layout shows loading screen already)
  if (isLoading) return null;

  // Unauthenticated — redirect to login
  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={styles.container}>
      <TopNavbar onMenuPress={() => setSidebarOpen(true)} />
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <View style={styles.content}>
        <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content:   { flex: 1 },
});
