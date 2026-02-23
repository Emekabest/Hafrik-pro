import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = [
  { key: 'following', label: 'Following' },
  { key: 'for_you', label: 'For You' },
];
const INDICATOR_W = 22;
const ACCENT = '#13C296';

const ReelHeader = ({ mode = 'for_you', onModeChange, onSearchPress }) => {
  const insets = useSafeAreaInsets();
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
      tension: 200,
      friction: 14,
    }).start();
  }, [indicatorX]);

  const handleLayout = useCallback((index, e) => {
    tabLayouts.current[index] = e.nativeEvent.layout;
    if (Object.keys(tabLayouts.current).length === TABS.length) {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (ready) animateTo(activeIndex);
  }, [activeIndex, ready, animateTo]);

  const handlePress = useCallback((key, index) => {
    animateTo(index);
    onModeChange?.(key);
  }, [animateTo, onModeChange]);

  return (
    <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
      <View style={styles.iconSlot}>
        <Ionicons name="radio" size={15} color="white" />
      </View>

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

      <TouchableOpacity activeOpacity={0.8} style={styles.iconSlot} onPress={onSearchPress}>
        <Ionicons name="search" size={18} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  iconSlot: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 28,
    position: 'relative',
    alignItems: 'center',
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  tabText: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  activeTabText: {
    color: '#fff',
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
