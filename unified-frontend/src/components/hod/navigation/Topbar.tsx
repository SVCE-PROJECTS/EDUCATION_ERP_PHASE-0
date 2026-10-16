import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { Menu } from '../icons';
import { useTheme } from '../../../context/hod/ThemeContext';

// -- Topbar -------------------------------------------------------------------
// The SVCE brand mark lives in the drawer header (HODDrawerContent) — this
// bar only needs to surface the current screen's title plus, on narrow
// screens, the hamburger to reach that drawer.

export interface TopbarProps {
  title?: string;
}

export default function Topbar({ title }: TopbarProps) {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const { colors: theme } = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.bar}>
      {!isLargeScreen && (
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
          style={styles.menuBtn}
          accessibilityLabel="Open menu"
        >
          <Menu size={20} color={theme.textPrimary} />
        </TouchableOpacity>
      )}
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
    </View>
  );
}

// -- Styles -------------------------------------------------------------------

const getStyles = (theme) => StyleSheet.create({
  bar: {
    height: 56,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  menuBtn: { padding: 4 },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: theme.textPrimary,
  },
});