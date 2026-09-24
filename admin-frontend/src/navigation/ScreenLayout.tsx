// @ts-nocheck
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import Sidebar from '../components/Sidebar/Sidebar';
import GlobalSearch from '../components/GlobalSearch/GlobalSearch';
import CollegeBanner from '../components/Banner/CollegeBanner';
import { useTheme } from '../context/ThemeContext';
import { spacing, radius, shadows } from '../theme';

// Wrap any screen's content with this to get the persistent left sidebar.
// activeScreen must match one of the route names in AppNavigator so the
// matching nav item highlights correctly.
const ScreenLayout = ({ navigation, activeScreen, children }) => {
  // Dashboard is home — every other screen gets a pill that jumps straight
  // back to it, regardless of how deep the sidebar navigation got.
  const showBack = activeScreen !== 'Dashboard';
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <View style={styles.row}>
      <Sidebar navigation={navigation} activeScreen={activeScreen} />
      <View style={styles.main}>
        <View style={styles.bannerShadow}>
          <CollegeBanner />
        </View>
        <View style={styles.toolbar}>
          {showBack ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('Dashboard')}
              style={styles.backRow}
              accessibilityLabel="Back to Dashboard"
            >
              <Icon source="arrow-left" size={18} color={colors.primary} />
              <Text style={styles.backText}>Back to Dashboard</Text>
            </TouchableOpacity>
          ) : <View />}
          <GlobalSearch />
        </View>
        <View style={styles.content}>{children}</View>
      </View>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  main: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: colors.background,
  },
  bannerShadow: {
    zIndex: 1,
    ...shadows.soft,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    zIndex: 10,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  backText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  content: {
    flex: 1,
  },
});

export default ScreenLayout;
