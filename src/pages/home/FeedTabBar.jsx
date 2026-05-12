import React, { useRef, useEffect, memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const WHITE  = Colors.white;

// ─── Tab definitions — each maps to a backend filter ────────────────────────
// `get`      → value passed as ?get= to /api/v1/feed/list.php
// `listName` → Zustand store list slot
// `isNav`    → if true, tapping navigates (no feed rendered)
// `navTarget`→ screen name to navigate to when isNav=true
export const FEED_TABS = [
  {
    key:       'home',
    label:     'For You',
    feedTitle: 'For You',
    icon:      'home-outline',
    activeIcon:'home',
    get:       'discover',
    listName:  'discoverFeeds',
  },
  {
    key:       'following',
    label:     'Following',
    feedTitle: 'People You Follow',
    icon:      'people-outline',
    activeIcon:'people',
    get:       'following',
    listName:  'communityFeeds',
  },
  {
    key:       'trending',
    label:     'Trending',
    feedTitle: "What's Trending",
    icon:      'trending-up-outline',
    activeIcon:'trending-up',
    get:       'popular',
    listName:  'popularFeeds',
  },
  {
    key:       'tv',
    label:     'HafrikTV',
    feedTitle: 'HafrikTV',
    icon:      'tv-outline',
    activeIcon:'tv',
    get:       null,
    listName:  null,
    isTV:      true,
  },
];

// ─── Content filter pills ────────────────────────────────────────────────────
export const CONTENT_FILTERS = [
  { label: 'All',      value: '',             icon: 'grid-outline'      },
  { label: 'Photos',   value: 'photo,photos', icon: 'image-outline'     },
  { label: 'Videos',   value: 'video',        icon: 'videocam-outline'  },
  { label: 'Articles', value: 'article',      icon: 'newspaper-outline' },
  { label: 'Polls',    value: 'poll',         icon: 'stats-chart-outline'},
];

// ─── Single Tab Chip ─────────────────────────────────────────────────────────
const TabChip = memo(({ tab, isActive, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.9, useNativeDriver: true, speed: 60, bounciness: 0 }),
      Animated.spring(scale, { toValue: 1,   useNativeDriver: true, speed: 20, bounciness: 10 }),
    ]).start();
    onPress();
  }, [onPress, scale]);

  const isTV = tab.key === 'tv';

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.chip, isActive && styles.chipActive]}
        activeOpacity={1}
        onPress={handlePress}
      >
        <Ionicons
          name={isActive ? tab.activeIcon : tab.icon}
          size={13}
          color={isActive ? WHITE : isTV ? '#e85d04' : BRAND + '80'}
          style={{ marginRight: 5 }}
        />
        <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
          {tab.label}
        </Text>
        {/* TV live dot */}
        {isTV && !isActive && (
          <View style={styles.tvDot} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── Primary Feed Tab Bar ────────────────────────────────────────────────────
const FeedTabBar = memo(({ activeIndex, onTabChange }) => {
  const scrollRef = useRef(null);

  // Auto-scroll to keep active tab visible
  useEffect(() => {
    scrollRef.current?.scrollTo({ x: Math.max(0, activeIndex * 88 - 44), animated: true });
  }, [activeIndex]);

  return (
    <View style={styles.tabBarWrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBarContent}
        keyboardShouldPersistTaps="handled"
      >
        {FEED_TABS.map((tab, index) => (
          <TabChip
            key={tab.key}
            tab={tab}
            isActive={index === activeIndex}
            onPress={() => onTabChange(index)}
          />
        ))}
      </ScrollView>
    </View>
  );
});

// ─── Secondary Content Filter Pills ─────────────────────────────────────────
export const ContentFilterBar = memo(({ activeFilter, onFilterChange }) => (
  <View style={styles.filterBarWrap}>
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
              size={12}
              color={active ? WHITE : BRAND + 'A0'}
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
));

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Tab bar
  tabBarWrap: {
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight ?? '#EBEBEB',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Chip (inactive)
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: BRAND + '08',
    borderWidth: 1.5,
    borderColor: BRAND + '14',
  },

  // Chip (active) — filled brand color
  chipActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 4,
  },

  chipLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: BRAND + '80',
    letterSpacing: -0.1,
  },
  chipLabelActive: {
    color: WHITE,
    fontWeight: '800',
  },

  // TV live dot
  tvDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#e85d04',
    marginLeft: 5,
  },

  // Content filter pills
  filterBarWrap: {
    backgroundColor: WHITE,
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
    paddingHorizontal: 12,
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
    color: WHITE,
  },
});

export default FeedTabBar;
