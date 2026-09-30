import React from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { Menu } from '../icons';

const svceBanner = require('../../../assets/svce_banner.png');
const BANNER_ASPECT = 1133 / 260;

// -- Topbar -------------------------------------------------------------------

export interface TopbarProps {
  title?: string;
}

export default function Topbar({ title }: TopbarProps) {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  return (
    <View style={styles.bar}>
      {/* Hamburger menu for mobile (positioned absolutely over banner area) */}
      {!isLargeScreen && (
        <TouchableOpacity 
          onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
          style={styles.menuBtn} 
          accessibilityLabel="Open menu"
        >
          <Menu size={20} color="#ffffff" />
        </TouchableOpacity>
      )}

      {/* SVCE Banner - left aligned like Admin portal - 261.5 x 60 */}
      <Image
        source={svceBanner}
        style={{ width: 261.5, height: 60 }}
        resizeMode="contain"
        accessibilityLabel="SVCE"
      />
    </View>
  );
}

// -- Styles -------------------------------------------------------------------

const BAR_HEIGHT = 80; // Accommodate 60px banner + padding

const styles = StyleSheet.create({
  bar: {
    height: BAR_HEIGHT,
    width: '100%',
    backgroundColor: '#000000',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: 24,
    position: 'relative',
  },
  menuBtn: {
    position: 'absolute',
    left: 8,
    top: '50%',
    transform: [{ translateY: -20 }],
    padding: 8,
    zIndex: 10,
  },
});