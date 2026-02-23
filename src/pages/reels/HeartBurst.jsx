import React, { useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function HeartBurst({ visibleKey }) {
  // visibleKey changes -> play animation
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!visibleKey) return;

    scale.setValue(0.4);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(scale, { toValue: 1.2, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(scale, { toValue: 1.6, duration: 220, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    });
  }, [visibleKey]);

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <Ionicons name="heart" size={92} color="rgba(255,255,255,0.92)" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: "42%",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});