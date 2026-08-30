import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface Props {
  title: string;
  message?: string;
  icon?: string; // emoji fallback when no icon library available
}

const EmptyState: React.FC<Props> = ({ title, message, icon = '📭' }) => (
  <View style={styles.container}>
    <Text style={styles.icon}>{icon}</Text>
    <Text style={styles.title}>{title}</Text>
    {message ? <Text style={styles.message}>{message}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default EmptyState;
