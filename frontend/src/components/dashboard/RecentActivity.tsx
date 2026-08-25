/**
 * RecentActivity.tsx
 *
 * Shows real recent activities from the backend (/dashboard/stats).
 * If the backend returns no recentActivities, shows "No recent activity"
 * instead of fabricated static data.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { DashboardStats } from '../../types';
import Colors from '../../theme/colors';

interface RecentActivityProps {
  refreshKey: number;
}

interface ActivityItem {
  text:  string;
  route: string;
  icon:  string;
}

type LoadState = 'loading' | 'success' | 'empty' | 'error';

function routeForActivity(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('student'))    return '/students';
  if (t.includes('assignment')) return '/assignments';
  if (t.includes('attendance')) return '/attendance';
  if (t.includes('ia') || t.includes('mark')) return '/iamarks';
  return '/dashboard';
}

function iconForActivity(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('student'))    return 'person-add-outline';
  if (t.includes('assignment')) return 'book-outline';
  if (t.includes('attendance')) return 'checkbox-outline';
  if (t.includes('ia') || t.includes('mark')) return 'bar-chart-outline';
  return 'ellipse-outline';
}

export default function RecentActivity({ refreshKey }: RecentActivityProps) {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [state,      setState]      = useState<LoadState>('loading');

  useEffect(() => {
    setState('loading');
    const controller = new AbortController();

    api.get<DashboardStats>('/dashboard/stats', { signal: controller.signal })
      .then(res => {
        const raw = res.data.recentActivities;
        if (!raw || raw.length === 0) {
          setState('empty');
          return;
        }
        setActivities(raw.map(text => ({
          text,
          route: routeForActivity(text),
          icon:  iconForActivity(text),
        })));
        setState('success');
      })
      .catch(err => {
        if (err.name === 'CanceledError') return;
        setState('error');
      });

    return () => controller.abort();
  }, [refreshKey]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Recent Activity</Text>
        <TouchableOpacity onPress={() => router.push('/students')}>
          <Text style={styles.viewAll}>View All →</Text>
        </TouchableOpacity>
      </View>

      {state === 'loading' && (
        <View style={styles.centred}>
          <ActivityIndicator color={Colors.primary} size="small" />
        </View>
      )}

      {state === 'error' && (
        <Text style={styles.errorText}>Could not load recent activity.</Text>
      )}

      {state === 'empty' && (
        <View style={styles.centred}>
          <Ionicons name="time-outline" size={32} color={Colors.border} />
          <Text style={styles.emptyText}>No recent activity yet.</Text>
        </View>
      )}

      {state === 'success' && activities.map((item, idx) => (
        <TouchableOpacity
          key={idx}
          style={styles.item}
          onPress={() => router.push(item.route as any)}
          activeOpacity={0.7}
        >
          <View style={styles.iconWrap}>
            <Ionicons name={item.icon as any} size={14} color={Colors.primary} />
          </View>
          <Text style={styles.text} numberOfLines={2}>{item.text}</Text>
          <Ionicons name="chevron-forward" size={13} color={Colors.textMuted} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5, flex: 1,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  heading:   { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  viewAll:   { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  centred:   { alignItems: 'center', paddingVertical: 20, gap: 6 },
  emptyText: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
  errorText: { fontSize: 12, color: Colors.danger, textAlign: 'center', paddingVertical: 12 },
  item:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: Colors.border },
  iconWrap:  { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  text:      { fontSize: 13, color: Colors.textPrimary, flex: 1, marginRight: 4 },
});
