// @ts-nocheck
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { transferStudent, fetchTransferHistory, fetchAllTransfers } from '../services/transferService';

export const useTransferStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => transferStudent(payload),
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student', payload.studentId] });
    },
  });
};

export const useTransferHistory = (studentId) => useQuery({
  queryKey: ['transferHistory', studentId],
  queryFn: () => fetchTransferHistory(studentId),
  enabled: !!studentId,
});

export const useAllTransfers = () => useQuery({
  queryKey: ['transfers', 'all'],
  queryFn: fetchAllTransfers,
});
