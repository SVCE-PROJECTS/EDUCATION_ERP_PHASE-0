// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAcademicYear, updateAcademicYear, fetchDepartments, createDepartment, setDepartmentActive,
} from '../services/settingsService';

export const useAcademicYear = () => useQuery({
  queryKey: ['settings', 'academic-year'],
  queryFn: fetchAcademicYear,
});

export const useUpdateAcademicYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => updateAcademicYear(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'academic-year'] });
    },
  });
};

export const useDepartments = () => useQuery({
  queryKey: ['settings', 'departments'],
  queryFn: fetchDepartments,
});

export const useCreateDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createDepartment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'departments'] });
    },
  });
};

export const useSetDepartmentActive = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }) => setDepartmentActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'departments'] });
    },
  });
};
