/**
 * Faculty Portal — Document Upload
 * Faculty's own uploaded documents (ID proof, certificates, etc.), backed by
 * GET/POST/DELETE /api/faculty/me/documents — uploads immediately on pick
 * (no local staging), so the HOD can see them right away too.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UploadCloud, FileText, X } from '../icons';
import { colors, shadows, ThemeColors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { documentService, FacultyDocument } from '../../services/document.service';
import { resolveFileUrl } from '../../services/api';
import Toast from '../../services/toast';

const formatSize = (bytes?: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function DocumentUpload() {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  const qc = useQueryClient();
  const [pickError, setPickError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['my-documents'],
    queryFn: documentService.getMine,
  });

  const documents: FacultyDocument[] = (data as any)?.data ?? [];

  const uploadMutation = useMutation({
    mutationFn: documentService.upload,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-documents'] });
      Toast.show({ type: 'success', text1: 'Document uploaded' });
    },
    onError: (err: any) => {
      Toast.show({
        type: 'error',
        text1: 'Upload failed',
        text2: err?.response?.data?.message ?? 'Please try again.',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: documentService.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-documents'] });
      Toast.show({ type: 'success', text1: 'Document deleted' });
    },
    onError: (err: any) => {
      Toast.show({
        type: 'error',
        text1: 'Delete failed',
        text2: err?.response?.data?.message ?? 'Please try again.',
      });
    },
  });

  const handlePick = async () => {
    setPickError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      result.assets.forEach((asset) => {
        uploadMutation.mutate({
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType,
          file: (asset as any).file ?? null,
        });
      });
    } catch (err: any) {
      setPickError(err?.message || 'Unable to select document.');
    }
  };

  const handleOpen = (doc: FacultyDocument) => {
    const url = resolveFileUrl(doc.filePath);
    if (url) Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={s.card}>
      <Text style={s.title}>DOCUMENTS</Text>
      <Text style={s.hint}>Attach any supporting documents — ID proof, certificates, or other records.</Text>

      <TouchableOpacity
        style={s.dropzone}
        onPress={handlePick}
        activeOpacity={0.7}
        disabled={uploadMutation.isPending}
      >
        {uploadMutation.isPending ? (
          <ActivityIndicator color={theme.primary} />
        ) : (
          <UploadCloud size={24} color={theme.textMuted} />
        )}
        <Text style={s.dropzoneText}>
          {uploadMutation.isPending ? 'Uploading…' : 'Tap to select a file'}
        </Text>
        <Text style={s.dropzoneHint}>PDF, JPG or PNG up to 10MB</Text>
      </TouchableOpacity>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 4 }} color={theme.primary} />
      ) : documents.length > 0 ? (
        <View style={s.list}>
          {documents.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={s.docRow}
              onPress={() => handleOpen(doc)}
              activeOpacity={0.75}
            >
              <FileText size={16} color={theme.primary} />
              <View style={s.docInfo}>
                <Text style={s.docName} numberOfLines={1}>{doc.documentName}</Text>
                <Text style={s.docSize}>
                  {formatSize(doc.fileSize)}{doc.fileSize ? ' · ' : ''}{formatDate(doc.uploadedAt)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => deleteMutation.mutate(doc.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={`Remove ${doc.documentName}`}
                disabled={deleteMutation.isPending}
              >
                <X size={15} color={theme.textMuted} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {!!pickError && <Text style={s.error}>{pickError}</Text>}
    </View>
  );
}

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 20,
    gap: 10,
    ...shadows.card,
  },
  title: { fontSize: 10, fontWeight: '600', color: theme.textSecondary, letterSpacing: 0.8 },
  hint: { fontSize: 12, color: theme.textSecondary, lineHeight: 17, marginTop: -4 },
  dropzone: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.border,
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.background,
  },
  dropzoneText: { fontSize: 13, fontWeight: '500', color: theme.textSecondary },
  dropzoneHint: { fontSize: 11, color: theme.textMuted },
  list: { gap: 8 },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.primarySoft,
  },
  docInfo: { flex: 1, minWidth: 0 },
  docName: { fontSize: 12, fontWeight: '500', color: theme.textPrimary },
  docSize: { fontSize: 10, color: theme.textSecondary, marginTop: 1 },
  error: { fontSize: 12, color: colors.danger },
});
