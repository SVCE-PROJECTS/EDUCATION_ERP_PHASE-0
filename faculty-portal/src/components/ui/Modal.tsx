// Faculty Portal — Modal — mirrors hod-portal/src/components/ui/Modal.tsx
import React from 'react';
import {
  Modal as RNModal, View, Text, TouchableOpacity,
  ScrollView, StyleSheet, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { X } from '../icons';
import { colors, shadows, ThemeColors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const SIZE_MAX_WIDTH: Record<ModalSize, number> = {
  sm: 400, md: 520, lg: 640, xl: 768, full: 9999,
};

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  size?: ModalSize;
  footer?: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children, size = 'md', footer }: ModalProps) {
  const { colors: theme } = useTheme();
  const styles = getStyles(theme);
  const maxWidth = SIZE_MAX_WIDTH[size] ?? SIZE_MAX_WIDTH.md;
  return (
    <RNModal visible={isOpen} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} accessibilityLabel="Close modal" />
        <View style={[styles.sheet, { maxWidth, width: '92%' }]}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          {footer && <View style={styles.footer}>{footer}</View>}
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: theme.overlay, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  sheet: { backgroundColor: theme.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.border, maxHeight: SCREEN_HEIGHT * 0.85, ...shadows.soft },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.border },
  title: { flex: 1, fontSize: 16, fontWeight: '600', color: theme.textPrimary, marginRight: 8 },
  closeBtn: { padding: 6, borderRadius: 8 },
  body: { maxHeight: SCREEN_HEIGHT * 0.55 },
  bodyContent: { paddingHorizontal: 24, paddingVertical: 16 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: theme.border },
});
