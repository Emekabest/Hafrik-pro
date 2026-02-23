import React, { useMemo } from "react";
import { View, StyleSheet, Animated } from "react-native";

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
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 999,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 999,
  },
});