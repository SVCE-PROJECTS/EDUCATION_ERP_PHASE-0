// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchNonTeachingStaff, fetchNonTeachingStaffById,
  createNonTeachingStaff, updateNonTeachingStaff, deleteNonTeachingStaff,
} from '../services/nonTeachingStaffService';

export const useNonTeachingStaff = (filters) => useQuery({
  queryKey: ['nonTeachingStaff', filters],
  queryFn: () => fetchNonTeachingStaff(filters),
  keepPreviousData: true,
});

export const useNonTeachingStaffMember = (id) => useQuery({
  queryKey: ['nonTeachingStaffMember', id],
  queryFn: () => fetchNonTeachingStaffById(id),
  enabled: !!id,
});

export const useCreateNonTeachingStaff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (form) => createNonTeachingStaff(form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nonTeachingStaff'] }),
  });
};

export const useUpdateNonTeachingStaff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, form }) => updateNonTeachingStaff(id, form),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['nonTeachingStaff'] });
      queryClient.invalidateQueries({ queryKey: ['nonTeachingStaffMember', id] });
    },
  });
};

export const useDeleteNonTeachingStaff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteNonTeachingStaff(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nonTeachingStaff'] }),
  });
};
