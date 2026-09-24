/**
 * Faculty Portal — Document Upload
 * A staging area on My Profile where faculty can attach supporting
 * documents (ID proof, certificates, etc.) before submitting them.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { UploadCloud, FileText, X } from '../icons';
import { colors, shadows, ThemeColors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';

interface PickedDoc {
  uri: string;
  name: string;
  size?: number | null;
}

const formatSize = (bytes?: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function DocumentUpload() {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  const [docs, setDocs] = useState<PickedDoc[]>([]);
  const [error, setError] = useState('');

  const handlePick = async () => {
    setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (!result.canceled) {
        const picked = result.assets.map((a) => ({ uri: a.uri, name: a.name, size: a.size }));
        setDocs((prev) => [...prev, ...picked.filter((p) => !prev.some((d) => d.uri === p.uri))]);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to select document.');
    }
  };

  const removeDoc = (uri: string) => setDocs((prev) => prev.filter((d) => d.uri !== uri));

  return (
    <View style={s.card}>
      <Text style={s.title}>DOCUMENTS</Text>
      <Text style={s.hint}>Attach any supporting documents — ID proof, certificates, or other records.</Text>

      <TouchableOpacity style={s.dropzone} onPress={handlePick} activeOpacity={0.7}>
        <UploadCloud size={24} color={theme.textMuted} />
        <Text style={s.dropzoneText}>Tap to select a file</Text>
        <Text style={s.dropzoneHint}>PDF, JPG or PNG up to 10MB</Text>
      </TouchableOpacity>

      {docs.length > 0 && (
        <View style={s.list}>
          {docs.map((doc) => (
            <View key={doc.uri} style={s.docRow}>
              <FileText size={16} color={theme.primary} />
              <View style={s.docInfo}>
                <Text style={s.docName} numberOfLines={1}>{doc.name}</Text>
                {!!doc.size && <Text style={s.docSize}>{formatSize(doc.size)}</Text>}
              </View>
              <TouchableOpacity onPress={() => removeDoc(doc.uri)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel={`Remove ${doc.name}`}>
                <X size={15} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {!!error && <Text style={s.error}>{error}</Text>}
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
