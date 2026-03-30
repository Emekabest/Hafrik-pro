import React, { useEffect, useRef, useMemo, useCallback, memo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const { width, height } = Dimensions.get('window');

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const LIGHT  = Colors.tealWave;
const ARC_SIZES = [300, 380, 460, 540];
const FEATURE_CHIPS = ['🤝 Connect', '🚀 Grow', '🌐 Belong'];
const BACKGROUND_GRADIENT = [BRAND, Colors.brandDeepAlt, Colors.brandDeepStrong];

// ─── Floating particles (matches Login onboarding style) ─────────────────────
const FloatingParticles = memo(() => {
  const particles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        x:       new Animated.Value(Math.random() * width),
        y:       new Animated.Value(Math.random() * height),
        opacity: new Animated.Value(0),
        size:    Math.random() * 6 + 2.5,
        delay:   i * 200,
      })),
    [],
  );

  const animateParticle = useCallback((p) => {
    const loop = () => {
      Animated.parallel([
        Animated.timing(p.x, {
          toValue: Math.random() * width,
          duration: 5000 + Math.random() * 4000,
          useNativeDriver: true,
        }),
        Animated.timing(p.y, {
          toValue: Math.random() * height,
          duration: 5000 + Math.random() * 4000,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(p.opacity, {
            toValue: Math.random() * 0.35 + 0.08,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(p.opacity, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
          }),
        ]),
      ]).start(({ finished }) => { if (finished) loop(); });
    };
    return loop;
  }, []);

  useEffect(() => {
    const timers = particles.map((p) => {
      const loop = animateParticle(p);
      return setTimeout(loop, p.delay);
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [particles, animateParticle]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width:  p.size,
            height: p.size,
            borderRadius: p.size / 2,
            backgroundColor: ACCENT,
            opacity:   p.opacity,
            transform: [{ translateX: p.x }, { translateY: p.y }],
          }}
        />
      ))}
    </View>
  );
});

