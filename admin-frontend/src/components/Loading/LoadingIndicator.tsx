// @ts-nocheck
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography } from '../../theme';

const LoadingIndicator = ({ label = 'Loading...', fullscreen = false }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={[styles.container, fullscreen && styles.fullscreen]}>
      <ActivityIndicator animating size="large" color={colors.primary} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  fullscreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  label: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});

export default LoadingIndicator;
