import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle } from '../../components/icons';
import Modal from './Modal';
import Button, { ButtonVariant } from './Button';
import { colors, neutral } from '../../theme/colors';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  variant?: ButtonVariant;
  loading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onPress={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={variant} onPress={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <AlertTriangle size={20} color={colors.red[500]} />
        </View>
        <Text style={styles.message}>{message}</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrap: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.red[50],
  },
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: neutral[600],
    marginTop: 2,
  },
});
