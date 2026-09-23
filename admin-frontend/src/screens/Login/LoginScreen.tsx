// @ts-nocheck
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { spacing, radius } from '../../theme';

const svceBanner = require('../../assets/svce_banner.png');

const DEFAULTS = { username: '', password: '' };
const GOLD = '#C9A84C';
const NAVY = '#0D1B2A';
const WHITE = '#FFFFFF';

const { width: SCREEN_W } = Dimensions.get('window');
const IS_WIDE = SCREEN_W >= 768;

// ─── Illustration: stacked books + students ───────────────────────────────────
const Diamond = ({ color, top, left, size }) => (
  <View style={{
    position: 'absolute', top, left,
    width: size, height: size,
    backgroundColor: color,
    transform: [{ rotate: '45deg' }],
    borderRadius: 1,
  }} />
);

const Illustration = () => (
  <View style={il.root}>
    <Diamond color="#F4A261" top={18} left={60}  size={9} />
    <Diamond color="#E63946" top={35} left={210} size={7} />
    <Diamond color="#2EC4B6" top={55} left={40}  size={6} />
    <Diamond color="#F4A261" top={70} left={170} size={8} />
    <Diamond color="#E63946" top={20} left={130} size={6} />
    <Diamond color="#2EC4B6" top={100} left={230} size={7} />

    {/* Leaves */}
    <View style={[il.leaf, il.leafL1]} />
    <View style={[il.leaf, il.leafL2]} />
    <View style={[il.leaf, il.leafR1]} />
    <View style={[il.leaf, il.leafR2]} />

    {/* Books */}
    <View style={[il.book, il.book4]}><View style={[il.spine, { backgroundColor: '#1a9e8f' }]} /><View style={[il.stripe, { top: 10 }]} /><View style={[il.stripe, { top: 22 }]} /></View>
    <View style={[il.book, il.book3]}><View style={[il.spine, { backgroundColor: '#112244' }]} /><View style={[il.stripe, { top: 8, backgroundColor: '#F4A261' }]} /></View>
    <View style={[il.book, il.book2]}><View style={[il.spine, { backgroundColor: '#9b2226' }]} /><View style={[il.stripe, { top: 6 }]} /><View style={[il.stripe, { top: 16 }]} /></View>
    <View style={[il.book, il.book1]}><View style={[il.spine, { backgroundColor: '#2EC4B6' }]} /></View>

    {/* Golden document */}
    <View style={il.document}>
      <View style={il.documentLine} />
      <View style={[il.documentLine, { marginTop: 8, width: '60%' }]} />
      <View style={[il.documentLine, { marginTop: 8, width: '70%' }]} />
    </View>

    {/* Bookmark */}
    <View style={il.bookmark} />

    {/* Student A */}
    <View style={il.studentA}>
      <View style={[il.head, { backgroundColor: '#FFBF69' }]} />
      <View style={il.hairA} />
      <View style={[il.body, { backgroundColor: '#E63946' }]} />
      <View style={il.legsA} />
      <View style={il.laptopA} />
    </View>

    {/* Student B */}
    <View style={il.studentB}>
      <View style={[il.head, { backgroundColor: '#FFBF69' }]} />
      <View style={il.hairB} />
      <View style={[il.body, { backgroundColor: '#2EC4B6', width: 22, height: 24 }]} />
      <View style={il.laptopB} />
    </View>
  </View>
);

const il = StyleSheet.create({
  root: { width: '100%', height: 260, position: 'relative' },
  leaf: { position: 'absolute', borderRadius: 50 },
  leafL1: { width: 36, height: 56, backgroundColor: '#E63946', bottom: 20, left: 10, transform: [{ rotate: '-30deg' }] },
  leafL2: { width: 28, height: 44, backgroundColor: '#ff6b6b', bottom: 12, left: 30, transform: [{ rotate: '10deg' }] },
  leafR1: { width: 30, height: 50, backgroundColor: '#2EC4B6', top: 60, right: 20, transform: [{ rotate: '20deg' }] },
  leafR2: { width: 22, height: 38, backgroundColor: '#52e0d5', top: 50, right: 36, transform: [{ rotate: '-15deg' }] },
  book: { position: 'absolute', borderRadius: 4, overflow: 'hidden' },
  book4: { width: 170, height: 34, backgroundColor: '#2EC4B6', bottom: 20, left: 45 },
  book3: { width: 148, height: 30, backgroundColor: '#1a3a5c', bottom: 54, left: 56 },
  book2: { width: 130, height: 28, backgroundColor: '#c1121f', bottom: 84, left: 64 },
  book1: { width: 110, height: 22, backgroundColor: '#2EC4B6', bottom: 112, left: 74 },
  spine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6 },
  stripe: { position: 'absolute', left: 10, right: 10, height: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  document: { position: 'absolute', width: 60, height: 90, backgroundColor: '#FFCF56', borderRadius: 6, bottom: 42, left: 80, padding: 10, elevation: 4 },
  documentLine: { height: 3, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 2, width: '80%' },
  bookmark: { position: 'absolute', width: 18, height: 50, backgroundColor: '#E63946', bottom: 10, right: 70, borderRadius: 3, transform: [{ rotate: '-15deg' }] },
  studentA: { position: 'absolute', bottom: 50, left: 105, alignItems: 'center', width: 36 },
  studentB: { position: 'absolute', bottom: 132, right: 55, alignItems: 'center', width: 32 },
  head: { width: 18, height: 18, borderRadius: 9, marginBottom: 1 },
  hairA: { position: 'absolute', top: -4, left: 0, right: 0, height: 10, backgroundColor: '#3a1a00', borderRadius: 8 },
  hairB: { position: 'absolute', top: -4, left: 0, right: 0, height: 10, backgroundColor: '#E63946', borderRadius: 8 },
  body: { width: 24, height: 20, borderRadius: 4, marginBottom: 2 },
  legsA: { width: 28, height: 10, backgroundColor: '#2EC4B6', borderRadius: 3 },
  laptopA: { marginTop: 2, width: 30, height: 4, backgroundColor: '#ddd', borderRadius: 2 },
  laptopB: { marginTop: 2, width: 26, height: 16, backgroundColor: '#c8d8e8', borderRadius: 3, borderWidth: 2, borderColor: '#8899aa' },
});

