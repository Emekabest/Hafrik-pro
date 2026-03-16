import React, { useRef, useEffect, memo, useCallback } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;

// ─── Tab definitions ─────────────────────────────────────────────────────────
export const FEED_TABS = [
  { key: 'forYou',     label: 'For You',    icon: 'sparkles-outline',     get: 'newsfeed',   listName: 'forYouFeeds' },
  { key: 'discover',   label: 'Discover',   icon: 'compass-outline',      get: 'discover',   listName: 'discoverFeeds' },
  { key: 'popular',    label: 'Popular',    icon: 'trending-up-outline',  get: 'popular',    listName: 'popularFeeds' },
  { key: 'reels',      label: 'Reels',      icon: 'film-outline',         get: 'reels',      listName: 'reelsFeeds' },
  { key: 'following',  label: 'Following',  icon: 'people-outline',       get: 'following',  listName: 'followingFeeds' },
  { key: 'videos',     label: 'Videos',     icon: 'videocam-outline',     get: 'watch',      listName: 'watchFeeds' },
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
  const scrollRef = useRef(null);
  const indicatorX = useRef(new Animated.Value(0)).current;

  // Auto-scroll active tab into view
  useEffect(() => {
    scrollRef.current?.scrollTo({ x: Math.max(0, activeIndex * 100 - 30), animated: true });
  }, [activeIndex]);

  return (
    <View style={styles.tabBarContainer}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBarContent}
        keyboardShouldPersistTaps="handled"
      >
        {FEED_TABS.map((tab, index) => {
          const active = index === activeIndex;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, active && styles.tabActive]}
              activeOpacity={0.8}
              onPress={() => onTabChange(index)}
            >
              {active && (
                <LinearGradient
                  colors={[Colors.brandDeep, Colors.primaryDark, Colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <Ionicons
                name={active ? tab.icon.replace('-outline', '') || tab.icon : tab.icon}
                size={15}
                color={active ? Colors.white : BRAND + 'CC'}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
                size={14}
                color={active ? Colors.white : BRAND + 'A0'}
                style={{ marginRight: 5 }}
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
  // Primary tabs
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
  tabBarContent: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: BRAND + '09',
    overflow: 'hidden',
  },
  tabActive: {
    shadowColor: Colors.brandDeep,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: BRAND + 'BB',
    letterSpacing: -0.1,
  },
  tabLabelActive: {
    color: Colors.white,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  // Content filter pills — separated row with extra vertical breathing room
  filterBarContainer: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight ?? '#EBEBEB',
    paddingTop: 2,
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
