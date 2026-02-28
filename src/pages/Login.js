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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import AppDetails from '../helpers/appdetails';

const { width, height } = Dimensions.get('window');

// ─── Brand tokens ──────────────────────────────────────────────────────────────
const BRAND  = '#0C3F44';
const ACCENT = '#13C296';
const CREAM  = '#F5F0E8';
const DARK   = '#0D1B1E';
const MUTED  = '#7A9198';
const ERROR  = '#E55353';

const API_BASE = 'https://hafrik.com/api/v1/auth';

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
    bg: BRAND,
    accent: ACCENT,
  },
  {
    id: 2,
    eyebrow: 'COMMUNITIES',
    title: 'Groups built\naround you.',
    body: 'Join city groups, student communities, business networks and more — all in one place.',
    emoji: '👥',
    bg: '#0a5a62',
    accent: '#1ED6A8',
  },
  {
    id: 3,
    eyebrow: 'OPPORTUNITIES',
    title: 'Grow where\nyou are.',
    body: 'Discover jobs, marketplace listings, shipping agents, events and local guides.',
    emoji: '🚀',
    bg: '#073038',
    accent: ACCENT,
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
const STRENGTH_COLORS = ['', '#E55353', '#F5A623', '#13C296', '#0C3F44'];

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
              backgroundColor: i <= s ? STRENGTH_COLORS[s] : 'rgba(12,63,68,0.12)',
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
    <Text style={styles.fieldLabel}>{label}</Text>
    {children}
    {!!error && <Text style={styles.fieldError}>{error}</Text>}
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

  const slide = SLIDES[idx];

  return (
    <View style={{ flex: 1, backgroundColor: slide.bg }}>
      {/* Animated floating particles */}
      <FloatingParticles />

      {/* Decorative blobs */}
      <View style={[styles.blob, { width: 300, height: 300, top: -80, right: -100, opacity: 0.08 }]} />
      <View style={[styles.blob, { width: 200, height: 200, bottom: 140, left: -60, opacity: 0.06 }]} />
      <View style={[styles.blob, { width: 100, height: 100, top: '38%', left: '25%', opacity: 0.04 }]} />

      {/* Skip */}
      {idx < SLIDES.length - 1 && (
        <TouchableOpacity
          style={[styles.skipBtn, { top: top + 16 }]}
          onPress={onDone}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip</Text>
          <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.75)" />
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
                <PulseRing color={slide.accent} size={120} />
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
                style={[styles.dot, { width: w, backgroundColor: i === idx ? ACCENT : 'rgba(255,255,255,0.3)' }]}
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
    </View>
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
  const [showModal, setShowModal] = useState(false);
  const [agreed, setAgreed]       = useState(false);
  const [errors, setErrors]       = useState({});
  const [focused, setFocused]     = useState({});
  const isSubmitting              = useRef(false);

  const [form, setForm] = useState({
    fullName: '', username: '', email: '',
    password: '', phone: '', country: null,
  });

  const set = (key, val) => {
    setForm((p) => ({ ...p, [key]: val }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: null }));
  };

  const resetForm = () => {
    setForm({ fullName: '', username: '', email: '', password: '', phone: '', country: null });
    setErrors({}); setAgreed(false); isSubmitting.current = false;
  };

  const toggleMode = () => { resetForm(); setMode((m) => (m === 'login' ? 'register' : 'login')); };

  const validate = () => {
    const e = {};
    if (mode === 'register') {
      if (!form.fullName.trim()) e.fullName = 'Full name is required';
      if (!form.email.trim())    e.email    = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
      if (!form.country)         e.country  = 'Please select your country';
      if (!form.phone.trim())    e.phone    = 'Phone number is required';
      if (!agreed)               e.terms    = 'You must agree to the terms';
    }
    if (!form.username.trim() && !form.email.trim()) e.username = 'Username or email is required';
    if (!form.password)          e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'At least 6 characters';
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
        ? { username: form.username.trim() || form.email.trim(), password: form.password }
        : {
            full_name:    form.fullName.trim(),
            username:     form.username.trim(),
            email:        form.email.trim().toLowerCase(),
            password:     form.password,
            phone_number: `${form.country?.dialCode ?? ''}${form.phone.replace(/\D/g, '')}`,
            country:      form.country?.code,
            country_name: form.country?.name,
          };

      const res = await axios.post(endpoint, payload, {
        timeout: 12000,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      });

      if (res.data.status === 'success') {
        const token = res.data.data?.token;
        let user    = res.data.data?.user;
        if (Array.isArray(user)) user = user[0];
        if (!token || !user) throw new Error('Invalid server response');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await login(user, token);
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
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
      <LinearGradient
        colors={[BRAND, '#0a5a62', '#073038']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: top + 8 }]}
      >
        <View style={styles.headerBlob} />
        <View style={[styles.headerBlob, { width: 110, height: 110, top: 8, left: -18, opacity: 0.07 }]} />

        <View style={{ flex: 1 }}>
          {/* Live social proof pill */}
          <View style={styles.proofPill}>
            <View style={styles.proofDot} />
            <Text style={styles.proofText}>50,000+ members worldwide</Text>
          </View>

          <Text style={styles.headerEyebrow}>HAFRIK</Text>
          <Text style={styles.headerTitle}>
            {mode === 'login' ? 'Welcome back.' : 'Join Hafrik.'}
          </Text>
          <Text style={styles.headerSub}>
            {mode === 'login'
              ? 'Sign in to your community'
              : 'Create your account in seconds'}
          </Text>
        </View>

        <View style={styles.headerLogo}>
          <Text style={{ fontSize: 28 }}>🌍</Text>
        </View>
      </LinearGradient>

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
              <Ionicons
                name={m === 'login' ? 'log-in-outline' : 'person-add-outline'}
                size={14}
                color={mode === m ? '#fff' : MUTED}
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

          {/* Username / email */}
          <Field label={mode === 'login' ? 'Username or Email' : 'Username'} error={errors.username}>
            <View style={inputStyle('username')}>
              <Ionicons name="person-outline" size={16} color={MUTED} style={styles.inputIcon} />
              <TextInput
                style={styles.inputText}
                placeholder={mode === 'login' ? 'Enter username or email' : 'Choose a username'}
                placeholderTextColor={MUTED}
                value={mode === 'login' ? (form.username || form.email) : form.username}
                onChangeText={(v) => {
                  if (mode === 'login') {
                    v.includes('@') ? (set('email', v), set('username', '')) : (set('username', v), set('email', ''));
                  } else set('username', v);
                }}
                autoCapitalize="none"
                onFocus={() => setFocused((p) => ({ ...p, username: true }))}
                onBlur={()  => setFocused((p) => ({ ...p, username: false }))}
              />
            </View>
          </Field>

          {/* Password */}
          <Field label="Password" error={errors.password}>
            <View style={inputStyle('password')}>
              <Ionicons name="lock-closed-outline" size={16} color={MUTED} style={styles.inputIcon} />
              <TextInput
                style={[styles.inputText, { flex: 1 }]}
                placeholder="Enter your password"
                placeholderTextColor={MUTED}
                value={form.password}
                onChangeText={(v) => set('password', v)}
                secureTextEntry={!showPwd}
                onFocus={() => setFocused((p) => ({ ...p, password: true }))}
                onBlur={()  => setFocused((p) => ({ ...p, password: false }))}
              />
              <TouchableOpacity onPress={() => setShowPwd((v) => !v)} style={styles.eyeBtn}>
                <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color={MUTED} />
              </TouchableOpacity>
            </View>
            {/* Strength bar (register only) */}
            {mode === 'register' && <PasswordStrength password={form.password} />}
          </Field>

          {/* Register-only fields */}
          {mode === 'register' && (
            <>
              <Field label="Email" error={errors.email}>
                <View style={inputStyle('email')}>
                  <Ionicons name="mail-outline" size={16} color={MUTED} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputText}
                    placeholder="your@email.com"
                    placeholderTextColor={MUTED}
                    value={form.email}
                    onChangeText={(v) => set('email', v)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={() => setFocused((p) => ({ ...p, email: true }))}
                    onBlur={()  => setFocused((p) => ({ ...p, email: false }))}
                  />
                </View>
              </Field>

              <Field label="Full Name" error={errors.fullName}>
                <View style={inputStyle('fullName')}>
                  <Ionicons name="id-card-outline" size={16} color={MUTED} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputText}
                    placeholder="Your full name"
                    placeholderTextColor={MUTED}
                    value={form.fullName}
                    onChangeText={(v) => set('fullName', v)}
                    onFocus={() => setFocused((p) => ({ ...p, fullName: true }))}
                    onBlur={()  => setFocused((p) => ({ ...p, fullName: false }))}
                  />
                </View>
              </Field>

              <Field label="Country" error={errors.country}>
                <TouchableOpacity
                  style={[styles.input, styles.inputRow, errors.country && styles.inputError]}
                  onPress={() => setShowModal(true)}
                  activeOpacity={0.8}
                >
                  {form.country ? (
                    <>
                      <Text style={{ fontSize: 18, marginRight: 10 }}>{form.country.flag}</Text>
                      <Text style={[styles.inputText, { flex: 1 }]}>{form.country.name}</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="globe-outline" size={16} color={MUTED} style={styles.inputIcon} />
                      <Text style={[styles.inputText, { color: MUTED, flex: 1 }]}>Select your country</Text>
                    </>
                  )}
                  <Ionicons name="chevron-down" size={18} color={MUTED} />
                </TouchableOpacity>
              </Field>

              <Field label="Phone" error={errors.phone}>
                <View style={[styles.input, styles.inputRow, errors.phone && styles.inputError]}>
                  <TouchableOpacity onPress={() => setShowModal(true)} style={styles.dialCode}>
                    <Text style={styles.dialCodeText}>
                      {form.country?.flag ?? '🌍'} {form.country?.dialCode ?? '+?'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={MUTED} />
                  </TouchableOpacity>
                  <View style={styles.phoneDivider} />
                  <TextInput
                    style={[styles.inputText, { flex: 1 }]}
                    placeholder="Mobile number"
                    placeholderTextColor={MUTED}
                    value={form.phone}
                    onChangeText={(v) => set('phone', v.replace(/\D/g, ''))}
                    keyboardType="phone-pad"
                    onFocus={() => setFocused((p) => ({ ...p, phone: true }))}
                    onBlur={()  => setFocused((p) => ({ ...p, phone: false }))}
                  />
                </View>
              </Field>

              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => setAgreed((v) => !v)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
                  {agreed && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
                <Text style={styles.termsText}>
                  I agree to Hafrik's{' '}
                  <Text style={styles.termsLink}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>
              {errors.terms && <Text style={styles.fieldError}>{errors.terms}</Text>}
            </>
          )}

          {/* Forgot password (login only) */}
          {mode === 'login' && (
            <TouchableOpacity style={styles.forgotBtn} activeOpacity={0.7}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          {/* Submit — gradient button */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.6 }]}
            onPress={submit}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[BRAND, '#0a5a62']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.submitText}>
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Or continue with */}
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or continue with</Text>
            <View style={styles.orLine} />
          </View>

          {/* Social buttons */}
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8}>
              <Ionicons name="logo-google" size={18} color="#EA4335" />
              <Text style={styles.socialBtnText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#000', borderColor: '#000' }]} activeOpacity={0.8}>
              <Ionicons name="logo-apple" size={18} color="#fff" />
              <Text style={[styles.socialBtnText, { color: '#fff' }]}>Apple</Text>
            </TouchableOpacity>
          </View>

          {/* Switch mode */}
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            </Text>
            <TouchableOpacity onPress={toggleMode} activeOpacity={0.7}>
              <Text style={styles.switchLink}>
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </Text>
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

      <CountryModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSelect={(c) => set('country', c)}
      />
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
    backgroundColor: '#fff',
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
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  skipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: AppDetails?.fontFamily?.inter?.medium ?? 'System',
  },
  slideEmoji: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
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
    color: '#fff',
    lineHeight: 46,
    marginBottom: 18,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  slideBody: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 24,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },
  slideBottom: {
    paddingHorizontal: 30,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    paddingTop: 16,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  statStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
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
    color: 'rgba(255,255,255,0.58)',
    fontSize: 11,
    marginTop: 2,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.15)' },
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

  // ── Auth header ──
  header: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  headerBlob: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(19,194,150,0.10)',
    top: -60,
    right: -40,
  },
  proofPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(19,194,150,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(19,194,150,0.28)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 12,
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
  headerEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 3,
    color: ACCENT,
    marginBottom: 6,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },
  headerLogo: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Body ──
  body: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 60,
  },

  // Tab row
  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(12,63,68,0.08)',
    borderRadius: 100,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 100,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tabActive: { backgroundColor: BRAND },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: MUTED,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  tabTextActive: { color: '#fff' },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(12,63,68,0.07)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },

  // Field
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

  // Input
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FA',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(12,63,68,0.10)',
    paddingHorizontal: 14,
    height: 50,
  },
  inputRow:    { flexDirection: 'row', alignItems: 'center' },
  inputFocused: { borderColor: ACCENT, backgroundColor: '#fff' },
  inputError:  { borderColor: ERROR,   backgroundColor: '#FFF5F5' },
  inputIcon:   { marginRight: 10 },
  inputText: {
    fontSize: 15,
    color: DARK,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },
  eyeBtn: { padding: 4 },

  // Dial code
  dialCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 10,
  },
  dialCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: DARK,
    fontFamily: AppDetails?.fontFamily?.inter?.medium ?? 'System',
  },
  phoneDivider: {
    width: 1, height: 24,
    backgroundColor: 'rgba(12,63,68,0.15)',
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
    borderColor: 'rgba(12,63,68,0.25)',
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
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 18,
  },
  submitGradient: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },

  // Or divider
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  orLine: { flex: 1, height: 1, backgroundColor: 'rgba(12,63,68,0.1)' },
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
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F7F9FA',
    borderWidth: 1.5,
    borderColor: 'rgba(12,63,68,0.10)',
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
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: height * 0.82,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(12,63,68,0.15)',
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
    borderBottomColor: 'rgba(12,63,68,0.07)',
  },
  modalTitle: {
    fontSize: 17, fontWeight: '800', color: DARK,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  modalClose: { padding: 4 },
  modalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(12,63,68,0.10)',
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
  separator: { height: 1, backgroundColor: 'rgba(12,63,68,0.05)', marginLeft: 58 },
});
