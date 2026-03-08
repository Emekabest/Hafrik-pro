import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const TABS = [
  { key: 'for_you', label: 'For You' },
];
const INDICATOR_W = 20;
const ACCENT = Colors.primary;

// No onCreatePress — + button removed per redesign
const ReelHeader = ({ mode = 'for_you', onModeChange, onSearchPress }) => {
  const { top } = useSafeAreaInsets();
  const tabLayouts = useRef({});
  const indicatorX = useRef(new Animated.Value(0)).current;
  const [ready, setReady] = useState(false);

  const activeIndex = TABS.findIndex(t => t.key === mode);

  const animateTo = useCallback((index) => {
    const layout = tabLayouts.current[index];
    if (!layout) return;
    const toX = layout.x + (layout.width - INDICATOR_W) / 2;
    Animated.spring(indicatorX, {
      toValue: toX,
      useNativeDriver: true,
      tension: 220,
      friction: 15,
    }).start();
  }, [indicatorX]);

  const handleLayout = useCallback((index, e) => {
    tabLayouts.current[index] = e.nativeEvent.layout;
    if (Object.keys(tabLayouts.current).length === TABS.length) setReady(true);
  }, []);

  useEffect(() => {
    if (ready) animateTo(activeIndex);
  }, [activeIndex, ready, animateTo]);

  const handlePress = useCallback((key, index) => {
    animateTo(index);
    onModeChange?.(key);
  }, [animateTo, onModeChange]);

  return (
    <View style={[styles.header, { paddingTop: top + 6 }]}>
      {/* Top gradient for legibility over any video content */}
      <LinearGradient
        colors={[withOpacity(Colors.black, 0.55), withOpacity(Colors.black, 0.0)]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Left spacer — keeps tabs visually centred */}
      <View style={styles.sideSlot} />

      {/* Following / For You tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.7}
            onPress={() => handlePress(tab.key, i)}
            onLayout={e => handleLayout(i, e)}
            style={styles.tabBtn}
          >
            <Text style={[styles.tabText, mode === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}

        {ready && (
          <Animated.View
            style={[styles.indicator, { transform: [{ translateX: indicatorX }] }]}
          />
        )}
      </View>

      {/* Search icon */}
      <TouchableOpacity activeOpacity={0.8} style={styles.sideSlot} onPress={onSearchPress}>
        <Ionicons name="search" size={20} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 14,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  sideSlot: {
    width: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 30,
    position: 'relative',
    alignItems: 'center',
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tabText: {
    color: withOpacity(Colors.white, 0.48),
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  activeTabText: {
    color: Colors.white,
    fontSize: 17,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: INDICATOR_W,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: ACCENT,
  },
});

export default ReelHeader;
