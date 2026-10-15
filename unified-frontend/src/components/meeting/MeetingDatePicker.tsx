// @ts-nocheck
/**
 * Meeting Date Picker Component
 * Custom calendar popup for meeting date selection with date restrictions
 */

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Icon } from 'react-native-paper';
import { getTodayString } from '../../utils/dateHelpers';

interface MeetingDatePickerProps {
  visible: boolean;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onClose: () => void;
  theme: any;
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad2 = (n: number) => String(n).padStart(2, '0');

export default function MeetingDatePicker({
  visible,
  selectedDate,
  onDateSelect,
  onClose,
  theme,
}: MeetingDatePickerProps) {
  const [currentYear, setCurrentYear] = useState(() => selectedDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => selectedDate.getMonth() + 1);

  const today = new Date();
  const todayString = getTodayString();
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90); // 90 days ahead

  const selectedDateString = `${selectedDate.getFullYear()}-${pad2(selectedDate.getMonth() + 1)}-${pad2(selectedDate.getDate())}`;

  const goToPrev = () => {
    const m = currentMonth === 1 ? 12 : currentMonth - 1;
    const y = currentMonth === 1 ? currentYear - 1 : currentYear;
    setCurrentMonth(m);
    setCurrentYear(y);
  };

  const goToNext = () => {
    const m = currentMonth === 12 ? 1 : currentMonth + 1;
    const y = currentMonth === 12 ? currentYear + 1 : currentYear;
    setCurrentMonth(m);
    setCurrentYear(y);
  };

  const weeks = useMemo(() => {
    const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth - 1, 0).getDate();

    const days: Array<{
      date: number;
      dateString: string;
      dateObj: Date;
      isCurrentMonth: boolean;
      isDisabled: boolean;
    }> = [];

    // Trailing days from previous month
    const pm = currentMonth === 1 ? 12 : currentMonth - 1;
    const py = currentMonth === 1 ? currentYear - 1 : currentYear;
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const dateObj = new Date(py, pm - 1, d);
      const dateString = `${py}-${pad2(pm)}-${pad2(d)}`;
      days.push({
        date: d,
        dateString,
        dateObj,
        isCurrentMonth: false,
        isDisabled: dateObj < today || dateObj > maxDate
      });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateObj = new Date(currentYear, currentMonth - 1, i);
      const dateString = `${currentYear}-${pad2(currentMonth)}-${pad2(i)}`;
      days.push({
        date: i,
        dateString,
        dateObj,
        isCurrentMonth: true,
        isDisabled: dateObj < today || dateObj > maxDate
      });
    }

    // Leading days from next month
    const nm = currentMonth === 12 ? 1 : currentMonth + 1;
    const ny = currentMonth === 12 ? currentYear + 1 : currentYear;
    for (let i = 1; days.length < 42; i++) {
      const dateObj = new Date(ny, nm - 1, i);
      const dateString = `${ny}-${pad2(nm)}-${pad2(i)}`;
      days.push({
        date: i,
        dateString,
        dateObj,
        isCurrentMonth: false,
        isDisabled: dateObj < today || dateObj > maxDate
      });
    }

    // Split into weeks
    const rows = [];
    for (let r = 0; r < 6; r++) {
      rows.push(days.slice(r * 7, r * 7 + 7));
    }
    return rows;
  }, [currentYear, currentMonth, today, maxDate]);

  const handleDatePress = (day: any) => {
    if (!day.isCurrentMonth || day.isDisabled) return;
    onDateSelect(day.dateObj);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={goToPrev} style={styles.navButton}>
              <Icon source="chevron-left" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerText, { color: theme.textPrimary }]}>
              {MONTHS[currentMonth - 1]} {currentYear}
            </Text>
            <TouchableOpacity onPress={goToNext} style={styles.navButton}>
              <Icon source="chevron-right" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Weekday labels */}
          <View style={styles.weekdayRow}>
            {DAYS.map((day) => (
              <View key={day} style={styles.weekdayCell}>
                <Text style={[styles.weekdayText, { color: theme.textMuted }]}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          {weeks.map((week, r) => (
            <View key={r} style={styles.weekRow}>
              {week.map((day) => {
                const isToday = day.dateString === todayString;
                const isSelected = day.dateString === selectedDateString;

                return (
                  <TouchableOpacity
                    key={day.dateString}
                    style={[
                      styles.dayCell,
                      !day.isCurrentMonth && styles.dayCellMuted,
                      day.isDisabled && styles.dayCellDisabled,
                      isToday && { backgroundColor: theme.primaryLight },
                      isSelected && { backgroundColor: theme.primary },
                    ]}
                    onPress={() => handleDatePress(day)}
                    disabled={!day.isCurrentMonth || day.isDisabled}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { color: theme.textPrimary },
                        !day.isCurrentMonth && { color: theme.textMuted },
                        day.isDisabled && { color: theme.textMuted, opacity: 0.5 },
                        isToday && { color: theme.primary, fontWeight: '700' },
                        isSelected && { color: '#FFFFFF', fontWeight: '700' },
                      ]}
                    >
                      {day.date}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {/* Close button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.closeButton, { borderColor: theme.border }]}
              onPress={onClose}
            >
              <Text style={[styles.closeButtonText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    width: 320,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayCell: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    margin: 2,
  },
  dayCellMuted: {
    opacity: 0.3,
  },
  dayCellDisabled: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    marginTop: 16,
    alignItems: 'center',
  },
  closeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});