// ─── Concentric pulse rings ───────────────────────────────────────────────────
const PulseRings = memo(({ size = 140 }) => {
  const rings = useMemo(
    () =>
      Array.from({ length: 3 }, () => ({
        scale:   new Animated.Value(1),
        opacity: new Animated.Value(0.45),
      })),
    [],
  );

  useEffect(() => {
    rings.forEach((r, i) => {
      Animated.loop(
        Animated.parallel([
          Animated.timing(r.scale, {
            toValue: 2.1,
            duration: 2200,
            delay: i * 540,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(r.opacity, {
            toValue: 0,
            duration: 2200,
            delay: i * 540,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    });
  }, []);

  return (
    <View
      style={{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      pointerEvents="none"
    >
      {rings.map((r, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: size, height: size,
            borderRadius: size / 2,
            borderWidth: 1.5,
            borderColor: ACCENT,
            transform: [{ scale: r.scale }],
            opacity: r.opacity,
          }}
        />
      ))}
    </View>
  );
});

// ─── Shimmer loading bar ──────────────────────────────────────────────────────
const ShimmerBar = memo(() => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const translateX = useMemo(
    () => shimmer.interpolate({
      inputRange: [0, 1],
      outputRange: [-width * 0.55, width * 0.55],
    }),
    [shimmer],
  );

  return (
    <View style={styles.shimmerTrack}>
      <Animated.View style={[styles.shimmerGlow, { transform: [{ translateX }] }]} />
    </View>
  );
});

// ─── Decorative static concentric arcs ───────────────────────────────────────
const ArcLines = memo(() => {
  const arcStyles = useMemo(
    () =>
      ARC_SIZES.map((d, i) => ({
        position: 'absolute',
        top: height / 2 - d / 2,
        left: width / 2 - d / 2,
        width: d,
        height: d,
        borderRadius: d / 2,
        borderWidth: 0.5,
        borderColor: withOpacity(Colors.tealAccent, 0.07 - i * 0.015),
      })),
    [],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {arcStyles.map((style, i) => (
        <View key={i} style={style} />
      ))}
    </View>
  );
});

// ─── Main Splash Screen ───────────────────────────────────────────────────────
function SplashScreen({ fadeAnim }) {
  const logoScale   = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  const tagOpacity1 = useRef(new Animated.Value(0)).current;
  const tagTY1      = useRef(new Animated.Value(20)).current;
  const tagOpacity2 = useRef(new Animated.Value(0)).current;
  const tagTY2      = useRef(new Animated.Value(20)).current;

  const chipOpacity = useRef(new Animated.Value(0)).current;
  const chipTY      = useRef(new Animated.Value(14)).current;

  const globeScale = useRef(new Animated.Value(0)).current;
  const fallbackOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Logo springs in
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 100, friction: 7, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
    ]).start();

    // Globe bounces in
    setTimeout(() => {
      Animated.spring(globeScale, { toValue: 1, tension: 90, friction: 6, useNativeDriver: true }).start();
    }, 180);

    // Tagline line 1
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(tagOpacity1, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(tagTY1, { toValue: 0, duration: 420, useNativeDriver: true }),
      ]).start();
    }, 420);

    // Tagline line 2
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(tagOpacity2, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(tagTY2, { toValue: 0, duration: 420, useNativeDriver: true }),
      ]).start();
    }, 640);

    // Feature chips
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(chipOpacity, { toValue: 1, duration: 360, useNativeDriver: true }),
        Animated.timing(chipTY, { toValue: 0, duration: 360, useNativeDriver: true }),
      ]).start();
    }, 860);
  }, []);

  const wrapperOpacity = useMemo(() => fadeAnim ?? fallbackOpacity, [fadeAnim, fallbackOpacity]);

  return (
    <Animated.View style={[styles.root, { opacity: wrapperOpacity }]}>
      {/* Background gradient */}
      <LinearGradient
        colors={BACKGROUND_GRADIENT}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative rings */}
      <ArcLines />

      {/* Floating dots */}
      <FloatingParticles />

      {/* ── Center cluster ── */}
      <View style={styles.cluster}>

        {/* Globe emoji */}
        <Animated.Text style={[styles.globe, { transform: [{ scale: globeScale }] }]}>
          🌍
        </Animated.Text>

        {/* Orb + pulse rings */}
        <View style={{ alignItems: 'center', justifyContent: 'center', height: 140 }}>
          <PulseRings size={140} />

          <Animated.View
            style={[
              styles.logoOrb,
              { transform: [{ scale: logoScale }], opacity: logoOpacity },
            ]}
          >
            <LinearGradient
              colors={[ACCENT, Colors.tealAccentAlt, LIGHT]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoOrbGrad}
            >
              <Image
                source={require('../../assl.js/logo1.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </LinearGradient>
          </Animated.View>
        </View>


        {/* Accent underline */}
        <Animated.View style={[styles.accentLine, { opacity: logoOpacity }]} />

        {/* Tagline */}
        <Animated.Text style={[styles.tag1, { opacity: tagOpacity1, transform: [{ translateY: tagTY1 }] }]}>
          Your diaspora.
        </Animated.Text>
        <Animated.Text style={[styles.tag2, { opacity: tagOpacity2, transform: [{ translateY: tagTY2 }] }]}>
          Your community.
        </Animated.Text>

        {/* Feature chips */}
        <Animated.View style={[styles.chipRow, { opacity: chipOpacity, transform: [{ translateY: chipTY }] }]}>
          {FEATURE_CHIPS.map((label) => (
            <View key={label} style={styles.chip}>
              <Text style={styles.chipTxt}>{label}</Text>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* Bottom loading indicator */}
      <View style={styles.bottom}>
        <ShimmerBar />
        <Text style={styles.bottomTxt}>Connecting Africa's diaspora</Text>
      </View>
    </Animated.View>
  );
}

export default memo(SplashScreen);

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },

  cluster: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  globe: {
    fontSize: 44,
    marginBottom: 12,
  },

  logoOrb: {
    width: 90,
    height: 90,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 22,
    elevation: 16,
  },
  logoOrbGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 78,
    height: 78,
  },

  brandName: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 9,
    marginTop: 16,
    marginBottom: 8,
  },
  brandLogo: {
    width: 180,
    height: 60,
    marginTop: 16,
    marginBottom: 8,
  },

  accentLine: {
    width: 50,
    height: 3,
    borderRadius: 99,
    backgroundColor: ACCENT,
    marginBottom: 24,
  },

  tag1: {
    fontSize: 22,
    fontWeight: '700',
    color: withOpacity(Colors.white, 0.92),
    letterSpacing: 0.2,
  },
  tag2: {
    fontSize: 22,
    fontWeight: '300',
    color: withOpacity(Colors.white, 0.55),
    letterSpacing: 0.2,
    marginTop: 2,
    marginBottom: 30,
  },

  chipRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: withOpacity(Colors.tealAccent, 0.32),
    backgroundColor: withOpacity(Colors.tealAccent, 0.10),
  },
  chipTxt: {
    fontSize: 11.5,
    fontWeight: '600',
    color: withOpacity(Colors.white, 0.72),
    letterSpacing: 0.2,
  },

  shimmerTrack: {
    width: 130,
    height: 3,
    borderRadius: 99,
    backgroundColor: withOpacity(Colors.white, 0.10),
    overflow: 'hidden',
    marginBottom: 12,
  },
  shimmerGlow: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: '60%',
    borderRadius: 99,
    backgroundColor: ACCENT,
    opacity: 0.8,
  },

  bottom: {
    position: 'absolute',
    bottom: 52,
    alignItems: 'center',
    gap: 0,
  },
  bottomTxt: {
    fontSize: 11,
    color: withOpacity(Colors.white, 0.28),
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    marginTop: 8,
  },
});
