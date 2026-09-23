import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { ChevronDown, Check } from '../../components/icons';
import { colors, neutral, primaryScale } from '../../theme/colors';
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
        <ChevronDown size={16} color={neutral[400]} />
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
                  {isSelected && <Check size={16} color={primaryScale[600]} />}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, width: '100%' },
  label: { fontSize: 12, fontWeight: '600', color: neutral[600] },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.white,
  },
  fieldDisabled: { opacity: 0.5 },
  fieldText: { fontSize: 13, color: neutral[900], flex: 1 },
  placeholder: { color: neutral[400] },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  optionText: { flex: 1, minWidth: 0 },
  optionLabel: { fontSize: 13, fontWeight: '500', color: neutral[800] },
  optionLabelActive: { color: primaryScale[700], fontWeight: '700' },
  optionMeta: { fontSize: 11, color: neutral[400], marginTop: 1 },
  sep: { height: 1, backgroundColor: neutral[100] },

  empty: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, color: neutral[400] },
});
