import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { ThemeColors, shadows } from '../../../theme/hod/colors';
import { useTheme } from '../../../context/hod/ThemeContext';

export interface BarGroupDatum {
  label: string;
  value: number | null; // null = "no data"
  color: string;
  semester?: number;
  section?: string;
  onPress?: () => void;
}

export interface GroupedBarChartGroup {
  groupLabel: string;
  bars: BarGroupDatum[];
}

export interface GroupedBarChartProps {
  data: GroupedBarChartGroup[];
  height?: number;
  showValues?: boolean;
  unit?: string;
  title?: string;
  showLegend?: boolean;
}

const MAX_BAR_WIDTH = 36;
const BAR_GAP = 6;
const TOOLTIP_WIDTH = 180;
const TOOLTIP_HEIGHT = 72; // approximate, used for flip logic

export default function GroupedBarChart({
  data,
  height = 240,
  showValues = true,
  unit = '',
  title,
  showLegend = false,
}: GroupedBarChartProps) {
  const { colors: theme } = useTheme();
  const styles = getStyles(theme);
  const [hoveredBar, setHoveredBar] = useState<{
    groupIdx: number;
    barIdx: number;
    pageX: number;
    pageY: number;
    barWidth: number;
  } | null>(null);

  // Ref to the chartContainer so we can measure it
  const containerRef = useRef<any>(null);
  const [containerRect, setContainerRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  const [trackWidth, setTrackWidth] = useState(0);

  const onTrackLayout = (e: any) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const measureContainer = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.measure((_x: number, _y: number, w: number, h: number, pageX: number, pageY: number) => {
        setContainerRect({ left: pageX, top: pageY, width: w, height: h });
      });
    }
  }, []);

  const handleHoverIn = (groupIdx: number, barIdx: number, event: any) => {
    // On web, use getBoundingClientRect for accurate coordinates
    if (Platform.OS === 'web' && event?.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      setHoveredBar({
        groupIdx,
        barIdx,
        pageX: rect.left + rect.width / 2,
        pageY: rect.top,
        barWidth: rect.width,
      });
    }
  };

  const handleHoverOut = () => {
    setHoveredBar(null);
  };

  if (!data || data.length === 0) {
    return (
      <View style={styles.root}>
        {title && <Text style={styles.title}>{title}</Text>}
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  const maxValue = Math.max(100, ...data.flatMap((g) => g.bars.map((b) => b.value ?? 0)));
  const groupCount = data.length;
  const groupWidth = trackWidth ? trackWidth / groupCount : 250;

  // Legend items from first group
  const legendItems = showLegend && data.length > 0
    ? data[0].bars.map((bar) => ({ label: bar.label, color: bar.color }))
    : [];

  // Compute tooltip position relative to the page (fixed positioning)
  let tooltipLeft = 0;
  let tooltipTop = 0;
  let tooltipVisible = false;

  if (hoveredBar && containerRect) {
    tooltipVisible = true;
    // Center tooltip on bar center, clamp to container
    tooltipLeft = hoveredBar.pageX - TOOLTIP_WIDTH / 2;
    // Clamp horizontally to container bounds
    const containerLeft = containerRect.left;
    const containerRight = containerRect.left + containerRect.width;
    if (tooltipLeft < containerLeft + 8) {
      tooltipLeft = containerLeft + 8;
    }
    if (tooltipLeft + TOOLTIP_WIDTH > containerRight - 8) {
      tooltipLeft = containerRight - TOOLTIP_WIDTH - 8;
    }
    // Position above bar with 8px gap
    tooltipTop = hoveredBar.pageY - TOOLTIP_HEIGHT - 8;
    // If no room above, flip below
    if (tooltipTop < 0) {
      tooltipTop = hoveredBar.pageY + 20; // below the bar
    }
  }

  return (
    <View style={styles.root}>
      {title && (
        <View style={styles.headerRow}>
          <Text style={styles.title}>{title}</Text>
          {showLegend && legendItems.length > 0 && (
            <View style={styles.legend}>
              {legendItems.map((item) => (
                <View key={item.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>{item.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Chart Container */}
      <View
        ref={containerRef}
        onLayout={measureContainer}
        style={styles.chartContainer}
      >
        {/* Plot area */}
        <View style={[styles.track, { height, paddingTop: 28 }]} onLayout={onTrackLayout}>
          {data.map((group, groupIdx) => {
            const barsInGroup = group.bars.length;
            const totalGapWidth = BAR_GAP * (barsInGroup - 1);
            const availableWidth = groupWidth - 32;
            const calculatedBarWidth = (availableWidth - totalGapWidth) / barsInGroup;
            const barWidth = Math.min(MAX_BAR_WIDTH, Math.max(18, calculatedBarWidth));

            return (
              <View
                key={`${group.groupLabel}-${groupIdx}`}
                style={[styles.groupCol, { width: groupWidth }]}
              >
                <View style={styles.barsRow}>
                  {group.bars.map((bar, barIdx) => {
                    const barValue = bar.value ?? 0;
                    const hasData = bar.value !== null;
                    const barHeight = hasData
                      ? Math.max(8, (barValue / maxValue) * (height - 80))
                      : 4;

                    return (
                      <Pressable
                        key={`${bar.label}-${barIdx}`}
                        onPress={bar.onPress}
                        onHoverIn={(e) => handleHoverIn(groupIdx, barIdx, e)}
                        onHoverOut={handleHoverOut}
                        style={[styles.barCol, { width: barWidth }]}
                      >
                        {showValues && (
                          <Text style={styles.value} numberOfLines={1}>
                            {hasData ? `${barValue}${unit}` : '-'}
                          </Text>
                        )}
                        <View
                          style={[
                            styles.bar,
                            {
                              height: barHeight,
                              backgroundColor: hasData ? bar.color : theme.border,
                              width: barWidth,
                              opacity: hasData ? 1 : 0.3,
                            },
                          ]}
                        />
                        <Text style={styles.barLabel} numberOfLines={1}>
                          {bar.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.groupLabel} numberOfLines={1}>
                  {group.groupLabel}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Tooltip - fixed position on web, escapes scroll containers */}
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
            <Text style={styles.tooltipDeptName}>
              {data[hoveredBar.groupIdx].groupLabel} - Section {data[hoveredBar.groupIdx].bars[hoveredBar.barIdx].label}
            </Text>
            <Text style={styles.tooltipYearRow}>Average attendance</Text>
            <View style={styles.tooltipDivider} />
            <Text style={styles.tooltipTotal}>
              {data[hoveredBar.groupIdx].bars[hoveredBar.barIdx].value !== null
                ? `${data[hoveredBar.groupIdx].bars[hoveredBar.barIdx].value}${unit}`
                : 'No attendance data'}
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const getStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    root: {
      width: '100%',
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    legend: {
      flexDirection: 'row',
      gap: 12,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      fontSize: 10,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    emptyText: {
      fontSize: 13,
      color: theme.textMuted,
      textAlign: 'center',
      padding: 20,
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
    },
    groupCol: {
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
    },
    barsRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: BAR_GAP,
      justifyContent: 'center',
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
      color: theme.textSecondary,
      textAlign: 'center',
    },
    groupLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textPrimary,
      marginTop: 8,
      textAlign: 'center',
    },
    // Fixed positioning escapes ScrollView/overflow clipping
    tooltipFixed: {
      position: 'fixed' as any,
      width: TOOLTIP_WIDTH,
      zIndex: 99999,
    },
    tooltip: {
      backgroundColor: '#1e293b',
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      minWidth: TOOLTIP_WIDTH,
      maxWidth: 240,
      ...shadows.card,
    },
    tooltipDeptName: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 4,
    },
    tooltipYearRow: {
      color: '#94a3b8',
      fontSize: 10,
    },
    tooltipDivider: {
      height: 1,
      backgroundColor: '#334155',
      marginVertical: 4,
    },
    tooltipTotal: {
      color: '#e2e8f0',
      fontSize: 11,
      fontWeight: '600',
    },
  });
