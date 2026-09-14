// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchFaculty, fetchFacultyById, createFaculty, updateFaculty, deleteFaculty,
} from '../services/facultyService';

export const useFaculty = (filters) => useQuery({
  queryKey: ['faculty', filters],
  queryFn: () => fetchFaculty(filters),
  keepPreviousData: true,
});

export const useFacultyMember = (id) => useQuery({
  queryKey: ['facultyMember', id],
  queryFn: () => fetchFacultyById(id),
  enabled: !!id,
});

export const useCreateFaculty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (form) => createFaculty(form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['faculty'] }),
  });
};

export const useUpdateFaculty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, form }) => updateFaculty(id, form),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['faculty'] });
      queryClient.invalidateQueries({ queryKey: ['facultyMember', id] });
    },
  });
};

export const useDeleteFaculty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteFaculty(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['faculty'] }),
  });
};
