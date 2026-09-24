import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { ChevronDown, Check } from '../../components/icons';
import { ThemeColors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import Modal from './Modal';

export interface DropdownOption {
  label: string;
  value: string;
  /** Optional secondary line, e.g. a subject code. */
  meta?: string;
}

export interface DropdownProps {
  label?: string;
  placeholder?: string;
  value?: string | null;
  options: DropdownOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  emptyText?: string;
}

/**
 * Dropdown — tap to open a modal list of options, single-select.
 * Built on the app's existing Modal primitive so it matches the rest of
 * the UI (no new native picker dependency required).
 */
export default function Dropdown({
  label,
  placeholder = 'Select…',
  value,
  options,
  onChange,
  disabled,
  emptyText = 'No options available',
}: DropdownProps) {
  const { colors: theme } = useTheme();
  const styles = getStyles(theme);
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.wrap}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.field, disabled && styles.fieldDisabled]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.75}
        disabled={disabled}
      >
        <Text style={[styles.fieldText, !selected && styles.placeholder]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <ChevronDown size={16} color={theme.textMuted} />
      </TouchableOpacity>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={label || 'Select an option'} size="sm">
        {options.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{emptyText}</Text>
          </View>
        ) : (
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            renderItem={({ item }) => {
              const isSelected = item.value === value;
              return (
                <TouchableOpacity
                  style={styles.option}
                  activeOpacity={0.7}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelActive]} numberOfLines={1}>
                      {item.label}
                    </Text>
                    {item.meta ? (
                      <Text style={styles.optionMeta} numberOfLines={1}>
                        {item.meta}
                      </Text>
                    ) : null}
                  </View>
                  {isSelected && <Check size={16} color={theme.primary} />}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </Modal>
    </View>
  );
}

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  wrap: { gap: 6, width: '100%' },
  label: { fontSize: 12, fontWeight: '600', color: theme.textSecondary },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: theme.surface,
  },
  fieldDisabled: { opacity: 0.5 },
  fieldText: { fontSize: 13, color: theme.textPrimary, flex: 1 },
  placeholder: { color: theme.textMuted },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  optionText: { flex: 1, minWidth: 0 },
  optionLabel: { fontSize: 13, fontWeight: '500', color: theme.textPrimary },
  optionLabelActive: { color: theme.primary, fontWeight: '700' },
  optionMeta: { fontSize: 11, color: theme.textMuted, marginTop: 1 },
  sep: { height: 1, backgroundColor: theme.border },

  empty: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, color: theme.textMuted },
});
