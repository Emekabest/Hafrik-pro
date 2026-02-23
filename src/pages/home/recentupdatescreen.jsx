import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../AuthContext.js';
import Feeds from "./feeds/feeds.jsx";
import GetFeedsController from '../../controllers/getfeedscontroller.js';
import useStore from "../../repository/store.js";
import AppDetails from '../../helpers/appdetails.js';

const FILTERS = [
  { label: 'All',      value: '',        icon: 'grid-outline'      },
  { label: 'Pictures', value: 'photos',  icon: 'image-outline'     },
  { label: 'Videos',   value: 'video',   icon: 'videocam-outline'  },
  { label: 'Reels',    value: 'reel',    icon: 'flame-outline'     },
  { label: 'Articles', value: 'article', icon: 'newspaper-outline' },
];

// ✅ Defined OUTSIDE so it never remounts
const FiltersBar = memo(({ contentFilter, onFilterPress, onLayout, indicatorX, indicatorWidth }) => (
  <View style={styles.filterWrapper}>
    {/* ✅ Indicator behind buttons, outside ScrollView */}
    <Animated.View
      pointerEvents="none"
      style={[styles.indicator, {
        transform: [{ translateX: indicatorX }],
        width: indicatorWidth,
      }]}
    />
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterContainer}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
    >
      {FILTERS.map((item, index) => {
        const active = contentFilter === item.value;
        return (
          <TouchableOpacity
            key={item.value || 'all'}
            style={[styles.filterButton, active && styles.filterButtonActive]}
            activeOpacity={0.85}
            onPress={() => onFilterPress(item.value, index)}
            onLayout={(e) => onLayout(e, index, contentFilter, item.value)}
          >
            <Ionicons
              name={item.icon}
              size={16}
              color={active ? '#fff' : '#2b2b2b'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.filterText, active && styles.filterTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  </View>
));

const RecentUpdatesScreen = ({ feedWidth }) => {
  const { token } = useAuth();
  const feedsName = 'recentUpdateFeeds';

  const clearFeedsList_store   = useStore(state => state.clearFeedsList);
  const addFeedsToList_store   = useStore(state => state.addFeedsToList);
  const prependFeedsToList_store = useStore(state => state.prependFeedsToList);
  const ids      = useStore(state => state.feeds.lists.recentUpdateFeeds);
  const feedsById = useStore(state => state.feeds.feedsById);

  const recentFeedsFromStore = useMemo(
    () => ids.map(id => feedsById[id]).filter(Boolean),
    [ids, feedsById]
  );

  const [feeds, setFeeds]               = useState([]);
  const [contentFilter, setContentFilter] = useState('');
  const [version, setVersion]           = useState(0);
  const [layoutData, setLayoutData]     = useState([]);

  const API_URL        = AppDetails.apis.recentUpdateApi;
  const indicatorX     = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;

  /* ── Fetch ── */
  const getFeeds = useCallback(async (filter = '') => {
    clearFeedsList_store(feedsName);
    const url = filter ? `${API_URL}?content=${filter}` : API_URL;
    const response = await GetFeedsController(url, token, 1);
    if (response.status === 200) {
      addFeedsToList_store(feedsName, response.data);
    } else {
      Alert.alert('Error', 'Failed to fetch recent updates.');
    }
  }, [API_URL, token]);

  useEffect(() => { setVersion(v => v + 1); getFeeds(contentFilter); }, [contentFilter]);
  useEffect(() => { setFeeds(recentFeedsFromStore); }, [recentFeedsFromStore]);

  /* ── Background refresh on screen focus — prepend new posts, no scroll reset ── */
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        // Skip first focus — initial load already handled by the useEffect above
        isFirstFocus.current = false;
        return;
      }
      const silentRefresh = async () => {
        try {
          const url = contentFilter ? `${API_URL}?content=${contentFilter}` : API_URL;
          const response = await GetFeedsController(url, token, 1);
          if (response.status === 200 && Array.isArray(response.data)) {
            prependFeedsToList_store(feedsName, response.data);
          }
        } catch {}
      };
      silentRefresh();
    }, [API_URL, token, contentFilter, prependFeedsToList_store]),
  );

  /* ── Filter press ── */
  const handleFilterPress = useCallback((value, index) => {
    setContentFilter(value);
    if (layoutData[index]) {
      Animated.parallel([
        Animated.spring(indicatorX,     { toValue: layoutData[index].x,     useNativeDriver: false }),
        Animated.spring(indicatorWidth, { toValue: layoutData[index].width,  useNativeDriver: false }),
      ]).start();
    }
  }, [layoutData]);

  /* ── Layout ── */
  const handleLayout = useCallback((e, index, currentFilter, itemValue) => {
    const { x, width } = e.nativeEvent.layout;
    setLayoutData(prev => {
      const copy = [...prev];
      copy[index] = { x, width };
      return copy;
    });
    if (index === 0 && currentFilter === '' && itemValue === '') {
      indicatorX.setValue(x);
      indicatorWidth.setValue(width);
    }
  }, []);

  /* ── Combined data ── */
  const combinedData = useMemo(() => [
    { type: 'banner',    feedWidth: feedWidth || 0 },
    {
      type: 'filtersbar',
      contentFilter,
      onFilterPress: handleFilterPress,
      onLayout: handleLayout,
      indicatorX,
      indicatorWidth,
    },
    { type: 'feedsheader', name: 'Recent Updates', id: feedsName },
    ...feeds.map(feed => ({ type: 'feed', data: feed })),
  ], [feeds, feedWidth, contentFilter, handleFilterPress, handleLayout]);

  // Index 1 = filtersbar — make it sticky
  const stickyHeaderIndices = [1];

  return (
    <View style={styles.container}>
      <Feeds
        key={version}
        feedsName={feedsName}
        combinedData={combinedData}
        feeds={feeds}
        API_URL={API_URL}
        feedsController={GetFeedsController}
        stickyHeaderIndices={stickyHeaderIndices}
      />
    </View>
  );
};

export default RecentUpdatesScreen;

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#fff' },
  filterWrapper:   { backgroundColor: '#fff', paddingVertical: 4 },
  filterContainer: { paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  filterButton: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
    marginRight: 10, borderRadius: 22,
  },
  filterText:       { fontSize: 13, fontWeight: '600', color: '#2b2b2b' },
  filterTextActive: { color: '#fff' },
  indicator: {
    position: 'absolute',
    top: 12, bottom: 12,
    backgroundColor: AppDetails.primaryColor,
    borderRadius: 22,
    zIndex: -1,
  },
});