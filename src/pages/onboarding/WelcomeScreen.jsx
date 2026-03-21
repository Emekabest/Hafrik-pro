import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../AuthContext';
import useStore from '../../repository/store';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const WHITE  = Colors.white;

export default function WelcomeScreen({ navigation }) {
  const { top, bottom } = useSafeAreaInsets();
  const { updateOnboardingStep } = useAuth();

  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const scaleAnim  = useRef(new Animated.Value(0.85)).current;
  const slideAnim  = useRef(new Animated.Value(32)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(120),
      Animated.parallel([
        Animated.spring(scaleAnim,  { toValue: 1,    useNativeDriver: true, tension: 60, friction: 8 }),
        Animated.timing(fadeAnim,   { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim,  { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const goToFeed = async () => {
    await updateOnboardingStep(6);
    useStore.getState().setShowWelcomeModal?.(true);
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  return (
    <LinearGradient
      colors={[Colors.brandDeep ?? BRAND, Colors.primaryDark, Colors.primary]}
      start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }}
      style={styles.grad}
    >
      <View style={[styles.inner, { paddingTop: top + 40, paddingBottom: bottom + 32 }]}>
        {/* Icon */}
        <Animated.View style={[styles.iconWrap, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <Ionicons name="sparkles" size={52} color={WHITE} />
        </Animated.View>

        {/* Text */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center' }}>
          <Text style={styles.title}>Welcome to Hafrik 🎉</Text>
          <Text style={styles.sub}>Your community is ready</Text>

          {/* Decorative dots */}
          <View style={styles.dotsRow}>
            {['people-outline', 'storefront-outline', 'earth-outline', 'chatbubbles-outline'].map((icon, i) => (
              <View key={i} style={styles.dot}>
                <Ionicons name={icon} size={20} color={ACCENT} />
              </View>
            ))}
          </View>

          <Text style={styles.tagline}>
            Connect · Discover · Grow
          </Text>
        </Animated.View>

        <View style={styles.spacer} />

        {/* CTA */}
        <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
          <TouchableOpacity
            style={styles.btn}
            onPress={goToFeed}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>Let's go</Text>
            <Ionicons name="arrow-forward" size={18} color={BRAND} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  grad:       { flex: 1 },
  inner:      { flex: 1, alignItems: 'center', paddingHorizontal: 32 },
  iconWrap:   { width: 110, height: 110, borderRadius: 55, backgroundColor: WHITE + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 36, borderWidth: 1.5, borderColor: WHITE + '33' },
  title:      { fontSize: 32, fontWeight: '800', color: WHITE, textAlign: 'center', marginBottom: 12, letterSpacing: -0.5 },
  sub:        { fontSize: 17, color: WHITE + 'CC', textAlign: 'center', lineHeight: 24, marginBottom: 40 },
  dotsRow:    { flexDirection: 'row', gap: 14, marginBottom: 24 },
  dot:        { width: 52, height: 52, borderRadius: 26, backgroundColor: WHITE + '14', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: WHITE + '22' },
  tagline:    { fontSize: 14, color: WHITE + '88', letterSpacing: 2, textTransform: 'uppercase', fontWeight: '600' },
  spacer:     { flex: 1 },
  btn:        { flexDirection: 'row', width: '100%', height: 56, borderRadius: 16, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center' },
  btnText:    { fontSize: 17, fontWeight: '700', color: BRAND },
});
