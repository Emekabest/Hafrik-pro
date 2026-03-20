import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Animated,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';
import AppDetails from '../helpers/appdetails';

const API_BASE = 'https://hafrik.com/api/v1/auth';
const CODE_LENGTH = 6;

const BRAND = Colors.primaryDark;
const ACCENT = Colors.primary;
const CREAM  = Colors.surfaceCool;
const DARK   = Colors.black;
const MUTED  = Colors.secondaryText;
const WHITE  = Colors.white;
const ERROR  = Colors.destructive;

// ─── OTP Box row ──────────────────────────────────────────────────────────────
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
    <View style={otpStyles.wrapper}>
      {/* Invisible TextInput that handles all input */}
      <TextInput
        ref={inputRef}
        style={otpStyles.hiddenInput}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={CODE_LENGTH}
        autoFocus
        caretHidden
      />

      {/* Visual digit boxes */}
      <TouchableOpacity
        style={otpStyles.boxRow}
        activeOpacity={1}
        onPress={() => inputRef.current?.focus()}
      >
        {Array.from({ length: CODE_LENGTH }).map((_, i) => {
          const digit = value[i] ?? '';
          const isActive = value.length === i;
          return (
            <View
              key={i}
              style={[
                otpStyles.box,
                !!digit && otpStyles.boxFilled,
                isActive && otpStyles.boxActive,
              ]}
            >
              <Text style={otpStyles.boxText}>{digit}</Text>
              {isActive && <View style={otpStyles.cursor} />}
            </View>
          );
        })}
      </TouchableOpacity>
    </View>
  );
};

