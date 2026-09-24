// @ts-nocheck
import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Portal, Modal, Text } from 'react-native-paper';
import { useTheme } from '../../context/ThemeContext';
import { radius, spacing, typography } from '../../theme';

const CustomModal = ({
  visible, onDismiss, title, children,
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <ScrollView>{children}</ScrollView>
      </Modal>
    </Portal>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    margin: spacing.xl,
    borderRadius: radius.lg,
    padding: spacing.xl,
    maxHeight: '80%',
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
});

export default CustomModal;
