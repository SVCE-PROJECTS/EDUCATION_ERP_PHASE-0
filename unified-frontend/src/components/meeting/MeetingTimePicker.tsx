// @ts-nocheck
/**
 * Meeting Time Picker Component
 * Analog clock interface for meeting time selection
 */

import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput as RNTextInput } from 'react-native';
import { Icon } from 'react-native-paper';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

interface MeetingTimePickerProps {
  visible: boolean;
  selectedTime: Date;
  onTimeSelect: (time: Date) => void;
  onClose: () => void;
  theme: any;
}

type SelectionStep = 'hour' | 'minute';

export default function MeetingTimePicker({
  visible,
  selectedTime,
  onTimeSelect,
  onClose,
  theme,
}: MeetingTimePickerProps) {
  const [step, setStep] = useState<SelectionStep>('hour');
  const [tempHour, setTempHour] = useState(() => {
    let hour = selectedTime.getHours();
    return hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  });
  const [tempMinute, setTempMinute] = useState(() => selectedTime.getMinutes());
  const [tempPeriod, setTempPeriod] = useState<'AM' | 'PM'>(() =>
    selectedTime.getHours() >= 12 ? 'PM' : 'AM'
  );
  // Manual entry mirrors the clock face — kept as plain strings while being
  // typed so "1" isn't forced to "01" mid-keystroke, then clamped on blur.
  const [hourText, setHourText] = useState(() => String(tempHour));
  const [minuteText, setMinuteText] = useState(() => String(tempMinute).padStart(2, '0'));

  const clockSize = 200;
  const center = clockSize / 2;
  const radius = 80;

  // Generate hour positions (1-12) — labels only now; hit-testing below is
  // computed continuously from the touch angle instead of per-mark circles.
  const hourPositions = useMemo(() => {
    const positions = [];
    for (let i = 1; i <= 12; i++) {
      const angle = (i * 30 - 90) * (Math.PI / 180); // 30 degrees per hour, -90 to start at 12
      const x = center + Math.cos(angle) * radius;
      const y = center + Math.sin(angle) * radius;
      positions.push({ hour: i, x, y, angle });
    }
    return positions;
  }, []);

  // Generate minute tick labels (0, 5, 10, ..., 55) — also labels only; any
  // minute 0-59 can be picked by tapping/dragging between ticks.
  const minutePositions = useMemo(() => {
    const positions = [];
    for (let i = 0; i < 60; i += 5) {
      const angle = (i * 6 - 90) * (Math.PI / 180); // 6 degrees per minute, -90 to start at 12
      const x = center + Math.cos(angle) * radius;
      const y = center + Math.sin(angle) * radius;
      positions.push({ minute: i, x, y, angle });
    }
    return positions;
  }, []);

  // Calculate hand position for current selection
  const getHandPosition = () => {
    if (step === 'hour') {
      const hour = tempHour === 12 ? 0 : tempHour;
      const angle = (hour * 30 - 90) * (Math.PI / 180);
      return {
        x: center + Math.cos(angle) * (radius - 20),
        y: center + Math.sin(angle) * (radius - 20),
      };
    } else {
      const angle = (tempMinute * 6 - 90) * (Math.PI / 180);
      return {
        x: center + Math.cos(angle) * (radius - 20),
        y: center + Math.sin(angle) * (radius - 20),
      };
    }
  };

  // Single continuous hit area for the whole clock face. Earlier this used
  // one small (40px) TouchableOpacity circle per mark — at a 200px clock
  // with 12 marks on an 80px-radius ring, adjacent marks sit only ~41px
  // apart center-to-center, so those circles overlapped and a tap near the
  // boundary could register the neighboring mark (tapping 12 selected 1,
  // tapping minute 30 selected 25, etc). Computing the value directly from
  // the touch angle removes that ambiguity — every angle maps to exactly
  // one nearest hour/minute — and as a side effect allows picking any
  // minute (not just 5-minute steps), since the angle is continuous.
  const handleTouch = (evt: any) => {
    const { locationX, locationY } = evt.nativeEvent;
    const dx = locationX - center;
    const dy = locationY - center;
    const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
    const normalized = ((angleDeg + 90) % 360 + 360) % 360; // 0 = 12 o'clock, clockwise

    if (step === 'hour') {
      let h = Math.round(normalized / 30) % 12;
      if (h === 0) h = 12;
      setTempHour(h);
      setHourText(String(h));
    } else {
      const m = Math.round(normalized / 6) % 60;
      setTempMinute(m);
      setMinuteText(String(m).padStart(2, '0'));
    }
  };

  const handleRelease = () => {
    if (step === 'hour') setStep('minute');
  };

  const handleHourTextChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 2);
    setHourText(digits);
    const n = parseInt(digits, 10);
    if (Number.isInteger(n) && n >= 1 && n <= 12) setTempHour(n);
  };

  const handleMinuteTextChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 2);
    setMinuteText(digits);
    const n = parseInt(digits, 10);
    if (Number.isInteger(n) && n >= 0 && n <= 59) setTempMinute(n);
  };

  const handleHourTextBlur = () => {
    setHourText(String(tempHour));
  };

  const handleMinuteTextBlur = () => {
    setMinuteText(String(tempMinute).padStart(2, '0'));
  };

  const handleConfirm = () => {
    const newTime = new Date(selectedTime);
    let hour24 = tempHour;
    if (tempPeriod === 'AM' && tempHour === 12) hour24 = 0;
    if (tempPeriod === 'PM' && tempHour !== 12) hour24 = tempHour + 12;

    newTime.setHours(hour24, tempMinute, 0, 0);
    onTimeSelect(newTime);
    onClose();
  };

  const handleCancel = () => {
    // Reset to original values
    const origHour = selectedTime.getHours();
    const resetHour = origHour === 0 ? 12 : origHour > 12 ? origHour - 12 : origHour;
    setTempHour(resetHour);
    setTempMinute(selectedTime.getMinutes());
    setTempPeriod(selectedTime.getHours() >= 12 ? 'PM' : 'AM');
    setHourText(String(resetHour));
    setMinuteText(String(selectedTime.getMinutes()).padStart(2, '0'));
    setStep('hour');
    onClose();
  };

  const handPos = getHandPosition();
  const displayTime = `${tempHour}:${String(tempMinute).padStart(2, '0')} ${tempPeriod}`;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={handleCancel} />
        <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              {step === 'hour' ? 'Select Hour' : 'Select Minutes'}
            </Text>
            <Text style={[styles.displayTime, { color: theme.primary }]}>
              {displayTime}
            </Text>
          </View>

          {/* Clock Face */}
          <View style={styles.clockContainer}>
            <Svg width={clockSize} height={clockSize}>
              {/* Clock circle */}
              <Circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={theme.border}
                strokeWidth="2"
              />

              {/* Numbers */}
              {step === 'hour' ? (
                hourPositions.map(pos => (
                  <SvgText
                    key={pos.hour}
                    x={pos.x}
                    y={pos.y + 6}
                    fontSize="16"
                    fontWeight={pos.hour === tempHour ? 'bold' : 'normal'}
                    fill={pos.hour === tempHour ? theme.primary : theme.textPrimary}
                    textAnchor="middle"
                  >
                    {pos.hour}
                  </SvgText>
                ))
              ) : (
                minutePositions.map(pos => (
                  <SvgText
                    key={pos.minute}
                    x={pos.x}
                    y={pos.y + 6}
                    fontSize="12"
                    fontWeight={pos.minute === tempMinute ? 'bold' : 'normal'}
                    fill={pos.minute === tempMinute ? theme.primary : theme.textSecondary}
                    textAnchor="middle"
                  >
                    {String(pos.minute).padStart(2, '0')}
                  </SvgText>
                ))
              )}

              {/* Hand */}
              <Line
                x1={center}
                y1={center}
                x2={handPos.x}
                y2={handPos.y}
                stroke={theme.primary}
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Center dot */}
              <Circle
                cx={center}
                cy={center}
                r="4"
                fill={theme.primary}
              />
            </Svg>

            {/* Single continuous touch surface — see handleTouch comment */}
            <View
              style={styles.touchSurface}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={handleTouch}
              onResponderMove={handleTouch}
              onResponderRelease={handleRelease}
            />
          </View>

          {/* Manual entry — alternative to tapping the clock face */}
          <View style={styles.manualRow}>
            <RNTextInput
              value={hourText}
              onChangeText={handleHourTextChange}
              onBlur={handleHourTextBlur}
              onFocus={() => setStep('hour')}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="HH"
              placeholderTextColor={theme.textMuted}
              style={[styles.manualInput, { color: theme.textPrimary, borderColor: theme.border }]}
              accessibilityLabel="Hour"
            />
            <Text style={[styles.manualColon, { color: theme.textPrimary }]}>:</Text>
            <RNTextInput
              value={minuteText}
              onChangeText={handleMinuteTextChange}
              onBlur={handleMinuteTextBlur}
              onFocus={() => setStep('minute')}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="MM"
              placeholderTextColor={theme.textMuted}
              style={[styles.manualInput, { color: theme.textPrimary, borderColor: theme.border }]}
              accessibilityLabel="Minute"
            />
          </View>

          {/* AM/PM Toggle */}
          <View style={styles.periodContainer}>
            <TouchableOpacity
              style={[
                styles.periodButton,
                { backgroundColor: tempPeriod === 'AM' ? theme.primary : theme.surface, borderColor: theme.border }
              ]}
              onPress={() => setTempPeriod('AM')}
            >
              <Text style={[
                styles.periodText,
                { color: tempPeriod === 'AM' ? '#FFFFFF' : theme.textSecondary }
              ]}>
                AM
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.periodButton,
                { backgroundColor: tempPeriod === 'PM' ? theme.primary : theme.surface, borderColor: theme.border }
              ]}
              onPress={() => setTempPeriod('PM')}
            >
              <Text style={[
                styles.periodText,
                { color: tempPeriod === 'PM' ? '#FFFFFF' : theme.textSecondary }
              ]}>
                PM
              </Text>
            </TouchableOpacity>
          </View>

          {/* Step indicator */}
          {step === 'hour' && (
            <Text style={[styles.instruction, { color: theme.textMuted }]}>
              Tap or drag to pick an hour, then select minutes
            </Text>
          )}

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: theme.border }]}
              onPress={handleCancel}
            >
              <Text style={[styles.buttonText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton, { backgroundColor: theme.primary }]}
              onPress={handleConfirm}
            >
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Confirm</Text>
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
    padding: 24,
    width: 320,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  displayTime: {
    fontSize: 24,
    fontWeight: '700',
  },
  clockContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  touchSurface: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 100,
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  manualInput: {
    width: 52,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  manualColon: {
    fontSize: 18,
    fontWeight: '700',
  },
  periodContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 50,
    alignItems: 'center',
  },
  periodText: {
    fontSize: 16,
    fontWeight: '600',
  },
  instruction: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {
    // backgroundColor set inline
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
