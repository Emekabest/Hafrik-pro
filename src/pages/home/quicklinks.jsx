
import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const LIME   = Colors.brandLime;
const MIST   = Colors.surfaceTint;
const BORDER = Colors.borderSoft;

const items = [
  {
    label: "Arrival",
    icon: (active) => <Ionicons name="airplane" size={20} color={active ? Colors.white : BRAND} />,
    screen: "ArrivalConcierge",
    colors: ['#c9a84c', '#8a6820'],
  },
  {
    label: "Community",
    icon: (active) => <Ionicons name="people" size={20} color={active ? Colors.white : BRAND} />,
    screen: "GroupScreen",
    params: { initialTab: 0 },
    colors: [BRAND, Colors.tealDeep],
  },
  {
    label: "Business",
    icon: (active) => <Ionicons name="business" size={20} color={active ? Colors.white : BRAND} />,
    screen: "BusinessPages",
    colors: [ACCENT, Colors.tealMint],
  },
  {
    label: "City Guide",
    icon: (active) => <Ionicons name="map" size={20} color={active ? Colors.white : BRAND} />,
    screen: "CityGuide",
    colors: [Colors.teal, Colors.tealDark],
  },
  {
    label: "Exchange",
    icon: (active) => <Ionicons name="swap-horizontal" size={20} color={active ? Colors.white : BRAND} />,
    screen: "HafrikXCurrency",
    colors: ['#c9a84c', '#8a6820'],
  },
  {
    label: "Articles",
    icon: (active) => <Ionicons name="newspaper" size={20} color={active ? Colors.white : BRAND} />,
    screen: "ArticlesScreen",
    colors: [Colors.violet, Colors.violetDeep],
  },
  {
    label: "Visa",
    icon: (active) => <Ionicons name="document-text" size={20} color={active ? Colors.white : BRAND} />,
    screen: "HafrikXVisa",
    colors: [Colors.tealNavy, Colors.tealDeepStrong],
  },
  {
    label: "Learn",
    icon: (active) => <Ionicons name="school" size={20} color={active ? Colors.white : BRAND} />,
    screen: "HafrikXLearn",
    colors: [Colors.redStrong, Colors.redDeep],
  },
  {
    label: "Events",
    icon: (active) => <MaterialCommunityIcons name="calendar-star" size={20} color={active ? Colors.white : BRAND} />,
    screen: "EventsScreen",
    colors: [Colors.orangeStrong, Colors.orangeDeep],
  },
  {
    label: "Jobs",
    icon: (active) => <MaterialCommunityIcons name="briefcase" size={20} color={active ? Colors.white : BRAND} />,
    screen: "JobsScreen",
    colors: [Colors.pinkBright, Colors.pinkDeep],
  },
];

const ShortcutItem = ({ item, index, onPress }) => {
  const { colors: tc } = useTheme();
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

        <Text style={[styles.label, { color: tc.text }]} numberOfLines={1}>{item.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function StaticShortcutRow() {
  const navigation = useNavigation();
  const { colors: tc } = useTheme();

  const handlePress = (screen, params) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(screen, params);
  };

  // chunk into rows of 5
  const rows = [];
  for (let i = 0; i < items.length; i += 5) rows.push(items.slice(i, i + 5));

  return (
    <View style={[styles.wrapper, { backgroundColor: tc.surface, borderBottomColor: tc.border }]}>
      {/* Subtle top accent line */}
      <LinearGradient
        colors={[ACCENT, LIME, ACCENT]}
        style={styles.topAccent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />

      {rows.map((row, ri) => (
        <View key={ri} style={[styles.row, ri > 0 && styles.rowGap]}>
          {row.map((item, index) => (
            <ShortcutItem
              key={item.label}
              item={item}
              index={ri * 5 + index}
              onPress={handlePress}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.white,
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
    justifyContent: "space-between",
  },
  rowGap: {
    marginTop: 14,
  },

  item: {
    alignItems: "center",
    flex: 1,
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
    backgroundColor: withOpacity(Colors.white, 0.12),
  },

  label: {
    fontSize: 11,
    color: BRAND,
    fontWeight: "700",
    textAlign: "center",
  },
});
