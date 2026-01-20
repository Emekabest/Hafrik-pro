import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Dimensions, Animated } from "react-native";
import AppDetails from "../../helpers/appdetails";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const ITEM_HEIGHT = SCREEN_HEIGHT - (AppDetails.mainTabNavigatorHeight || 0);
const MEDIA_WIDTH = SCREEN_WIDTH;
const RIGHT_COLUMN_WIDTH = 64;

const SkeletonReelCard = () => {
  const pulse = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.6, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={[styles.container, { height: ITEM_HEIGHT }]}>
      <View style={styles.mediaWrapper}>
        <View style={styles.mediaPlaceholder} />
      </View>

      <View style={styles.rightColumn}>
        <Animated.View style={[styles.iconPlaceholder, { opacity: pulse }]} />
        <Animated.View style={[styles.iconPlaceholder, { marginTop: 16, opacity: pulse }]} />
        <Animated.View style={[styles.iconPlaceholder, { marginTop: 16, opacity: pulse }]} />
        <Animated.View style={[styles.iconPlaceholder, { marginTop: 16, opacity: pulse }]} />
      </View>

      <View style={styles.bottomInfo}>
        <Animated.View style={[styles.usernamePlaceholder, { opacity: pulse }]} />
        <Animated.View style={[styles.captionPlaceholder, { opacity: pulse }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#111",
    position: "relative",
    overflow: "hidden",
  },
  mediaWrapper: {
    width: MEDIA_WIDTH,
    height: "100%",
    backgroundColor: "#000",
  },
  mediaPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
  },
  rightColumn: {
    position: "absolute",
    right: 12,
    top: "20%",
    width: RIGHT_COLUMN_WIDTH,
    alignItems: "center",
  },
  iconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2a2a2a",
  },
  bottomInfo: {
    position: "absolute",
    left: 12,
    bottom: 36,
    right: RIGHT_COLUMN_WIDTH + 24,
  },
  usernamePlaceholder: {
    width: "55%",
    height: 14,
    borderRadius: 6,
    backgroundColor: "#2a2a2a",
    marginBottom: 8,
  },
  captionPlaceholder: {
    width: "90%",
    height: 48,
    borderRadius: 6,
    backgroundColor: "#262626",
  },
});

export default SkeletonReelCard;