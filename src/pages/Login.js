import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
  FlatList,
  Modal,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/apiClient';
import { useAuth } from '../AuthContext';
import useStore from '../repository/store';
import AppDetails from '../helpers/appdetails';
import { Colors } from '../theme/colors';
import { useNotification } from '../../context/notificationcontext';
import PushNotificationController from '../controllers/pushnotificationcontroller';

const { width, height } = Dimensions.get('window');

// ─── Brand tokens ──────────────────────────────────────────────────────────────
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const CREAM  = Colors.surfaceCool;
const DARK   = Colors.black;
const MUTED  = Colors.secondaryText;
const ERROR  = Colors.destructive;
const WHITE  = Colors.white;

const API_BASE = 'https://hafrik.com/api/v1/auth';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = '82e6f4a6-dc87-4421-aff0-ae035aae8be2.apps.googleusercontent.com';

// ─── Countries ────────────────────────────────────────────────────────────────
const COUNTRIES = [
  { code: 'NG', name: 'Nigeria',        dialCode: '+234', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana',          dialCode: '+233', flag: '🇬🇭' },
  { code: 'KE', name: 'Kenya',          dialCode: '+254', flag: '🇰🇪' },
  { code: 'ZA', name: 'South Africa',   dialCode: '+27',  flag: '🇿🇦' },
  { code: 'EG', name: 'Egypt',          dialCode: '+20',  flag: '🇪🇬' },
  { code: 'ET', name: 'Ethiopia',       dialCode: '+251', flag: '🇪🇹' },
  { code: 'CI', name: 'Ivory Coast',    dialCode: '+225', flag: '🇨🇮' },
  { code: 'SN', name: 'Senegal',        dialCode: '+221', flag: '🇸🇳' },
  { code: 'CM', name: 'Cameroon',       dialCode: '+237', flag: '🇨🇲' },
  { code: 'TZ', name: 'Tanzania',       dialCode: '+255', flag: '🇹🇿' },
  { code: 'UG', name: 'Uganda',         dialCode: '+256', flag: '🇺🇬' },
  { code: 'AO', name: 'Angola',         dialCode: '+244', flag: '🇦🇴' },
  { code: 'MA', name: 'Morocco',        dialCode: '+212', flag: '🇲🇦' },
  { code: 'DZ', name: 'Algeria',        dialCode: '+213', flag: '🇩🇿' },
  { code: 'CN', name: 'China',          dialCode: '+86',  flag: '🇨🇳' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44',  flag: '🇬🇧' },
  { code: 'US', name: 'United States',  dialCode: '+1',   flag: '🇺🇸' },
  { code: 'FR', name: 'France',         dialCode: '+33',  flag: '🇫🇷' },
  { code: 'DE', name: 'Germany',        dialCode: '+49',  flag: '🇩🇪' },
  { code: 'BR', name: 'Brazil',         dialCode: '+55',  flag: '🇧🇷' },
  { code: 'IN', name: 'India',          dialCode: '+91',  flag: '🇮🇳' },
  { code: 'AU', name: 'Australia',      dialCode: '+61',  flag: '🇦🇺' },
];

// ─── Onboarding slides ────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: 1,
    eyebrow: 'WELCOME',
    title: 'Your diaspora.\nYour community.',
    body: 'Connect with fellow Africans across China and beyond. Find your people, build your network.',
    emoji: '🌍',
  },
  {
    id: 2,
    eyebrow: 'COMMUNITIES',
    title: 'Groups built\naround you.',
    body: 'Join city groups, student communities, business networks and more — all in one place.',
    emoji: '👥',
  },
  {
    id: 3,
    eyebrow: 'OPPORTUNITIES',
    title: 'Grow where\nyou are.',
    body: 'Discover jobs, marketplace listings, shipping agents, events and local guides.',
    emoji: '🚀',
  },
];

// ─── Floating particles ────────────────────────────────────────────────────────
const FloatingParticles = () => {
  const particles = useMemo(() =>
    Array.from({ length: 10 }, (_, i) => ({
      x:       new Animated.Value(Math.random() * width),
      y:       new Animated.Value(Math.random() * height * 0.65),
      opacity: new Animated.Value(Math.random() * 0.2 + 0.04),
      size:    Math.random() * 7 + 3,
      delay:   i * 280,
    }))
  , []);

  useEffect(() => {
    particles.forEach((p) => {
      const loop = () => {
        Animated.parallel([
          Animated.timing(p.x, {
            toValue: Math.random() * width,
            duration: 4500 + Math.random() * 4000,
            useNativeDriver: true,
          }),
          Animated.timing(p.y, {
            toValue: Math.random() * height * 0.65,
            duration: 4500 + Math.random() * 4000,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(p.opacity, { toValue: Math.random() * 0.28 + 0.06, duration: 2200, useNativeDriver: true }),
            Animated.timing(p.opacity, { toValue: 0.03, duration: 2200, useNativeDriver: true }),
          ]),
        ]).start(({ finished }) => { if (finished) loop(); });
      };
      setTimeout(loop, p.delay);
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: p.size / 2,
            backgroundColor: ACCENT,
            opacity: p.opacity,
            transform: [{ translateX: p.x }, { translateY: p.y }],
          }}
        />
      ))}
    </View>
  );
};

