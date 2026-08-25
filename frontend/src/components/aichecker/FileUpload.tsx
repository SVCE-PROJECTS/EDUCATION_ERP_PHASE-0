import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../theme/colors';

export interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
}

interface FileUploadProps {
  file1: PickedFile | null;
  setFile1: (f: PickedFile | null) => void;
  file2: PickedFile | null;
  setFile2: (f: PickedFile | null) => void;
}

interface FileSlotProps {
  label: string;
  file: PickedFile | null;
  setFile: (f: PickedFile | null) => void;
  slotNumber: 1 | 2;
}

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileSlot({ label, file, setFile, slotNumber }: FileSlotProps) {
  const [picking, setPicking] = useState(false);

  const handlePick = async () => {
    setPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];

      setFile({
        uri:      asset.uri,
        name:     asset.name,
        mimeType: asset.mimeType ?? undefined,
        size:     asset.size ?? undefined,
      });
    } catch (err: any) {
      Alert.alert('Pick Failed', err.message ?? 'Could not open file picker.');
    } finally {
      setPicking(false);
    }
  };

  const isPDF = file?.name.toLowerCase().endsWith('.pdf');

  return (
    <View style={styles.slot}>
      {/* Label row */}
      <View style={styles.labelRow}>
        <View style={styles.slotBadge}>
          <Text style={styles.slotBadgeText}>{slotNumber}</Text>
        </View>
        <Text style={styles.slotLabel}>{label}</Text>
      </View>

      {/* Pick button */}
      <TouchableOpacity
        style={[styles.pickBtn, file && styles.pickBtnDone]}
        onPress={handlePick}
        disabled={picking}
        activeOpacity={0.75}
      >
        {picking ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Ionicons
            name={file ? 'document-text' : 'document-attach-outline'}
            size={20}
            color={file ? Colors.success : Colors.primary}
          />
        )}
        <Text style={[styles.pickBtnText, file ? { color: Colors.success } : undefined]}>
          {picking ? 'Opening...' : file ? 'Change File' : 'Choose File (.txt / .pdf)'}
        </Text>
      </TouchableOpacity>

      {/* Selected file info */}
      {file && (
        <View style={styles.fileInfo}>
          <View style={[
            styles.fileTypeBadge,
            { backgroundColor: isPDF ? Colors.dangerLight : Colors.primaryLight },
          ]}>
            <Text style={[
              styles.fileTypeText,
              { color: isPDF ? Colors.danger : Colors.primary },
            ]}>
              {isPDF ? 'PDF' : 'TXT'}
            </Text>
          </View>
          <View style={styles.fileDetails}>
            <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
            {file.size ? <Text style={styles.fileSize}>{formatSize(file.size)}</Text> : null}
          </View>
          <TouchableOpacity
            onPress={() => setFile(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function FileUpload({ file1, setFile1, file2, setFile2 }: FileUploadProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Upload Assignments</Text>
      <Text style={styles.subheading}>
        Supported: .txt · .pdf — save files to device storage for best results
      </Text>
      <FileSlot label="Assignment 1" file={file1} setFile={setFile1} slotNumber={1} />
      <View style={styles.divider} />
      <FileSlot label="Assignment 2" file={file2} setFile={setFile2} slotNumber={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 18, marginBottom: 14,
    elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5,
  },
  heading:       { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  subheading:    { fontSize: 11, color: Colors.textMuted, marginBottom: 16, lineHeight: 17 },
  slot:          { marginBottom: 4 },
  labelRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  slotBadge:     { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  slotBadgeText: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  slotLabel:     { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  pickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: Colors.primary,
    borderStyle: 'dashed', borderRadius: 10, padding: 12,
  },
  pickBtnDone:  { borderStyle: 'solid', borderColor: Colors.success, backgroundColor: Colors.successLight },
  pickBtnText:  { color: Colors.primary, fontWeight: '600', fontSize: 14, flex: 1 },
  fileInfo:     { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: Colors.background, borderRadius: 8, padding: 10, gap: 10 },
  fileTypeBadge:{ borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  fileTypeText: { fontSize: 11, fontWeight: '800' },
  fileDetails:  { flex: 1 },
  fileName:     { fontSize: 12, fontWeight: '600', color: Colors.textPrimary },
  fileSize:     { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  divider:      { height: 1, backgroundColor: Colors.border, marginVertical: 14 },
});
