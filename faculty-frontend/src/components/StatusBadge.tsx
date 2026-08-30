import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, radius } from '../theme';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'muted';

interface Props {
  label: string;
  variant?: BadgeVariant;
}

const BG: Record<BadgeVariant, string> = {
  success: colors.successBg,
  warning: colors.warningBg,
  danger: colors.dangerBg,
  info: colors.infoBg,
  muted: '#F1F5F9',
};
const FG: Record<BadgeVariant, string> = {
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  info: colors.info,
  muted: colors.textSecondary,
};

const StatusBadge: React.FC<Props> = ({ label, variant = 'muted' }) => (
  <View style={[styles.badge, { backgroundColor: BG[variant] }]}>
    <Text style={[styles.text, { color: FG[variant] }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  text: { ...typography.smallBold },
});

export default StatusBadge;
