/**
 * Faculty Portal — Role Notifications
 * Renders one notification card per role the logged-in user is allocated
 * (e.g. FACULTY, EXAM_COORDINATOR, TIMETABLE_COORDINATOR, ...).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Bell } from '../icons';
import { RoleBadge } from './Badge';
import { getRoleShortName } from '../../utils/roleUtils';
import { shadows, ThemeColors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';

export interface RoleNotificationsProps {
  roles?: string[];
}

export default function RoleNotifications({ roles = [] }: RoleNotificationsProps) {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  if (!roles.length) return null;

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Role Notifications</Text>
      <View style={s.grid}>
        {roles.map((slug) => (
          <View key={slug} style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.bellWrap}>
                <Bell size={16} color={theme.primary} />
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

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  section: { gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    flexBasis: 220,
    flexGrow: 1,
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    gap: 8,
    ...shadows.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bellWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: theme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: theme.textPrimary },
  cardBody: { fontSize: 12, color: theme.textSecondary, lineHeight: 17 },
});
