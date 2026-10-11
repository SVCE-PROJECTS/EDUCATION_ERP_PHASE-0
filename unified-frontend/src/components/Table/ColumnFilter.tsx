// @ts-nocheck
import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, Dimensions, Keyboard } from 'react-native';
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
  const [dropdownLayout, setDropdownLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const buttonRef = useRef<View>(null);

  const handleOpen = () => {
    Keyboard.dismiss();
    if (buttonRef.current) {
      buttonRef.current.measure((x, y, width, height, pageX, pageY) => {
        const screenHeight = Dimensions.get('window').height;
        const dropdownHeight = Math.min(280, options.length * 44 + 44); // Approximate height
        const spaceBelow = screenHeight - (pageY + height);
        const spaceAbove = pageY;
        
        // Open upward if not enough space below and more space above
        const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
        
        setDropdownLayout({
          x: pageX,
          y: openUpward ? pageY - dropdownHeight : pageY + height,
          width: 200,
          height: dropdownHeight,
        });
        setIsOpen(true);
      });
    }
  };

  const handleSelect = (value: any) => {
    onSelect(value);
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Support both formats: { id, name } from dropdowns and { label, value } from custom options
  const normalizedOptions = options.map(opt => ({
    value: opt.value ?? opt.id,
    label: opt.label ?? opt.name,
  }));

  const selectedLabel = normalizedOptions.find((opt) => opt.value === selectedValue)?.label || placeholder;

  return (
    <>
      <View ref={buttonRef} style={styles.container}>
        <IconButton
          icon={isOpen ? 'chevron-up' : 'filter-variant'}
          size={14}
          iconColor={selectedValue ? colors.primary : colors.textMuted}
          style={styles.button}
          onPress={handleOpen}
        />
      </View>

      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={handleClose}
      >
        <TouchableOpacity 
          style={styles.modalBackdrop} 
          activeOpacity={1}
          onPress={handleClose}
        >
          {dropdownLayout && (
            <View
              style={[
                styles.dropdown,
                {
                  position: 'absolute',
                  left: dropdownLayout.x,
                  top: dropdownLayout.y,
                  width: dropdownLayout.width,
                  maxHeight: dropdownLayout.height,
                }
              ]}
              onStartShouldSetResponder={() => true}
            >
              <ScrollView 
                style={styles.scrollView} 
                nestedScrollEnabled
                showsVerticalScrollIndicator={true}
              >
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
          )}
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    // No relative positioning needed anymore
  },
  button: {
    margin: 0,
    width: 24,
    height: 24,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdown: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  scrollView: {
    flexGrow: 0,
  },
  option: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 44,
    justifyContent: 'center',
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
