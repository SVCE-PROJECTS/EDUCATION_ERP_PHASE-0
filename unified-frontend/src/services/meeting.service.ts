// @ts-nocheck
/**
 * Meeting Management Service
 * API calls for meeting operations
 */

import axiosInstance from '../api/axiosInstance';

export interface Meeting {
  meeting_id: number;
  title: string;
  description?: string;
  department_code: string;
  scheduled_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  duration_minutes: number;
  location?: string;
  meeting_type: 'online' | 'offline';
  meeting_url?: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';
  approval_required: boolean;
  created_by: string;
  created_by_name?: string;
  created_by_designation?: string;
  participant_count?: number;
  pending_approvals?: number;
  created_at: string;
  updated_at: string;
}

export interface MeetingParticipant {
  participant_id: string;
  name: string;
  designation: string;
  email: string;
  participation_type: 'required' | 'optional' | 'invited';
  availability_status: 'pending' | 'available' | 'unavailable' | 'tentative';
  availability_comments?: string;
  attendance_status?: 'present' | 'absent';
  responded_at?: string;
}

export interface MeetingApproval {
  approval_id: number;
  approver_id: string;
  approver_name: string;
  approver_designation: string;
  approval_level: number;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  approved_at?: string;
}

export interface MeetingDocument {
  document_id: number;
  document_type: 'agenda' | 'presentation' | 'handout' | 'reference' | 'other';
  file_name: string;
  file_path: string;
  file_size: number;
  description?: string;
  uploaded_by: string;
  uploaded_by_name?: string;
  created_at: string;
}

export interface MeetingMinutes {
  minutes_id: number;
  content: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  edited_by?: string;
  edited_by_name?: string;
  edited_at?: string;
}