const otpStyles = StyleSheet.create({
  wrapper: { marginBottom: 6 },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  boxRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  box: {
    width: 46,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BRAND + '20',
    backgroundColor: Colors.surfaceCoolAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: {
    borderColor: ACCENT,
    backgroundColor: WHITE,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  boxFilled: {
    borderColor: ACCENT + '80',
    backgroundColor: ACCENT + '0A',
  },
  boxText: {
    fontSize: 22,
    fontWeight: '800',
    color: DARK,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  cursor: {
    position: 'absolute',
    bottom: 10,
    width: 2,
    height: 22,
    borderRadius: 1,
    backgroundColor: ACCENT,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
const VerifyResetScreen = ({ route, navigation }) => {
  const { top }  = useSafeAreaInsets();
  const { email } = route.params || {};

  const [code,      setCode]      = useState('');
  const [loading,   setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [error,     setError]     = useState('');

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const timerRef  = useRef(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 480, useNativeDriver: true }),
    ]).start();
    startCountdown();
    return () => clearInterval(timerRef.current);
  }, []);

  const startCountdown = () => {
    setCountdown(60);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timerRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const verify = async (digits) => {
    if (digits.length !== CODE_LENGTH) {
      setError('Enter the complete 6-digit code');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/verify.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, reset_key: digits }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        navigation.navigate('ResetPassword', {
          email: data.data?.email ?? email,
          reset_key: data.data?.reset_key ?? digits,
        });
      } else {
        setError(data.message || 'Invalid or expired code. Please try again.');
        setCode('');
      }
    } catch (_) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    try {
      const res = await fetch(`${API_BASE}/forgot.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setCode('');
        setError('');
        startCountdown();
        Alert.alert('Code Sent', 'A new code has been sent to your email.');
      } else {
        Alert.alert('Error', data.message || 'Failed to resend code.');
      }
    } catch (_) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: CREAM }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── Header ── */}
      <LinearGradient
        colors={[Colors.brandDeep, Colors.primaryDark, Colors.tealWave]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: top + 20 }]}
      >
        <View style={styles.headerBlob} pointerEvents="none" />
        <View style={[styles.headerBlob, { width: 100, height: 100, top: 10, left: -20, opacity: 0.06 }]} pointerEvents="none" />
        <View style={styles.headerOrbBottom} pointerEvents="none" />

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={WHITE} />
        </TouchableOpacity>

        <Image
          source={require('../assl.js/Layer 3.png')}
          style={styles.headerLogoImg}
          resizeMode="contain"
        />

        <View style={styles.iconCircle}>
          <Ionicons name="shield-checkmark" size={28} color={ACCENT} />
        </View>

        <Text style={styles.headerTitle}>Verify Code</Text>
        <Text style={styles.headerSub}>
          Enter the 6-digit code sent to{'\n'}
          <Text style={{ color: WHITE, fontWeight: '700' }}>{email}</Text>
        </Text>

        <View style={styles.headerWave} pointerEvents="none" />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

          {/* OTP boxes */}
          <Text style={styles.otpLabel}>Enter Verification Code</Text>
          <OtpInput
            value={code}
            onChange={(v) => { setCode(v); if (error) setError(''); }}
            onFilled={verify}
          />

          {/* Error */}
          {!!error && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={14} color={ERROR} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Verify button */}
          <TouchableOpacity
            style={[styles.submitBtn, (loading || code.length !== CODE_LENGTH) && { opacity: 0.55 }]}
            onPress={() => verify(code)}
            disabled={loading || code.length !== CODE_LENGTH}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[Colors.brandDeep, Colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {loading ? (
                <ActivityIndicator color={WHITE} size="small" />
              ) : (
                <>
                  <Text style={styles.submitText}>Verify Code</Text>
                  <Ionicons name="arrow-forward" size={18} color={WHITE} style={{ marginLeft: 8 }} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Didn't receive a code? </Text>
            {countdown > 0 ? (
              <Text style={styles.resendTimer}>Resend in {countdown}s</Text>
            ) : (
              <TouchableOpacity onPress={resend} disabled={resending} activeOpacity={0.7}>
                {resending
                  ? <ActivityIndicator size="small" color={ACCENT} />
                  : <Text style={styles.resendLink}>Resend Code</Text>
                }
              </TouchableOpacity>
            )}
          </View>

          {/* Back to login */}
          <TouchableOpacity
            style={styles.backToLogin}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={14} color={ACCENT} />
            <Text style={styles.backToLoginText}>Back to Sign In</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 28,
    paddingBottom: 56,
    overflow: 'hidden',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  headerBlob: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: ACCENT + '18',
    top: -80,
    right: -60,
  },
  headerOrbBottom: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: WHITE + '07',
    bottom: -30,
    left: -20,
  },
  headerWave: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 28,
    backgroundColor: Colors.surfaceCool,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: WHITE + '1A',
    borderWidth: 1,
    borderColor: WHITE + '26',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerLogoImg: {
    width: 130,
    height: 42,
    marginBottom: 18,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: WHITE + '16',
    borderWidth: 1.5,
    borderColor: ACCENT + '50',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: WHITE,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  headerSub: {
    fontSize: 14,
    color: WHITE + 'A0',
    marginTop: 6,
    lineHeight: 22,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },

  body: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 60,
  },

  card: {
    backgroundColor: WHITE,
    borderRadius: 28,
    padding: 24,
    shadowColor: Colors.brandDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 6,
  },

  otpLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: DARK,
    marginBottom: 18,
    textAlign: 'center',
    fontFamily: AppDetails?.fontFamily?.inter?.medium ?? 'System',
  },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: ERROR,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },

  submitBtn: {
    borderRadius: 28,
    overflow: 'hidden',
    marginTop: 20,
    marginBottom: 16,
    shadowColor: Colors.brandDeep,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  submitGradient: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 17,
    fontWeight: '800',
    color: WHITE,
    letterSpacing: 0.3,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },

  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  resendLabel: {
    fontSize: 13,
    color: MUTED,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },
  resendLink: {
    fontSize: 13,
    fontWeight: '700',
    color: ACCENT,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  resendTimer: {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED,
    fontFamily: AppDetails?.fontFamily?.inter?.medium ?? 'System',
  },

  backToLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  backToLoginText: {
    fontSize: 13,
    color: ACCENT,
    fontWeight: '600',
    fontFamily: AppDetails?.fontFamily?.inter?.medium ?? 'System',
  },
});

export default VerifyResetScreen;
