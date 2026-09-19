// @ts-nocheck
import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import Sidebar from '../components/Sidebar/Sidebar';
import { colors } from '../theme';

const svceBanner = require('../assets/svce_banner.png');

// Wrap any screen's content with this to get the persistent left sidebar.
// activeScreen must match one of the route names in AppNavigator so the
// matching nav item highlights correctly.
const ScreenLayout = ({ navigation, activeScreen, children }) => (
  <View style={styles.row}>
    <Sidebar navigation={navigation} activeScreen={activeScreen} />
    <View style={styles.main}>
      <View style={styles.banner}>
        <Image
          source={svceBanner}
          style={styles.bannerImage}
          resizeMode="stretch"
        />
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  main: {
    flex: 1,
    flexDirection: 'column',
  },
  banner: {
    width: '100%',
    backgroundColor: '#000000',
  },
  bannerImage: {
    width: '100%',
    height: 95,
  },
  content: {
    flex: 1,
  },
});

export default ScreenLayout;
