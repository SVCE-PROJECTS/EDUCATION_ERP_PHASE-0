import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, User, Building2, Eye, EyeOff } from '../components/icons';
import { authService, LoginCredentials } from '../services/auth.service';
import { useAuth } from '../context/AuthContext';
import { colors, primaryScale, neutral } from '../theme/colors';
import Toast from '../services/toast';
import LogoBanner from '../layouts/LogoBanner';

// ── Reusable labelled field ───────────────────────────────────────────────────

interface FieldProps {
  label: string;
  error?: string;
  children?: React.ReactNode;
  required?: boolean;
}

function Field({ label, error, children, required }: FieldProps) {
  return (
    <View style={s.field}>
      <Text style={s.label}>
        {label}
        {required && <Text style={s.required}> *</Text>}
      </Text>
      {children}
      {error ? <Text style={s.errorText}>{error}</Text> : null}
    </View>
  );
}

// ── Icon-prefixed input ───────────────────────────────────────────────────────

interface IconInputProps {
  icon: React.ComponentType<{ size?: number; color?: string; style?: StyleProp<ViewStyle> }>;
  value?: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: any;
  rightElement?: React.ReactNode;
  hasError?: boolean;
}

function IconInput({
  icon: Icon,
  value,
  onChangeText,
  onBlur,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  autoComplete,
  rightElement,
  hasError,
}: IconInputProps) {
  return (
    <View style={[s.inputWrap, hasError && s.inputWrapError]}>
      <Icon size={16} color={neutral[400]} style={s.inputIcon} />
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={neutral[400]}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        autoCorrect={false}
      />
      {rightElement}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigation = useNavigation<any>();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCredentials & { departmentCode: string }>({
    defaultValues: { departmentCode: 'CSE', username: '', password: '' },
  });

  const onSubmit = async (data: LoginCredentials & { departmentCode: string }) => {
    setLoading(true);
    try {
      const res = await authService.login(data);
      if (res.success) {
        const { faculty, token, isHOD } = res.data;
        if (!isHOD) {
          Toast.show({ type: 'error', text1: 'Access denied. HOD login required.' });
          return;
        }
        login(
          {
            ...faculty,
            isHOD: true,
            roles: faculty.roles?.map((fr: any) => fr.role?.slug || fr) || [],
            departmentCode: faculty.department?.code,
          },
          token
        );
        Toast.show({ type: 'success', text1: `Welcome back, ${faculty.name?.split(' ')[0]}!` });
        // Navigation resets automatically — App.tsx RootNavigator re-renders
        // because isAuthenticated flips to true in authStore
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      Toast.show({ type: 'error', text1: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[primaryScale[500], primaryScale[700], primaryScale[900]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.gradient}
    >
      <KeyboardAvoidingView style={s.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Card ────────────────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.duration(500).springify()} style={s.card}>
            {/* Logo */}
            <Animated.View entering={FadeIn.delay(200).duration(400)} style={s.logoSection}>
              <View style={s.logoImageWrap}>
                <LogoBanner rounded />
              </View>
              <Text style={s.appTitle}>Department Portal</Text>
              <Text style={s.appSubtitle}>SVCE — Engineering College ERP</Text>
            </Animated.View>

            {/* Department Code */}
            <Field label="Department Code" required error={errors.departmentCode?.message}>
              <Controller
                control={control}
                name="departmentCode"
                rules={{ required: 'Department code is required', maxLength: { value: 20, message: 'Too long' } }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <IconInput
                    icon={Building2}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="e.g. CSE, ECE, MECH"
                    autoCapitalize="characters"
                    hasError={!!errors.departmentCode}
                  />
                )}
              />
            </Field>

            {/* Username */}
            <Field label="Username" required error={errors.username?.message}>
              <Controller
                control={control}
                name="username"
                rules={{ required: 'Username is required', minLength: { value: 3, message: 'At least 3 characters' } }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <IconInput
                    icon={User}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Your username"
                    autoComplete="username"
                    hasError={!!errors.username}
                  />
                )}
              />
            </Field>

            {/* Password */}
            <Field label="Password" required error={errors.password?.message}>
              <Controller
                control={control}
                name="password"
                rules={{ required: 'Password is required', minLength: { value: 6, message: 'At least 6 characters' } }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <IconInput
                    icon={Lock}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Your password"
                    secureTextEntry={!showPassword}
                    autoComplete="current-password"
                    hasError={!!errors.password}
                    rightElement={
                      <TouchableOpacity
                        onPress={() => setShowPassword((v) => !v)}
                        style={s.eyeBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        {showPassword ? (
                          <EyeOff size={16} color={neutral[400]} />
                        ) : (
                          <Eye size={16} color={neutral[400]} />
                        )}
                      </TouchableOpacity>
                    }
                  />
                )}
              />
            </Field>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
              activeOpacity={0.85}
              style={[s.submitBtn, loading && s.submitBtnDisabled]}
            >
              {loading ? <ActivityIndicator color={colors.white} size={18} /> : <Text style={s.submitText}>Sign In</Text>}
            </TouchableOpacity>

            {/* Demo credentials hint */}
            <View style={s.demoBox}>
              <Text style={s.demoHeading}>HOD LOGIN CREDENTIALS</Text>
              <Text style={s.demoLine}>
                Username: <Text style={s.demoCode}>hod_cse</Text> (CSE Dept)
              </Text>
              <Text style={s.demoLine}>
                Password: <Text style={s.demoCode}>hod@cse123</Text>
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  gradient: { flex: 1 },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  // Card
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 28,
    padding: 28,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },

  // Logo
  logoSection: {
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  logoImageWrap: {
    width: '100%',
    maxWidth: 380,
    marginBottom: 6,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: neutral[900],
  },
  appSubtitle: {
    fontSize: 13,
    color: neutral[500],
  },

  // Fields
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: neutral[700],
  },
  required: {
    color: colors.red[500],
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 12,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    height: 46,
  },
  inputWrapError: {
    borderColor: colors.red[400],
  },
  inputIcon: {
    marginRight: 8,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: neutral[900],
    padding: 0,
  },
  eyeBtn: {
    marginLeft: 6,
    padding: 2,
  },
  errorText: {
    fontSize: 11,
    color: colors.red[500],
  },

  // Submit
  submitBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: primaryScale[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: primaryScale[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  submitBtnDisabled: {
    opacity: 0.65,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },

  // Demo box
  demoBox: {
    backgroundColor: primaryScale[50],
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  demoHeading: {
    fontSize: 10,
    fontWeight: '700',
    color: primaryScale[700],
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  demoLine: {
    fontSize: 12,
    color: neutral[600],
  },
  demoCode: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: primaryScale[600],
    backgroundColor: colors.white,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
});
