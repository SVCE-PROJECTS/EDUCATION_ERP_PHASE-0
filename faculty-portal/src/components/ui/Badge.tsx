import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { roleBadgeColors, statusColors } from '../../theme/colors';
import { getRoleShortName } from '../../utils/roleUtils';
import { FacultyStatus } from '../../types';

export interface RoleBadgeProps {
  slug: string;
  name?: string;
  size?: 'sm' | 'lg';
}

export function RoleBadge({ slug, name, size = 'sm' }: RoleBadgeProps) {
  const label = getRoleShortName(slug) || name || slug;
  const palette = (roleBadgeColors as Record<string, { bg: string; text: string }>)[slug] ?? roleBadgeColors.DEFAULT;
  const isLg = size === 'lg';
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }, isLg ? styles.badgeLg : styles.badgeSm]}>
      <Text style={[styles.badgeText, { color: palette.text }, isLg ? styles.textLg : styles.textSm]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export interface StatusBadgeProps { status: FacultyStatus | string; }

export function StatusBadge({ status }: StatusBadgeProps) {
  const palette = (statusColors as Record<string, { bg: string; text: string; dot: string }>)[status] ?? statusColors.INACTIVE;
  const labels: Record<string, string> = { ACTIVE: 'Active', INACTIVE: 'Inactive', ON_LEAVE: 'On Leave' };
  return (
    <View style={[styles.badge, styles.badgeSm, { backgroundColor: palette.bg }]}>
      <View style={[styles.dot, { backgroundColor: palette.dot }]} />
      <Text style={[styles.badgeText, styles.textSm, { color: palette.text }]}>{labels[status] ?? status}</Text>
    </View>
  );
}

export default RoleBadge;

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, alignSelf: 'flex-start' },
  badgeSm: { paddingHorizontal: 8, paddingVertical: 2 },
  badgeLg: { paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { fontWeight: '500' },
  textSm: { fontSize: 11 },
  textLg: { fontSize: 13 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
});
