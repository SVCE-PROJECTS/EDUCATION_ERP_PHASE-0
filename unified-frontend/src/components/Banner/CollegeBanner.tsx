// @ts-nocheck
import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

const svceBanner = require('../../assets/svce_banner.png');

// Real file is 1133x260 (~4.36:1). The old banner stretched this to full
// viewport width at a fixed 95px height with resizeMode="stretch", which
// distorts the crest into an oval and warps the lettering. Rendering it at
// its natural aspect ratio with resizeMode="contain" keeps it crisp and
// undistorted — it just won't span the full bar width anymore, which is
// correct for a logo lockup rather than a panoramic banner.
const ASPECT_RATIO = 1133 / 260;

const CollegeBanner = ({ height = 80 }) => (
  <View style={[styles.wrap, { height }]}>
    <Image
      source={svceBanner}
      style={{ height: height - 20, width: (height - 20) * ASPECT_RATIO }}
      resizeMode="contain"
    />
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    backgroundColor: '#000000',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});

export default CollegeBanner;
