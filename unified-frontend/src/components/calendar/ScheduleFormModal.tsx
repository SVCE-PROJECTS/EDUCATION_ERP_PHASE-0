// @ts-nocheck
/**
 * ScheduleFormModal Component
 * Modal for creating and editing schedules
 * Includes DatePickerModal and TimePickerModal
 * Shared across all portals (Admin, HOD, Faculty)
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, Modal, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Schedule } from '../../services/schedule.service';
import { useCreateSchedule, useUpdateSchedule } from '../../hooks/useSchedules';
import MiniCalendar from './MiniCalendar';
import { formatDateLong, normalizeDateString } from '../../utils/dateHelpers';
import { showError } from '../../utils/confirmDialog';

interface ScheduleFormModalProps {
  visible: boolean;
  onClose: () => void;
  initialDate?: string; // YYYY-MM-DD
  schedule?: Schedule; // If present, edit mode
  theme: any;
}

export default function ScheduleFormModal({ 
  visible, 
  onClose, 
  initialDate, 
  schedule,
  theme 
}: ScheduleFormModalProps) {
  const isEdit = !!schedule;
  const { createSchedule, loading: creating } = useCreateSchedule();
  const { updateSchedule, loading: updating } = useUpdateSchedule();
  const loading = creating || updating;

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  
  const [titleError, setTitleError] = useState('');
  const [dateError, setDateError] = useState('');
  const [timeError, setTimeError] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      if (schedule) {
        setTitle(schedule.title);
        setDate(normalizeDateString(schedule.date) || schedule.date);
        setTime(schedule.time || '');
        setDescription(schedule.description || '');
      } else {
        setTitle('');
        setDate(normalizeDateString(initialDate) || initialDate || '');
        setTime('');
        setDescription('');
      }
      setTitleError('');
      setDateError('');
      setTimeError('');
    }
  }, [visible, schedule, initialDate]);

  const validate = () => {
    let valid = true;
    if (!title.trim()) {
      setTitleError('Title is required');
      valid = false;
    } else {
      setTitleError('');
    }
    if (!date) {
      setDateError('Date is required');
      valid = false;
    } else {
      setDateError('');
    }
    if (!time) {
      setTimeError('Time is required');
      valid = false;
    } else {
      setTimeError('');
    }
    return valid;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      // Convert HH:mm to HH:mm:ss for backend
      const start_time = time + ':00';
      
      if (isEdit && schedule) {
        await updateSchedule(schedule.id, {
          title: title.trim(),
          date,
          start_time,
          description: description.trim() || undefined,
          status: schedule.status,
        });
      } else {
        await createSchedule({
          title: title.trim(),
          date,
          start_time,
          description: description.trim() || undefined,
        });
      }
      onClose();
    } catch (err: any) {
      showError('Error', err.message || 'Failed to save schedule');
    }
  };

  const s = useMemo(() => getStyles(theme), [theme]);

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
          <View style={s.modal}>
            {/* Header */}
            <View style={s.header}>
              <Text style={s.headerTitle}>{isEdit ? 'Edit Schedule' : 'Add Schedule'}</Text>
              <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={s.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Body */}
            <ScrollView style={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Title */}
              <View style={s.field}>
                <Text style={s.label}>Project Title <Text style={s.required}>*</Text></Text>
                <TextInput
                  style={[s.input, titleError && s.inputError]}
                  value={title}
                  onChangeText={(text) => {
                    setTitle(text);
                    setTitleError('');
                  }}
                  placeholder="Enter schedule title"
                  placeholderTextColor={theme.placeholder}
                  editable={!loading}
                />
                {titleError ? <Text style={s.errorText}>{titleError}</Text> : null}
              </View>

              {/* Date */}
              <View style={s.field}>
                <Text style={s.label}>Date <Text style={s.required}>*</Text></Text>
                <TouchableOpacity
                  style={[s.input, s.inputTouchable, dateError && s.inputError]}
                  onPress={() => setShowDatePicker(true)}
                  disabled={loading}
                >
                  <Text style={date ? s.inputText : s.inputPlaceholder}>
                    {date ? formatDateLong(date) : 'Select date'}
                  </Text>
                </TouchableOpacity>
                {dateError ? <Text style={s.errorText}>{dateError}</Text> : null}
              </View>

              {/* Time */}
              <View style={s.field}>
                <Text style={s.label}>Time <Text style={s.required}>*</Text></Text>
                <TouchableOpacity
                  style={[s.input, s.inputTouchable, timeError && s.inputError]}
                  onPress={() => setShowTimePicker(true)}
                  disabled={loading}
                >
                  <Text style={time ? s.inputText : s.inputPlaceholder}>
                    {time || 'Select time'}
                  </Text>
                </TouchableOpacity>
                {timeError ? <Text style={s.errorText}>{timeError}</Text> : null}
              </View>

              {/* Description */}
              <View style={s.field}>
                <Text style={s.label}>Description</Text>
                <TextInput
                  style={[s.input, s.inputMultiline]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Enter description (optional)"
                  placeholderTextColor={theme.placeholder}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!loading}
                />
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={s.footer}>
              <TouchableOpacity style={[s.btn, s.btnSecondary]} onPress={onClose} disabled={loading}>
                <Text style={s.btnTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, s.btnPrimary, loading && s.btnDisabled]}
                onPress={handleSave}
                disabled={loading}
              >
                <Text style={s.btnTextPrimary}>{loading ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        current={date}
        onSelect={(selected) => {
          setDate(selected);
          setDateError('');
          setShowDatePicker(false);
        }}
        onClose={() => setShowDatePicker(false)}
        theme={theme}
      />

      {/* Time Picker Modal */}
      <TimePickerModal
        visible={showTimePicker}
        current={time}
        onSelect={(selected) => {
          setTime(selected);
          setTimeError('');
          setShowTimePicker(false);
        }}
        onClose={() => setShowTimePicker(false)}
        theme={theme}
      />
    </>
  );
}

