/**
 * AI Checker / Plagiarism Screen
 *
 * Backend endpoint:
 *   POST /api/ai-checker/extract
 *   - multipart/form-data, field name: "file"
 *   - Accepted: .txt (text/plain), .pdf (application/pdf) — max 10 MB
 *   - Returns: { text: string, filename: string }
 *
 * What the backend does vs what this screen does:
 *   Backend: extracts plain text from a .txt or .pdf file.
 *   Frontend: uploads two files, extracts both texts, then computes
 *             Jaccard similarity client-side via computeSimilarity().
 *
 * We do NOT fake similarity — if extraction fails we show the real error.
 * We do NOT support file types the backend does not accept.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import ScreenLayout from '../components/ScreenLayout';
import CustomButton from '../components/CustomButton';
import Card from '../components/Card';
import LoadingIndicator from '../components/LoadingIndicator';
import { extractTextFromFile, computeSimilarity } from '../services/aiCheckerApi';
import type { CheckerDocument, SimilarityResult } from '../types/aiChecker';
import { colors, spacing, typography, radius } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AIChecker'>;

const EMPTY_DOC: CheckerDocument = {
  uri: '',
  name: '',
  mimeType: '',
  extractedText: null,
  loading: false,
  error: null,
};

const ACCEPT_EXTENSIONS = ['.txt', '.pdf'];
const ACCEPT_TYPES = ['text/plain', 'application/pdf'];

const AICheckerScreen: React.FC<Props> = ({ navigation }) => {
  const [docA, setDocA] = useState<CheckerDocument>({ ...EMPTY_DOC });
  const [docB, setDocB] = useState<CheckerDocument>({ ...EMPTY_DOC });
  const [result, setResult] = useState<SimilarityResult | null>(null);

  const pickFile = async (slot: 'A' | 'B') => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ACCEPT_TYPES,
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (picked.canceled || !picked.assets?.length) return;

      const asset = picked.assets[0];
      const name = asset.name ?? 'file';
      const mimeType = asset.mimeType ?? 'application/octet-stream';
      const uri = asset.uri;

      // Validate extension as extra guard
      const nameLower = name.toLowerCase();
      const isAllowed = ACCEPT_EXTENSIONS.some((ext) => nameLower.endsWith(ext));
      if (!isAllowed) {
        Alert.alert(
          'Unsupported File',
          'Only .txt and .pdf files are supported by the backend.',
        );
        return;
      }

      const doc: CheckerDocument = {
        uri,
        name,
        mimeType,
        extractedText: null,
        loading: true,
        error: null,
      };

      if (slot === 'A') {
        setDocA(doc);
        setResult(null);
      } else {
        setDocB(doc);
        setResult(null);
      }

      // Extract text via backend
      try {
        const response = await extractTextFromFile(uri, name, mimeType);
        const updated: CheckerDocument = {
          ...doc,
          extractedText: response.text,
          loading: false,
        };
        if (slot === 'A') setDocA(updated);
        else setDocB(updated);
      } catch (err: unknown) {
        const message = (err as { message?: string }).message ?? 'Text extraction failed.';
        const failed: CheckerDocument = { ...doc, loading: false, error: message };
        if (slot === 'A') setDocA(failed);
        else setDocB(failed);
      }
    } catch {
      // User cancelled or picker error — silently ignore
    }
  };

  const handleCompare = () => {
    if (!docA.extractedText || !docB.extractedText) return;
    const sim = computeSimilarity(docA.extractedText, docB.extractedText);
    setResult(sim);
  };

  const reset = () => {
    setDocA({ ...EMPTY_DOC });
    setDocB({ ...EMPTY_DOC });
    setResult(null);
  };

  const similarityColor =
    result == null
      ? colors.textSecondary
      : result.label === 'High'
      ? colors.danger
      : result.label === 'Medium'
      ? colors.warning
      : colors.success;

  return (
    <ScreenLayout navigation={navigation} activeScreen="AIChecker">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>AI Similarity Checker</Text>
        <Text style={styles.pageSubtitle}>
          Upload two documents (.txt or .pdf) to compare their text similarity.
        </Text>

        <View style={styles.docsRow}>
          {/* Document A */}
          <DocSlot
            label="Document A"
            doc={docA}
            onPick={() => pickFile('A')}
          />
          {/* Document B */}
          <DocSlot
            label="Document B"
            doc={docB}
            onPick={() => pickFile('B')}
          />
        </View>

        {/* Compare button */}
        {docA.extractedText && docB.extractedText && !result && (
          <CustomButton
            title="Compare Documents"
            onPress={handleCompare}
            style={styles.compareBtn}
          />
        )}

        {/* Result */}
        {result && (
          <Card style={styles.resultCard}>
            <Text style={styles.resultLabel}>Similarity Score</Text>
            <Text style={[styles.resultScore, { color: similarityColor }]}>
              {result.similarity}%
            </Text>
            <View style={[styles.resultBadge, { backgroundColor: similarityColor + '22' }]}>
              <Text style={[styles.resultBadgeText, { color: similarityColor }]}>
                {result.label} Similarity
              </Text>
            </View>
            <View style={styles.resultMeta}>
              <Text style={styles.resultMetaText}>
                Doc A: {result.wordCountA} words
              </Text>
              <Text style={styles.resultMetaText}>
                Doc B: {result.wordCountB} words
              </Text>
            </View>
            <Text style={styles.resultNote}>
              Similarity is computed using Jaccard token overlap between the
              extracted texts. This is an approximation — always review manually.
            </Text>
            <CustomButton
              title="Reset"
              onPress={reset}
              variant="secondary"
              style={styles.resetBtn}
            />
          </Card>
        )}

        {/* Supported formats note */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️  Supported Formats</Text>
          <Text style={styles.infoText}>
            • <Text style={styles.infoBold}>.pdf</Text> — text is extracted from PDF content{'\n'}
            • <Text style={styles.infoBold}>.txt</Text> — raw plain text{'\n'}
            • Max file size: <Text style={styles.infoBold}>10 MB</Text> per file{'\n'}
            • Other formats (Word, Excel, images) are not supported by the backend
          </Text>
        </Card>
      </ScrollView>
    </ScreenLayout>
  );
};

