// @ts-nocheck
import React from 'react';
import {
  View, StyleSheet, ScrollView, Image, Platform, Linking,
} from 'react-native';
import {
  Portal, Modal, Text, IconButton,
} from 'react-native-paper';
import { useTheme } from '../../context/ThemeContext';
import {
  spacing, radius, typography,
} from '../../theme';

const isImageUrl = (url = '') => /\.(jpe?g|png|gif|webp)$/i.test(url);

// documentUrl must be an ABSOLUTE url (include the backend origin), not the
// relative "/uploads/xxx" path stored in the database.
const DocumentViewerModal = ({
  visible, onDismiss, documentUrl, title = 'Supporting Document',
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  if (!documentUrl) return null;
  const isImage = isImageUrl(documentUrl);

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <IconButton icon="close" size={20} onPress={onDismiss} />
        </View>

        {Platform.OS === 'web' ? (
          // Real browser <iframe>: renders PDFs and images natively with
          // built-in scroll/zoom, no extra native dependency needed.
          React.createElement('iframe', {
            src: documentUrl,
            title: 'document-preview',
            style: {
              width: '100%', height: '75vh', border: 'none', borderRadius: 8,
            },
          })
        ) : isImage ? (
          <ScrollView
            style={styles.nativeScroll}
            minimumZoomScale={1}
            maximumZoomScale={3}
          >
            <Image source={{ uri: documentUrl }} style={styles.nativeImage} resizeMode="contain" />
          </ScrollView>
        ) : (
          <View style={styles.fallback}>
            <Text style={styles.fallbackText}>
              PDF preview isn&apos;t available in-app on this device yet.
            </Text>
            <Text style={styles.link} onPress={() => Linking.openURL(documentUrl)}>
              Open document
            </Text>
          </View>
        )}
      </Modal>
    </Portal>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    margin: spacing.xl,
    borderRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  nativeScroll: {
    maxHeight: 500,
  },
  nativeImage: {
    width: '100%',
    height: 500,
  },
  fallback: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  fallbackText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  link: {
    ...typography.bodyBold,
    color: colors.primary,
  },
});

export default DocumentViewerModal;
