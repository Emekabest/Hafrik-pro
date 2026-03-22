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
const CREAM  = Colors.surfaceCool;
const DARK   = Colors.black;
const MUTED  = Colors.secondaryText;
const WHITE  = Colors.white;
const ERROR  = Colors.destructive;

const ForgotPasswordScreen = ({ navigation }) => {
  const { top } = useSafeAreaInsets();

  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [error,   setError]   = useState('');

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 480, useNativeDriver: true }),
    ]).start();
  }, []);

  const validate = () => {
    if (!email.trim()) {
      setError('Email address is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/forgot.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        navigation.navigate('VerifyReset', { email: email.trim().toLowerCase() });
      } else {
        Alert.alert('Error', data.message || 'Failed to send reset code.');
      }
    } catch (_) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
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
          <Ionicons name="mail" size={28} color={ACCENT} />
        </View>

        <Text style={styles.headerTitle}>Forgot Password?</Text>
        <Text style={styles.headerSub}>
          Enter your email and we'll send you a reset code
        </Text>

        <View style={styles.headerWave} pointerEvents="none" />
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

          {/* Email field */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <View style={[
              styles.input,
              focused && styles.inputFocused,
              !!error && styles.inputError,
            ]}>
              <Ionicons name="mail-outline" size={17} color={focused ? ACCENT : MUTED} style={styles.inputIcon} />
              <TextInput
                style={[styles.inputText, { flex: 1 }]}
                placeholder="your@email.com"
                placeholderTextColor={MUTED}
                value={email}
                onChangeText={(v) => { setEmail(v); if (error) setError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
            </View>
            {!!error && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={13} color={ERROR} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>

          {/* Info box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={ACCENT} />
            <Text style={styles.infoText}>
              We'll send a 6-digit code to your email. The code expires in 15 minutes.
            </Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
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
                  <Text style={styles.submitText}>Send Reset Code</Text>
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
    lineHeight: 20,
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

  fieldWrap: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: DARK,
    marginBottom: 7,
    fontFamily: AppDetails?.fontFamily?.inter?.medium ?? 'System',
  },

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

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: ERROR,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: ACCENT + '0F',
    borderRadius: 12,
    padding: 14,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: ACCENT + '28',
  },
  infoText: {
    flex: 1,
    fontSize: 12.5,
    color: ACCENT,
    lineHeight: 18,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },

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
});

export default ForgotPasswordScreen;
