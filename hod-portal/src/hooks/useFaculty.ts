import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from '../services/toast';
import { facultyService, roleService, FacultyListParams } from '../services/faculty.service';

// ─── helpers ──────────────────────────────────────────────────────────────────

const ok = (text1: string, text2?: string) => Toast.show({ type: 'success', text1, text2 });
const err = (text1: string, text2?: string) => Toast.show({ type: 'error', text1, text2 });

interface MutationOptions<T = unknown> {
  onSuccess?: (data: T) => void;
  onError?: (error: any) => void;
}

// ─── Faculty list ─────────────────────────────────────────────────────────────

export function useFacultyList(params?: FacultyListParams) {
  return useQuery({
    queryKey: ['faculty', params],
    queryFn: () => facultyService.getAll(params),
    placeholderData: (prev: any) => prev,
    staleTime: 30_000,
  });
}

// ─── Single faculty ───────────────────────────────────────────────────────────

export function useFaculty(id?: string) {
  return useQuery({
    queryKey: ['faculty', id],
    queryFn: () => facultyService.getById(id as string),
    enabled: !!id,
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────

export function useCreateFaculty(options: MutationOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: facultyService.create,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['faculty'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      ok('Faculty created successfully');
      options.onSuccess?.(data);
    },
    onError: (e: any) => {
      err('Create failed', e.response?.data?.message);
      options.onError?.(e);
    },
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export function useUpdateFaculty(id: string, options: MutationOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => facultyService.update(id, formData),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['faculty'] });
      qc.invalidateQueries({ queryKey: ['faculty', id] });
      ok('Faculty updated successfully');
      options.onSuccess?.(data);
    },
    onError: (e: any) => {
      err('Update failed', e.response?.data?.message);
      options.onError?.(e);
    },
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export function useDeleteFaculty(options: MutationOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => facultyService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faculty'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      ok('Faculty deleted');
      options.onSuccess?.(undefined as any);
    },
    onError: (e: any) => {
      err('Delete failed', e.response?.data?.message);
    },
  });
}

// ─── Sync coordinator roles ───────────────────────────────────────────────────

export function useSyncRoles(facultyId: string, options: MutationOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ add, remove }: { add: string[]; remove: string[] }) =>
      roleService.sync(facultyId, { add, remove }),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['faculty'] });
      qc.invalidateQueries({ queryKey: ['faculty', facultyId] });
      const r = data?.data?.results;
      if (r?.added?.length) ok('Role assigned');
      if (r?.removed?.length) ok('Role removed');
      options.onSuccess?.(data);
    },
    onError: (e: any) => {
      err('Role update failed', e.response?.data?.message);
    },
  });
}
