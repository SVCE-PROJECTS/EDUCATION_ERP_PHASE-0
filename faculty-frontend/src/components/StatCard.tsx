import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { colors, spacing, typography, radius } from '../theme';

interface Props {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
  bgColor?: string;
}

const StatCard: React.FC<Props> = ({
  label,
  value,
  icon,
  color = colors.primary,
  bgColor = colors.primaryLight,
}) => (
  <View style={[styles.card, { borderLeftColor: color }]}>
    <View style={[styles.iconWrap, { backgroundColor: bgColor }]}>
      <Text style={styles.icon}>{icon}</Text>
    </View>
    <View style={styles.info}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderLeftWidth: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    flex: 1,
    minWidth: 140,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 22 },
  info: { flex: 1 },
  value: {
    ...typography.h2,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

export default StatCard;
