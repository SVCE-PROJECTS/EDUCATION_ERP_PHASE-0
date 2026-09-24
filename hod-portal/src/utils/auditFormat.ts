import {
  Plus, Pencil, Trash2, ShieldPlus, ShieldMinus, UserPlus, X,
  Cpu, Trophy, Music2, Briefcase, Zap, Star,
  LucideIconType,
} from '../components/icons';
import { colors } from '../theme/colors';
import { AuditLogEntry } from '../services/audit.service';

export interface ActionMeta {
  icon: LucideIconType;
  bg: string;
  fg: string;
  label: string;
}

const ACTION_META: Record<string, ActionMeta> = {
  // ── Faculty ──
  CREATE_FACULTY: { icon: Plus, bg: colors.green[100], fg: colors.green[600], label: 'Faculty Added' },
  UPDATE_FACULTY: { icon: Pencil, bg: colors.blue[100], fg: colors.blue[600], label: 'Faculty Updated' },
  DELETE_FACULTY: { icon: Trash2, bg: colors.red[100], fg: colors.red[600], label: 'Faculty Removed' },
  ASSIGN_ROLE: { icon: ShieldPlus, bg: colors.purple[100], fg: colors.purple[600], label: 'Role Assigned' },
  REMOVE_ROLE: { icon: ShieldMinus, bg: colors.amber[100], fg: colors.amber[600], label: 'Role Removed' },

  // ── Technical events ──
  CREATE_TECHNICAL_EVENT: { icon: Cpu, bg: colors.blue[100], fg: colors.blue[600], label: 'Technical Event Added' },
  UPDATE_TECHNICAL_EVENT: { icon: Pencil, bg: colors.blue[100], fg: colors.blue[600], label: 'Technical Event Updated' },
  DELETE_TECHNICAL_EVENT: { icon: Trash2, bg: colors.red[100], fg: colors.red[600], label: 'Technical Event Removed' },

  // ── Sports activities ──
  CREATE_SPORTS_ACTIVITY: { icon: Trophy, bg: colors.orange[100], fg: colors.orange[600], label: 'Sports Activity Added' },
  UPDATE_SPORTS_ACTIVITY: { icon: Pencil, bg: colors.orange[100], fg: colors.orange[600], label: 'Sports Activity Updated' },
  DELETE_SPORTS_ACTIVITY: { icon: Trash2, bg: colors.red[100], fg: colors.red[600], label: 'Sports Activity Removed' },

  // ── Cultural activities ──
  CREATE_CULTURAL_ACTIVITY: { icon: Music2, bg: colors.pink[100], fg: colors.pink[600], label: 'Cultural Activity Added' },
  UPDATE_CULTURAL_ACTIVITY: { icon: Pencil, bg: colors.pink[100], fg: colors.pink[600], label: 'Cultural Activity Updated' },
  DELETE_CULTURAL_ACTIVITY: { icon: Trash2, bg: colors.red[100], fg: colors.red[600], label: 'Cultural Activity Removed' },

  // ── Industry projects ──
  CREATE_INDUSTRY_PROJECT: { icon: Briefcase, bg: colors.cyan[100], fg: colors.cyan[600], label: 'Industry Project Added' },
  UPDATE_INDUSTRY_PROJECT: { icon: Pencil, bg: colors.cyan[100], fg: colors.cyan[600], label: 'Industry Project Updated' },
  DELETE_INDUSTRY_PROJECT: { icon: Trash2, bg: colors.red[100], fg: colors.red[600], label: 'Industry Project Removed' },
  ADD_PROJECT_STUDENT: { icon: UserPlus, bg: colors.cyan[100], fg: colors.cyan[600], label: 'Student Added to Project' },
  REMOVE_PROJECT_STUDENT: { icon: X, bg: colors.red[100], fg: colors.red[600], label: 'Student Removed from Project' },

  // ── Hackathons ──
  CREATE_HACKATHON: { icon: Zap, bg: colors.purple[100], fg: colors.purple[600], label: 'Hackathon Record Added' },
  UPDATE_HACKATHON: { icon: Pencil, bg: colors.purple[100], fg: colors.purple[600], label: 'Hackathon Record Updated' },
  DELETE_HACKATHON: { icon: Trash2, bg: colors.red[100], fg: colors.red[600], label: 'Hackathon Record Removed' },

  // ── Other curricular ──
  CREATE_OTHER_CURRICULAR: { icon: Star, bg: colors.amber[100], fg: colors.amber[600], label: 'Activity Record Added' },
  UPDATE_OTHER_CURRICULAR: { icon: Pencil, bg: colors.amber[100], fg: colors.amber[600], label: 'Activity Record Updated' },
  DELETE_OTHER_CURRICULAR: { icon: Trash2, bg: colors.red[100], fg: colors.red[600], label: 'Activity Record Removed' },
};

const DEFAULT_META: ActionMeta = {
  icon: Pencil, bg: colors.blue[100], fg: colors.blue[600], label: 'Activity',
};

export const getActionMeta = (action?: string): ActionMeta =>
  (action && ACTION_META[action]) || DEFAULT_META;

/** e.g. "CREATE_FACULTY" -> "Create Faculty", for any action not in ACTION_META. */
export const actionLabel = (action = ''): string => {
  const known = ACTION_META[action];
  if (known) return known.label;
  return action
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
};

// ── Module filter (what the Activity Log screen's dropdown offers) ────────────

export const MODULE_OPTIONS = [
  { label: 'All modules', value: '' },
  { label: 'Faculty', value: 'faculty' },
  { label: 'Technical Events', value: 'technical_event' },
  { label: 'Sports Activities', value: 'sports_activity' },
  { label: 'Cultural Activities', value: 'cultural_activity' },
  { label: 'Industry Projects', value: 'industry_project' },
  { label: 'Hackathons', value: 'hackathon' },
  { label: 'Other Curricular', value: 'other_curricular' },
];

export const formatTimestamp = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const sameDay = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return sameDay
    ? `Today, ${time}`
    : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
};

/** One-line human summary of the entry's newValue payload, when present. */
export const summarizeDetails = (entry: Pick<AuditLogEntry, 'newValue'>): string => {
  const v = entry.newValue as Record<string, unknown> | null;
  if (!v) return '';
  if (Array.isArray(v.roles) && v.roles.length) return (v.roles as string[]).join(', ');
  if (Array.isArray(v.updatedFields) && v.updatedFields.length) {
    return `Updated: ${(v.updatedFields as string[]).join(', ')}`;
  }
  if (typeof v.studentUsn === 'string' && v.studentUsn) return `USN ${v.studentUsn}`;
  if (typeof v.title === 'string') return v.title;
  if (typeof v.name === 'string') return v.name;
  return '';
};
