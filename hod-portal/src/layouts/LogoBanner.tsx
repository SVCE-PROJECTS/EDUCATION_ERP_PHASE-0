import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

const svceBanner = require('../assets/svce_banner.png');

// Same asset + rendering approach as admin-frontend's CollegeBanner, so the
// banner looks identical across portals. Real file is 1133x260 (~4.36:1).
// Rendered at its natural aspect ratio with resizeMode="contain" — a fixed
// bar height with the logo left-aligned, not stretched full-bleed.
const ASPECT_RATIO = 1133 / 260;

export interface LogoBannerProps {
  height?: number;
  /** Rounds the corners — use when embedding inside a card rather than full-bleed. */
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
