// @ts-nocheck
/**
 * Meeting Management Hooks
 * React Query hooks for meeting data management
 */

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  approveMeeting,
  updateAvailability,
  startMeeting,
  completeMeeting,
  getFacultyForInvitation,
  getMeetingParticipants,
  addParticipant,
  removeParticipant,
  uploadDocument,
  getMeetingDocuments,
  deleteDocument,
  saveMeetingMinutes,
  getMeetingMinutes,
  createActionItem,
  getActionItems,
  updateActionItem,
  getTodayMeetings,
  getMeetingNotifications,
  markMeetingNotificationRead,
  Meeting,
  MeetingDetails,
  Faculty,
  MeetingParticipant,
  MeetingDocument,
  ActionItem,
} from '../services/meeting.service';

const formatLocalDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const useLocalToday = () => {
  const [today, setToday] = React.useState(() => formatLocalDate(new Date()));

  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const scheduleNextMidnight = () => {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(() => {
        setToday(formatLocalDate(new Date()));
        scheduleNextMidnight();
      }, Math.max(1000, nextMidnight.getTime() - now.getTime() + 100));
    };
    scheduleNextMidnight();
    return () => clearTimeout(timer);
  }, []);

  return today;
};

// ── Meeting Management ────────────────────────────────────────────────────────

export const useMeetings = (params?: {
  status?: string;
  from?: string;
  to?: string;
  department_code?: string;
  meeting_type?: 'online' | 'offline';
}) => {
  return useQuery({
    queryKey: ['meetings', params],
    queryFn: () => getMeetings(params),
    staleTime: 30_000, // Cache for 30 seconds to reduce requests
    cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    retry: 1, // Only retry once to avoid spam
    retryDelay: 2000, // Wait 2 seconds before retry
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    refetchOnMount: true, // Still refetch when component mounts
    refetchInterval: false, // Disable automatic polling
  });
};

export const useMeetingDetails = (id: number) => {
  return useQuery({
    queryKey: ['meeting-details', id],
    queryFn: () => getMeetingById(id),
    enabled: !!id,
    staleTime: 30_000,
  });
};

// Alias for backwards compatibility
export const useMeetingById = useMeetingDetails;

export const useCreateMeeting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMeeting,
    onSuccess: () => {
      // Invalidate ALL meeting queries regardless of parameters
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      // Force refetch of all meeting queries
      queryClient.refetchQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-today'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-notifications'] });
      // Admin/HOD/Faculty Analytics all show meeting-status/type breakdowns
      // sourced from a separately-cached query — keep them in sync too.
      queryClient.invalidateQueries({ queryKey: ['analytics', 'overview'] });
    },
  });
};

export const useUpdateMeeting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...meeting }: { id: number } & Parameters<typeof updateMeeting>[1]) =>
      updateMeeting(id, meeting),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-details', id] });
    },
  });
};

export const useDeleteMeeting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMeeting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['analytics', 'overview'] });
    },
  });
};

// ── Approval Management ───────────────────────────────────────────────────────

export const useApproveMeeting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, action, comments }: { id: number; action: 'approve' | 'reject'; comments?: string }) =>
      approveMeeting(id, action, comments),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-details', id] });
      queryClient.invalidateQueries({ queryKey: ['analytics', 'overview'] });
    },
  });
};

// ── Availability Management ───────────────────────────────────────────────────

export const useUpdateAvailability = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, comments }: { id: number; status: string; comments?: string }) =>
      updateAvailability(id, status, comments),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-details', id] });
      queryClient.invalidateQueries({ queryKey: ['meeting-participants', id] });
      // Analytics' "participant responses" breakdown reads this too.
      queryClient.invalidateQueries({ queryKey: ['analytics', 'overview'] });
    },
  });
};

// ── Meeting Control ───────────────────────────────────────────────────────────

export const useStartMeeting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: startMeeting,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-details', id] });
      queryClient.invalidateQueries({ queryKey: ['analytics', 'overview'] });
    },
  });
};

export const useCompleteMeeting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeMeeting,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-details', id] });
      queryClient.invalidateQueries({ queryKey: ['analytics', 'overview'] });
    },
  });
};

// ── Participant Management ────────────────────────────────────────────────────

