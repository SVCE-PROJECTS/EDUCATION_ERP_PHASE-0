/**
 * ClassPicker — dropdown to select one of the faculty's assigned classes.
 * Wraps @react-native-picker/picker with a label, loading state, and empty state.
 *
 * Data source: ClassesContext (GET /api/faculty/me/classes)
 *
 * On selection it reports the full FacultyClass object so the parent screen
 * can use class_id, semester_number, section_name, subject_name, etc.
 */

import React from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { colors, spacing, typography, radius } from '../theme';
import type { FacultyClass } from '../types/faculty';
import LoadingIndicator from './LoadingIndicator';

interface Props {
  classes: FacultyClass[];
  loading: boolean;
  selectedClassId: number | string | null;
  onSelect: (cls: FacultyClass) => void;
  label?: string;
}

const ClassPicker: React.FC<Props> = ({
  classes,
  loading,
  selectedClassId,
  onSelect,
  label = 'Select Class',
}) => {
  if (loading) return <LoadingIndicator message="Loading classes…" />;

  const handleChange = (value: number | string) => {
    const cls = classes.find((c) => String(c.class_id) === String(value));
    if (cls) onSelect(cls);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.pickerWrap}>
        <Picker<number | string>
          selectedValue={selectedClassId ?? -1}
          onValueChange={handleChange}
          style={styles.picker}
          accessibilityLabel={label}
        >
          <Picker.Item label="— Choose a class —" value={-1} color={colors.placeholder} />
          {classes.map((cls) => (
            <Picker.Item
              key={cls.class_id}
              label={`${cls.subject_name} (Sem ${cls.semester_number} - ${cls.section_name})`}
              value={cls.class_id}
            />
          ))}
        </Picker>
      </View>
      {classes.length === 0 && (
        <Text style={styles.empty}>No classes assigned. Contact admin.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: {
    ...typography.smallBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  pickerWrap: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    minHeight: 48,
    justifyContent: 'center',
  },
  picker: {
    height: Platform.OS === 'ios' ? undefined : 48,
    color: colors.textPrimary,
  },
  empty: {
    ...typography.small,
    color: colors.warning,
    marginTop: spacing.xs,
  },
});

export default ClassPicker;