export interface ActionItem {
  item_id: number;
  description: string;
  assigned_to: string;
  assigned_to_name: string;
  assigned_to_designation: string;
  assigned_to_email: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  progress_notes?: string;
  completion_date?: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface Faculty {
  id: string;
  name: string;
  designation: string;
  email: string;
  department_name: string;
  department_code: string;
  is_hod: boolean;
}

export interface MeetingDetails extends Meeting {
  participants: MeetingParticipant[];
  approvals: MeetingApproval[];
  documents: MeetingDocument[];
}

export interface MeetingNotification {
  notification_id: number;
  meeting_id: number;
  notification_type: string;
  message: string;
  created_at: string;
  read_at?: string | null;
  meeting_type: 'online' | 'offline';
  scheduled_date: string;
  start_time: string;
  location?: string | null;
  duration_minutes?: number | null;
  status: string;
}

export interface MeetingInput {
  title: string;
  description?: string;
  scheduled_date: string;
  start_time: string;
  duration_minutes?: number | null;
  location?: string;
  participant_ids?: string[];
  meeting_type?: 'online' | 'offline';
}

const normalizeMeetingStatus = (status?: string) => {
  if (!status) return status;
  const map: Record<string, string> = {
    pending_availability: 'pending_approval',
    pending_approval: 'pending_approval',
    confirmed: 'confirmed',
    approved: 'approved',
  };
  return map[status] || status;
};

const normalizeMeeting = (meeting: any) => ({
  ...meeting,
  status: normalizeMeetingStatus(meeting?.status),
});

// ── Meeting Management ────────────────────────────────────────────────────────

export const getMeetings = async (params?: {
  status?: string;
  from?: string;
  to?: string;
  department_code?: string;
  meeting_type?: 'online' | 'offline';
}): Promise<Meeting[]> => {
  try {
    // Add cache-busting timestamp to ensure fresh data after creation
    const searchParams = {
      ...params,
      _t: Date.now() // Force fresh request
    };

    const response = await axiosInstance.get('/meetings', {
      params: searchParams
    });

    // Axios interceptor returns { success: true, data: Meeting[] }
    // We need to extract .data to get the Meeting[] array
    if (response && response.success && Array.isArray(response.data)) {
      return response.data.map(normalizeMeeting);
    }

    // Handle unexpected response structure
    console.warn('Unexpected getMeetings response structure:', response);
    return [];
  } catch (error) {
    console.error('Error fetching meetings:', error);
    // Re-throw error to allow proper error handling in UI
    throw new Error(error.message || 'Failed to load meetings');
  }
};

export const getMeetingById = async (id: number): Promise<MeetingDetails> => {
  try {
    const response = await axiosInstance.get(`/meetings/${id}`);

    // Axios interceptor returns { success: true, data: MeetingDetails }
    // We need to extract .data to get the MeetingDetails object
    if (response && response.success && response.data) {
      return normalizeMeeting(response.data);
    }

    // Handle unexpected response structure
    console.warn('Unexpected getMeetingById response structure:', response);
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Error fetching meeting details:', error);
    throw new Error(error.message || 'Failed to load meeting details');
  }
};

export const createMeeting = async (meeting: {
  title: string;
  description?: string;
  scheduled_date: string;
  start_time: string;
  duration_minutes?: number | null;
  location?: string;
  participant_ids?: string[];
  meeting_type?: 'online' | 'offline';
}): Promise<Meeting> => {
  try {
    const response = await axiosInstance.post('/meetings', meeting);

    // Axios interceptor returns { success: true, data: Meeting }
    // We need to extract .data to get the Meeting object
    if (response && response.success && response.data) {
      return normalizeMeeting(response.data);
    }

    // Handle unexpected response structure
    console.warn('Unexpected createMeeting response structure:', response);
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Error creating meeting:', error);
    throw new Error(error.message || 'Failed to create meeting');
  }
};

export const updateMeeting = async (id: number, meeting: {
  title: string;
  description?: string;
  scheduled_date: string;
  start_time: string;
  duration_minutes: number;
  location?: string;
  participant_ids?: string[];
}): Promise<Meeting> => {
  try {
    const response = await axiosInstance.put(`/meetings/${id}`, meeting);

    // Axios interceptor returns { success: true, data: Meeting }
    // We need to extract .data to get the Meeting object
    if (response && response.success && response.data) {
      return normalizeMeeting(response.data);
    }

    // Handle unexpected response structure
    console.warn('Unexpected updateMeeting response structure:', response);
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Error updating meeting:', error);
    throw new Error(error.message || 'Failed to update meeting');
  }
};

export const deleteMeeting = async (id: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/meetings/${id}`);
    // Delete endpoints typically don't return data, just success status
  } catch (error) {
    console.error('Error deleting meeting:', error);
    throw new Error(error.message || 'Failed to delete meeting');
  }
};

// ── Approval Management ───────────────────────────────────────────────────────

export const approveMeeting = async (id: number, action: 'approve' | 'reject', comments?: string): Promise<void> => {
  try {
    await axiosInstance.post(`/meetings/${id}/approve`, { action, comments });
    // Approval endpoints typically don't return data, just success status
  } catch (error) {
    console.error('Error approving meeting:', error);
    throw new Error(error.message || `Failed to ${action} meeting`);
  }
};

// ── Availability Management ───────────────────────────────────────────────────

export const updateAvailability = async (id: number, status: string, comments?: string): Promise<void> => {
  try {
    await axiosInstance.post(`/meetings/${id}/availability`, { status, comments });
    // Availability endpoints typically don't return data, just success status
  } catch (error) {
    console.error('Error updating availability:', error);
    throw new Error(error.message || 'Failed to update availability');
  }
};

// ── Meeting Control ───────────────────────────────────────────────────────────

export const startMeeting = async (id: number): Promise<{ meeting_url: string }> => {
  try {
    const response = await axiosInstance.post(`/meetings/${id}/start`);

    // Axios interceptor returns { success: true, message: '...', meeting_url: '...' }
    // For this endpoint, the meeting_url is at the top level of response
    if (response && response.success && response.meeting_url) {
      return { meeting_url: response.meeting_url };
    }

    // Handle unexpected response structure
    console.warn('Unexpected startMeeting response structure:', response);
    throw new Error('Invalid response format - missing meeting URL');
  } catch (error) {
    console.error('Error starting meeting:', error);
    throw new Error(error.message || 'Failed to start meeting');
  }
};

export const completeMeeting = async (id: number): Promise<void> => {
  try {
    await axiosInstance.post(`/meetings/${id}/complete`);
    // Complete endpoints typically don't return data, just success status
  } catch (error) {
    console.error('Error completing meeting:', error);
    throw new Error(error.message || 'Failed to complete meeting');
  }
};

// ── Participant Management ────────────────────────────────────────────────────

export const getFacultyForInvitation = async (params?: {
  department_code?: string;
  search?: string;
}): Promise<Faculty[]> => {
  try {
    // Add cache-busting timestamp for dynamic search results
    const searchParams = {
      ...params,
      _t: Date.now() // Add timestamp to prevent browser caching
    };

    const response = await axiosInstance.get('/meetings/faculty', {
      params: searchParams
    });

    // Axios interceptor returns { success: true, data: Faculty[] }
    // We need to extract .data to get the Faculty[] array
    if (response && response.success && Array.isArray(response.data)) {
      return response.data;
    }

    // Handle unexpected response structure
    console.warn('Unexpected getFacultyForInvitation response structure:', response);
    return [];
  } catch (error) {
    console.error('Error fetching faculty for invitation:', error);
    // Re-throw error to allow proper error handling in UI
    throw new Error(error.message || 'Failed to load faculty');
  }
};

export const getMeetingParticipants = async (id: number): Promise<MeetingParticipant[]> => {
  try {
    const response = await axiosInstance.get(`/meetings/${id}/participants`);

    // Axios interceptor returns { success: true, data: MeetingParticipant[] }
    // We need to extract .data to get the array
    if (response && response.success && Array.isArray(response.data)) {
      return response.data;
    }

    // Handle unexpected response structure
    console.warn('Unexpected getMeetingParticipants response structure:', response);
    return [];
  } catch (error) {
    console.error('Error fetching meeting participants:', error);
    throw new Error(error.message || 'Failed to load meeting participants');
  }
};

export const addParticipant = async (id: number, participantId: string, participationType?: string): Promise<MeetingParticipant> => {
  try {
    const response = await axiosInstance.post(`/meetings/${id}/participants`, {
      participant_id: participantId,
      participation_type: participationType
    });

    // Axios interceptor returns { success: true, data: MeetingParticipant }
    // We need to extract .data to get the object
    if (response && response.success && response.data) {
      return response.data;
    }

    // Handle unexpected response structure
    console.warn('Unexpected addParticipant response structure:', response);
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Error adding participant:', error);
    throw new Error(error.message || 'Failed to add participant');
  }
};

export const removeParticipant = async (id: number, participantId: string): Promise<void> => {
  try {
    await axiosInstance.delete(`/meetings/${id}/participants/${participantId}`);
    // Remove endpoints typically don't return data, just success status
  } catch (error) {
    console.error('Error removing participant:', error);
    throw new Error(error.message || 'Failed to remove participant');
  }
};

// ── Document Management ───────────────────────────────────────────────────────

export const uploadDocument = async (id: number, file: File, documentType?: string, description?: string): Promise<MeetingDocument> => {
  try {
    const formData = new FormData();
    formData.append('document', file);
    if (documentType) formData.append('document_type', documentType);
    if (description) formData.append('description', description);

    const response = await axiosInstance.post(`/meetings/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    // Axios interceptor returns { success: true, data: MeetingDocument }
    // We need to extract .data to get the object
    if (response && response.success && response.data) {
      return response.data;
    }

    // Handle unexpected response structure
    console.warn('Unexpected uploadDocument response structure:', response);
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Error uploading document:', error);
    throw new Error(error.message || 'Failed to upload document');
  }
};

