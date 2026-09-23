import React, { useState } from 'react';
import { Image, View, StyleSheet, LayoutChangeEvent } from 'react-native';
import svceLogoBanner from '../assets/svce-logo-banner.png';

const ASPECT_RATIO = 469 / 35;

/**
 * LogoBanner — full-width SVCE wordmark strip.
 *
 * Height is computed explicitly from the container's measured width
 * (rather than relying on the CSS `aspectRatio` style, which some builds
 * of react-native-web don't apply consistently before the image paints,
 * causing "cover" to zoom in and crop the top/bottom of the logo). This
 * guarantees the full logo is always visible, uncropped, and fills the
 * banner edge-to-edge with no letterboxing on every screen size.
 */
export interface LogoBannerProps {
  /** Rounds the corners — use when embedding inside a card rather than full-bleed. */
  rounded?: boolean;
}

export default function LogoBanner({ rounded }: LogoBannerProps) {
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w && w !== width) setWidth(w);
  };

  const height = width ? width / ASPECT_RATIO : undefined;

  return (
    <View style={[styles.wrap, rounded && styles.rounded]} onLayout={onLayout}>
      {!!height && (
        <Image
          source={svceLogoBanner}
          style={{ width, height }}
          resizeMode="stretch"
          accessibilityLabel="SVCE — Sri Venkateshwara College of Engineering"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', backgroundColor: '#000000'},
  rounded: { borderRadius: 14, overflow: 'hidden' },
});