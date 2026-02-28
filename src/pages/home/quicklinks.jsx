
import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

const BRAND  = "#0C3F44";
const ACCENT = "#13C296";
const LIME   = "#A8E063";
const MIST   = "#F0F5F5";
const BORDER = "#E4EEEF";

const items = [
  {
    label: "Community",
    icon: (active) => <Ionicons name="people" size={20} color={active ? "#fff" : BRAND} />,
    screen: "GroupScreen",
    params: { initialTab: 0 },
    colors: [BRAND, "#0a5a62"],
  },
  {
    label: "Business",
    icon: (active) => <Ionicons name="business" size={20} color={active ? "#fff" : BRAND} />,
    screen: "GroupScreen",
    params: { initialTab: 1 },
    colors: [ACCENT, "#0fa882"],
  },
  {
    label: "Events",
    icon: (active) => <MaterialCommunityIcons name="calendar-star" size={20} color={active ? "#fff" : BRAND} />,
    screen: "EventsScreen",
    colors: ["#F97316", "#EA580C"],
  },
  {
    label: "Jobs",
    icon: (active) => <MaterialCommunityIcons name="briefcase" size={20} color={active ? "#fff" : BRAND} />,
    screen: "JobsScreen",
    colors: ["#EC4899", "#BE185D"],
  },
  {
    label: "Articles",
    icon: (active) => <Ionicons name="newspaper" size={20} color={active ? "#fff" : BRAND} />,
    screen: "ArticlesScreen",
    colors: ["#8B5CF6", "#6D28D9"],
  },
];

const ShortcutItem = ({ item, index, onPress }) => {
  const scale    = useRef(new Animated.Value(0)).current;
  const opacity  = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        delay: index * 60,
        tension: 120,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        delay: index * 60,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(pressAnim, { toValue: 0.88, useNativeDriver: true, tension: 200, friction: 10 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(pressAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }).start();
  };

  return (
    <Animated.View style={{ opacity, transform: [{ scale: Animated.multiply(scale, pressAnim) }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => onPress(item.screen, item.params)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.item}
      >
        {/* Gradient bubble */}
        <LinearGradient
          colors={item.colors}
          style={styles.bubble}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Inner shine */}
          <View style={styles.bubbleShine} />
          {item.icon(true)}
        </LinearGradient>

        <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function StaticShortcutRow() {
  const navigation = useNavigation();

  const handlePress = (screen, params) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(screen, params);
  };

  return (
    <View style={styles.wrapper}>
      {/* Subtle top accent line */}
      <LinearGradient
        colors={[ACCENT, LIME, ACCENT]}
        style={styles.topAccent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {items.map((item, index) => (
          <ShortcutItem
            key={item.label}
            item={item}
            index={index}
            onPress={handlePress}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingTop: 12,
    paddingBottom: 18,
  },

  topAccent: {
    height: 2,
    width: "100%",
    opacity: 0.4,
    marginBottom: 12,
  },

  row: {
    flexDirection: "row",
    paddingHorizontal: 14,
    gap: 10, // more breathing space
  },

  item: {
    alignItems: "center",
    width: 72, // slightly wider for better label balance
  },

  bubble: {
    width: 56,
    height: 56,
    borderRadius: 18, // smoother rounded look
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    overflow: "hidden",

    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },

  bubbleShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "45%",
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  label: {
    fontSize: 11,
    color: BRAND,
    fontWeight: "700",
    textAlign: "center",
  },
});