// ─── Doc slot sub-component ───────────────────────────────────────────────────

interface DocSlotProps {
  label: string;
  doc: CheckerDocument;
  onPick: () => void;
}

const DocSlot: React.FC<DocSlotProps> = ({ label, doc, onPick }) => (
  <View style={slotStyles.wrap}>
    <Text style={slotStyles.label}>{label}</Text>
    <TouchableOpacity
      style={[
        slotStyles.dropzone,
        doc.uri ? slotStyles.dropzoneActive : null,
        doc.error ? slotStyles.dropzoneError : null,
      ]}
      onPress={onPick}
      accessibilityRole="button"
      accessibilityLabel={`Pick file for ${label}`}
    >
      {doc.loading ? (
        <LoadingIndicator message="Extracting…" />
      ) : doc.error ? (
        <>
          <Text style={slotStyles.errorIcon}>⚠️</Text>
          <Text style={slotStyles.errorText} numberOfLines={3}>{doc.error}</Text>
          <Text style={slotStyles.retapText}>Tap to retry</Text>
        </>
      ) : doc.extractedText ? (
        <>
          <Text style={slotStyles.successIcon}>✅</Text>
          <Text style={slotStyles.fileName} numberOfLines={2}>{doc.name}</Text>
          <Text style={slotStyles.wordCount}>
            {doc.extractedText.split(/\s+/).filter(Boolean).length} words extracted
          </Text>
          <Text style={slotStyles.retapText}>Tap to change</Text>
        </>
      ) : (
        <>
          <Text style={slotStyles.plusIcon}>📄</Text>
          <Text style={slotStyles.pickText}>Tap to select</Text>
          <Text style={slotStyles.formatHint}>.txt or .pdf only</Text>
        </>
      )}
    </TouchableOpacity>
  </View>
);

const slotStyles = StyleSheet.create({
  wrap: { flex: 1 },
  label: { ...typography.smallBold, color: colors.textPrimary, marginBottom: spacing.xs },
  dropzone: {
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    backgroundColor: colors.surface,
  },
  dropzoneActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  dropzoneError: { borderColor: colors.danger, backgroundColor: colors.dangerBg },
  plusIcon: { fontSize: 32, marginBottom: spacing.sm },
  pickText: { ...typography.bodyBold, color: colors.primary },
  formatHint: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  successIcon: { fontSize: 28, marginBottom: spacing.sm },
  fileName: { ...typography.smallBold, color: colors.primaryDark, textAlign: 'center' },
  wordCount: { ...typography.caption, color: colors.success, marginTop: 2 },
  retapText: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  errorIcon: { fontSize: 28, marginBottom: spacing.sm },
  errorText: { ...typography.small, color: colors.danger, textAlign: 'center' },
});

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  pageTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.xs },
  pageSubtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl },
  docsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  compareBtn: { marginBottom: spacing.lg },
  resultCard: { alignItems: 'center', marginBottom: spacing.lg },
  resultLabel: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.sm },
  resultScore: { fontSize: 64, fontWeight: '700', lineHeight: 72 },
  resultBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    marginVertical: spacing.md,
  },
  resultBadgeText: { ...typography.bodyBold },
  resultMeta: { flexDirection: 'row', gap: spacing.xl, marginBottom: spacing.md },
  resultMetaText: { ...typography.small, color: colors.textSecondary },
  resultNote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  resetBtn: { width: '100%' },
  infoCard: { backgroundColor: colors.infoBg },
  infoTitle: { ...typography.bodyBold, color: colors.info, marginBottom: spacing.sm },
  infoText: { ...typography.small, color: colors.textSecondary, lineHeight: 22 },
  infoBold: { fontWeight: '700' },
});

export default AICheckerScreen;
