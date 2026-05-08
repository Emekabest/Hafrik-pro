import React, { useRef } from "react";
import { Animated, PanResponder, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Detects horizontal swipe gestures using PanResponder.
 * - Swipe right → onSwipeRight
 * - Swipe left  → onSwipeLeft
 */
export default function ReelGestures({ children, onSwipeRight, onSwipeLeft }) {
  const dragX   = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy),

      onPanResponderMove: (_, { dx }) => {
        const progress = Math.min(1, Math.abs(dx) / 90);
        dragX.setValue(dx);
        opacity.setValue(progress * 0.9);
      },

      onPanResponderRelease: (_, { dx }) => {
        // Reset indicator
        Animated.parallel([
          Animated.timing(dragX,   { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();

        if (dx > 80)       onSwipeRight?.();
        else if (dx < -80) onSwipeLeft?.();
      },

      onPanResponderTerminate: () => {
        dragX.setValue(0);
        opacity.setValue(0);
      },
    })
  ).current;

  // Switch indicator slides with the swipe direction.
  const indicatorTranslate = dragX.interpolate({
    inputRange: [-120, 0, 120],
    outputRange: [0, 0, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.wrap} {...panResponder.panHandlers}>
      {/* Swipe tab indicator */}
      <Animated.View
        style={[
          styles.switchIndicator,
          { opacity, transform: [{ translateX: indicatorTranslate }] },
        ]}
        pointerEvents="none"
      >
        <Ionicons name="swap-horizontal" size={22} color="#fff" />
      </Animated.View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  switchIndicator: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
});
