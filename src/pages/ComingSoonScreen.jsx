import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || '').replace('#', '');
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${normalized}${alpha}`;
};

// Map feature name → icon + gradient colours
const FEATURE_CONFIG = {
  Jobs: {
    icon: 'briefcase-outline',
    gradient: [Colors.primaryDark, '#1a6b72'],
    accentGradient: ['#ff6b6b', '#ee5a24'],
    tagline: 'Find your next opportunity',
    sub: "We're building the best job board for Africa–China professionals. Stay tuned!",
  },
  Events: {
    icon: 'calendar-outline',
    gradient: [Colors.primaryDark, '#1a6b72'],
    accentGradient: [Colors.tealAccent, '#0a8f7c'],
    tagline: 'Discover amazing events',
    sub: "From trade expos to networking evenings — your events hub is almost ready.",
  },
};

const DEFAULT_CONFIG = {
  icon: 'rocket-outline',
  gradient: [Colors.primaryDark, '#1a6b72'],
  accentGradient: [Colors.tealAccent, Colors.primary],
  tagline: 'Something exciting is coming',
  sub: "We're working hard to bring you this feature. Check back soon!",
};

export default function ComingSoonScreen({ navigation, route }) {
  const feature = route?.params?.feature ?? 'Feature';
  const cfg = FEATURE_CONFIG[feature] ?? DEFAULT_CONFIG;
  const { width } = useWindowDimensions();

  // ── Animations ────────────────────────────────────────────────────────────
  const pulse   = useRef(new Animated.Value(1)).current;
  const fadeIn  = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    // Continuous pulse on the icon ring
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const ringSize = Math.min(width * 0.44, 190);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right', 'bottom']}>
      {/* ── Header ── */}
      <LinearGradient
        colors={cfg.gradient}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{feature}</Text>

        {/* spacer so title is centred */}
        <View style={styles.backBtn} />
      </LinearGradient>

      {/* ── Body ── */}
      <LinearGradient
        colors={[Colors.white, '#eef8f8', Colors.white]}
        style={styles.body}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeIn, transform: [{ translateY: slideUp }] },
          ]}
        >
          {/* ── Icon ring ── */}
          <View style={styles.ringWrap}>
            {/* Outer pulse ring */}
            <Animated.View
              style={[
                styles.outerRing,
                {
                  width: ringSize + 32,
                  height: ringSize + 32,
                  borderRadius: (ringSize + 32) / 2,
                  transform: [{ scale: pulse }],
                },
              ]}
            />
            {/* Inner gradient circle */}
            <LinearGradient
              colors={cfg.accentGradient}
              style={[styles.iconCircle, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name={cfg.icon} size={ringSize * 0.38} color={Colors.white} />
            </LinearGradient>
          </View>

          {/* ── Text ── */}
          <View style={styles.textBlock}>
            <View style={styles.badge}>
              <View style={styles.badgeDot} />
              <Text style={styles.badgeLabel}>COMING SOON</Text>
            </View>

            <Text style={styles.featureName}>{cfg.tagline}</Text>
            <Text style={styles.sub}>{cfg.sub}</Text>
          </View>

          {/* ── Divider ── */}
          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerLabel}>HAFRIK</Text>
            <View style={styles.divider} />
          </View>

          {/* ── Notify pill (decorative) ── */}
          <View style={styles.notifyCard}>
            <LinearGradient
              colors={cfg.gradient}
              style={styles.notifyIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="notifications-outline" size={18} color={Colors.white} />
            </LinearGradient>
            <View style={styles.notifyText}>
              <Text style={styles.notifyTitle}>Be the first to know</Text>
              <Text style={styles.notifySub}>We'll let you know when {feature} goes live</Text>
            </View>
            <Ionicons name="checkmark-circle" size={20} color={Colors.tealAccent} />
          </View>

          {/* ── Back CTA ── */}
          <TouchableOpacity
            style={styles.ctaWrap}
            activeOpacity={0.84}
            onPress={() => navigation.goBack()}
          >
            <LinearGradient
              colors={cfg.gradient}
              style={styles.cta}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="arrow-back" size={16} color={Colors.white} />
              <Text style={styles.ctaLabel}>Go back</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primaryDark },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: withOpacity(Colors.white, 0.15),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.3,
  },

  // Body
  body: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
    gap: 28,
  },

  // Icon ring
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    backgroundColor: withOpacity(Colors.tealAccent, 0.10),
    borderWidth: 1.5,
    borderColor: withOpacity(Colors.tealAccent, 0.22),
  },
  iconCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 10,
  },

  // Text block
  textBlock: {
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: withOpacity(Colors.tealAccent, 0.12),
    borderWidth: 1,
    borderColor: withOpacity(Colors.tealAccent, 0.28),
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.tealAccent,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.tealAccent,
    letterSpacing: 1.2,
  },
  featureName: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.primaryDark,
    textAlign: 'center',
    lineHeight: 32,
  },
  sub: {
    fontSize: 13.5,
    color: Colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'stretch',
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: withOpacity(Colors.primaryDark, 0.10),
  },
  dividerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: withOpacity(Colors.primaryDark, 0.30),
    letterSpacing: 2,
  },

  // Notify card
  notifyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    alignSelf: 'stretch',
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: withOpacity(Colors.primaryDark, 0.07),
  },
  notifyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  notifyText: {
    flex: 1,
    gap: 2,
  },
  notifyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  notifySub: {
    fontSize: 11.5,
    color: Colors.secondaryText,
    lineHeight: 16,
  },

  // CTA
  ctaWrap: {
    alignSelf: 'stretch',
    borderRadius: 14,
    overflow: 'hidden',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  ctaLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.3,
  },
});
