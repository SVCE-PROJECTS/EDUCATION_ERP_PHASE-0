// @ts-nocheck
/**
 * MiniCalendar Component
 * Fixed-pixel sizing: 300px wide in popovers, 340px in My Schedules.
 * Day cells are always 36x36px. Each week is its own row of 7 cells,
 * so the Saturday column can never wrap.
 * Shared across Admin, HOD, Faculty portals.
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useMonthSchedules, getDotForDate } from '../../hooks/useSchedules';
import { getTodayString } from '../../utils/dateHelpers';

export interface MiniCalendarProps {
  selectedDate?: string;          // YYYY-MM-DD
  schedules?: any[];              // if omitted, fetches for current month
  onDatePress?: (dateString: string) => void;
  onMonthChange?: (year: number, month: number) => void;
  /** Width of the calendar. Default 300 (popover). My Schedules passes 340. */
  calWidth?: number;
  theme: any;
}

// Layout constants
const CELL_SIZE = 36;  // day cell width AND height
const HEADER_H  = 44;  // month + nav row
const DAY_ROW_H = 28;  // weekday label row
const V_PAD     = 12;  // top + bottom padding
const H_PAD     = 10;  // left + right padding
const ROW_GAP   = 2;   // vertical gap between week rows

export const CALENDAR_HEIGHT =
  HEADER_H + DAY_ROW_H + 6 * CELL_SIZE + 5 * ROW_GAP + V_PAD * 2 + 2;

const DAYS   = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const pad2 = (n: number) => String(n).padStart(2, '0');

export default function MiniCalendar({
  selectedDate,
  schedules: providedSchedules,
  onDatePress,
  onMonthChange,
  calWidth = 300,
  theme,
}: MiniCalendarProps) {
  const [currentYear,  setCurrentYear]  = React.useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = React.useState(() => new Date().getMonth() + 1);

  // Fetch only when schedules are not provided by the parent
  const { schedules: fetchedSchedules } = useMonthSchedules(currentYear, currentMonth);
  const schedules = providedSchedules !== undefined ? providedSchedules : (fetchedSchedules || []);

  const today = useMemo(() => getTodayString(), []);

  const goToPrev = () => {
    const m = currentMonth === 1 ? 12 : currentMonth - 1;
    const y = currentMonth === 1 ? currentYear - 1 : currentYear;
    setCurrentMonth(m);
    setCurrentYear(y);
    onMonthChange?.(y, m);
  };

  const goToNext = () => {
    const m = currentMonth === 12 ? 1 : currentMonth + 1;
    const y = currentMonth === 12 ? currentYear + 1 : currentYear;
    setCurrentMonth(m);
    setCurrentYear(y);
    onMonthChange?.(y, m);
  };

  // 42 cells (6 weeks), split into 6 rows of 7
  const weeks = useMemo(() => {
    const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay();
    const daysInMonth    = new Date(currentYear, currentMonth, 0).getDate();
    const prevMonthDays  = new Date(currentYear, currentMonth - 1, 0).getDate();

    const days: Array<{ date: number; dateString: string; isCurrentMonth: boolean }> = [];

    // Trailing days from previous month
    const pm = currentMonth === 1 ? 12 : currentMonth - 1;
    const py = currentMonth === 1 ? currentYear - 1 : currentYear;
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      days.push({ date: d, dateString: `${py}-${pad2(pm)}-${pad2(d)}`, isCurrentMonth: false });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: i, dateString: `${currentYear}-${pad2(currentMonth)}-${pad2(i)}`, isCurrentMonth: true });
    }

    // Leading days from next month
    const nm = currentMonth === 12 ? 1 : currentMonth + 1;
    const ny = currentMonth === 12 ? currentYear + 1 : currentYear;
    for (let i = 1; days.length < 42; i++) {
      days.push({ date: i, dateString: `${ny}-${pad2(nm)}-${pad2(i)}`, isCurrentMonth: false });
    }

    const rows = [];
    for (let r = 0; r < 6; r++) rows.push(days.slice(r * 7, r * 7 + 7));
    return rows;
  }, [currentYear, currentMonth]);

  return (
    <View
      style={[
        styles.container,
        {
          width: calWidth,
          paddingHorizontal: H_PAD,
          paddingVertical: V_PAD,
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { height: HEADER_H }]}>
        <TouchableOpacity
          onPress={goToPrev}
          style={styles.navBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.navText, { color: theme.textPrimary }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerText, { color: theme.textPrimary }]}>
          {MONTHS[currentMonth - 1]} {currentYear}
        </Text>
        <TouchableOpacity
          onPress={goToNext}
          style={styles.navBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.navText, { color: theme.textPrimary }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Weekday labels: same row structure as the date rows, so they line up */}
      <View style={[styles.weekRow, { height: DAY_ROW_H, marginBottom: 4 }]}>
        {DAYS.map((d) => (
          <View key={d} style={styles.slot}>
            <Text style={[styles.dayLabelText, { color: theme.textMuted }]}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Grid: 6 rows x 7 columns */}
      {weeks.map((week, r) => (
        <View
          key={r}
          style={[styles.weekRow, { height: CELL_SIZE, marginTop: r === 0 ? 0 : ROW_GAP }]}
        >
          {week.map((day) => {
            const isToday    = day.dateString === today;
            const isSelected = day.dateString === selectedDate;
            const dotColor   = getDotForDate(schedules, day.dateString);

            return (
              <View key={day.dateString} style={styles.slot}>
                <TouchableOpacity
                  style={[
                    styles.cell,
                    !day.isCurrentMonth && styles.cellMuted,
                    isToday    && { backgroundColor: theme.primaryLight },
                    isSelected && { backgroundColor: theme.primary },
                  ]}
                  onPress={() => day.isCurrentMonth && onDatePress?.(day.dateString)}
                  disabled={!day.isCurrentMonth}
                >
                  <Text
                    style={[
                      styles.cellText,
                      { color: theme.textPrimary },
                      isToday    && { color: theme.primary, fontWeight: '700' },
                      isSelected && { color: '#FFFFFF', fontWeight: '700' },
                    ]}
                  >
                    {day.date}
                  </Text>
                  {dotColor && (
                    <View style={[styles.dot, dotColor === 'red' ? styles.dotRed : styles.dotBlue]} />
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    // width, padding, bg, borderColor are set inline
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerText: { fontSize: 14, fontWeight: '600' },
  navBtn:  { padding: 4 },
  navText: { fontSize: 22, fontWeight: '600', lineHeight: 26 },

  // One week (or the weekday label row): 7 equal slots, never wraps
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabelText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },

  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    position: 'relative',
  },
  cellMuted: { opacity: 0.25 },
  cellText:  { fontSize: 13, fontWeight: '500' },

  dot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dotRed:  { backgroundColor: '#DC2626' },
  dotBlue: { backgroundColor: '#2563EB' },
});