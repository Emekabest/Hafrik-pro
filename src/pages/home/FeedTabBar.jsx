import React, { useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const TAB_COUNT = 3;
const TAB_W = SCREEN_W / TAB_COUNT;

// ─── Tab definitions ─────────────────────────────────────────────────────────
export const FEED_TABS = [
  {
    key: 'discover',
    label: 'Discover',
    description: 'Discover posts, people, and communities near you.',
    icon: 'compass-outline',
    get: 'discover',
    listName: 'discoverFeeds',
  },
  {
    key: 'community',
    label: 'Following',
    description: 'Posts from people, pages, and communities you follow.',
    icon: 'people-circle-outline',
    get: 'following',
    listName: 'communityFeeds',
  },
  {
    key: 'trending',
    label: 'Trending',
    description: 'See what everyone is talking about right now.',
    icon: 'trending-up-outline',
    get: 'popular',
    listName: 'popularFeeds',
  },
];

// ─── Content filter pills ────────────────────────────────────────────────────
export const CONTENT_FILTERS = [
  { label: 'All',      value: '',                    icon: 'grid-outline' },
  { label: 'Photos',   value: 'photo,photos',        icon: 'image-outline' },
  { label: 'Videos',   value: 'video',               icon: 'videocam-outline' },
  { label: 'Articles', value: 'article',             icon: 'newspaper-outline' },
  { label: 'Polls',    value: 'poll',                icon: 'stats-chart-outline' },
];

// ─── Primary Tab Bar ─────────────────────────────────────────────────────────
const FeedTabBar = memo(({ activeIndex, onTabChange }) => {
  const indicatorX = useRef(new Animated.Value(activeIndex * TAB_W)).current;

  useEffect(() => {
    Animated.spring(indicatorX, {
      toValue: activeIndex * TAB_W,
      useNativeDriver: true,
      tension: 68,
      friction: 10,
    }).start();
  }, [activeIndex]);

  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabRow}>
        {FEED_TABS.map((tab, index) => {
          const active = index === activeIndex;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              activeOpacity={0.7}
              onPress={() => onTabChange(index)}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Sliding underline indicator */}
      <Animated.View
        style={[
          styles.indicator,
          { width: TAB_W, transform: [{ translateX: indicatorX }] },
        ]}
      />
    </View>
  );
});

// ─── Secondary Content Filter Pills ──────────────────────────────────────────
export const ContentFilterBar = memo(({ activeFilter, onFilterChange }) => {
  return (
    <View style={styles.filterBarContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBarContent}
        keyboardShouldPersistTaps="handled"
      >
        {CONTENT_FILTERS.map((filter) => {
          const active = activeFilter === filter.value;
          return (
            <TouchableOpacity
              key={filter.value || 'all'}
              style={[styles.filterPill, active && styles.filterPillActive]}
              activeOpacity={0.8}
              onPress={() => onFilterChange(filter.value)}
            >
              <Ionicons
                name={filter.icon}
                size={13}
                color={active ? Colors.white : BRAND + 'A0'}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Primary tabs — full width, no scroll
  tabBarContainer: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight ?? '#EBEBEB',
    elevation: 2,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  tabRow: {
    flexDirection: 'row',
    width: '100%',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: BRAND + '80',
    letterSpacing: -0.1,
  },
  tabLabelActive: {
    color: ACCENT,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  indicator: {
    height: 3,
    borderRadius: 2,
    backgroundColor: ACCENT,
    marginTop: -1,
  },

  // Content filter pills
  filterBarContainer: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight ?? '#EBEBEB',
  },
  filterBarContent: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BRAND + '22',
  },
  filterPillActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: BRAND + 'A0',
  },
  filterLabelActive: {
    color: Colors.white,
  },
});

export default FeedTabBar;
