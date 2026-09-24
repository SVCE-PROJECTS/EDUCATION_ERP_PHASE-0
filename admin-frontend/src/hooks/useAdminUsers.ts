// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminUsers, createAdminUser, setAdminUserStatus,
} from '../services/adminUserService';

export const useAdminUsers = () => useQuery({
  queryKey: ['admin-users'],
  queryFn: fetchAdminUsers,
});

export const useCreateAdminUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createAdminUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
};

export const useSetAdminUserStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => setAdminUserStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
};
