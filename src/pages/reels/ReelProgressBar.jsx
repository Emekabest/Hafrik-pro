import React, { useMemo } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { Colors } from '../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


export default function ReelProgressBar({ progress }) {
  // progress: Animated.Value between 0..1
  const width = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: ["0%", "100%"],
      }),
    [progress]
  );

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.bar, { width }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 3,
    width: "100%",
    backgroundColor: withOpacity(Colors.white, 0.25),
    borderRadius: 999,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    backgroundColor: Colors.white,
    borderRadius: 999,
  },
});