import React, { useRef } from "react";
import { PanResponder, StyleSheet, View } from "react-native";

/**
 * Detects horizontal swipe gestures using PanResponder (no reanimated/worklets dependency).
 * Only activates when movement is clearly horizontal (dx > dy), so vertical
 * FlatList scrolling is not interrupted.
 */
export default function ReelGestures({ children, onSwipeRight, onSwipeLeft }) {
  const panResponder = useRef(
    PanResponder.create({
      // Never claim the tap — let TouchableWithoutFeedback handle it
      onStartShouldSetPanResponder: () => false,

      // Claim horizontal swipes only (dx > 20 and dx > dy)
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy),

      onPanResponderRelease: (_, { dx }) => {
        if (dx > 90) onSwipeRight?.();
        else if (dx < -90) onSwipeLeft?.();
      },
    })
  ).current;

  return (
    <View style={styles.wrap} {...panResponder.panHandlers}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
});
