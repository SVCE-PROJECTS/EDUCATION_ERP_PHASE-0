/**
 * Login Screen
 *
 * API: POST /api/auth/faculty/login
 * Body: { username, password }
 * Response: { success, message, data: { token, faculty, isHOD } }
 *
 * No departmentCode needed for the Faculty Portal — only the HOD portal sends it.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import { colors, spacing, typography, radius } from '../theme';

const LoginScreen: React.FC = () => {
  const { login, isLoggingIn, loginError, sessionExpired } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!username.trim()) newErrors.username = 'Username is required.';
    if (!password) newErrors.password = 'Password is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    // Strip all whitespace from username before sending — phone autocorrect
    // can insert spaces (e.g. "dr. sharma" instead of "dr.sharma")
    await login(username.replace(/\s/g, ''), password);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoWrap}>
              <Text style={styles.logoEmoji}>🎓</Text>
            </View>
            <Text style={styles.appName}>SVCE Faculty Portal</Text>
            <Text style={styles.tagline}>Academic Management System</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In</Text>
            <Text style={styles.cardSubtitle}>
              Enter your faculty credentials to continue
            </Text>

            {/* Session expired notice — shown when auto-logged-out */}
            {sessionExpired && (
              <View style={styles.sessionBanner}>
                <Text style={styles.sessionBannerText}>
                  🔒  Your session has expired. Please sign in again.
                </Text>
              </View>
            )}

            <CustomInput
              label="Username"
              placeholder="Enter your username"
              value={username}
              onChangeText={(t) => {
                // Remove all spaces — phone autocorrect adds spaces after periods
                const cleaned = t.replace(/\s/g, '');
                setUsername(cleaned);
                if (errors.username) setErrors((e) => ({ ...e, username: undefined }));
              }}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              textContentType="username"
              keyboardType="email-address"
              returnKeyType="next"
              error={errors.username}
              containerStyle={styles.inputSpacing}
            />

            <CustomInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
              }}
              isPassword
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              error={errors.password}
              containerStyle={styles.inputSpacing}
            />

            {/* Backend error */}
            {loginError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>⚠️  {loginError}</Text>
              </View>
            ) : null}

            <CustomButton
              title="Sign In"
              onPress={handleLogin}
              loading={isLoggingIn}
              style={styles.loginBtn}
            />
          </View>

          <Text style={styles.footer}>
            Contact your department admin if you have trouble logging in.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  header: { alignItems: 'center', marginBottom: spacing.xxl },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  logoEmoji: { fontSize: 40 },
  appName: {
    ...typography.h1,
    color: colors.white,
    textAlign: 'center',
  },
  tagline: {
    ...typography.body,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cardTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  sessionBanner: {
    backgroundColor: colors.warningBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  sessionBannerText: {
    ...typography.small,
    color: colors.warning,
  },
  inputSpacing: { marginBottom: spacing.md },
  errorBanner: {
    backgroundColor: colors.dangerBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { ...typography.small, color: colors.danger },
  loginBtn: { marginTop: spacing.sm },
  footer: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: spacing.xl,
    maxWidth: 300,
  },
});

export default LoginScreen;
