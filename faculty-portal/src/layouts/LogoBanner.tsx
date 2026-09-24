import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

const svceBanner = require('../assets/svce_banner.png');
const ASPECT_RATIO = 1133 / 260;

export interface LogoBannerProps {
  height?: number;
  rounded?: boolean;
}

export default function LogoBanner({ height = 80, rounded }: LogoBannerProps) {
  return (
    <View style={[styles.wrap, { height }, rounded && styles.rounded]}>
      <Image
        source={svceBanner}
        style={{ height: height - 20, width: (height - 20) * ASPECT_RATIO }}
        resizeMode="contain"
        accessibilityLabel="SVCE — Sri Venkateshwara College of Engineering"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    backgroundColor: '#000000',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  rounded: { borderRadius: 14, overflow: 'hidden' },
});
