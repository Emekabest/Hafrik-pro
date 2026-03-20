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

const BRAND = Colors.primaryDark;
const ACCENT = Colors.primary;
const CREAM = Colors.surfaceCool;
const DARK = Colors.black;
const MUTED = Colors.secondaryText;
const WHITE = Colors.white;
const ERROR = Colors.destructive;

// ─── Password strength ────────────────────────────────────────────────────────
const getStrength = (pwd) => {
  if (!pwd) return 0;
  let s = 0;
  if (pwd.length >= 8)           s++;
  if (/[A-Z]/.test(pwd))        s++;
  if (/[0-9]/.test(pwd))        s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
};
const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', Colors.destructive, Colors.warning, Colors.primary, Colors.primaryDark];

const PasswordStrength = ({ password }) => {
  const s = getStrength(password);
  if (!password) return null;
  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              flex: 1, height: 3, borderRadius: 2,
              backgroundColor: i <= s ? STRENGTH_COLORS[s] : BRAND + '1F',
            }}
          />
        ))}
      </View>
      <Text style={{ fontSize: 11, color: STRENGTH_COLORS[s], marginTop: 4, fontWeight: '600' }}>
        {STRENGTH_LABELS[s]}
      </Text>
    </View>
  );
};

// ─── Field wrapper ────────────────────────────────────────────────────────────
const Field = ({ label, error, children }) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {children}
    {!!error && <Text style={styles.fieldError}>{error}</Text>}
  </View>
);

