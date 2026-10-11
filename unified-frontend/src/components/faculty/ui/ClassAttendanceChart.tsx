/**
 * Class Attendance Chart - Faculty Portal
 * Shows attendance % for each allocated class with tooltips and navigation
 */
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { colors, ThemeColors, shadows, primaryScale } from '../../../theme/faculty/colors';
import { useTheme } from '../../../context/faculty/ThemeContext';
import { ROUTES } from '../../../navigation/faculty/routes';
import type { FacultyClass } from '../../../services/faculty/class.service';

const MAX_BAR_WIDTH = 36;
const BAR_GAP = 6;
const TOOLTIP_WIDTH = 200;
const TOOLTIP_HEIGHT = 80;

interface ClassWithAttendance extends FacultyClass {
  attendancePercent: number | null;
  studentCount?: number;
}

interface ClassAttendanceChartProps {
  classes: ClassWithAttendance[];
  height?: number;
}

export default function ClassAttendanceChart({
  classes,
  height = 240,
}: ClassAttendanceChartProps) {
  const { colors: theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();
  
  const [hoveredBar, setHoveredBar] = useState<{
    index: number;
    pageX: number;
    pageY: number;
  } | null>(null);

  const containerRef = React.useRef<any>(null);
  const [containerRect, setContainerRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [trackWidth, setTrackWidth] = useState(0);

  const measureContainer = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.measure((x: number, y: number, w: number, h: number, pageX: number, pageY: number) => {
        setContainerRect({ left: pageX, top: pageY, width: w, height: h });
      });
    }
  }, []);

  const onTrackLayout = (e: any) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const handleHoverIn = (index: number, event: any) => {
    if (Platform.OS === 'web' && event?.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      setHoveredBar({
        index,
        pageX: rect.left + rect.width / 2,
        pageY: rect.top,
      });
    }
  };

  const handleHoverOut = () => {
    setHoveredBar(null);
  };

  const handleBarPress = () => {
    navigation.navigate(ROUTES.ATTENDANCE);
  };

  if (!classes || classes.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionLabel}>CLASS ATTENDANCE</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No classes allocated yet</Text>
          <Text style={styles.emptyDesc}>Classes will appear here once they are assigned to you</Text>
        </View>
      </View>
    );
  }

  const maxValue = 100;
  const classCount = classes.length;
  const barWidth = trackWidth && classCount > 0
    ? Math.min(MAX_BAR_WIDTH, Math.max(18, (trackWidth - (classCount + 1) * BAR_GAP) / classCount))
    : 32;

  // Compute tooltip position
  let tooltipLeft = 0;
  let tooltipTop = 0;
  let tooltipVisible = false;

  if (hoveredBar && containerRect) {
    tooltipVisible = true;
    tooltipLeft = hoveredBar.pageX - TOOLTIP_WIDTH / 2;
    const containerLeft = containerRect.left;
    const containerRight = containerRect.left + containerRect.width;
    if (tooltipLeft < containerLeft + 8) {
      tooltipLeft = containerLeft + 8;
    }
    if (tooltipLeft + TOOLTIP_WIDTH > containerRight - 8) {
      tooltipLeft = containerRight - TOOLTIP_WIDTH - 8;
    }
    tooltipTop = hoveredBar.pageY - TOOLTIP_HEIGHT - 8;
    if (tooltipTop < 0) {
      tooltipTop = hoveredBar.pageY + 20;
    }
  }

  const chartColors = [
    colors.blue[600],
    colors.purple[600],
    colors.green[600],
    colors.amber[600],
    colors.red[600],
    primaryScale[600],
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>CLASS ATTENDANCE</Text>

      <View
        ref={containerRef}
        onLayout={measureContainer}
        style={styles.chartContainer}
      >
        <View style={[styles.track, { height, paddingTop: 28 }]} onLayout={onTrackLayout}>
          {classes.map((cls, index) => {
            const percent = cls.attendancePercent ?? 0;
            const hasData = cls.attendancePercent !== null;
            const barHeight = hasData
              ? Math.max(8, (percent / maxValue) * (height - 80))
              : 4;
            const barColor = chartColors[index % chartColors.length];

            return (
              <Pressable
                key={cls.class_id}
                onPress={handleBarPress}
                onHoverIn={(e) => handleHoverIn(index, e)}
                onHoverOut={handleHoverOut}
                style={[styles.barCol, { width: barWidth }]}
              >
                <Text style={styles.value} numberOfLines={1}>
                  {hasData ? `${percent}%` : '-'}
                </Text>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: hasData ? barColor : theme.border,
                      width: barWidth,
                      opacity: hasData ? 1 : 0.3,
                    },
                  ]}
                />
                <Text style={styles.barLabel} numberOfLines={2}>
                  {cls.subject_code}
                </Text>
                <Text style={styles.barSubLabel} numberOfLines={1}>
                  S{cls.semester}-{cls.section}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text style={styles.chartHelp}>Tap to open Attendance</Text>

      {/* Tooltip */}
      {tooltipVisible && hoveredBar !== null && (
        <Animated.View
          entering={FadeInDown.duration(150)}
          exiting={FadeOutUp.duration(100)}
          style={[
            styles.tooltipFixed,
            {
              left: tooltipLeft,
              top: tooltipTop,
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.tooltip}>
            <Text style={styles.tooltipTitle}>
              {classes[hoveredBar.index].subject_name} ({classes[hoveredBar.index].subject_code})
            </Text>
            <Text style={styles.tooltipSubtitle}>
              Semester {classes[hoveredBar.index].semester} - Section {classes[hoveredBar.index].section}
            </Text>
            <View style={styles.tooltipDivider} />
            <Text style={styles.tooltipValue}>
              {classes[hoveredBar.index].attendancePercent !== null
                ? `${classes[hoveredBar.index].attendancePercent}% attendance`
                : 'No data'}
              {classes[hoveredBar.index].studentCount ? ` · ${classes[hoveredBar.index].studentCount} students` : ''}
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const getStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 22,
      gap: 0,
      ...shadows.card,
      overflow: 'visible' as any,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textSecondary,
      letterSpacing: 0.6,
      marginBottom: 20,
    },
    emptyState: {
      paddingVertical: 40,
      alignItems: 'center',
      gap: 8,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    emptyDesc: {
      fontSize: 13,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    chartContainer: {
      position: 'relative' as any,
      width: '100%',
      overflow: 'visible' as any,
    },
    track: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-around',
      width: '100%',
      overflow: 'visible' as any,
      gap: BAR_GAP,
    },
    barCol: {
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 6,
      cursor: 'pointer' as any,
    },
    bar: {
      borderTopLeftRadius: 6,
      borderTopRightRadius: 6,
      minWidth: 14,
    },
    value: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    barLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.textPrimary,
      textAlign: 'center',
      marginTop: 4,
    },
    barSubLabel: {
      fontSize: 9,
      fontWeight: '500',
      color: theme.textSecondary,
      textAlign: 'center',
    },
    chartHelp: {
      fontSize: 11,
      color: theme.textMuted,
      textAlign: 'center',
      marginTop: 12,
    },
    tooltipFixed: {
      position: 'fixed' as any,
      width: TOOLTIP_WIDTH,
      zIndex: 99999,
    },
    tooltip: {
      backgroundColor: '#1e293b',
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      minWidth: TOOLTIP_WIDTH,
      ...shadows.card,
    },
    tooltipTitle: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 2,
    },
    tooltipSubtitle: {
      color: '#94a3b8',
      fontSize: 10,
      marginBottom: 6,
    },
    tooltipDivider: {
      height: 1,
      backgroundColor: '#334155',
      marginVertical: 6,
    },
    tooltipValue: {
      color: '#e2e8f0',
      fontSize: 11,
      fontWeight: '600',
    },
  });
