import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ListRenderItemInfo,
} from 'react-native';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { Plus } from '../../components/icons';
import { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import SearchBar from '../ui/SearchBar';
import Pagination from '../ui/Pagination';
import ConfirmDialog from '../ui/ConfirmDialog';
import ActivityFormModal, { FieldDescriptor } from './ActivityFormModal';
import ActivityCard, { ActivityStudent } from './ActivityCard';
import { colors, ThemeColors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useDebounce } from '../../hooks/useDebounce';
import { Pagination as PaginationMeta } from '../../types';

const LIMIT = 50;

interface ActivityItem { id: string | number; [key: string]: any }
interface ListResult<T> { data?: T[]; pagination?: PaginationMeta }
interface MutationOptions { onSuccess?: () => void }

export interface ActivityListScreenProps<T extends ActivityItem = ActivityItem> {
  title: string;
  accentColor?: string;
  icon?: React.ComponentType<any>;
  useListHook: (params: Record<string, unknown>) => UseQueryResult<ListResult<T>> & { isFetching: boolean; refetch: () => void };
  useCreateHook: (options: MutationOptions) => UseMutationResult<any, any, any>;
  useUpdateHook: (id: string, options: MutationOptions) => UseMutationResult<any, any, any>;
  useDeleteHook: (options: MutationOptions) => UseMutationResult<any, any, any>;
  fields: FieldDescriptor[];
  getGroupKey?: (item: T) => string;
  getStudents?: (item: T) => ActivityStudent[];
  renderCard?: (args: {
    item: T;
    // FIXED: previously only the first raw row in a group was ever exposed to
    // renderCard — every other student's own row (its real activity_id) was
    // discarded once merged into the combined `students` display list, so
    // there was no way to edit or delete an individual student's record.
    // `items` carries every raw row in the group so callers can map a
    // displayed student back to the specific row that represents them.
    items: T[];
    students: ActivityStudent[];
    onEdit: (item: T) => void;
    onDelete: (item: T) => void;
  }) => React.ReactElement;
}

function uniqueStudents(students: ActivityStudent[]) {
  const seen = new Set<string>();
  return students.filter((student) => {
    const key = String(student.id ?? student.usn ?? `${student.name}|${student.semester}|${student.section}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function ActivityListScreen<T extends ActivityItem = ActivityItem>({
  title, accentColor, icon: Icon, useListHook, useCreateHook,
  useUpdateHook, useDeleteHook, fields, getGroupKey, getStudents, renderCard,
}: ActivityListScreenProps<T>) {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  const accent = accentColor ?? theme.primary;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 350);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<T | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  const params = { page, limit: LIMIT, search: debouncedSearch || undefined };
  const { data, isLoading, isFetching, refetch } = useListHook(params);
  const rawItems: T[] = data?.data || [];
  const pagination = (data?.pagination || {}) as Partial<PaginationMeta>;

  const groups = useMemo(() => {
    const map = new Map<string, { item: T; items: T[]; students: ActivityStudent[] }>();
    rawItems.forEach((item) => {
      const key = getGroupKey ? getGroupKey(item) : String(item.id);
      const existing = map.get(key);
      const extracted = getStudents ? getStudents(item) : [];
      if (!existing) map.set(key, { item, items: [item], students: extracted });
      else {
        existing.items.push(item);
        existing.students = uniqueStudents([...existing.students, ...extracted]);
      }
    });
    return Array.from(map.values());
  }, [rawItems, getGroupKey, getStudents]);

  const createMutation = useCreateHook({ onSuccess: () => { setFormOpen(false); setPage(1); } });
  const updateMutation = useUpdateHook(
    // The hook must be called unconditionally on every render (rules of
    // hooks), even while no item is being edited — the id is only actually
    // used once the edit form is submitted (updateMutation.mutate below),
    // by which point editItem is guaranteed to be set. This cast reflects
    // that; it does not change runtime behavior.
    (editItem?.id?.toString() as string) ?? '',
    { onSuccess: () => { setFormOpen(false); setEditItem(null); } },
  );
  const deleteMutation = useDeleteHook({ onSuccess: () => setDeleteTarget(null) });

  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);
  const openAdd = useCallback(() => { setEditItem(null); setFormOpen(true); }, []);
  const openEdit = useCallback((item: T) => { setEditItem(item); setFormOpen(true); }, []);
  const openDelete = useCallback((item: T) => setDeleteTarget(item), []);

  const handleSubmit = (formData: Record<string, unknown>) => {
    if (editItem) updateMutation.mutate(formData);
    else createMutation.mutate(formData);
  };

  const renderItem = useCallback(({ item }: ListRenderItemInfo<{ item: T; items: T[]; students: ActivityStudent[] }>) => {
    if (renderCard) return renderCard({ item: item.item, items: item.items, students: item.students, onEdit: openEdit, onDelete: openDelete });
    return (
      <ActivityCard
        title={String(item.item.title ?? 'Activity')}
        students={item.students}
        accentColor={accent}
        onEdit={() => openEdit(item.item)}
        onDelete={() => openDelete(item.item)}
      />
    );
  }, [renderCard, openEdit, openDelete, accent]);

  const ListHeader = (
    <View style={s.filterRow}>
      <SearchBar value={search} onChange={handleSearch} placeholder="Search..." style={s.search} />
      <TouchableOpacity onPress={openAdd} style={[s.addBtn, { backgroundColor: accent }]} activeOpacity={0.85}>
        <Plus size={18} color={colors.white} />
      </TouchableOpacity>
    </View>
  );

  const ListEmpty = !isLoading ? (
    <Animated.View entering={FadeInUp.delay(100).duration(400)} style={s.empty}>
      <Text style={s.emptyText}>{debouncedSearch ? `No results for "${debouncedSearch}"` : `No ${title.toLowerCase()} recorded yet.`}</Text>
      <TouchableOpacity onPress={openAdd} style={[s.emptyAddBtn, { borderColor: accent }]}>
        <Text style={[s.emptyAddText, { color: accent }]}>+ Add First Record</Text>
      </TouchableOpacity>
    </Animated.View>
  ) : null;

  const ListFooter = (pagination.totalPages ?? 0) > 1 ? (
    <Pagination pagination={{ ...(pagination as PaginationMeta), page }} onPageChange={setPage} />
  ) : null;

  return (
    <View style={s.root}>
      <Animated.View entering={FadeIn.duration(300)} style={s.header}>
        {Icon && <Icon size={20} color={accent} />}
        <Text style={s.title}>{title}</Text>
        {!isLoading && <Text style={s.count}>{pagination.total ?? groups.length}</Text>}
      </Animated.View>

      <FlatList
        data={isLoading ? [] : groups}
        keyExtractor={(group) => String(group.item.id)}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={accent} colors={[accent]} />}
      />

      <ActivityFormModal
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditItem(null); }}
        onSubmit={handleSubmit}
        title={editItem ? `Edit ${title}` : `Add ${title}`}
        fields={fields}
        initialValues={editItem as Record<string, unknown> | null}
        loading={createMutation.isPending || updateMutation.isPending}
        accentColor={accent}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget?.id != null && deleteMutation.mutate(String(deleteTarget.id))}
        loading={deleteMutation.isPending}
        title="Delete Record"
        message={`Are you sure you want to delete this ${title.toLowerCase()} record? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </View>
  );
}

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: theme.textPrimary },
  count: { fontSize: 12, fontWeight: '600', color: colors.white, backgroundColor: theme.textMuted, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  search: { flex: 1 },
  addBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingBottom: 32 },
  empty: { padding: 40, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, color: theme.textMuted, textAlign: 'center' },
  emptyAddBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  emptyAddText: { fontSize: 13, fontWeight: '600' },
});
