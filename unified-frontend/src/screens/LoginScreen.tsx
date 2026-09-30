// @ts-nocheck
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
  Image,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { doAdminLogin, doFacultyLogin } from '../context/AuthContext';

// ── Assets ────────────────────────────────────────────────────────────────────
const svceLogo = require('../assets/svce_banner.png');

// ── Palette ───────────────────────────────────────────────────────────────────
const LIGHT = {
  navy:        '#0F2044',
  navyLight:   '#1E3A5F',
  gradStart:   '#0F2044',
  gradMid:     '#1E3A5F',
  gradEnd:     '#1A3A6B',
  white:       '#FFFFFF',
  slate50:     '#F8FAFC',
  slate100:    '#F1F5F9',
  slate200:    '#E2E8F0',
  slate400:    '#94A3B8',
  slate500:    '#64748B',
  slate700:    '#334155',
  slate900:    '#0F172A',
  red:         '#EF4444',
  redLight:    '#FEE2E2',
  cardBg:      '#FFFFFF',
  cardHeader:  '#0F2044',
  inputBg:     '#F8FAFC',
  inputBorder: '#E2E8F0',
  labelColor:  '#334155',
  adminColor:  '#7C3AED',
  hodColor:    '#0891B2',
  facColor:    '#059669',
  artOpacity:  0.07,
  decorLine:   'rgba(255,255,255,0.10)',
};
const DARK = {
  navy:        '#070F1F',
  navyLight:   '#0D1F3C',
  gradStart:   '#070F1F',
  gradMid:     '#0D1F3C',
  gradEnd:     '#0A1628',
  white:       '#FFFFFF',
  slate50:     '#1E293B',
  slate100:    '#1A2744',
  slate200:    '#243354',
  slate400:    '#94A3B8',
  slate500:    '#64748B',
  slate700:    '#CBD5E1',
  slate900:    '#F1F5F9',
  red:         '#F87171',
  redLight:    '#3B0F0F',
  cardBg:      '#111827',
  cardHeader:  '#0D1F3C',
  inputBg:     '#1E293B',
  inputBorder: '#334155',
  labelColor:  '#CBD5E1',
  adminColor:  '#A78BFA',
  hodColor:    '#22D3EE',
  facColor:    '#34D399',
  artOpacity:  0.12,
  decorLine:   'rgba(255,255,255,0.06)',
};

// ── Role config ───────────────────────────────────────────────────────────────
const getRoles = (C) => [
  {
    key: 'admin',
    label: 'Admin',
    icon: '🛡️',
    accent: C.adminColor,
    accentLight: C === DARK ? '#2D1B69' : '#F5F3FF',
    accentBorder: C === DARK ? '#5B21B6' : '#DDD6FE',
    description: 'Full system access — student registry, transfers, fees & reports',
    hasDeptCode: false,
  },
  {
    key: 'hod',
    label: 'Department',
    icon: '🏛️',
    accent: C.hodColor,
    accentLight: C === DARK ? '#0C2A3A' : '#ECFEFF',
    accentBorder: C === DARK ? '#0E4F6A' : '#A5F3FC',
    description: 'Department-wide management — faculty, students & coordinators',
    hasDeptCode: true,
  },
  {
    key: 'faculty',
    label: 'Faculty',
    icon: '👨‍🏫',
    accent: C.facColor,
    accentLight: C === DARK ? '#0A2E20' : '#ECFDF5',
    accentBorder: C === DARK ? '#065F46' : '#A7F3D0',
    description: 'Faculty portal — assignments, attendance & IA marks',
    hasDeptCode: true,
  },
];

const LOGO_ASPECT = 1133 / 260;