// ─── Pulse rings around emoji ──────────────────────────────────────────────────
const PulseRing = ({ color = ACCENT, size = 120 }) => {
  const r1Scale   = useRef(new Animated.Value(1)).current;
  const r1Opacity = useRef(new Animated.Value(0.5)).current;
  const r2Scale   = useRef(new Animated.Value(1)).current;
  const r2Opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop1 = Animated.loop(Animated.parallel([
      Animated.timing(r1Scale,   { toValue: 1.55, duration: 1400, useNativeDriver: true }),
      Animated.timing(r1Opacity, { toValue: 0,    duration: 1400, useNativeDriver: true }),
    ]));
    const loop2 = Animated.loop(Animated.parallel([
      Animated.timing(r2Scale,   { toValue: 1.9, duration: 1900, useNativeDriver: true }),
      Animated.timing(r2Opacity, { toValue: 0,   duration: 1900, useNativeDriver: true }),
    ]));
    loop1.start();
    setTimeout(() => loop2.start(), 450);
    return () => { loop1.stop(); loop2.stop(); };
  }, []);

  const ring = (scale, opacity) => ({
    position: 'absolute',
    width: size, height: size,
    borderRadius: size / 2,
    borderWidth: 1.5,
    borderColor: color,
    transform: [{ scale }],
    opacity,
  });

  return (
    <>
      <Animated.View pointerEvents="none" style={ring(r1Scale, r1Opacity)} />
      <Animated.View pointerEvents="none" style={ring(r2Scale, r2Opacity)} />
    </>
  );
};

// ─── Fade-in helper ───────────────────────────────────────────────────────────
const FadeSlide = ({ delay = 0, children }) => {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 500, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
};

// ─── Password strength ────────────────────────────────────────────────────────
const getStrength = (pwd) => {
  if (!pwd) return 0;
  let s = 0;
  if (pwd.length >= 8)        s++;
  if (/[A-Z]/.test(pwd))     s++;
  if (/[0-9]/.test(pwd))     s++;
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

// ─── Country Picker Modal ─────────────────────────────────────────────────────
const CountryModal = ({ visible, onClose, onSelect }) => {
  const [query, setQuery] = useState('');
  const filtered = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.dialCode.includes(query)
  );
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Select Country</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Ionicons name="close" size={22} color={DARK} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalSearch}>
            <Ionicons name="search-outline" size={16} color={MUTED} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search country or code…"
              placeholderTextColor={MUTED}
              value={query}
              onChangeText={setQuery}
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(c) => c.code}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.countryRow}
                activeOpacity={0.75}
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text style={styles.countryFlag}>{item.flag}</Text>
                <Text style={styles.countryName}>{item.name}</Text>
                <Text style={styles.countryDial}>{item.dialCode}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </View>
    </Modal>
  );
};