export const getMeetingDocuments = async (id: number): Promise<MeetingDocument[]> => {
  try {
    const response = await axiosInstance.get(`/meetings/${id}/documents`);

    // Axios interceptor returns { success: true, data: MeetingDocument[] }
    // We need to extract .data to get the array
    if (response && response.success && Array.isArray(response.data)) {
      return response.data;
    }

    // Handle unexpected response structure
    console.warn('Unexpected getMeetingDocuments response structure:', response);
    return [];
  } catch (error) {
    console.error('Error fetching meeting documents:', error);
    throw new Error(error.message || 'Failed to load meeting documents');
  }
};

export const deleteDocument = async (meetingId: number, documentId: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/meetings/${meetingId}/documents/${documentId}`);
    // Delete endpoints typically don't return data, just success status
  } catch (error) {
    console.error('Error deleting document:', error);
    throw new Error(error.message || 'Failed to delete document');
  }
};

// ── Minutes & Action Items ────────────────────────────────────────────────────

export const saveMeetingMinutes = async (id: number, content: string, attendees?: Array<{
  participant_id: string;
  status: 'present' | 'absent';
}>): Promise<MeetingMinutes> => {
  try {
    const response = await axiosInstance.post(`/meetings/${id}/minutes`, { content, attendees });

    // Axios interceptor returns { success: true, data: MeetingMinutes }
    // We need to extract .data to get the object
    if (response && response.success && response.data) {
      return response.data;
    }

    // Handle unexpected response structure
    console.warn('Unexpected saveMeetingMinutes response structure:', response);
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Error saving meeting minutes:', error);
    throw new Error(error.message || 'Failed to save meeting minutes');
  }
};

export const getMeetingMinutes = async (id: number): Promise<{
  minutes: MeetingMinutes | null;
  attendees: MeetingParticipant[];
}> => {
  try {
    const response = await axiosInstance.get(`/meetings/${id}/minutes`);

    // Axios interceptor returns { success: true, data: { minutes, attendees } }
    // We need to extract .data to get the object
    if (response && response.success && response.data) {
      return response.data;
    }

    // Handle unexpected response structure
    console.warn('Unexpected getMeetingMinutes response structure:', response);
    return { minutes: null, attendees: [] };
  } catch (error) {
    console.error('Error fetching meeting minutes:', error);
    throw new Error(error.message || 'Failed to load meeting minutes');
  }
};

export const createActionItem = async (id: number, actionItem: {
  description: string;
  assigned_to: string;
  due_date?: string;
  priority?: string;
}): Promise<ActionItem> => {
  try {
    const response = await axiosInstance.post(`/meetings/${id}/action-items`, actionItem);

    // Axios interceptor returns { success: true, data: ActionItem }
    // We need to extract .data to get the object
    if (response && response.success && response.data) {
      return response.data;
    }

    // Handle unexpected response structure
    console.warn('Unexpected createActionItem response structure:', response);
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Error creating action item:', error);
    throw new Error(error.message || 'Failed to create action item');
  }
};

export const getActionItems = async (id: number): Promise<ActionItem[]> => {
  try {
    const response = await axiosInstance.get(`/meetings/${id}/action-items`);

    // Axios interceptor returns { success: true, data: ActionItem[] }
    // We need to extract .data to get the array
    if (response && response.success && Array.isArray(response.data)) {
      return response.data;
    }

    // Handle unexpected response structure
    console.warn('Unexpected getActionItems response structure:', response);
    return [];
  } catch (error) {
    console.error('Error fetching action items:', error);
    throw new Error(error.message || 'Failed to load action items');
  }
};

export const updateActionItem = async (meetingId: number, itemId: number, updates: {
  status?: string;
  progress_notes?: string;
  completion_date?: string;
}): Promise<ActionItem> => {
  try {
    const response = await axiosInstance.put(`/meetings/${meetingId}/action-items/${itemId}`, updates);

    // Axios interceptor returns { success: true, data: ActionItem }
    // We need to extract .data to get the object
    if (response && response.success && response.data) {
      return response.data;
    }

    // Handle unexpected response structure
    console.warn('Unexpected updateActionItem response structure:', response);
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Error updating action item:', error);
    throw new Error(error.message || 'Failed to update action item');
  }
};

export const getTodayMeetings = async (date: string): Promise<Meeting[]> => {
  const response = await axiosInstance.get('/meetings/today', { params: { date, _t: Date.now() } });
  if (response?.success && Array.isArray(response.data)) return response.data.map(normalizeMeeting);
  throw new Error(response?.message || 'Invalid today meetings response');
};

export const getMeetingNotifications = async (): Promise<MeetingNotification[]> => {
  const response = await axiosInstance.get('/meetings/notifications');
  if (response?.success && Array.isArray(response.data)) return response.data;
  throw new Error(response?.message || 'Invalid meeting notifications response');
};

export const markMeetingNotificationRead = async (notificationId: number): Promise<void> => {
  const response = await axiosInstance.patch(`/meetings/notifications/${notificationId}/read`);
  if (!response?.success) throw new Error(response?.message || 'Could not mark notification as read');
};