// ── DatePickerModal ──────────────────────────────────────────────────────────
interface DatePickerProps {
  visible: boolean;
  current: string; // YYYY-MM-DD
  onSelect: (date: string) => void;
  onClose: () => void;
  theme: any;
}

function DatePickerModal({ visible, current, onSelect, onClose, theme }: DatePickerProps) {
  const [picked, setPicked] = useState<string | null>(
    current || new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    if (visible) {
      setPicked(current || new Date().toISOString().split('T')[0]);
    }
  }, [visible, current]);

  const s = dpStyles(theme);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={s.box} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <Text style={s.title}>Select Date</Text>
          <MiniCalendar
            selectedDate={picked || undefined}
            onDatePress={(dateStr) => setPicked(dateStr)}
            calWidth={300}
            theme={theme}
          />
          <View style={s.actions}>
            <TouchableOpacity style={[s.btn, s.btnCancel]} onPress={onClose}>
              <Text style={s.btnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, s.btnSelect]}
              onPress={() => {
                if (picked) {
                  onSelect(picked);
                }
              }}
            >
              <Text style={s.btnSelectText}>Select</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const dpStyles = (theme: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  box: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 20,
    width: 340,
    borderWidth: 1,
    borderColor: theme.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.border,
  },
  btnSelect: {
    backgroundColor: theme.primary,
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  btnSelectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

// ── TimePickerModal ──────────────────────────────────────────────────────────
interface TimePickerModalProps {
  visible: boolean;
  current: string; // HH:mm
  onSelect: (time: string) => void;
  onClose: () => void;
  theme: any;
}

// Convert 24h to 12h
function to12(time24: string): { hour: number; minute: number; ampm: 'AM' | 'PM' } {
  if (!time24) return { hour: 9, minute: 0, ampm: 'AM' };
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { hour, minute: m, ampm };
}

// Convert 12h to 24h
function to24(hour: number, minute: number, ampm: 'AM' | 'PM'): string {
  let h = hour;
  if (ampm === 'AM' && h === 12) h = 0;
  if (ampm === 'PM' && h !== 12) h += 12;
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function TimePickerModal({ visible, current, onSelect, onClose, theme }: TimePickerModalProps) {
  const init = to12(current);
  const [hour, setHour] = useState(init.hour);
  const [minute, setMinute] = useState(init.minute);
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(init.ampm);

  useEffect(() => {
    if (visible) {
      const t = to12(current || '09:00');
      setHour(t.hour);
      setMinute(t.minute);
      setAmpm(t.ampm);
    }
  }, [visible, current]);

  const s = tpmStyles(theme);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={s.box} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <Text style={s.title}>Select Time</Text>

          <View style={s.pickers}>
            {/* Hour */}
            <View style={s.picker}>
              <TouchableOpacity onPress={() => setHour((h) => (h === 12 ? 1 : h + 1))} style={s.pickerBtn}>
                <Text style={s.arrow}>▲</Text>
              </TouchableOpacity>
              <View style={s.pickerValue}>
                <Text style={s.pickerText}>{String(hour).padStart(2, '0')}</Text>
              </View>
              <TouchableOpacity onPress={() => setHour((h) => (h === 1 ? 12 : h - 1))} style={s.pickerBtn}>
                <Text style={s.arrow}>▼</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.colon}>:</Text>

            {/* Minute */}
            <View style={s.picker}>
              <TouchableOpacity onPress={() => setMinute((m) => (m + 5) % 60)} style={s.pickerBtn}>
                <Text style={s.arrow}>▲</Text>
              </TouchableOpacity>
              <View style={s.pickerValue}>
                <Text style={s.pickerText}>{String(minute).padStart(2, '0')}</Text>
              </View>
              <TouchableOpacity onPress={() => setMinute((m) => (m - 5 + 60) % 60)} style={s.pickerBtn}>
                <Text style={s.arrow}>▼</Text>
              </TouchableOpacity>
            </View>

            {/* AM/PM */}
            <View style={s.picker}>
              <TouchableOpacity onPress={() => setAmpm(ampm === 'AM' ? 'PM' : 'AM')} style={s.pickerBtn}>
                <Text style={s.arrow}>▲</Text>
              </TouchableOpacity>
              <View style={s.pickerValue}>
                <Text style={s.pickerText}>{ampm}</Text>
              </View>
              <TouchableOpacity onPress={() => setAmpm(ampm === 'AM' ? 'PM' : 'AM')} style={s.pickerBtn}>
                <Text style={s.arrow}>▼</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.actions}>
            <TouchableOpacity style={[s.btn, s.btnCancel]} onPress={onClose}>
              <Text style={s.btnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, s.btnSelect]}
              onPress={() => {
                const time24 = to24(hour, minute, ampm);
                onSelect(time24);
              }}
            >
              <Text style={s.btnSelectText}>Select</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const tpmStyles = (theme: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  box: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: theme.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 24,
    textAlign: 'center',
  },
  pickers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  picker: {
    alignItems: 'center',
  },
  pickerBtn: {
    padding: 8,
  },
  arrow: {
    fontSize: 16,
    color: theme.textPrimary,
  },
  pickerValue: {
    backgroundColor: theme.background,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 60,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  pickerText: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  colon: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.textPrimary,
    marginTop: -8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.border,
  },
  btnSelect: {
    backgroundColor: theme.primary,
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  btnSelectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

const getStyles = (theme: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    width: '92%',
    maxWidth: 500,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: theme.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    fontSize: 20,
    color: theme.textMuted,
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 8,
  },
  required: {
    color: '#DC2626',
  },
  input: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.textPrimary,
  },
  inputTouchable: {
    justifyContent: 'center',
  },
  inputText: {
    fontSize: 14,
    color: theme.textPrimary,
  },
  inputPlaceholder: {
    fontSize: 14,
    color: theme.placeholder,
  },
  inputMultiline: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#DC2626',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: theme.primary,
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.border,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  btnTextSecondary: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textPrimary,
  },
});
