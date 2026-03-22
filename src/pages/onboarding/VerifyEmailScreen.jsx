import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, ScrollView, ActivityIndicator,
  Animated, Platform, Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../AuthContext';
import apiClient from '../../api/apiClient';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const DARK   = Colors.black;
const MUTED  = Colors.secondaryText;
const WHITE  = Colors.white;
const ERROR  = Colors.destructive;
const CODE_LENGTH = 6;

// ─── OTP Input ────────────────────────────────────────────────────────────────
const OtpInput = ({ value, onChange, onFilled }) => {
  const inputRef = useRef(null);

  const handleChange = (text) => {
    const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    onChange(digits);
    if (digits.length === CODE_LENGTH) {
      inputRef.current?.blur();
      onFilled(digits);
    }
  };

  return (
    <View style={otp.wrapper}>
      <TextInput
        ref={inputRef}
        style={otp.hidden}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={CODE_LENGTH}
        autoFocus
        caretHidden
      />
      <TouchableOpacity style={otp.boxRow} activeOpacity={1} onPress={() => inputRef.current?.focus()}>
        {Array.from({ length: CODE_LENGTH }).map((_, i) => {
          const digit    = value[i] ?? '';
          const isActive = value.length === i;
          return (
            <View key={i} style={[otp.box, !!digit && otp.boxFilled, isActive && otp.boxActive]}>
              <Text style={otp.boxText}>{digit}</Text>
              {isActive && <View style={otp.cursor} />}
            </View>
          );
        })}
      </TouchableOpacity>
    </View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function VerifyEmailScreen({ navigation, route }) {
  const { email: routeEmail } = route.params || {};
  const { top, bottom } = useSafeAreaInsets();
  const { login, updateOnboardingStep } = useAuth();

  const [email,    setEmail]    = useState(routeEmail || '');
  const [code,     setCode]     = useState('');
  const [loading,  setLoading]  = useState(false);
  const [resending, setResending] = useState(false);
  const [error,    setError]    = useState('');
  const [countdown, setCountdown] = useState(60);
  const timerRef = useRef(null);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 480, useNativeDriver: true }),
    ]).start();
    startCountdown();
    // If email was not passed via route params, try loading from AsyncStorage
    if (!routeEmail) {
      AsyncStorage.getItem('hafrik_pending_email').then((stored) => {
        if (stored) setEmail(stored);
      });
    }
    return () => timerRef.current && clearInterval(timerRef.current);
  }, []);

  const startCountdown = () => {
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timerRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const verify = async (digits) => {
    const finalCode = String(digits ?? code);
    if (finalCode.length < CODE_LENGTH) {
      setError('Enter the 6-digit code');
      return;
    }
    if (!email) {
      setError('Email address is missing. Please go back and try again.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // verify.php is a public endpoint — no Bearer token required.
      // It accepts { email, code } and returns token + user on success.
      const res = await apiClient.post('/auth/verify.php', {
        email,
        code: finalCode,
      });

      if (res.data?.status === 'success') {
        const payload      = res.data.data?.data ?? res.data.data ?? res.data;
        const token        = payload?.token;
        const sessionToken = payload?.session_token ?? null;
        let   user         = payload?.user;
        if (Array.isArray(user)) user = user[0];

        if (token) {
          await login(user ?? {}, token, sessionToken);
        }
        await updateOnboardingStep(2);
        navigation.reset({ index: 0, routes: [{ name: 'OnboardingAvatar' }] });
      } else {
        setError(res.data?.message || 'Invalid code. Please try again.');
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Verification failed. Please try again.');
    }
    setLoading(false);
  };

  const resend = async () => {
    if (resending || countdown > 0) return;
    setResending(true);
    try {
      await apiClient.post('/auth/resend_verification.php', { email });
      startCountdown();
      Alert.alert('Code sent', 'A new verification code has been sent to your email.');
    } catch {
      Alert.alert('Error', 'Could not resend code. Please try again.');
    }
    setResending(false);
  };

  return (
    <LinearGradient
      colors={[Colors.brandDeep ?? BRAND, Colors.primaryDark, Colors.primary]}
      start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }}
      style={styles.grad}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: top + 20, paddingBottom: bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Header */}
            <View style={styles.iconWrap}>
              <Ionicons name="mail-open-outline" size={48} color={WHITE} />
            </View>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.sub}>
              We sent a 6-digit code to{'\n'}
              <Text style={styles.emailHighlight}>{email}</Text>
            </Text>

            {/* OTP */}
            <View style={styles.otpWrap}>
              <OtpInput value={code} onChange={setCode} onFilled={verify} />
            </View>

            {!!error && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={14} color={ERROR} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Verify button */}
            <TouchableOpacity
              style={[styles.btn, loading && { opacity: 0.7 }]}
              onPress={() => verify()}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={BRAND} />
                : <Text style={styles.btnText}>Verify Email</Text>
              }
            </TouchableOpacity>

            {/* Resend */}
            <TouchableOpacity
              style={styles.resendBtn}
              onPress={resend}
              disabled={resending || countdown > 0}
              activeOpacity={0.7}
            >
              {resending
                ? <ActivityIndicator size="small" color={WHITE + 'AA'} />
                : countdown > 0
                  ? <Text style={styles.resendText}>Resend code in {countdown}s</Text>
                  : <Text style={[styles.resendText, { color: WHITE }]}>Resend code</Text>
              }
            </TouchableOpacity>

            {/* Back */}
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.reset({ index: 0, routes: [{ name: 'Login' }] })} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={16} color={WHITE + 'BB'} />
              <Text style={styles.backText}>Back to login</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  grad:            { flex: 1 },
  scroll:          { flexGrow: 1, alignItems: 'center', paddingHorizontal: 28 },
  iconWrap:        { width: 88, height: 88, borderRadius: 44, backgroundColor: WHITE + '1A', alignItems: 'center', justifyContent: 'center', marginBottom: 24, marginTop: 8 },
  title:           { fontSize: 28, fontWeight: '700', color: WHITE, textAlign: 'center', marginBottom: 10 },
  sub:             { fontSize: 15, color: WHITE + 'CC', textAlign: 'center', lineHeight: 22, marginBottom: 36 },
  emailHighlight:  { color: WHITE, fontWeight: '700' },
  otpWrap:         { width: '100%', marginBottom: 16 },
  errorRow:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  errorText:       { color: ERROR, fontSize: 13 },
  btn:             { width: '100%', height: 52, borderRadius: 14, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  btnText:         { fontSize: 16, fontWeight: '700', color: BRAND },
  resendBtn:       { paddingVertical: 10, marginBottom: 16 },
  resendText:      { fontSize: 14, color: WHITE + '88', textAlign: 'center' },
  backBtn:         { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  backText:        { fontSize: 14, color: WHITE + 'BB' },
});

const otp = StyleSheet.create({
  wrapper:    { width: '100%', alignItems: 'center' },
  hidden:     { position: 'absolute', opacity: 0, height: 0, width: 0 },
  boxRow:     { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  box:        { width: 44, height: 54, borderRadius: 12, backgroundColor: WHITE + '1A', borderWidth: 1.5, borderColor: WHITE + '33', alignItems: 'center', justifyContent: 'center' },
  boxFilled:  { backgroundColor: WHITE + '26', borderColor: WHITE + '99' },
  boxActive:  { borderColor: WHITE, backgroundColor: WHITE + '2A' },
  boxText:    { fontSize: 22, fontWeight: '700', color: WHITE },
  cursor:     { position: 'absolute', bottom: 10, width: 2, height: 20, backgroundColor: WHITE, borderRadius: 1 },
});