// ─── Input field ──────────────────────────────────────────────────────────────
const Field = ({ label, error, children }) => (
  <View style={styles.fieldWrap}>
    <View style={styles.fieldLabelRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {!!error && (
        <View style={styles.fieldErrorBadge}>
          <Ionicons name="alert-circle" size={11} color={ERROR} style={{ marginRight: 3 }} />
          <Text style={styles.fieldErrorBadgeText}>{error}</Text>
        </View>
      )}
    </View>
    {children}
  </View>
);

// ─── Onboarding ───────────────────────────────────────────────────────────────
const Onboarding = ({ onDone }) => {
  const { top } = useSafeAreaInsets();
  const [idx, setIdx] = useState(0);
  const scrollRef     = useRef(null);
  const dotAnim       = useRef(SLIDES.map(() => new Animated.Value(0))).current;
  const emojiScale    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    SLIDES.forEach((_, i) => {
      Animated.spring(dotAnim[i], {
        toValue: i === idx ? 1 : 0,
        useNativeDriver: false,
        tension: 120, friction: 8,
      }).start();
    });
    // Bounce emoji on each slide change
    Animated.sequence([
      Animated.timing(emojiScale, { toValue: 0.82, duration: 90, useNativeDriver: true }),
      Animated.spring(emojiScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 6 }),
    ]).start();
  }, [idx]);

  const next = () => {
    if (idx < SLIDES.length - 1) {
      const nextIdx = idx + 1;
      scrollRef.current?.scrollTo({ x: nextIdx * width, animated: true });
      setIdx(nextIdx);
    } else {
      onDone();
    }
  };

  return (
    <LinearGradient
      colors={[Colors.brandDeep, Colors.primaryDark, Colors.tealWave]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.4, y: 1 }}
      style={{ flex: 1 }}
    >
      {/* Animated floating particles */}
      <FloatingParticles />

      {/* Decorative blobs — non-interactive */}
      <View pointerEvents="none" style={[styles.blob, { width: 300, height: 300, top: -80, right: -100, opacity: 0.08 }]} />
      <View pointerEvents="none" style={[styles.blob, { width: 200, height: 200, bottom: 140, left: -60, opacity: 0.06 }]} />
      <View pointerEvents="none" style={[styles.blob, { width: 100, height: 100, top: '38%', left: '25%', opacity: 0.04 }]} />

      {/* Logo top-left */}
      <Image
        source={require('../assl.js/Layer 3.png')}
        style={[styles.onboardLogo, { top: top + 18 }]}
        resizeMode="contain"
        pointerEvents="none"
      />

      {/* Skip */}
      {idx < SLIDES.length - 1 && (
        <TouchableOpacity
          style={[styles.skipBtn, { top: top + 20 }]}
          onPress={onDone}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip</Text>
          <Ionicons name="chevron-forward" size={13} color={WHITE + 'BF'} />
        </TouchableOpacity>
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s) => (
          <View key={s.id} style={[styles.slide, { paddingTop: top + 60 }]}>
            {/* Emoji orb with double pulse rings */}
            <FadeSlide delay={60}>
              <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 40 }}>
                <PulseRing color={ACCENT} size={120} />
                <Animated.View style={[styles.slideEmoji, { transform: [{ scale: emojiScale }] }]}>
                  <Text style={{ fontSize: 72 }}>{s.emoji}</Text>
                </Animated.View>
              </View>
            </FadeSlide>

            <FadeSlide delay={160}>
              <Text style={styles.slideEyebrow}>{s.eyebrow}</Text>
              <Text style={styles.slideTitle}>{s.title}</Text>
              <Text style={styles.slideBody}>{s.body}</Text>
            </FadeSlide>
          </View>
        ))}
      </ScrollView>

      {/* Bottom panel */}
      <View style={styles.slideBottom}>
        {/* Stats strip */}
        <FadeSlide delay={260}>
          <View style={styles.statStrip}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>50K+</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>30+</Text>
              <Text style={styles.statLabel}>Countries</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>100+</Text>
              <Text style={styles.statLabel}>Communities</Text>
            </View>
          </View>
        </FadeSlide>

        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const w = dotAnim[i].interpolate({ inputRange: [0, 1], outputRange: [8, 28] });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: w, backgroundColor: i === idx ? ACCENT : WHITE + '4D' }]}
              />
            );
          })}
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.slideBtn} onPress={next} activeOpacity={0.85}>
          <Text style={styles.slideBtnText}>
            {idx === SLIDES.length - 1 ? 'Get Started' : 'Continue'}
          </Text>
          <Ionicons name="arrow-forward" size={18} color={BRAND} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};


