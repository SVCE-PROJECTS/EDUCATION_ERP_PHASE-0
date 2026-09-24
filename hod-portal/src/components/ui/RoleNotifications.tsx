/**
 * HOD Portal — Role Notifications
 * Renders one notification card per role the logged-in user is allocated
 * (e.g. HOD, EXAM_COORDINATOR, TIMETABLE_COORDINATOR, ...).
 * Mirrors faculty-portal/src/components/ui/RoleNotifications.tsx.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Bell } from '../icons';
import { RoleBadge } from './Badge';
import { getRoleShortName } from '../../utils/roleUtils';
import { colors, shadows, primaryScale, neutral } from '../../theme/colors';

export interface RoleNotificationsProps {
  roles?: string[];
}

export default function RoleNotifications({ roles = [] }: RoleNotificationsProps) {
  if (!roles.length) return null;

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Role Notifications</Text>
      <View style={s.grid}>
        {roles.map((slug) => (
          <View key={slug} style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.bellWrap}>
                <Bell size={16} color={primaryScale[600]} />
              </View>
              <RoleBadge slug={slug} size="sm" />
            </View>
            <Text style={s.cardTitle}>{getRoleShortName(slug)}</Text>
            <Text style={s.cardBody}>No new notifications for this role yet.</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  section: { gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: neutral[900] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    flexBasis: 220,
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: neutral[100],
    padding: 16,
    gap: 8,
    ...shadows.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bellWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: primaryScale[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: neutral[900] },
  cardBody: { fontSize: 12, color: neutral[500], lineHeight: 17 },
});
