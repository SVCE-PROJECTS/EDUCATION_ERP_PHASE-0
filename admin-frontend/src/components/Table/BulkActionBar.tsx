// @ts-nocheck
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import CustomButton from '../Button/CustomButton';
import { useTheme } from '../../context/ThemeContext';
import {
  spacing, typography, radius, shadows,
} from '../../theme';

const BulkActionBar = ({
  count, onPromote, onReassign, onClear, busy,
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.bar}>
      <Text style={styles.count}>{count} student{count === 1 ? '' : 's'} selected</Text>
      <View style={styles.actions}>
        <CustomButton label="Promote to Next Semester" variant="outline" onPress={onPromote} disabled={busy} />
        <CustomButton label="Reassign Section" variant="outline" onPress={onReassign} disabled={busy} />
        <Text style={styles.clearLink} onPress={onClear}>Clear</Text>
      </View>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.soft,
  },
  count: { ...typography.bodyBold, color: colors.primary },
  actions: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  clearLink: {
    ...typography.bodyBold, color: colors.textSecondary, paddingHorizontal: spacing.sm,
  },
});

export default BulkActionBar;
