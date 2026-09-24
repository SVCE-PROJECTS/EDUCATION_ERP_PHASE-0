// @ts-nocheck
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../../context/ThemeContext';
import {
  radius, spacing, typography, shadows,
} from '../../theme';

const InfoCard = ({
  title, icon, children, style,
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <View style={[styles.card, style]}>
      {title ? (
        <View style={styles.header}>
          {icon}
          <Text style={styles.title}>{title}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.soft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
});

export default InfoCard;
