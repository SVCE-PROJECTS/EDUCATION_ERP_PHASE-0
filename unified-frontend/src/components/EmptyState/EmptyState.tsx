// @ts-nocheck
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { useTheme } from '../../context/admin/ThemeContext';
import { spacing, typography, radius } from '../../theme';

const EmptyState = ({
  icon = 'account-search-outline', title, description, footnote,
  // Optional — shows a button below the description. Used so a search/filter
  // that matches nothing still leaves a way back to the unfiltered list,
  // instead of the controls that set it disappearing along with the table.
  actionLabel, onAction,
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
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.actionBtn} onPress={onAction} activeOpacity={0.7}>
          <Text style={styles.actionBtnText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
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
  actionBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionBtnText: {
    ...typography.bodyBold,
    color: colors.primary,
  },
});

export default EmptyState;
