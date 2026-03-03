import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  PanGestureHandler,
  State,
} from "react-native-gesture-handler";
import { Colors } from '../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || '').replace('#', '');
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0');
  return `#${normalized}${alpha}`;
};

const { width } = Dimensions.get("window");
const TAB_WIDTH = (width - 40) / 3;

const tabs = [
  {
    key: "nearby",
    label: "Nearby",
    icon: "location-sharp",
    gradient: [Colors.primaryDark, Colors.greenDeep],
    inactiveColor: withOpacity(Colors.primaryDark, 0.6),
  },
  {
    key: "trending",
    label: "Trending",
    icon: "flame",
    gradient: [Colors.orangeHot, Colors.orangeHotDark],
    inactiveColor: withOpacity(Colors.orangeHot, 0.6),
  },
  {
    key: "recent",
    label: "Recent",
    icon: "time",
    gradient: [Colors.teal, Colors.tealDark],
    inactiveColor: withOpacity(Colors.teal, 0.6),
  },
];

export default function HafrikTabs({ activeTab, onTabChange }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef(tabs.map(() => new Animated.Value(1))).current;
  const swipeX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: activeTab * TAB_WIDTH,
      useNativeDriver: true,
      tension: 120,
      friction: 14,
    }).start();

    scaleAnims.forEach((anim, index) => {
      Animated.spring(anim, {
        toValue: index === activeTab ? 1.1 : 1,
        useNativeDriver: true,
      }).start();
    });
  }, [activeTab]);

  const handleSwipe = Animated.event(
    [{ nativeEvent: { translationX: swipeX } }],
    { useNativeDriver: true }
  );

  const handleSwipeEnd = (event) => {
    const { translationX, state } = event.nativeEvent;

    if (state === State.END) {
      if (translationX < -60 && activeTab < tabs.length - 1) {
        onTabChange(activeTab + 1);
      } else if (translationX > 60 && activeTab > 0) {
        onTabChange(activeTab - 1);
      }

      Animated.spring(swipeX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  };

  const activeGradient = tabs[activeTab].gradient;
  const isTrending = tabs[activeTab].key === "trending";

  return (
    <PanGestureHandler
      onGestureEvent={handleSwipe}
      onHandlerStateChange={handleSwipeEnd}
    >
      <Animated.View style={styles.wrapper}>
        <BlurView intensity={18} tint="light" style={styles.container}>

          {/* Sliding Background */}
          <Animated.View
            style={[
              styles.slider,
              {
                transform: [{ translateX }],
                shadowColor: isTrending ? Colors.redHot : Colors.black,
                shadowOpacity: isTrending ? 0.25 : 0.05,
              },
            ]}
          >
            <LinearGradient
              colors={activeGradient}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.gradient}
            />
          </Animated.View>

          {tabs.map((tab, index) => {
            const isActive = index === activeTab;

            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tab}
                activeOpacity={0.85}
                onPress={() => onTabChange(index)}
              >
                <Animated.View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    transform: [{ scale: scaleAnims[index] }],
                  }}
                >
                  <Ionicons
                    name={tab.icon}
                    size={18}
                    color={isActive ? Colors.white : tab.inactiveColor}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.text,
                      isActive && styles.activeText,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </BlurView>

        {/* Thin Animated Underline */}
        <Animated.View
          style={[
            styles.indicator,
            {
              width: TAB_WIDTH,
              transform: [{ translateX }],
            },
          ]}
        >
          <LinearGradient
            colors={activeGradient}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ flex: 1, borderRadius: 3 }}
          />
        </Animated.View>
      </Animated.View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  container: {
    flexDirection: "row",
    height: 54,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: withOpacity(Colors.white, 0.6),
    borderWidth: 1,
    borderColor: withOpacity(Colors.black, 0.05),
  },

  slider: {
    position: "absolute",
    top: 6,
    left: 0,
    width: TAB_WIDTH,
    height: 42,
    borderRadius: 14,
    zIndex: 1,
  },

  gradient: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
  },

  tab: {
    width: TAB_WIDTH,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },

  text: {
    fontSize: 13,
    color: Colors.mutedText,
    fontFamily: "ReadexPro_400Regular",
  },

  activeText: {
    color: Colors.white,
    fontFamily: "ReadexPro_600SemiBold",
  },

  indicator: {
    marginTop: 6,
    height: 3,
    borderRadius: 3,
  },
});