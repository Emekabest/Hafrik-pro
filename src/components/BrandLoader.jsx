/**
 * BrandLoader — Hafrik branded pulse loader.
 *
 * Usage:
 *   <BrandLoader />                  — full-screen centered overlay
 *   <BrandLoader inline />           — inline (no overlay, just the pulse)
 *   <BrandLoader size="small" />     — smaller variant
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';

const BRAND  = Colors.primaryDark;   // deep teal
const ACCENT = Colors.primary;       // lighter teal

const SIZES = {
  small:  { outer: 56,  inner: 40,  logo: 30 },
  medium: { outer: 80,  inner: 58,  logo: 46 },
  large:  { outer: 104, inner: 76,  logo: 62 },
};

export default function BrandLoader({ inline = false, size = 'medium' }) {
  const { outer, inner, logo } = SIZES[size] ?? SIZES.medium;

  // Ring 1 — slower pulse
  const ring1Scale   = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0.5)).current;

  // Ring 2 — offset pulse
  const ring2Scale   = useRef(new Animated.Value(1)).current;
  const ring2Opacity = useRef(new Animated.Value(0.25)).current;

  // Core — subtle breathe
  const coreScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = (scale, opacity, duration, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale,   { toValue: 1.6, duration, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0,   duration, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scale,   { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.5, duration: 0, useNativeDriver: true }),
          ]),
        ])
      );

    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(coreScale, { toValue: 1.06, duration: 700, useNativeDriver: true }),
        Animated.timing(coreScale, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    );

    const r1 = pulse(ring1Scale, ring1Opacity, 1200, 0);
    const r2 = pulse(ring2Scale, ring2Opacity, 1200, 600);

    r1.start();
    r2.start();
    breathe.start();

    return () => { r1.stop(); r2.stop(); breathe.stop(); };
  }, []);

  const Pulse = ({ scale, opacity }) => (
    <Animated.View
      style={[
        styles.ring,
        {
          width: outer,
          height: outer,
          borderRadius: outer / 2,
          borderColor: ACCENT,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );

  const core = (
    <View style={{ width: outer, height: outer, alignItems: 'center', justifyContent: 'center' }}>
      {/* Ripple rings */}
      <View style={StyleSheet.absoluteFill}>
        <Pulse scale={ring1Scale} opacity={ring1Opacity} />
      </View>
      <View style={StyleSheet.absoluteFill}>
        <Pulse scale={ring2Scale} opacity={ring2Opacity} />
      </View>

      {/* Pulsing gradient circle */}
      <Animated.View style={{ transform: [{ scale: coreScale }] }}>
        <LinearGradient
          colors={[ACCENT, BRAND]}
          style={[styles.circle, { width: inner, height: inner, borderRadius: inner / 2 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Image
            source={require('../assl.js/logo1.png')}
            style={{ width: logo, height: logo, tintColor: '#ffffff' }}
            resizeMode="contain"
          />
        </LinearGradient>
      </Animated.View>
    </View>
  );

  if (inline) return core;

  return (
    <View style={styles.overlay}>
      {core}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
});
