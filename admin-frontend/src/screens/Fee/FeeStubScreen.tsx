// @ts-nocheck

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import ScreenLayout from '../../navigation/ScreenLayout';
import EmptyState from '../../components/EmptyState/EmptyState';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography } from '../../theme';

// Shared leaf screen for a fee category that doesn't have backend support
// yet (Transport, Hostel, Tuition, Exam). Reached via route params so one
// screen covers all four instead of four near-identical files.
const FeeStubScreen = ({ navigation, route }) => {
  const {
    title = 'Fee Category',
    description,
    icon = 'clock-outline',
  } = route?.params || {};
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <ScreenLayout navigation={navigation} activeScreen="Fee">
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>Fee structure and student dues</Text>

        <EmptyState
          icon={icon}
          title="Coming soon"
          description={description || `${title} management is being built and will be available in a future update.`}
        />
      </View>
    </ScreenLayout>
  );
};

const getStyles = (colors) => StyleSheet.create({
  content: {
    flex: 1,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
});

export default FeeStubScreen;