// ─── Auth Screen ──────────────────────────────────────────────────────────────
const AuthScreen = () => {
  const { top }    = useSafeAreaInsets();
  const navigation = useNavigation();
  const { login }  = useAuth();

  const [mode, setMode]           = useState('login');
  const [loading, setLoading]     = useState(false);
  const [showPwd, setShowPwd]     = useState(false);
  const [agreed, setAgreed]       = useState(false);
  const [errors, setErrors]       = useState({});
  const [focused, setFocused]     = useState({});
  const isSubmitting              = useRef(false);
  const [socialLoading, setSocialLoading] = useState(null); // 'apple' | 'google' | null

  const { expoPushToken, notification } = useNotification();

  const [form, setForm] = useState({
    firstName: '', lastName: '', username: '', email: '',
    password: '', gender: null,
  });
  const [genders] = useState([
    { id: 1, label: 'Male' },
    { id: 2, label: 'Female' },
    { id: 3, label: 'Rather not say' },
  ]);
  const [showGenderModal, setShowGenderModal] = useState(false);

  const set = (key, val) => {
    setForm((p) => ({ ...p, [key]: val }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: null }));
  };

  const resetForm = () => {
    setForm({ firstName: '', lastName: '', username: '', email: '', password: '', gender: null });
    setErrors({}); setAgreed(false); isSubmitting.current = false;
  };

  const toggleMode = () => { resetForm(); setMode((m) => (m === 'login' ? 'register' : 'login')); };

  const validate = () => {
    const e = {};
    if (mode === 'login') {
      if (!form.username.trim() && !form.email.trim()) e.username = 'Username or email is required';
      if (!form.password)         e.password = 'Password is required';
      else if (form.password.length < 6) e.password = 'At least 6 characters';
    }
    if (mode === 'register') {
      if (!form.firstName.trim()) e.firstName = 'Required';
      if (!form.lastName.trim())  e.lastName  = 'Required';
      if (!form.email.trim())     e.email     = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
      if (!form.username.trim())  e.username  = 'Username is required';
      if (!form.password)         e.password  = 'Password is required';
      else if (form.password.length < 6) e.password = 'At least 6 characters';
      if (!form.gender)  e.gender  = 'Please select your gender';
      if (!agreed)       e.terms   = 'You must agree to the terms';
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async () => {
    if (loading || isSubmitting.current) return;
    if (!validate()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    isSubmitting.current = true;

    try {
      const endpoint = mode === 'login'
        ? `${API_BASE}/login.php`
        : `${API_BASE}/register.php`;

      const payload = mode === 'login'
        ? { login: form.username.trim() || form.email.trim(), password: form.password }
        : {
            first_name: form.firstName.trim(),
            last_name:  form.lastName.trim(),
            username:   form.username.trim(),
            email:      form.email.trim().toLowerCase(),
            password:   form.password,
            gender:     form.gender,
            agree:      'on',
          };

      const res = await apiClient.post(endpoint, payload);

      if (res.data.status === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Both login and register return the same format: res.data.data.{token, session_token, user}
        const authData  = res.data.data;
        const authToken = authData?.token; // JWT — must be used in Authorization header
        let   authUser  = authData?.user;
        if (Array.isArray(authUser)) authUser = authUser[0];

        if (!authToken) {
          Alert.alert('Error', 'No token received from server. Please try again.');
          return;
        }

        await AsyncStorage.multiRemove(['hafrik_token', 'hafrik_user', 'hafrik_session_token']);
        await login(authUser ?? {}, authToken);

        if (mode === 'register') {
          await AsyncStorage.setItem('hafrik_onboarding_step', '2');
          navigation.replace('OnboardingAvatar');
        } else {
          if (!authUser) throw new Error('Invalid server response');

          const msg = { token: expoPushToken, title: 'Hafrik', body: 'Welcome back to Hafrik' };
          PushNotificationController(msg);

          navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Failed', res.data.message || 'Please check your credentials.');
      }
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      let msg = 'Something went wrong. Please try again.';
      if (err.response?.data?.message)          msg = err.response.data.message;
      else if (err.response?.status === 401)    msg = 'Invalid username or password.';
      else if (err.message.includes('timeout')) msg = 'Request timed out. Check your connection.';
      else if (err.message.includes('Network')) msg = 'No internet connection.';
      else if (err.message === 'Invalid server response') msg = 'Server error. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
      setTimeout(() => { isSubmitting.current = false; }, 1000);
    }
  };

  // ── Social sign-in: send identity token to backend, get hafrik token back ──
  const handleSocialLogin = async (provider, idToken, userData = {}) => {
    if (socialLoading) return;
    setSocialLoading(provider);
    try {
      const res = await apiClient.post(`${API_BASE}/social_login.php`, {
        provider,
        id_token: idToken,
        ...userData,
      });
      if (res.data.status === 'success') {
        const authToken = res.data.data?.token; // JWT — must be used in Authorization header
        let user        = res.data.data?.user;
        if (Array.isArray(user)) user = user[0];
        if (!authToken || !user) throw new Error('Invalid server response');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await login(user, authToken);
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Login Failed', res.data.message || 'Could not sign in. Please try again.');
      }
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      let msg = 'Something went wrong. Please try again.';
      if (err.response?.data?.message) msg = err.response.data.message;
      else if (err.message.includes('timeout')) msg = 'Request timed out.';
      else if (err.message.includes('Network')) msg = 'No internet connection.';
      Alert.alert('Error', msg);
    } finally {
      setSocialLoading(null);
    }
  };

  // ── Apple Sign In ─────────────────────────────────────────────────────────
  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        Alert.alert('Error', 'Apple Sign In failed. No identity token received.');
        return;
      }
      await handleSocialLogin('apple', credential.identityToken, {
        email: credential.email || undefined,
        full_name: [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ') || undefined,
        apple_user_id: credential.user,
      });
    } catch (e) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Error', 'Apple Sign In was cancelled or failed.');
      }
    }
  };

  // ── Google Sign In ────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    try {
      const nonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        String(Date.now()) + Math.random(),
      );
      const redirectUri = AuthSession.makeRedirectUri({ preferLocalhost: false });
      const discovery = await AuthSession.fetchDiscoveryAsync('https://accounts.google.com');
      const authRequest = new AuthSession.AuthRequest({
        clientId: GOOGLE_CLIENT_ID,
        redirectUri,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.IdToken,
        extraParams: { nonce },
      });
      const result = await authRequest.promptAsync(discovery);
      if (result.type === 'success' && result.params?.id_token) {
        await handleSocialLogin('google', result.params.id_token);
      } else if (result.type !== 'dismiss') {
        Alert.alert('Error', 'Google Sign In failed. Please try again.');
      }
    } catch (e) {
      Alert.alert('Error', 'Google Sign In failed. Please try again.');
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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* ── Gradient brand header ── */}
      <View>
        <LinearGradient
          colors={[Colors.brandDeep, Colors.primaryDark, Colors.tealWave]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: top + 20 }]}
        >
          {/* Decorative orbs — non-interactive */}
          <View style={styles.headerBlob} pointerEvents="none" />
          <View style={[styles.headerBlob, { width: 110, height: 110, top: 8, left: -18, opacity: 0.07 }]} pointerEvents="none" />

          {/* Brand logo image */}
          <Image
            source={require('../assl.js/Layer 3.png')}
            style={styles.headerLogoImg}
            resizeMode="contain"
          />

          {/* Social proof pill */}
          <View style={styles.proofPill}>
            <View style={styles.proofDot} />
            <Text style={styles.proofText}>50,000+ members worldwide</Text>
          </View>

          <Text style={styles.headerTitle}>
            {mode === 'login' ? 'Welcome back.' : 'Join Hafrik.'}
          </Text>
          <Text style={styles.headerSub}>
            {mode === 'login'
              ? 'Sign in to your community'
              : 'Create your account in seconds'}
          </Text>
        </LinearGradient>

        {/* Curved bottom — sits OUTSIDE the gradient so it never blocks touches */}
        <View style={styles.headerCurve} pointerEvents="none" />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Tab switcher ── */}
        <View style={styles.tabRow}>
          {['login', 'register'].map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.tab, mode === m && styles.tabActive]}
              onPress={() => { if (mode !== m) toggleMode(); }}
              activeOpacity={0.8}
            >
              {mode === m && (
                <LinearGradient
                  colors={[Colors.primaryDark, Colors.primary]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <Ionicons
                name={m === 'login' ? 'log-in-outline' : 'person-add-outline'}
                size={14}
                color={mode === m ? WHITE : MUTED}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>


        {/* ── Form card ── */}
        <View style={styles.card}>
          {mode === 'login' && (
            <>
              {/* Username/email */}
              <Field label="Username or Email" error={errors.username}>
                <View style={inputStyle('username')}>
                  <View style={styles.inputPrefix}><Ionicons name="person-outline" size={17} color={focused.username ? ACCENT : MUTED} /></View>
                  <View style={styles.inputDivider} />
                  <TextInput
                    style={[styles.inputText, { flex: 1 }]}
                    placeholder="Enter username or email"
                    placeholderTextColor={Colors.placeholder}
                    value={form.username || form.email}
                    onChangeText={(v) => { v.includes('@') ? (set('email', v), set('username', '')) : (set('username', v), set('email', '')); }}
                    autoCapitalize="none"
                    onFocus={() => setFocused((p) => ({ ...p, username: true }))}
                    onBlur={()  => setFocused((p) => ({ ...p, username: false }))}
                  />
                </View>
              </Field>

              {/* Password */}
              <Field label="Password" error={errors.password}>
                <View style={inputStyle('password')}>
                  <View style={styles.inputPrefix}><Ionicons name="lock-closed-outline" size={17} color={focused.password ? ACCENT : MUTED} /></View>
                  <View style={styles.inputDivider} />
                  <TextInput
                    style={[styles.inputText, { flex: 1 }]}
                    placeholder="Enter your password"
                    placeholderTextColor={Colors.placeholder}
                    value={form.password}
                    onChangeText={(v) => set('password', v)}
                    secureTextEntry={!showPwd}
                    onFocus={() => setFocused((p) => ({ ...p, password: true }))}
                    onBlur={()  => setFocused((p) => ({ ...p, password: false }))}
                  />
                  <TouchableOpacity onPress={() => setShowPwd((v) => !v)} style={styles.eyeBtn}>
                    <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color={focused.password ? ACCENT : MUTED} />
                  </TouchableOpacity>
                </View>
              </Field>

              <TouchableOpacity style={styles.forgotBtn} activeOpacity={0.7} onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.6 }]} onPress={submit} disabled={loading} activeOpacity={0.85}>
                <LinearGradient colors={[BRAND, Colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitGradient}>
                  {loading ? <ActivityIndicator color={WHITE} size="small" /> : (
                    <><Text style={styles.submitText}>Sign In</Text><Ionicons name="arrow-forward" size={18} color={WHITE} style={{ marginLeft: 8 }} /></>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.orRow}><View style={styles.orLine} /><Text style={styles.orText}>or continue with</Text><View style={styles.orLine} /></View>
              <View style={styles.socialRow}>
                <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8} onPress={handleGoogleSignIn} disabled={!!socialLoading}>
                  {socialLoading === 'google' ? <ActivityIndicator size="small" color={Colors.google} /> : (
                    <><Ionicons name="logo-google" size={18} color={Colors.google} /><Text style={styles.socialBtnText}>Google</Text></>
                  )}
                </TouchableOpacity>
                {Platform.OS === 'ios' && (
                  <TouchableOpacity style={[styles.socialBtn, { backgroundColor: DARK, borderColor: DARK }]} activeOpacity={0.8} onPress={handleAppleSignIn} disabled={!!socialLoading}>
                    {socialLoading === 'apple' ? <ActivityIndicator size="small" color={WHITE} /> : (
                      <><Ionicons name="logo-apple" size={18} color={WHITE} /><Text style={[styles.socialBtnText, { color: WHITE }]}>Apple</Text></>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {mode === 'register' && (
            <>
              {/* First + Last name side by side */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Field label="First Name" error={errors.firstName}>
                    <View style={inputStyle('firstName')}>
                      <View style={styles.inputPrefix}><Ionicons name="person-outline" size={17} color={focused.firstName ? ACCENT : MUTED} /></View>
                      <View style={styles.inputDivider} />
                      <TextInput style={[styles.inputText, { flex: 1 }]} placeholder="First name" placeholderTextColor={Colors.placeholder} value={form.firstName} onChangeText={(v) => set('firstName', v)} onFocus={() => setFocused((p) => ({ ...p, firstName: true }))} onBlur={() => setFocused((p) => ({ ...p, firstName: false }))} />
                    </View>
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Last Name" error={errors.lastName}>
                    <View style={inputStyle('lastName')}>
                      <View style={styles.inputPrefix}><Ionicons name="person-outline" size={17} color={focused.lastName ? ACCENT : MUTED} /></View>
                      <View style={styles.inputDivider} />
                      <TextInput style={[styles.inputText, { flex: 1 }]} placeholder="Last name" placeholderTextColor={Colors.placeholder} value={form.lastName} onChangeText={(v) => set('lastName', v)} onFocus={() => setFocused((p) => ({ ...p, lastName: true }))} onBlur={() => setFocused((p) => ({ ...p, lastName: false }))} />
                    </View>
                  </Field>
                </View>
              </View>

              <Field label="Username" error={errors.username}>
                <View style={inputStyle('username')}>
                  <View style={styles.inputPrefix}><Ionicons name="at-outline" size={17} color={focused.username ? ACCENT : MUTED} /></View>
                  <View style={styles.inputDivider} />
                  <TextInput style={[styles.inputText, { flex: 1 }]} placeholder="Choose a username" placeholderTextColor={Colors.placeholder} value={form.username} onChangeText={(v) => set('username', v)} autoCapitalize="none" onFocus={() => setFocused((p) => ({ ...p, username: true }))} onBlur={() => setFocused((p) => ({ ...p, username: false }))} />
                </View>
              </Field>

              <Field label="Email" error={errors.email}>
                <View style={inputStyle('email')}>
                  <View style={styles.inputPrefix}><Ionicons name="mail-outline" size={17} color={focused.email ? ACCENT : MUTED} /></View>
                  <View style={styles.inputDivider} />
                  <TextInput style={[styles.inputText, { flex: 1 }]} placeholder="your@email.com" placeholderTextColor={Colors.placeholder} value={form.email} onChangeText={(v) => set('email', v)} keyboardType="email-address" autoCapitalize="none" onFocus={() => setFocused((p) => ({ ...p, email: true }))} onBlur={() => setFocused((p) => ({ ...p, email: false }))} />
                </View>
              </Field>

              <Field label="Password" error={errors.password}>
                <View style={inputStyle('password')}>
                  <View style={styles.inputPrefix}><Ionicons name="lock-closed-outline" size={17} color={focused.password ? ACCENT : MUTED} /></View>
                  <View style={styles.inputDivider} />
                  <TextInput style={[styles.inputText, { flex: 1 }]} placeholder="Create a password" placeholderTextColor={Colors.placeholder} value={form.password} onChangeText={(v) => set('password', v)} secureTextEntry={!showPwd} onFocus={() => setFocused((p) => ({ ...p, password: true }))} onBlur={() => setFocused((p) => ({ ...p, password: false }))} />
                  <TouchableOpacity onPress={() => setShowPwd((v) => !v)} style={styles.eyeBtn}>
                    <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color={focused.password ? ACCENT : MUTED} />
                  </TouchableOpacity>
                </View>
                <PasswordStrength password={form.password} />
              </Field>

              {/* Gender */}
              <Field label="Gender" error={errors.gender}>
                <TouchableOpacity style={[styles.input, errors.gender && styles.inputError]} onPress={() => setShowGenderModal(true)} activeOpacity={0.8}>
                  <View style={styles.inputPrefix}><Ionicons name="transgender-outline" size={17} color={MUTED} /></View>
                  <View style={styles.inputDivider} />
                  <Text style={[styles.inputText, { flex: 1, color: form.gender ? Colors.textStrong ?? DARK : Colors.placeholder }]}>
                    {form.gender ? genders.find(g => g.id === form.gender)?.label : 'Select gender'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={MUTED} style={{ marginRight: 14 }} />
                </TouchableOpacity>
              </Field>

              {/* Terms */}
              <TouchableOpacity style={styles.termsRow} onPress={() => setAgreed((v) => !v)} activeOpacity={0.8}>
                <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
                  {agreed && <Ionicons name="checkmark" size={13} color={WHITE} />}
                </View>
                <Text style={styles.termsText}>
                  I agree to Hafrik's <Text style={styles.termsLink}>Terms of Service</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>
              {errors.terms && <Text style={styles.fieldError}>{errors.terms}</Text>}

              {/* Create Account */}
              <TouchableOpacity style={[styles.submitBtn, { marginTop: 4, opacity: loading ? 0.6 : 1 }]} onPress={submit} disabled={loading} activeOpacity={0.85}>
                <LinearGradient colors={[BRAND, Colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitGradient}>
                  {loading ? <ActivityIndicator color={WHITE} size="small" /> : (
                    <><Text style={styles.submitText}>Create Account</Text><Ionicons name="arrow-forward" size={18} color={WHITE} style={{ marginLeft: 8 }} /></>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.orRow}><View style={styles.orLine} /><Text style={styles.orText}>or sign up with</Text><View style={styles.orLine} /></View>
              <View style={styles.socialRow}>
                <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8} onPress={handleGoogleSignIn} disabled={!!socialLoading}>
                  {socialLoading === 'google' ? <ActivityIndicator size="small" color={Colors.google} /> : (
                    <><Ionicons name="logo-google" size={18} color={Colors.google} /><Text style={styles.socialBtnText}>Google</Text></>
                  )}
                </TouchableOpacity>
                {Platform.OS === 'ios' && (
                  <TouchableOpacity style={[styles.socialBtn, { backgroundColor: DARK, borderColor: DARK }]} activeOpacity={0.8} onPress={handleAppleSignIn} disabled={!!socialLoading}>
                    {socialLoading === 'apple' ? <ActivityIndicator size="small" color={WHITE} /> : (
                      <><Ionicons name="logo-apple" size={18} color={WHITE} /><Text style={[styles.socialBtnText, { color: WHITE }]}>Apple</Text></>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Gender modal */}
              <Modal visible={showGenderModal} animationType="slide" transparent onRequestClose={() => setShowGenderModal(false)}>
                <View style={styles.modalOverlay}>
                  <View style={styles.modalSheet}>
                    <View style={styles.modalHandle} />
                    <View style={styles.modalHeaderRow}>
                      <Text style={styles.modalTitle}>Select Gender</Text>
                      <TouchableOpacity onPress={() => setShowGenderModal(false)} style={styles.modalClose}><Ionicons name="close" size={22} color={DARK} /></TouchableOpacity>
                    </View>
                    {genders.map((g) => (
                      <TouchableOpacity key={g.id} style={[styles.countryRow, form.gender === g.id && { backgroundColor: ACCENT + '12' }]} activeOpacity={0.75} onPress={() => { set('gender', g.id); setShowGenderModal(false); }}>
                        <Ionicons name={g.id === 1 ? 'male-outline' : g.id === 2 ? 'female-outline' : 'person-outline'} size={20} color={form.gender === g.id ? ACCENT : MUTED} style={{ marginRight: 12 }} />
                        <Text style={[styles.countryName, form.gender === g.id && { color: ACCENT, fontWeight: '700' }]}>{g.label}</Text>
                        {form.gender === g.id && <Ionicons name="checkmark" size={18} color={ACCENT} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </Modal>
            </>
          )}

          {/* Switch mode — always shown */}
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>{mode === 'login' ? "Don't have an account? " : 'Already have an account? '}</Text>
            <TouchableOpacity onPress={toggleMode} activeOpacity={0.7}>
              <Text style={styles.switchLink}>{mode === 'login' ? 'Sign Up' : 'Sign In'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom tagline */}
        <View style={styles.tagline}>
          <Text style={styles.taglineText}>
            🌍 Connecting the African diaspora, one community at a time.
          </Text>
        </View>
      </ScrollView>

    </KeyboardAvoidingView>
  );
};

// ─── Root component ───────────────────────────────────────────────────────────
const HAFRIKAuth = () => {
  const [showOnboarding, setShowOnboarding] = useState(true);
  if (showOnboarding) return <Onboarding onDone={() => setShowOnboarding(false)} />;
  return <AuthScreen />;
};

export default HAFRIKAuth;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Onboarding ──
  slide: {
    width,
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: WHITE,
  },
  skipBtn: {
    position: 'absolute',
    right: 24,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: WHITE + '1F',
    borderWidth: 1,
    borderColor: WHITE + '29',
  },
  skipText: {
    color: WHITE + 'CC',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: AppDetails?.fontFamily?.inter?.medium ?? 'System',
  },
  slideEmoji: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: WHITE + '1F',
    borderWidth: 1,
    borderColor: WHITE + '2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
    color: ACCENT,
    marginBottom: 14,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  slideTitle: {
    fontSize: 38,
    fontWeight: '900',
    color: WHITE,
    lineHeight: 46,
    marginBottom: 18,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  slideBody: {
    fontSize: 16,
    color: WHITE + 'B8',
    lineHeight: 24,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },
  slideBottom: {
    paddingHorizontal: 30,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    paddingTop: 16,
    backgroundColor: DARK + '2E',
  },
  statStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHITE + '14',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WHITE + '1F',
    paddingVertical: 12,
    marginBottom: 20,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: {
    color: ACCENT,
    fontSize: 18,
    fontWeight: '900',
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  statLabel: {
    color: WHITE + '94',
    fontSize: 11,
    marginTop: 2,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },
  statDivider: { width: 1, height: 30, backgroundColor: WHITE + '26' },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
  },
  dot: { height: 8, borderRadius: 4 },
  slideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    borderRadius: 100,
    height: 56,
  },
  slideBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: BRAND,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  onboardLogo: {
    position: 'absolute',
    left: 24,
    width: 110,
    height: 36,
  },

  // ── Auth header ──
  header: {
    paddingHorizontal: 28,
    paddingBottom: 36,
  },
  headerCurve: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: CREAM,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
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
  headerLogoImg: {
    width: 140,
    height: 46,
    marginBottom: 18,
  },
  proofPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: ACCENT + '2A',
    borderWidth: 1,
    borderColor: ACCENT + '50',
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 14,
  },
  proofDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: ACCENT,
  },
  proofText: {
    color: ACCENT,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: AppDetails?.fontFamily?.inter?.medium ?? 'System',
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: WHITE,
    lineHeight: 36,
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
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 60,
  },

  // Step indicator
  stepRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, gap: 6 },
  stepDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: BRAND + '30' },
  stepDotOn:  { backgroundColor: BRAND },
  stepLine:   { width: 40, height: 3, borderRadius: 2, backgroundColor: BRAND + '30' },
  stepLineOn: { backgroundColor: BRAND },
  stepLabel:  { fontSize: 12, color: MUTED, fontWeight: '600', marginLeft: 8 },

  // Tab row
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceFrost,
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BRAND + '12',
    shadowColor: Colors.brandDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tabActive: {
    shadowColor: Colors.brandDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: MUTED,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  tabTextActive: { color: WHITE },

  // Card
  card: {
    backgroundColor: WHITE,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    shadowColor: Colors.brandDeep,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.09,
    shadowRadius: 28,
    elevation: 6,
    borderWidth: 1,
    borderColor: BRAND + '0A',
  },

  // Field
  fieldWrap: { marginBottom: 16 },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textStrongAlt,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontFamily: AppDetails?.fontFamily?.inter?.medium ?? 'System',
  },
  fieldError: {
    fontSize: 11,
    color: ERROR,
    marginTop: 5,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },
  fieldErrorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ERROR + '12',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  fieldErrorBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: ERROR,
    fontFamily: AppDetails?.fontFamily?.inter?.medium ?? 'System',
  },

  // Input
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceFrost,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.borderSoft,
    height: 54,
    overflow: 'hidden',
  },
  inputPrefix: {
    width: 48,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceCoolAlt,
  },
  inputDivider: {
    width: 1,
    height: 26,
    backgroundColor: Colors.borderSoft,
    marginRight: 12,
  },
  inputRow:    { flexDirection: 'row', alignItems: 'center' },
  inputFocused: {
    borderColor: ACCENT,
    backgroundColor: WHITE,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  inputError:  { borderColor: ERROR, backgroundColor: ERROR + '08' },
  inputIcon:   { marginRight: 10 },
  inputText: {
    fontSize: 15,
    color: Colors.textStrong,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },
  eyeBtn: { padding: 10 },

  // Dial code
  dialCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 14,
    paddingRight: 10,
    height: '100%',
    backgroundColor: Colors.surfaceCoolAlt,
  },
  dialCodeText: {
    fontSize: 13,
    fontWeight: '600',
    color: DARK,
    fontFamily: AppDetails?.fontFamily?.inter?.medium ?? 'System',
  },
  phoneDivider: {
    width: 1, height: 26,
    backgroundColor: Colors.borderSoft,
    marginRight: 12,
  },

  // Forgot
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 18, marginTop: -8 },
  forgotText: {
    fontSize: 13,
    color: ACCENT,
    fontWeight: '600',
    fontFamily: AppDetails?.fontFamily?.inter?.medium ?? 'System',
  },

  // Terms
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 18 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5,
    borderColor: BRAND + '40',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn:  { backgroundColor: BRAND, borderColor: BRAND },
  termsText: {
    flex: 1, fontSize: 13, color: MUTED, lineHeight: 19,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },
  termsLink: { color: ACCENT, fontWeight: '600' },


  // Submit
  submitBtn: {
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 18,
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

  // Or divider
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  orLine: { flex: 1, height: 1, backgroundColor: BRAND + '1A' },
  orText: {
    fontSize: 12,
    color: MUTED,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },

  // Social buttons
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.surfaceCoolAlt,
    borderWidth: 1.5,
    borderColor: BRAND + '18',
  },
  socialBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: DARK,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },

  // Switch
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  switchText: {
    fontSize: 13,
    color: MUTED,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },
  switchLink: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },

  // Tagline
  tagline: { alignItems: 'center', paddingTop: 28 },
  taglineText: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },

  // ── Country Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: DARK + '73',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: height * 0.82,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: BRAND + '26',
    alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BRAND + '12',
  },
  modalTitle: {
    fontSize: 17, fontWeight: '800', color: DARK,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  modalClose: { padding: 4 },
  modalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceTint,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND + '1A',
    paddingHorizontal: 14,
    height: 44,
    margin: 16,
    marginBottom: 8,
  },
  modalSearchInput: {
    flex: 1, fontSize: 14, color: DARK,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  countryFlag: { fontSize: 22, marginRight: 14 },
  countryName: {
    flex: 1, fontSize: 15, color: DARK, fontWeight: '500',
    fontFamily: AppDetails?.fontFamily?.inter?.medium ?? 'System',
  },
  countryDial: {
    fontSize: 13, color: MUTED,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },
  separator: { height: 1, backgroundColor: BRAND + '0D', marginLeft: 58 },
});
