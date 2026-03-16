import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, TouchableOpacity } from 'react-native';
import useStore from '../repository/store';
import { Colors } from '../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BRAND = Colors.primaryDark;

/**
 * Global Toast — mounts once in App.js.
 * Trigger via: useStore.getState().showToast('Message', '🎉')
 */
const Toast = () => {
  const toast  = useStore((s) => s.toast);
  const hideToast = useStore((s) => s.hideToast);
  const { bottom } = useSafeAreaInsets();

  const translateY = useRef(new Animated.Value(100)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const prevIdRef  = useRef(null);

  useEffect(() => {
    if (toast && toast.id !== prevIdRef.current) {
      prevIdRef.current = toast.id;
      // Slide up + fade in
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(opacity,    { toValue: 1, duration: 180,         useNativeDriver: true }),
      ]).start();
    } else if (!toast) {
      // Slide down + fade out
      Animated.parallel([
        Animated.spring(translateY, { toValue: 100, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(opacity,    { toValue: 0,   duration: 200,         useNativeDriver: true }),
      ]).start();
    }
  }, [toast]);

  if (!toast && opacity._value === 0) return null;

  return (
    <Animated.View
      style={[
        ts.wrap,
        { bottom: Math.max(bottom, 16) + 56, opacity, transform: [{ translateY }] },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={ts.pill}
        activeOpacity={0.85}
        onPress={hideToast}
      >
        {!!toast?.emoji && <Text style={ts.emoji}>{toast.emoji}</Text>}
        <Text style={ts.msg} numberOfLines={2}>{toast?.message ?? ''}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const ts = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BRAND,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 30,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
    maxWidth: 340,
  },
  emoji: { fontSize: 18 },
  msg: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
    flexShrink: 1,
    letterSpacing: 0.1,
  },
});

export default Toast;
