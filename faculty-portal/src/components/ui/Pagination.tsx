// Faculty Portal — Pagination — mirrors hod-portal
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight } from '../icons';
import { colors, primaryScale, ThemeColors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { Pagination as PaginationMeta } from '../../types';

export interface PaginationProps {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
}

export default function Pagination({ pagination, onPageChange }: PaginationProps) {
  const { colors: theme } = useTheme();
  const styles = getStyles(theme);
  const { page, totalPages, total, limit } = pagination;
  if (!totalPages || totalPages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const pages: number[] = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) pages.push(i);

  return (
    <View style={styles.container}>
      <Text style={styles.count}>
        <Text style={styles.countBold}>{start}–{end}</Text>
        {' of '}
        <Text style={styles.countBold}>{total}</Text>
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.btnRow}>
        <PageArrow onPress={() => onPageChange(page - 1)} disabled={page === 1}
          icon={<ChevronLeft size={16} color={page === 1 ? theme.border : theme.textSecondary} />} styles={styles} />
        {pages[0] > 1 && (
          <>
            <PageBtn n={1} current={page} onPress={onPageChange} styles={styles} />
            {pages[0] > 2 && <Text style={styles.ellipsis}>…</Text>}
          </>
        )}
        {pages.map((n) => <PageBtn key={n} n={n} current={page} onPress={onPageChange} styles={styles} />)}
        {pages[pages.length - 1] < totalPages && (
          <>
            {pages[pages.length - 1] < totalPages - 1 && <Text style={styles.ellipsis}>…</Text>}
            <PageBtn n={totalPages} current={page} onPress={onPageChange} styles={styles} />
          </>
        )}
        <PageArrow onPress={() => onPageChange(page + 1)} disabled={page === totalPages}
          icon={<ChevronRight size={16} color={page === totalPages ? theme.border : theme.textSecondary} />} styles={styles} />
      </ScrollView>
    </View>
  );
}

function PageBtn({ n, current, onPress, styles }: { n: number; current: number; onPress: (n: number) => void; styles: ReturnType<typeof getStyles> }) {
  const isActive = n === current;
  return (
    <TouchableOpacity onPress={() => onPress(n)} style={[styles.pageBtn, isActive && styles.pageBtnActive]}
      disabled={isActive} activeOpacity={0.7} accessibilityLabel={`Page ${n}`}>
      <Text style={[styles.pageBtnText, isActive && styles.pageBtnTextActive]}>{n}</Text>
    </TouchableOpacity>
  );
}

function PageArrow({ onPress, disabled, icon, styles }: { onPress: () => void; disabled?: boolean; icon: React.ReactNode; styles: ReturnType<typeof getStyles> }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={[styles.pageBtn, disabled && styles.pageBtnDisabled]} activeOpacity={0.7}>
      {icon}
    </TouchableOpacity>
  );
}

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.border, flexWrap: 'wrap', gap: 8 },
  count: { fontSize: 12, color: theme.textSecondary },
  countBold: { fontWeight: '600', color: theme.textPrimary },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  pageBtn: { minWidth: 32, height: 32, paddingHorizontal: 6, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pageBtnActive: { backgroundColor: primaryScale[600] },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontSize: 13, fontWeight: '500', color: theme.textSecondary },
  pageBtnTextActive: { color: colors.white, fontWeight: '700' },
  ellipsis: { fontSize: 13, color: theme.textMuted, paddingHorizontal: 4, alignSelf: 'center' },
});
