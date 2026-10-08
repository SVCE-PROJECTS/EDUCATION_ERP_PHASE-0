// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useTheme } from '../../context/admin/ThemeContext';
import { spacing, typography } from '../../theme';

interface ColumnFilterProps {
  options: Array<{ id?: any; name?: string; label?: string; value?: any }>;
  selectedValue?: any;
  onSelect: (value: any) => void;
  placeholder?: string;
}

const ColumnFilter: React.FC<ColumnFilterProps> = ({
  options,
  selectedValue,
  onSelect,
  placeholder = 'All',
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (value: any) => {
    onSelect(value);
    setIsOpen(false);
  };

  // Support both formats: { id, name } from dropdowns and { label, value } from custom options
  const normalizedOptions = options.map(opt => ({
    value: opt.value ?? opt.id,
    label: opt.label ?? opt.name,
  }));

  const selectedLabel = normalizedOptions.find((opt) => opt.value === selectedValue)?.label || placeholder;

  return (
    <View style={styles.container}>
      <IconButton
        icon={isOpen ? 'chevron-up' : 'filter-variant'}
        size={14}
        iconColor={selectedValue ? colors.primary : colors.textMuted}
        style={styles.button}
        onPress={() => setIsOpen(!isOpen)}
      />
      
      {isOpen && (
        <>
          <View style={styles.backdrop} onStartShouldSetResponder={() => { setIsOpen(false); return true; }} />
          <View style={styles.dropdown}>
            <ScrollView style={styles.scrollView} nestedScrollEnabled>
              <TouchableOpacity
                style={styles.option}
                onPress={() => handleSelect(undefined)}
              >
                <Text style={[styles.optionText, !selectedValue && styles.optionTextSelected]}>
                  {placeholder}
                </Text>
              </TouchableOpacity>
              {normalizedOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.option}
                  onPress={() => handleSelect(option.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      option.value === selectedValue && styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  button: {
    margin: 0,
    width: 24,
    height: 24,
  },
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  dropdown: {
    position: 'absolute',
    top: 28,
    left: 0,
    minWidth: 200,
    maxHeight: 300,
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1001,
  },
  scrollView: {
    maxHeight: 300,
  },
  option: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  optionTextSelected: {
    ...typography.bodyBold,
    color: colors.primary,
  },
});

export default ColumnFilter;
