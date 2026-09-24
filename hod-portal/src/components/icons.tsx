import React from 'react';
import VectorIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { StyleProp, ViewStyle } from 'react-native';

// Replaces lucide-react-native. MaterialCommunityIcons was chosen over
// Feather because several icons used across the app (Building2, Flame,
// GraduationCap, LayoutDashboard, Cpu, ...) have no Feather equivalent —
// MaterialCommunityIcons covers all of them with a close visual match.
//
// The app passes icon components around as VALUES in many places
// (`icon={Trophy}`, `{ icon: Cpu }`, drawer/tab configs, etc.), not just
// direct JSX — react-native-vector-icons only exposes one generic
// component per font family with a `name` string prop, which doesn't
// support that pattern directly. These wrappers bridge the two: each
// export below is a real component named exactly like its lucide
// equivalent, so every existing usage (JSX or "icon as a prop value")
// keeps working — only the import path needs to change.

export interface IconProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

function makeIcon(glyphName: string) {
  const Component = ({ size = 24, color = '#000', style }: IconProps) => (
    <VectorIcon name={glyphName} size={size} color={color} style={style} />
  );
  Component.displayName = `Icon(${glyphName})`;
  return Component;
}

export const AlertTriangle   = makeIcon('alert');
export const ArrowLeft       = makeIcon('arrow-left');
export const Award           = makeIcon('trophy-award');
export const Bell            = makeIcon('bell');
export const BookOpen        = makeIcon('book-open-variant');
export const Briefcase       = makeIcon('briefcase');
export const Building2       = makeIcon('office-building');
export const Calendar        = makeIcon('calendar');
export const CalendarClock   = makeIcon('calendar-clock');
export const Camera          = makeIcon('camera');
export const Check           = makeIcon('check');
export const CheckSquare     = makeIcon('checkbox-marked');
export const ChevronDown     = makeIcon('chevron-down');
export const ChevronLeft     = makeIcon('chevron-left');
export const ChevronRight    = makeIcon('chevron-right');
export const ChevronUp       = makeIcon('chevron-up');
export const Cpu             = makeIcon('chip');
export const Eye             = makeIcon('eye');
export const EyeOff          = makeIcon('eye-off');
export const ExternalLink    = makeIcon('open-in-new');
export const FileText        = makeIcon('file-document-outline');
export const Flame           = makeIcon('fire');
export const GraduationCap   = makeIcon('school');
export const History         = makeIcon('history');
export const Home            = makeIcon('home');
export const LayoutDashboard = makeIcon('view-dashboard');
export const Lock            = makeIcon('lock');
export const LogOut          = makeIcon('logout');
export const Mail            = makeIcon('email');
export const Menu            = makeIcon('menu');
export const Moon            = makeIcon('weather-night');
export const MoreVertical    = makeIcon('dots-vertical');
export const Music2          = makeIcon('music');
export const Pencil          = makeIcon('pencil');
export const Phone           = makeIcon('phone');
export const Plus            = makeIcon('plus');
export const RefreshCw       = makeIcon('refresh');
export const Search          = makeIcon('magnify');
export const ShieldMinus     = makeIcon('shield-remove-outline');
export const ShieldPlus      = makeIcon('shield-plus-outline');
export const Square          = makeIcon('checkbox-blank-outline');
export const Star            = makeIcon('star');
export const Sun             = makeIcon('white-balance-sunny');
export const Trash2          = makeIcon('trash-can-outline');
export const Trophy          = makeIcon('trophy');
export const User            = makeIcon('account');
export const UserPlus        = makeIcon('account-plus-outline');
export const Users           = makeIcon('account-group');
export const X               = makeIcon('close');
export const Zap             = makeIcon('lightning-bolt');

// Replaces lucide-react-native's `LucideIcon` type, used where code types
// an "icon component" prop generically.
export type LucideIconType = React.ComponentType<IconProps>;