// ─── Field label + error ──────────────────────────────────────────────────────
const Field = ({ label, error, children }) => (
  <View style={{ marginBottom: 14 }}>
    <Text style={fs.label}>{label}</Text>
    {children}
    {!!error && <Text style={fs.error}>{error}</Text>}
  </View>
);
const fs = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '500', color: '#4a5568', marginBottom: 5 },
  error: { fontSize: 11, color: '#dc2626', marginTop: 3 },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
const LoginScreen = () => {
  const { login, isLoggingIn, error } = useAuth();
  const [showPass, setShowPass] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm({ defaultValues: DEFAULTS });
  const onSubmit = handleSubmit(async (data) => {
    await login(data.username.trim(), data.password);
  });

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Light grey page background */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#EEF2F7' }]} />

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={StyleSheet.absoluteFill}
      >
        {/* ── Compact white card ── */}
        <View style={s.card}>

          {/* LEFT: banner + form */}
          <View style={s.left}>
            {/* SVCE banner with gold border */}
            <View style={s.bannerWrap}>
              <Image source={svceBanner} style={s.bannerImg} resizeMode="stretch" />
            </View>

            <Text style={s.heading}>Login to your account</Text>
            <Text style={s.sub}>Administrator · Academic Management Portal</Text>

            <Field label="Username or Email" error={errors.username?.message}>
              <Controller
                control={control} name="username"
                rules={{ required: 'Username is required' }}
                render={({ field }) => (
                  <View style={[s.inputWrap, !!errors.username && s.inputErr]}>
                    <Text style={s.icon}>👤</Text>
                    <TextInput
                      style={s.input}
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Username or Email"
                      placeholderTextColor="#a0aec0"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                )}
              />
            </Field>

            <Field label="Password" error={errors.password?.message}>
              <Controller
                control={control} name="password"
                rules={{ required: 'Password is required' }}
                render={({ field }) => (
                  <View style={[s.inputWrap, !!errors.password && s.inputErr]}>
                    <Text style={s.icon}>🔒</Text>
                    <TextInput
                      style={s.input}
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Password"
                      placeholderTextColor="#a0aec0"
                      secureTextEntry={!showPass}
                      autoCorrect={false}
                    />
                    <TouchableOpacity onPress={() => setShowPass(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={s.eye}>{showPass ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            </Field>

            {!!error && <Text style={s.apiErr}>{error}</Text>}

            <TouchableOpacity
              onPress={onSubmit}
              disabled={isLoggingIn}
              activeOpacity={0.85}
              style={[s.btn, isLoggingIn && s.btnOff]}
            >
              {isLoggingIn
                ? <ActivityIndicator color={WHITE} size={16} />
                : <Text style={s.btnTxt}>Login</Text>}
            </TouchableOpacity>

            <Text style={s.footer}>Sri Venkateshwara College of Engineering · Est. 2001</Text>
          </View>

          {/* RIGHT: illustration panel */}
          <View style={s.right}>
            <Illustration />
            <Text style={s.ilTitle}>SVCE Academic ERP</Text>
            <Text style={s.ilSub}>Empowering education through technology</Text>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  screen: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    minHeight: '100%',
  },

  // The compact card
  card: {
    width: '100%',
    maxWidth: 820,
    backgroundColor: WHITE,
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: IS_WIDE ? 'row' : 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },

  // Left (form) side
  left: {
    flex: IS_WIDE ? 1 : undefined,
    padding: 28,
    justifyContent: 'center',
  },

  // Banner
  bannerWrap: {
    borderWidth: 2,
    borderColor: GOLD,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 20,
  },
  bannerImg: { width: '100%', height: 76 },

  heading: { fontSize: 18, fontWeight: '700', color: NAVY, marginBottom: 3 },
  sub:     { fontSize: 12, color: '#718096', marginBottom: 18 },

  // Inputs
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e2e8f0',
    borderRadius: 9, backgroundColor: '#f7fafc',
    paddingHorizontal: 11, height: 44,
  },
  inputErr: { borderColor: '#fc8181' },
  icon:  { fontSize: 13, marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: NAVY, padding: 0 },
  eye:   { fontSize: 14, marginLeft: 6 },

  apiErr: { fontSize: 12, color: '#dc2626', marginBottom: 8, textAlign: 'center' },

  // Button
  btn: {
    height: 44, borderRadius: 9,
    backgroundColor: NAVY,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8,
    elevation: 5,
  },
  btnOff: { opacity: 0.6 },
  btnTxt: { fontSize: 14, fontWeight: '700', color: WHITE, letterSpacing: 0.4 },

  footer: { fontSize: 10, color: '#a0aec0', textAlign: 'center', marginTop: 18, fontStyle: 'italic' },

  // Right (illustration) side
  right: {
    flex: IS_WIDE ? 1 : undefined,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    paddingVertical: 28,
  },
  ilTitle: { fontSize: 15, fontWeight: '700', color: NAVY, marginTop: 10, textAlign: 'center' },
  ilSub:   { fontSize: 11, color: '#718096', marginTop: 3, textAlign: 'center' },
});

export default LoginScreen;
