/**
 * Progress Ring Component
 * Circular progress indicator for percentages
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { primaryScale, neutral, colors } from '../../theme/colors';

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  color?: string;
}

export default function ProgressRing({ 
  percentage, 
  size = 120, 
  strokeWidth = 12,
  label,
  color = primaryScale[500]
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Simple SVG-like rendering using React Native Views
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background Circle */}
      <View 
        style={[
          styles.circle, 
          styles.backgroundCircle,
          { 
            width: size - strokeWidth, 
            height: size - strokeWidth, 
            borderRadius: (size - strokeWidth) / 2,
            borderWidth: strokeWidth,
            borderColor: neutral[100],
          }
        ]} 
      />
      
      {/* Progress Circle (simplified) */}
      <View 
        style={[
          styles.circle, 
          styles.progressCircle,
          { 
            width: size - strokeWidth, 
            height: size - strokeWidth, 
            borderRadius: (size - strokeWidth) / 2,
            borderWidth: strokeWidth,
            borderColor: color,
            transform: [{ rotate: '-90deg' }],
          }
        ]} 
      >
        {/* This is a simplified version - for full circle progress, 
            you'd typically use react-native-svg, but this gives a good visual */}
        <View 
          style={[
            styles.progressMask,
            {
              width: '50%',
              height: '100%',
              backgroundColor: colors.white,
              opacity: progress < 50 ? 1 : 0,
            }
          ]}
        />
      </View>

      {/* Center Content */}
      <View style={styles.centerContent}>
        <Text style={[styles.percentageText, { fontSize: size * 0.25 }]}>
          {Math.round(progress)}%
        </Text>
        {label && (
          <Text style={[styles.label, { fontSize: size * 0.12 }]}>
            {label}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  circle: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundCircle: {
    // Static background
  },
  progressCircle: {
    // Animated progress
    shadowColor: primaryScale[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  progressMask: {
    position: 'absolute',
    right: 0,
  },
  centerContent: {
    alignItems: 'center',
    gap: 2,
  },
  percentageText: {
    fontWeight: '700',
    color: neutral[900],
  },
  label: {
    color: neutral[600],
    fontWeight: '500',
  },
});
