// Faculty Portal — Icon components (MaterialCommunityIcons wrapper)
// Identical to hod-portal/src/components/icons.tsx

import React from 'react';
import VectorIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { StyleProp, ViewStyle } from 'react-native';

export interface IconProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

function makeIcon(glyphName: string) {
  const Component = ({ size = 24, color = '#000', style }: IconProps) => (
    <VectorIcon name={glyphName} size={size} color={color} style={style as any} />
  );
  Component.displayName = `Icon(${glyphName})`;
  return Component;
}

export const AlertTriangle  = makeIcon('alert');
export const ArrowLeft      = makeIcon('arrow-left');
export const Award          = makeIcon('trophy-award');
export const Bell           = makeIcon('bell');
export const BookOpen       = makeIcon('book-open-variant');
export const Briefcase      = makeIcon('briefcase');
export const Building2      = makeIcon('office-building');
export const Calendar       = makeIcon('calendar');
export const CalendarClock  = makeIcon('calendar-clock');
export const Camera         = makeIcon('camera');
export const Check          = makeIcon('check');
export const CheckSquare    = makeIcon('checkbox-marked');
export const ChevronDown    = makeIcon('chevron-down');
export const ChevronLeft    = makeIcon('chevron-left');
export const ChevronRight   = makeIcon('chevron-right');
export const ClipboardList  = makeIcon('clipboard-list');
export const Eye            = makeIcon('eye');
export const EyeOff         = makeIcon('eye-off');
export const FileText       = makeIcon('file-document-outline');
export const Flame          = makeIcon('fire');
export const GraduationCap  = makeIcon('school');
export const LayoutDashboard = makeIcon('view-dashboard');
export const Lock           = makeIcon('lock');
export const LogOut         = makeIcon('logout');
export const Mail           = makeIcon('email');
export const Menu           = makeIcon('menu');
export const Moon           = makeIcon('weather-night');
export const MoreVertical   = makeIcon('dots-vertical');
export const Pencil         = makeIcon('pencil');
export const Phone          = makeIcon('phone');
export const Plus           = makeIcon('plus');
export const RefreshCw      = makeIcon('refresh');
export const Search         = makeIcon('magnify');
export const Sun            = makeIcon('white-balance-sunny');
export const Trash2         = makeIcon('trash-can-outline');
export const UploadCloud    = makeIcon('cloud-upload-outline');
export const User           = makeIcon('account');
export const Users          = makeIcon('account-group');
export const X              = makeIcon('close');

export type LucideIconType = React.ComponentType<IconProps>;
