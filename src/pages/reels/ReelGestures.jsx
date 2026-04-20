import React, { useRef } from "react";
import { Animated, PanResponder, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Detects horizontal swipe gestures using PanResponder.
 * - Swipe right → like (onSwipeRight)
 * - Swipe left  → go back (onSwipeLeft), with animated back indicator
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
        if (dx < 0) {
          // swiping left — drive the indicator
          const progress = Math.min(1, Math.abs(dx) / 90);
          dragX.setValue(dx);
          opacity.setValue(progress * 0.9);
        }
      },

      onPanResponderRelease: (_, { dx }) => {
        // Reset indicator
        Animated.parallel([
          Animated.timing(dragX,   { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();

        if (dx > 80)  onSwipeRight?.();
        else if (dx < -80) onSwipeLeft?.();
      },

      onPanResponderTerminate: () => {
        dragX.setValue(0);
        opacity.setValue(0);
      },
    })
  ).current;

  // Back chevron slides in from the left as you swipe left
  const indicatorTranslate = dragX.interpolate({
    inputRange: [-120, 0],
    outputRange: [0, -44],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.wrap} {...panResponder.panHandlers}>
      {/* Swipe-back indicator — appears on left edge */}
      <Animated.View
        style={[
          styles.backIndicator,
          { opacity, transform: [{ translateX: indicatorTranslate }] },
        ]}
        pointerEvents="none"
      >
        <Ionicons name="chevron-back" size={22} color="#fff" />
      </Animated.View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  backIndicator: {
    position: 'absolute',
    left: 0,
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
