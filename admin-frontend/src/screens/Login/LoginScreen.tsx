// @ts-nocheck
import React from 'react';
import {
  View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { Text, Icon } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import CustomInput from '../../components/Input/CustomInput';
import CustomButton from '../../components/Button/CustomButton';
import InfoCard from '../../components/Card/InfoCard';
import CollegeBanner from '../../components/Banner/CollegeBanner';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  spacing, typography, radius, shadows,
} from '../../theme';

const DEFAULTS = { username: '', password: '' };

const HERO_POINTS = [
  { icon: 'account-group-outline', text: 'Manage the student registry end to end' },
  { icon: 'swap-horizontal', text: 'Track transfers with full audit history' },
  { icon: 'tray-arrow-down', text: 'Download batch reports in a click' },
];

const LoginScreen = () => {
  const { login, isLoggingIn, error } = useAuth();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const {
    control, handleSubmit, formState: { errors },
  } = useForm({ defaultValues: DEFAULTS });

  const onSubmit = handleSubmit(async (data) => {
    await login(data.username.trim(), data.password);
    // On success, AuthContext flips isAuthenticated and AppNavigator swaps
    // straight to the main app stack - no manual navigation needed here.
  });

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <CollegeBanner />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.panelRow, isWide && styles.panelRowWide]}>

          {isWide && (
            <LinearGradient
              colors={colors.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <View style={styles.heroIconWrap}>
                <Icon source="shield-account-outline" size={28} color={colors.white} />
              </View>
              <Text style={styles.heroTitle}>Welcome back, Administrator</Text>
              <Text style={styles.heroSubtitle}>
                Everything you need to run academic operations for SVCE — students,
                transfers, fees and reporting — in one place.
              </Text>

              <View style={styles.heroPoints}>
                {HERO_POINTS.map((point) => (
                  <View key={point.text} style={styles.heroPointRow}>
                    <View style={styles.heroPointIcon}>
                      <Icon source={point.icon} size={16} color={colors.white} />
                    </View>
                    <Text style={styles.heroPointText}>{point.text}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          )}

          <View style={[styles.centerWrap, isWide && styles.centerWrapWide]}>
            <InfoCard title="Sign in" style={styles.card}>
              <Text style={styles.subheading}>
                Enter your administrator credentials to continue.
              </Text>

              <Controller
                control={control}
                name="username"
                rules={{ required: 'Username is required' }}
                render={({ field }) => (
                  <CustomInput
                    label="Username"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.username?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                rules={{ required: 'Password is required' }}
                render={({ field }) => (
                  <CustomInput
                    label="Password"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    secureTextEntry
                    error={errors.password?.message}
                  />
                )}
              />

              {!!error && <Text style={styles.errorText}>{error}</Text>}

              <CustomButton
                label="Log In"
                onPress={onSubmit}
                loading={isLoggingIn}
                style={styles.submitButton}
              />
            </InfoCard>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  panelRow: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  panelRowWide: {
    maxWidth: 880,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.xl,
  },
  hero: {
    flex: 1,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    justifyContent: 'center',
    ...shadows.raised,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  heroTitle: {
    ...typography.h1,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 21,
    marginBottom: spacing.xl,
  },
  heroPoints: { gap: spacing.md },
  heroPointRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroPointIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPointText: {
    ...typography.body,
    color: colors.white,
    flex: 1,
  },
  centerWrap: {
    width: '100%',
    alignItems: 'center',
  },
  centerWrapWide: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radius.lg,
    ...shadows.card,
  },
  subheading: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
});

export default LoginScreen;
