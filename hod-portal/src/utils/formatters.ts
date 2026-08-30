import { format, formatDistanceToNow } from 'date-fns';
import { avatarColors } from '../theme/colors';

export const formatDate = (date?: string | number | Date | null, fmt = 'dd MMM yyyy'): string => {
  if (!date) return '—';
  try {
    return format(new Date(date), fmt);
  } catch {
    return '—';
  }
};

export const formatRelativeTime = (date?: string | number | Date | null): string => {
  if (!date) return '—';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return '—';
  }
};

export const formatExperience = (years?: number | null): string => {
  if (!years && years !== 0) return '—';
  return years === 1 ? '1 year' : `${years} years`;
};

export const getInitials = (name = ''): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

/**
 * Returns a hex color string from the avatar palette based on the name.
 * Replaces the old web version which returned a Tailwind class string.
 */
export const getAvatarColor = (name = ''): string => {
  if (!name) return avatarColors[0];
  const idx = name.charCodeAt(0) % avatarColors.length;
  return avatarColors[idx];
};

const ACTION_LABELS: Record<string, string> = {
  ASSIGN_ROLE: 'Assigned Role',
  REMOVE_ROLE: 'Removed Role',
  CREATE_FACULTY: 'Added Faculty',
  UPDATE_FACULTY: 'Updated Faculty',
  DELETE_FACULTY: 'Deleted Faculty',
};

export const formatActionLabel = (action: string): string => ACTION_LABELS[action] || action;
