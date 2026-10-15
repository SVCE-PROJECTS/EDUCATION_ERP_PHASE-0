// @ts-nocheck
/**
 * Meeting Time Picker Component
 * Analog clock interface for meeting time selection
 */

import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
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

  const clockSize = 200;
  const center = clockSize / 2;
  const radius = 80;

  // Generate hour positions (1-12)
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

  // Generate minute positions (0, 5, 10, ..., 55)
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

  const handleHourPress = (hour: number) => {
    setTempHour(hour);
    setStep('minute');
  };

  const handleMinutePress = (minute: number) => {
    setTempMinute(minute);
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
    setTempHour(origHour === 0 ? 12 : origHour > 12 ? origHour - 12 : origHour);
    setTempMinute(selectedTime.getMinutes());
    setTempPeriod(selectedTime.getHours() >= 12 ? 'PM' : 'AM');
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

            {/* Invisible touch targets */}
            <View style={styles.touchTargets}>
              {step === 'hour' ? (
                hourPositions.map(pos => (
                  <TouchableOpacity
                    key={pos.hour}
                    style={[
                      styles.touchTarget,
                      {
                        left: pos.x - 20,
                        top: pos.y - 20,
                      }
                    ]}
                    onPress={() => handleHourPress(pos.hour)}
                  />
                ))
              ) : (
                minutePositions.map(pos => (
                  <TouchableOpacity
                    key={pos.minute}
                    style={[
                      styles.touchTarget,
                      {
                        left: pos.x - 20,
                        top: pos.y - 20,
                      }
                    ]}
                    onPress={() => handleMinutePress(pos.minute)}
                  />
                ))
              )}
            </View>
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
              Tap an hour, then select minutes
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
    marginBottom: 24,
    position: 'relative',
  },
  touchTargets: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  touchTarget: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
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