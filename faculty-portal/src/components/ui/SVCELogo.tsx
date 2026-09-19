/**
 * SVCE Logo Component
 * Official Sri Venkateshwara College of Engineering logo
 */
import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

interface SVCELogoProps {
  size?: 'sm' | 'md' | 'lg' | 'full';
  width?: number;
  height?: number;
  showText?: boolean;
  style?: any;
}

export default function SVCELogo({ size = 'md', width: customWidth, height: customHeight, showText = false, style }: SVCELogoProps) {
  const dimensions = {
    sm: { width: 180, height: 48 },
    md: { width: 280, height: 75 },
    lg: { width: 380, height: 100 },
    full: { width: 480, height: 128 },
  };

  const { width: defaultWidth, height: defaultHeight } = dimensions[size];
  const width = customWidth ?? defaultWidth;
  const height = customHeight ?? defaultHeight;

  return (
    <View style={[styles.container, { width, height }, style]}>
      <Image
        source={require('../../assets/images/svce-logo.png')}
        style={{ width, height }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
