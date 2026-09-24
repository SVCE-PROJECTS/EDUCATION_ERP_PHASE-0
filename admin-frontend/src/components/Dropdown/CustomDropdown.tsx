// @ts-nocheck
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { HelperText, Text } from 'react-native-paper';
import { useTheme } from '../../context/ThemeContext';
import {
  spacing, typography, radius,
} from '../../theme';

/**
 * options: Array<{ id: string|number, name: string }>
 *
 * Uses the standard @react-native-picker/picker component - a real <select>
 * on web, a real native picker on iOS/Android. This replaces the earlier
 * custom-built dropdown, which had reliability issues with click handling
 * and multiple menus staying open at once.
 */
const CustomDropdown = ({
  label, value, options = [], onSelect, error, placeholder = 'Select', loading = false,
  floatingLabel = true,
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const placeholderText = loading ? 'Loading...' : (floatingLabel ? label : placeholder);

  return (
    <View style={styles.container}>
      {!floatingLabel && label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={[styles.pickerWrapper, !!error && styles.inputError]}>
        <Picker
          selectedValue={value === undefined || value === null ? '' : value}
          onValueChange={(itemValue) => {
            if (itemValue !== '') onSelect(itemValue);
          }}
          enabled={!loading}
          style={styles.picker}
          dropdownIconColor={colors.textSecondary}
        >
          <Picker.Item label={placeholderText} value="" color={colors.placeholder} />
          {options.map((option) => (
            <Picker.Item key={option.id} label={option.name} value={option.id} />
          ))}
        </Picker>
      </View>

      {!!error && <HelperText type="error">{error}</HelperText>}
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    minHeight: 52,
    overflow: 'hidden',
  },
  inputError: {
    borderColor: colors.danger,
  },
  picker: {
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 0,
    height: 52,
    paddingHorizontal: spacing.sm,
    ...typography.body,
  },
});

export default CustomDropdown;
