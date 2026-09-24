// @ts-nocheck
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography } from '../../theme';

const EmptyState = ({
  icon = 'account-search-outline', title, description, footnote,
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <Avatar.Icon
        icon={icon}
        size={64}
        style={styles.iconWrap}
        color={colors.primary}
      />
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  footnote: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});

export default EmptyState;
