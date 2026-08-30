import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, spacing, typography, radius } from '../theme';

interface Props {
  message: string;
  onRetry?: () => void;
}

const ErrorMessage: React.FC<Props> = ({ message, onRetry }) => (
  <View style={styles.container}>
    <Text style={styles.icon}>⚠️</Text>
    <Text style={styles.message}>{message}</Text>
    {onRetry ? (
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry} accessibilityRole="button">
        <Text style={styles.retryText}>Try Again</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    margin: spacing.lg,
    backgroundColor: colors.dangerBg,
    borderRadius: radius.lg,
  },
  icon: { fontSize: 32, marginBottom: spacing.sm },
  message: {
    ...typography.body,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryBtn: {
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  retryText: {
    ...typography.bodyBold,
    color: colors.white,
  },
});

export default ErrorMessage;
