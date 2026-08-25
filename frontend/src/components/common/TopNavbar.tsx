/**
 * TopNavbar.tsx
 *
 * - Badge count is fetched ONCE on mount (not on every pathname change).
 * - Faculty name comes from AuthContext — no hardcoded string.
 * - Avatar initial is derived from the authenticated user's name.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { safeInitials } from '../../utils/numbers';
import Colors from '../../theme/colors';

interface TopNavbarProps {
  onMenuPress: () => void;
}

const TITLES: Record<string, string> = {
  '/dashboard':   'Dashboard',
  '/students':    'Students',
  '/attendance':  'Attendance',
  '/assignments': 'Assignments',
  '/iamarks':     'IA Marks',
  '/aichecker':   'AI Checker',
  '/profile':     'My Profile',
  '/timetable':   'Timetable',
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

// Extract first name for the greeting
function firstName(fullName?: string): string {
  if (!fullName) return 'Faculty';
  return fullName.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').split(' ')[0];
}

export default function TopNavbar({ onMenuPress }: TopNavbarProps) {
  const insets   = useSafeAreaInsets();
  const router   = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const topPad   = insets.top > 0 ? insets.top : (Platform.OS === 'android' ? 28 : 20);
  const title    = TITLES[pathname] ?? 'Faculty Dashboard';

  // Badge: fetched once on mount only — not on every route change
  const [badge, setBadge] = useState(0);
  useEffect(() => {
    api.get<{ openAssignments?: number }>('/dashboard/stats')
      .then(res => setBadge(res.data.openAssignments ?? 0))
      .catch(() => {}); // badge is non-critical — silent on failure
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally once

  const initials    = safeInitials(user?.name, 2);
  const displayName = firstName(user?.name);

  return (
    <View style={[styles.navbar, { paddingTop: topPad }]}>
      <TouchableOpacity
        onPress={onMenuPress}
        style={styles.menuBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="menu-outline" size={26} color={Colors.textPrimary} />
      </TouchableOpacity>

      <View style={styles.titleArea}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {pathname === '/dashboard'
          ? <Text style={styles.greeting}>{greeting()}, {displayName}</Text>
          : <Text style={styles.greeting}>Faculty Portal · SVCE</Text>
        }
      </View>

      <View style={styles.right}>
        <TouchableOpacity
          style={styles.bellWrap}
          onPress={() => router.push('/assignments')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="notifications-outline" size={22} color={Colors.textPrimary} />
          {badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.avatar}
          onPress={() => router.push('/profile')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    backgroundColor: Colors.navbarBg,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4,
    zIndex: 10,
  },
  menuBtn:   { marginRight: 12, padding: 4 },
  titleArea: { flex: 1 },
  title:     { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, lineHeight: 22 },
  greeting:  { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  right:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bellWrap:  { padding: 4, position: 'relative' },
  badge: {
    position: 'absolute', top: 0, right: 0,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.danger,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: Colors.white,
  },
  badgeText:  { fontSize: 9, color: Colors.white, fontWeight: '800' },
  avatar:     { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.primaryLight },
  avatarText: { color: Colors.white, fontWeight: '900', fontSize: 14 },
});
