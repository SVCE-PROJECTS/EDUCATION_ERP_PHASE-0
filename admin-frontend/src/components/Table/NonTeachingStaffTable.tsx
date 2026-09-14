// @ts-nocheck
import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { colors, spacing, typography } from '../../theme';

const STATUS_STYLE = {
  ACTIVE:   { bg: colors.successBg, text: colors.success },
  ON_LEAVE: { bg: colors.warningBg, text: colors.warning },
  INACTIVE: { bg: colors.dangerBg,  text: colors.danger  },
};

const COLUMNS = [
  { key: 'employeeId',    label: 'Employee ID', flex: 1.2 },
  { key: 'name',          label: 'Name',        flex: 1.6 },
  { key: 'designation',   label: 'Designation', flex: 1.4 },
  { key: 'departmentName',label: 'Department',  flex: 1.2 },
  { key: 'status',        label: 'Status',      flex: 0.9 },
];

const NonTeachingStaffTable = ({ staff, onRowPress }) => {
  const Header = () => (
    <View style={[styles.row, styles.headerRow]}>
      {COLUMNS.map((col) => (
        <Text key={col.key} style={[styles.headerCell, { flex: col.flex }]}>
          {col.label}
        </Text>
      ))}
    </View>
  );

  return (
    <FlatList
      data={staff}
      keyExtractor={(item) => String(item.id ?? item.staffId)}
      ListHeaderComponent={Header}
      stickyHeaderIndices={[0]}
      renderItem={({ item }) => {
        const s = STATUS_STYLE[item.status] || { bg: colors.border, text: colors.textSecondary };
        return (
          <TouchableOpacity style={styles.row} onPress={() => onRowPress?.(item)}>
            <Text style={[styles.cell, { flex: COLUMNS[0].flex, color: colors.primary }]} numberOfLines={1}>
              {item.employeeId || '—'}
            </Text>
            <Text style={[styles.cell, { flex: COLUMNS[1].flex }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.cell, { flex: COLUMNS[2].flex }]} numberOfLines={1}>{item.designation || '—'}</Text>
            <Text style={[styles.cell, { flex: COLUMNS[3].flex }]} numberOfLines={1}>{item.departmentName || '—'}</Text>
            <View style={{ flex: COLUMNS[4].flex, justifyContent: 'center' }}>
              <Chip
                style={{ backgroundColor: s.bg, alignSelf: 'flex-start' }}
                textStyle={{ color: s.text, fontSize: 11 }}
                compact
              >
                {item.status || '—'}
              </Chip>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: {
    backgroundColor: colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  headerCell: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cell: {
    ...typography.body,
    color: colors.textPrimary,
  },
});

export default NonTeachingStaffTable;
