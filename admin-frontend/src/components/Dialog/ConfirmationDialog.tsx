// @ts-nocheck
import React from 'react';
import { Portal, Dialog, Text, Button } from 'react-native-paper';
import { useTheme } from '../../context/ThemeContext';

const ConfirmationDialog = ({
  visible, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  onConfirm, onCancel, destructive = false, loading = false,
}) => {
  const { colors } = useTheme();
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onCancel}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text>{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onCancel} textColor={colors.textSecondary}>{cancelLabel}</Button>
          <Button
            onPress={onConfirm}
            loading={loading}
            textColor={destructive ? colors.danger : colors.primary}
          >
            {confirmLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

export default ConfirmationDialog;
