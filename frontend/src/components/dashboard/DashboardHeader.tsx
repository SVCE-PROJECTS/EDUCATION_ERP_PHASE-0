import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { safeInitials } from '../../utils/numbers';
import Colors from '../../theme/colors';

interface QuickAction {
  label: string;
  icon: string;
  route: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Attendance', icon: 'checkbox-outline',     route: '/attendance' },
  { label: 'Students',   icon: 'people-outline',        route: '/students'  },
  { label: 'IA Marks',   icon: 'bar-chart-outline',     route: '/iamarks'   },
  { label: 'AI Check',   icon: 'hardware-chip-outline', route: '/aichecker' },
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function DashboardHeader() {
  const router = useRouter();
  const { user } = useAuth();
  const today    = new Date();
  const initials = safeInitials(user?.name, 2);
  const displayName = user?.name ?? 'Faculty';

  return (
    <View style={styles.header}>
      {/* Top row — greeting + avatar */}
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.name}>{displayName}</Text>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={11} color="rgba(255,255,255,0.65)" />
            <Text style={styles.sub}>{formatDate(today)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => router.push('/profile')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.onlineDot} />
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Quick actions */}
      <View style={styles.actionsRow}>
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.route}
            style={styles.actionBtn}
            onPress={() => router.push(action.route as any)}
            activeOpacity={0.75}
          >
            <Ionicons name={action.icon as any} size={20} color={Colors.primary} />
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    margin: 16,
    padding: 20,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    elevation: 5,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleBlock: {
    flex: 1,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.2,
    marginBottom: 5,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
  },
  profileBtn: {
    position: 'relative',
    marginLeft: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 4,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
  },
});