export default function LoginScreen() {
  const { login } = useAuth();
  const { width } = useWindowDimensions();
  const isWide = width >= 860;

  const [isDark, setIsDark] = useState(false);
  const C = isDark ? DARK : LIGHT;
  const ROLES = getRoles(C);

  const [activeRole, setActiveRole] = useState(0);
  const [form, setForm] = useState({ departmentCode: '', username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const role = ROLES[activeRole];

  const set = (key) => (val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setError('');
  };

  const handleTabPress = (idx) => {
    setActiveRole(idx);
    setForm({ departmentCode: '', username: '', password: '' });
    setError('');
    setShowPassword(false);
  };

  const handleSubmit = async () => {
    if (role.hasDeptCode && !form.departmentCode.trim()) {
      setError('Department code is required.'); return;
    }
    if (!form.username.trim()) { setError('Username is required.'); return; }
    if (!form.password)        { setError('Password is required.'); return; }
    setLoading(true);
    setError('');
    try {
      let result;
      if (role.key === 'admin') {
        result = await doAdminLogin(form.username.trim(), form.password);
      } else {
        result = await doFacultyLogin(
          form.departmentCode.trim().toUpperCase(),
          form.username.trim(),
          form.password,
          role.key === 'hod',
        );
      }
      await login(result.user, result.token);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const s = getStyles(C, isDark);

  return (
    <LinearGradient
      colors={isDark
        ? [C.gradStart, C.gradMid, C.gradEnd]
        : ['#E8F4FF', '#C7E3FF', '#D4EDFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.gradient}
    >
      {/* ── Decorative background art ──────────────────────────────────── */}
      <View style={s.artContainer} pointerEvents="none">
        {isDark ? (
          // DARK: subtle glowing orbs + grid
          <>
            <View style={[s.artOrb, { width: 500, height: 500, top: -180, left: -160, backgroundColor: '#1E40AF', opacity: 0.18 }]} />
            <View style={[s.artOrb, { width: 350, height: 350, bottom: -100, right: -120, backgroundColor: '#0E7490', opacity: 0.14 }]} />
            <View style={[s.artOrb, { width: 220, height: 220, top: '38%', right: -70, backgroundColor: '#4C1D95', opacity: 0.12 }]} />
            {/* Dot grid */}
            {Array.from({ length: 6 }).map((_, row) =>
              Array.from({ length: 8 }).map((_, col) => (
                <View key={`d-${row}-${col}`} style={[s.artDot, {
                  top: 30 + row * 60, left: 10 + col * 55, opacity: 0.10,
                  backgroundColor: '#93C5FD',
                }]} />
              ))
            )}
            {/* Thin horizontal accent lines */}
            {[0,1,2].map((i) => (
              <View key={`l-${i}`} style={[s.artHLine, {
                top: 120 + i * 200, opacity: 0.06,
              }]} />
            ))}
          </>
        ) : (
          // LIGHT: clean geometric shapes on a soft blue-white background
          <>
            {/* Large soft circles */}
            <View style={[s.artOrb, { width: 480, height: 480, top: -160, left: -150, backgroundColor: '#93C5FD', opacity: 0.35 }]} />
            <View style={[s.artOrb, { width: 360, height: 360, bottom: -100, right: -100, backgroundColor: '#BAE6FD', opacity: 0.40 }]} />
            <View style={[s.artOrb, { width: 240, height: 240, top: '35%', right: -60, backgroundColor: '#A5F3FC', opacity: 0.28 }]} />
            {/* Small accent orbs */}
            <View style={[s.artOrb, { width: 100, height: 100, top: '20%', left: 30, backgroundColor: '#C7D2FE', opacity: 0.45 }]} />
            <View style={[s.artOrb, { width: 70, height: 70, bottom: '25%', left: 60, backgroundColor: '#BBF7D0', opacity: 0.50 }]} />
            {/* Subtle wave lines */}
            {[0,1,2,3].map((i) => (
              <View key={`w-${i}`} style={[s.artWaveLine, {
                top: 60 + i * 180,
                opacity: 0.12,
                transform: [{ rotate: '-8deg' }],
              }]} />
            ))}
            {/* Dot grid */}
            {Array.from({ length: 5 }).map((_, row) =>
              Array.from({ length: 7 }).map((_, col) => (
                <View key={`d-${row}-${col}`} style={[s.artDot, {
                  top: 40 + row * 65, left: 15 + col * 60, opacity: 0.18,
                  backgroundColor: '#3B82F6',
                }]} />
              ))
            )}
          </>
        )}
      </View>

      {/* ── Theme toggle ───────────────────────────────────────────────── */}
      <View style={s.themeToggleWrap}>
        <TouchableOpacity
          style={s.themeToggleBtn}
          onPress={() => setIsDark((d) => !d)}
          activeOpacity={0.8}
          accessibilityLabel="Toggle dark mode"
        >
          {/* Light mode = show Moon (click to go dark). Dark mode = show Sun (click to go light) */}
          <Text style={s.themeIcon}>{isDark ? '☀️' : '🌙'}</Text>
          <Text style={s.themeLabel}>{isDark ? 'Light' : 'Dark'}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[s.scroll, isWide && s.scrollWide]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── SVCE Banner ──────────────────────────────────────────────── */}
          <View style={s.bannerWrap}>
            <Image
              source={svceLogo}
              style={{ height: 76, width: 76 * LOGO_ASPECT }}
              resizeMode="contain"
            />
          </View>

          {/* ── Card ─────────────────────────────────────────────────────── */}
          <View style={[s.card, isWide && s.cardWide]}>

            {/* Card header */}
            <LinearGradient
              colors={[C.navy, C.navyLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.cardHeader}
            >
              <Text style={s.cardTitle}>ERP Portal Sign In</Text>
              <Text style={s.cardSubtitle}>Sri Venkateswara College of Engineering</Text>
            </LinearGradient>

            {/* Role tabs */}
            <View style={s.tabRow}>
              {ROLES.map((r, idx) => {
                const active = idx === activeRole;
                return (
                  <TouchableOpacity
                    key={r.key}
                    style={[s.tab, active && { backgroundColor: r.accent, borderColor: r.accent }]}
                    onPress={() => handleTabPress(idx)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.tabIcon}>{r.icon}</Text>
                    <Text style={[s.tabLabel, { color: active ? C.white : C.slate500 }, active && s.tabLabelActive]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Role description */}
            <View style={[s.descStrip, { backgroundColor: role.accentLight, borderColor: role.accentBorder }]}>
              <Text style={[s.descText, { color: role.accent }]}>{role.description}</Text>
            </View>

            {/* Form */}
            <View style={s.formWrap}>
              {role.hasDeptCode && (
                <View style={s.field}>
                  <Text style={[s.label, { color: C.labelColor }]}>Department Code</Text>
                  <View style={[s.inputWrap, { borderColor: C.inputBorder, backgroundColor: C.inputBg }]}>
                    <Text style={s.inputPrefix}>🏢</Text>
                    <TextInput
                      style={[s.input, { color: C.slate900 }]}
                      value={form.departmentCode}
                      onChangeText={set('departmentCode')}
                      placeholder="e.g. CSE, ECE, ISE"
                      placeholderTextColor={C.slate400}
                      autoCapitalize="characters"
                      autoCorrect={false}
                    />
                  </View>
                </View>
              )}

              <View style={s.field}>
                <Text style={[s.label, { color: C.labelColor }]}>Username</Text>
                <View style={[s.inputWrap, { borderColor: C.inputBorder, backgroundColor: C.inputBg }]}>
                  <Text style={s.inputPrefix}>👤</Text>
                  <TextInput
                    style={[s.input, { color: C.slate900 }]}
                    value={form.username}
                    onChangeText={set('username')}
                    placeholder="Enter your username"
                    placeholderTextColor={C.slate400}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                  />
                </View>
              </View>

              <View style={s.field}>
                <Text style={[s.label, { color: C.labelColor }]}>Password</Text>
                <View style={[s.inputWrap, { borderColor: C.inputBorder, backgroundColor: C.inputBg }]}>
                  <Text style={s.inputPrefix}>🔒</Text>
                  <TextInput
                    style={[s.input, { color: C.slate900 }]}
                    value={form.password}
                    onChangeText={set('password')}
                    placeholder="Enter your password"
                    placeholderTextColor={C.slate400}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="current-password"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={s.eyeBtn}
                  >
                    <Text style={s.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {!!error && (
                <View style={[s.errorBox, { backgroundColor: C.redLight }]}>
                  <Text style={[s.errorText, { color: C.red }]}>⚠️  {error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[s.submitBtn, { backgroundColor: role.accent }, loading && s.submitDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color={C.white} size={20} />
                  : <Text style={s.submitText}>Sign in as {role.label}</Text>}
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={s.footer}>
              <View style={[s.footerDot, { backgroundColor: role.accent }]} />
              <Text style={[s.footerText, { color: C.slate400 }]}>
                Secured by SVCE ERP
              </Text>
            </View>
          </View>

          <Text style={s.tagline}>SVCE Education ERP · Unified Portal v1.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const getStyles = (C, isDark) => StyleSheet.create({
  gradient: { flex: 1 },
  kav:      { flex: 1 },

  // Background art
  artContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  artOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  artDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  artHLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#FFFFFF',
  },
  artWaveLine: {
    position: 'absolute',
    left: -100,
    right: -100,
    height: 2,
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },

  // Theme toggle
  themeToggleWrap: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 20,
    right: 20,
    zIndex: 10,
  },
  themeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(15,32,68,0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(15,32,68,0.20)',
  },
  themeIcon: { fontSize: 16 },
  themeLabel: { fontSize: 12, fontWeight: '600', color: isDark ? '#FFFFFF' : '#0F2044' },

  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    paddingVertical: 36,
    paddingTop: 72,
  },
  scrollWide: { paddingVertical: 48, paddingTop: 80 },

  // Banner
  bannerWrap: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 16,
  },

  // Card
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: C.cardBg,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: isDark ? 0.5 : 0.25,
    shadowRadius: 32,
    elevation: 16,
  },
  cardWide: { maxWidth: 500 },

  cardHeader: {
    paddingHorizontal: 28,
    paddingVertical: 22,
    alignItems: 'center',
  },
  cardTitle:    { fontSize: 20, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
  cardSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 4, letterSpacing: 0.4 },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: isDark ? C.slate100 : '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: isDark ? C.slate200 : '#E2E8F0',
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    gap: 4,
  },
  tabIcon:       { fontSize: 20 },
  tabLabel:      { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  tabLabelActive: { color: '#FFFFFF' },

  descStrip: {
    marginHorizontal: 16,
    marginBottom: 4,
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  descText: { fontSize: 12, lineHeight: 18, fontWeight: '500', textAlign: 'center' },

  formWrap: { padding: 24, gap: 14 },
  field:    { gap: 6 },
  label:    { fontSize: 13, fontWeight: '600' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputPrefix: { fontSize: 15, marginRight: 8 },
  input: { flex: 1, fontSize: 14, padding: 0 },
  eyeBtn:  { marginLeft: 6, padding: 2 },
  eyeIcon: { fontSize: 15 },

  errorBox: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  errorText: { fontSize: 13, fontWeight: '500' },

  submitBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitDisabled: { opacity: 0.65 },
  submitText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingBottom: 20,
    paddingTop: 4,
  },
  footerDot:  { width: 6, height: 6, borderRadius: 3 },
  footerText: { fontSize: 11 },

  tagline: {
    marginTop: 20,
    fontSize: 11,
    color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(15,32,68,0.45)',
    textAlign: 'center',
  },
});