// ─── Main screen ──────────────────────────────────────────────────────────────
const ResetPasswordScreen = ({ route, navigation }) => {
  const { top } = useSafeAreaInsets();
  const { email, reset_key } = route.params || {};

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState({});
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);

  // Fade-in animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const successScale = useRef(new Animated.Value(0.6)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 480, useNativeDriver: true }),
    ]).start();
  }, []);

  const showSuccess = () => {
    Animated.parallel([
      Animated.spring(successScale,   { toValue: 1, useNativeDriver: true, tension: 120, friction: 7 }),
      Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const validate = () => {
    const e = {};
    if (!newPassword)              e.newPassword = 'Password is required';
    else if (newPassword.length < 6) e.newPassword = 'At least 6 characters';
    if (!confirmPassword)          e.confirmPassword = 'Please confirm your password';
    else if (newPassword !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleReset = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/reset.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          reset_key,
          password:  newPassword,
          confirm:   confirmPassword,
        }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        setDone(true);
        showSuccess();
        setTimeout(() => navigation.navigate('Login'), 2200);
      } else {
        Alert.alert('Error', data.message || 'Failed to reset password.');
      }
    } catch (_) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (key) => [
    styles.input,
    focused[key] && styles.inputFocused,
    errors[key]  && styles.inputError,
  ];

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
        {/* Decorative orbs */}
        <View style={styles.headerBlob} />
        <View style={[styles.headerBlob, { width: 100, height: 100, top: 10, left: -20, opacity: 0.06 }]} />
        <View style={styles.headerOrbBottom} />

        {/* Back button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={WHITE} />
        </TouchableOpacity>

        {/* Logo */}
        <Image
          source={require('../assl.js/Layer 3.png')}
          style={styles.headerLogoImg}
          resizeMode="contain"
        />

        {/* Lock icon */}
        <View style={styles.lockCircle}>
          <Ionicons name="lock-closed" size={28} color={ACCENT} />
        </View>

        <Text style={styles.headerTitle}>Set New Password</Text>
        <Text style={styles.headerSub}>
          Choose a strong password for your account
        </Text>

        {/* Wave curve */}
        <View style={styles.headerWave} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.card,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {done ? (
            /* ── Success state ── */
            <Animated.View
              style={[styles.successWrap, { opacity: successOpacity, transform: [{ scale: successScale }] }]}
            >
              <View style={styles.successCircle}>
                <Ionicons name="checkmark" size={38} color={WHITE} />
              </View>
              <Text style={styles.successTitle}>Password Reset!</Text>
              <Text style={styles.successSub}>
                Your password has been updated successfully. Redirecting to login…
              </Text>
            </Animated.View>
          ) : (
            <>
              {/* Info row */}
              {!!email && (
                <View style={styles.emailBadge}>
                  <Ionicons name="mail-outline" size={14} color={ACCENT} />
                  <Text style={styles.emailBadgeText} numberOfLines={1}>{email}</Text>
                </View>
              )}

              {/* New password */}
              <Field label="New Password" error={errors.newPassword}>
                <View style={inputStyle('newPassword')}>
                  <Ionicons name="lock-closed-outline" size={16} color={MUTED} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.inputText, { flex: 1 }]}
                    placeholder="Enter new password"
                    placeholderTextColor={MUTED}
                    value={newPassword}
                    onChangeText={(v) => { setNewPassword(v); if (errors.newPassword) setErrors((p) => ({ ...p, newPassword: null })); }}
                    secureTextEntry={!showNew}
                    onFocus={() => setFocused((p) => ({ ...p, newPassword: true }))}
                    onBlur={() => setFocused((p) => ({ ...p, newPassword: false }))}
                  />
                  <TouchableOpacity onPress={() => setShowNew((v) => !v)} style={styles.eyeBtn}>
                    <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={18} color={MUTED} />
                  </TouchableOpacity>
                </View>
                <PasswordStrength password={newPassword} />
              </Field>

              {/* Confirm password */}
              <Field label="Confirm Password" error={errors.confirmPassword}>
                <View style={inputStyle('confirmPassword')}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={MUTED} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.inputText, { flex: 1 }]}
                    placeholder="Re-enter your password"
                    placeholderTextColor={MUTED}
                    value={confirmPassword}
                    onChangeText={(v) => { setConfirmPassword(v); if (errors.confirmPassword) setErrors((p) => ({ ...p, confirmPassword: null })); }}
                    secureTextEntry={!showConfirm}
                    onFocus={() => setFocused((p) => ({ ...p, confirmPassword: true }))}
                    onBlur={() => setFocused((p) => ({ ...p, confirmPassword: false }))}
                  />
                  <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} style={styles.eyeBtn}>
                    <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={MUTED} />
                  </TouchableOpacity>
                </View>
              </Field>

              {/* Password rules hint */}
              <View style={styles.rulesBox}>
                {[
                  { ok: newPassword.length >= 8, text: 'At least 8 characters' },
                  { ok: /[A-Z]/.test(newPassword), text: 'One uppercase letter' },
                  { ok: /[0-9]/.test(newPassword), text: 'One number' },
                  { ok: /[^A-Za-z0-9]/.test(newPassword), text: 'One special character' },
                ].map((rule, i) => (
                  <View key={i} style={styles.ruleRow}>
                    <Ionicons
                      name={rule.ok ? 'checkmark-circle' : 'ellipse-outline'}
                      size={14}
                      color={rule.ok ? ACCENT : MUTED}
                    />
                    <Text style={[styles.ruleText, rule.ok && { color: ACCENT }]}>{rule.text}</Text>
                  </View>
                ))}
              </View>

              {/* Submit button */}
              <TouchableOpacity
                style={[styles.submitBtn, loading && { opacity: 0.6 }]}
                onPress={handleReset}
                disabled={loading}
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
                      <Text style={styles.submitText}>Reset Password</Text>
                      <Ionicons name="arrow-forward" size={18} color={WHITE} style={{ marginLeft: 8 }} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Back to login */}
              <TouchableOpacity
                style={styles.backToLogin}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={14} color={ACCENT} />
                <Text style={styles.backToLoginText}>Back to Sign In</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  // ── Header ──
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
  lockCircle: {
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
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },

  // ── Body ──
  body: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 60,
  },

  // ── Card ──
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

  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceCoolAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: ACCENT + '28',
  },
  emailBadgeText: {
    flex: 1,
    fontSize: 13,
    color: ACCENT,
    fontWeight: '600',
    fontFamily: AppDetails?.fontFamily?.inter?.medium ?? 'System',
  },

  // ── Fields ──
  fieldWrap: { marginBottom: 18 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: DARK,
    marginBottom: 7,
    fontFamily: AppDetails?.fontFamily?.inter?.medium ?? 'System',
  },
  fieldError: {
    fontSize: 11,
    color: ERROR,
    marginTop: 5,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },

  // ── Input ──
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCoolAlt,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BRAND + '16',
    paddingHorizontal: 16,
    height: 52,
  },
  inputFocused: {
    borderColor: ACCENT,
    backgroundColor: WHITE,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  inputError: { borderColor: ERROR, backgroundColor: ERROR + '10' },
  inputIcon:  { marginRight: 10 },
  inputText: {
    fontSize: 15,
    color: DARK,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },
  eyeBtn: { padding: 4 },

  // ── Password rules ──
  rulesBox: {
    backgroundColor: Colors.surfaceCoolAlt,
    borderRadius: 12,
    padding: 14,
    marginBottom: 22,
    gap: 8,
    borderWidth: 1,
    borderColor: BRAND + '10',
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleText: {
    fontSize: 12,
    color: MUTED,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },

  // ── Submit ──
  submitBtn: {
    borderRadius: 28,
    overflow: 'hidden',
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

  // ── Success ──
  successWrap: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: DARK,
    marginBottom: 10,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  successSub: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 21,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },
});

export default ResetPasswordScreen;