export const useFacultyForInvitation = (params?: {
  department_code?: string;
  search?: string;
}) => {
  return useQuery({
    queryKey: ['faculty-invitation', params],
    queryFn: () => getFacultyForInvitation(params),
    staleTime: params?.search ? 0 : 60_000, // Fresh data for searches, longer cache for browse
    initialData: [], // Provide empty array as initial data
    retry: 1, // Only retry once to avoid spam
    retryDelay: 2000, // Wait 2 seconds before retry
    enabled: true, // Always enabled, even without search
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    refetchInterval: false, // Disable automatic polling
  });
};

export const useMeetingParticipants = (id: number) => {
  return useQuery({
    queryKey: ['meeting-participants', id],
    queryFn: () => getMeetingParticipants(id),
    enabled: !!id,
    staleTime: 30_000,
  });
};

export const useAddParticipant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, participantId, participationType }: {
      id: number;
      participantId: string;
      participationType?: string;
    }) => addParticipant(id, participantId, participationType),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-details', id] });
      queryClient.invalidateQueries({ queryKey: ['meeting-participants', id] });
    },
  });
};

export const useRemoveParticipant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, participantId }: { id: number; participantId: string }) =>
      removeParticipant(id, participantId),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-details', id] });
      queryClient.invalidateQueries({ queryKey: ['meeting-participants', id] });
    },
  });
};

// ── Document Management ───────────────────────────────────────────────────────

export const useUploadDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      file,
      documentType,
      description
    }: {
      id: number;
      file: File;
      documentType?: string;
      description?: string;
    }) => uploadDocument(id, file, documentType, description),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-documents', id] });
      queryClient.invalidateQueries({ queryKey: ['meeting-details', id] });
    },
  });
};

export const useMeetingDocuments = (id: number) => {
  return useQuery({
    queryKey: ['meeting-documents', id],
    queryFn: () => getMeetingDocuments(id),
    enabled: !!id,
    staleTime: 30_000,
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ meetingId, documentId }: { meetingId: number; documentId: number }) =>
      deleteDocument(meetingId, documentId),
    onSuccess: (_, { meetingId }) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-documents', meetingId] });
      queryClient.invalidateQueries({ queryKey: ['meeting-details', meetingId] });
    },
  });
};

// ── Minutes & Action Items ────────────────────────────────────────────────────

export const useSaveMeetingMinutes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      content,
      attendees
    }: {
      id: number;
      content: string;
      attendees?: Array<{ participant_id: string; status: 'present' | 'absent' }>;
    }) => saveMeetingMinutes(id, content, attendees),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-minutes', id] });
      queryClient.invalidateQueries({ queryKey: ['meeting-details', id] });
    },
  });
};

export const useMeetingMinutes = (id: number) => {
  return useQuery({
    queryKey: ['meeting-minutes', id],
    queryFn: () => getMeetingMinutes(id),
    enabled: !!id,
    staleTime: 30_000,
  });
};

export const useCreateActionItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...actionItem }: { id: number } & Parameters<typeof createActionItem>[1]) =>
      createActionItem(id, actionItem),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['action-items', id] });
      queryClient.invalidateQueries({ queryKey: ['meeting-details', id] });
    },
  });
};

export const useActionItems = (id: number) => {
  return useQuery({
    queryKey: ['action-items', id],
    queryFn: () => getActionItems(id),
    enabled: !!id,
    staleTime: 30_000,
  });
};

export const useUpdateActionItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      meetingId,
      itemId,
      updates
    }: {
      meetingId: number;
      itemId: number;
      updates: Parameters<typeof updateActionItem>[2];
    }) => updateActionItem(meetingId, itemId, updates),
    onSuccess: (_, { meetingId }) => {
      queryClient.invalidateQueries({ queryKey: ['action-items', meetingId] });
    },
  });
};

export const useTodayMeetings = () => {
  const today = useLocalToday();
  return useQuery({
    queryKey: ['meeting-today', today],
    queryFn: () => getTodayMeetings(today),
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: true,
  });
};

export const useMeetingNotifications = () => {
  return useQuery({
    queryKey: ['meeting-notifications'],
    queryFn: getMeetingNotifications,
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: true,
  });
};

export const useMarkMeetingNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markMeetingNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meeting-notifications'] }),
  });
};