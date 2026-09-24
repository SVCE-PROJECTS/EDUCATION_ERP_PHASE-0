import React, { useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  LayoutAnimation,
  UIManager,
  StyleProp,
  ViewStyle,
} from 'react-native';

// Enable LayoutAnimation on Android (must be outside component)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Topbar from '../components/navigation/Topbar';
import LogoBanner from './LogoBanner';
import { useTheme } from '../context/ThemeContext';
import { primaryScale } from '../theme/colors';
import { SCREEN_TITLES, RouteName } from '../navigation/routes';

export interface ScreenWrapperProps {
  children?: React.ReactNode;
  route?: RouteName | string;
  title?: string;
  /** true (default) wraps children in ScrollView; false uses a flat View */
  scrollable?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * ScreenWrapper — authenticated screen shell.
 *
 * Provides: Topbar + SafeAreaView + optional ScrollView + LayoutAnimation.
 * Responds to isDark from themeStore so background flips correctly.
 */
export default function ScreenWrapper({
  children,
  route,
  title,
  scrollable = true,
  refreshing = false,
  onRefresh,
  style,
}: ScreenWrapperProps) {
  const insets = useSafeAreaInsets();
  const { colors: theme } = useTheme();
  const resolvedTitle = title ?? (route ? SCREEN_TITLES[route] : '') ?? '';

  const bg = theme.background;

  // Animate content in on every mount
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, []);

  const contentStyle = [styles.content, { paddingBottom: insets.bottom + 16 }, style];

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]} edges={['top']}>
        <Topbar title={resolvedTitle} />
        <LogoBanner />

        {scrollable ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={contentStyle}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={primaryScale[500]}
                  colors={[primaryScale[500]]}
                />
              ) : undefined
            }
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.fill, contentStyle]}>{children}</View>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 16 },
  fill: { flex: 1, padding: 16 },
});
