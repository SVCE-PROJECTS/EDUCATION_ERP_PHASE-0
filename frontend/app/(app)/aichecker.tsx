import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import stringSimilarity from 'string-similarity';
import { extractTextFromFile } from '../../src/utils/pdfUtils';
import PageHeader       from '../../src/components/common/PageHeader';
import FileUpload       from '../../src/components/aichecker/FileUpload';
import SimilarityResult from '../../src/components/aichecker/SimilarityResult';
import AnalysisReport   from '../../src/components/aichecker/AnalysisReport';
import MatchedSentences from '../../src/components/aichecker/MatchedSentences';
import DownloadReport   from '../../src/components/aichecker/DownloadReport';
import Colors from '../../src/theme/colors';

interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string;
}

function cleanText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function AICheckerScreen() {
  const [file1,      setFile1]      = useState<PickedFile | null>(null);
  const [file2,      setFile2]      = useState<PickedFile | null>(null);
  const [score,      setScore]      = useState<number | null>(null);
  const [text1,      setText1]      = useState('');
  const [text2,      setText2]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [statusMsg,  setStatusMsg]  = useState('');

  const handleCheck = async () => {
    if (!file1 || !file2) {
      Alert.alert('Missing Files', 'Please select both assignment files before analysing.');
      return;
    }
    setScore(null); setText1(''); setText2('');
    setLoading(true);
    try {
      setStatusMsg('Extracting text from Assignment 1...');
      let raw1: string;
      try { raw1 = await extractTextFromFile(file1); }
      catch (e: any) { Alert.alert('Extraction Failed', `Could not read "${file1.name}".\n${e.message}`); return; }

      setStatusMsg('Extracting text from Assignment 2...');
      let raw2: string;
      try { raw2 = await extractTextFromFile(file2); }
      catch (e: any) { Alert.alert('Extraction Failed', `Could not read "${file2.name}".\n${e.message}`); return; }

      if (!raw1 || raw1.trim().length < 5) { Alert.alert('Empty File', `"${file1.name}" appears empty.`); return; }
      if (!raw2 || raw2.trim().length < 5) { Alert.alert('Empty File', `"${file2.name}" appears empty.`); return; }

      setStatusMsg('Comparing submissions...');
      const cleaned1 = cleanText(raw1);
      const cleaned2 = cleanText(raw2);
      setText1(cleaned1);
      setText2(cleaned2);
      const similarity = stringSimilarity.compareTwoStrings(cleaned1, cleaned2);
      setScore(Math.round(similarity * 100));
      setStatusMsg('');
    } catch (err) {
      console.error('AI Checker error:', err);
      Alert.alert('Error', 'Unexpected error during analysis. Please try again.');
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  const handleReset = () => {
    setFile1(null); setFile2(null);
    setScore(null); setText1(''); setText2(''); setStatusMsg('');
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title="AI Similarity Checker"
        subtitle="Upload .txt or .pdf files to compare"
        iconName="hardware-chip-outline"
      />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>

          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>
              📌 Upload two assignment files to detect plagiarism.
              Both .txt and .pdf formats are supported.
            </Text>
          </View>

          <FileUpload
            file1={file1} setFile1={setFile1}
            file2={file2} setFile2={setFile2}
          />

          <TouchableOpacity
            style={[styles.analyzeBtn, loading && { opacity: 0.65 }]}
            onPress={handleCheck}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={Colors.white} size="small" />
                <Text style={[styles.analyzeBtnText, { marginLeft: 10 }]}>
                  {statusMsg || 'Analysing...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.analyzeBtnText}>🔍  Analyze Assignments</Text>
            )}
          </TouchableOpacity>

          {score !== null && (
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Text style={styles.resetBtnText}>↺  Start New Analysis</Text>
            </TouchableOpacity>
          )}

          <SimilarityResult score={score} />
          <AnalysisReport score={score} file1={file1} file2={file2} />
          <DownloadReport score={score} file1={file1} file2={file2} />
          <MatchedSentences text1={text1} text2={text2} />
          <View style={{ height: 30 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.background },
  scroll:     { flex: 1 },
  inner:      { padding: 16, paddingBottom: 30 },
  infoBanner: {
    backgroundColor: Colors.primaryLight, borderRadius: 10, padding: 12,
    marginBottom: 14, borderLeftWidth: 4, borderLeftColor: Colors.primary,
  },
  infoText:       { fontSize: 13, color: Colors.primary, lineHeight: 20 },
  analyzeBtn: {
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginBottom: 10, elevation: 3,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6,
  },
  analyzeBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  loadingRow:     { flexDirection: 'row', alignItems: 'center' },
  resetBtn: {
    backgroundColor: Colors.background, borderRadius: 10, paddingVertical: 11,
    alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: Colors.border,
  },
  resetBtnText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
});
