import {
  StyleSheet,
  View,
  ActivityIndicator,
  InteractionManager,
  Animated,
  TouchableOpacity,
  Text,
  ScrollView,
} from "react-native";
import FeedCard from "./feedcard.jsx";
import { useEffect, useState, useCallback, useRef, useMemo, memo } from "react";
import AppDetails from "../../../helpers/appdetails";
import Banner from "../banner.jsx";
import QuickLinks from "../quicklinks.jsx";
import PostFeed from "../postfeed.jsx";
import { useAuth } from "../../../AuthContext.js";
import FeedsHeader from "../feedsheader.jsx";
import { useIsFocused } from '@react-navigation/native';
import useStore from "../../../repository/store.js";
import VideoPreloader from "../../../helpers/VideoPreloader.js";
import { FlashList } from "@shopify/flash-list";
import { useGlobalVideoPlayer } from "../../../helpers/GlobalVideoPlayerContext.js";
import CommentModal from "./comments/commentmodal.jsx";
import ProfileTabs from "../../profile/tabs.jsx";
import TimelineComponents from "../../profile/timeline/timelineComponents.jsx";
import { Ionicons } from "@expo/vector-icons";

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG_BASE = '#F0F5F5';
const BG_CARD = '#ffffff';
const BRAND   = '#0C3F44';
const ACCENT  = '#13C296';

// ─── Filter definitions ───────────────────────────────────────────────────────
const FEED_FILTERS = [
  { label: 'All',      value: '',         icon: 'grid-outline'      },
  { label: 'Pictures', value: 'pictures', icon: 'image-outline'     },
  { label: 'Videos',   value: 'videos',   icon: 'videocam-outline'  },
  { label: 'Reels',    value: 'reels',    icon: 'flame-outline'     },
  { label: 'Articles', value: 'articles', icon: 'newspaper-outline' },
];

// ─── Memoized section components ──────────────────────────────────────────────
const MemoizedBanner      = memo(Banner);
const MemoizedQuickLinks  = memo(QuickLinks);
const MemoizedPostFeed    = memo(PostFeed);
const MemoizedFeedsHeader = memo(FeedsHeader);

// ─── Pulsing footer loader ────────────────────────────────────────────────────
const FooterLoader = memo(({ visible }) => {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!visible) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [visible]);

  return (
    <View style={styles.footerContainer}>
      {visible && (
        <View style={styles.footerInner}>
          {[0, 1, 2].map((i) => (
            <Animated.View
              key={i}
              style={[
                styles.footerDot,
                {
                  opacity: pulse,
                  transform: [{
                    scale: pulse.interpolate({
                      inputRange:  [0.4, 1],
                      outputRange: [0.7 + i * 0.1, 1],
                    })
                  }]
                }
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
});

// ─── Inline FiltersBar ────────────────────────────────────────────────────────
const InlineFiltersBar = memo(({ contentFilter, onFilterPress, onLayout, indicatorX, indicatorWidth }) => (
  <View style={styles.filterWrapper}>
    <Animated.View
      pointerEvents="none"
      style={[styles.filterIndicator, {
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
      {FEED_FILTERS.map((item, index) => {
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

// ─── Feeds ────────────────────────────────────────────────────────────────────
const Feeds = ({
  feedsName,
  combinedData,
  feeds,
  API_URL,
  feedsController,
  stickyHeaderIndices,
  refreshing = false,
  onRefresh,
  onPostPress,
}) => {
  const pageRef        = useRef(1);
  const loadingMoreRef = useRef(false);
  const [loadingMore,    setLoadingMore]    = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [visibleFeedId,  setVisibleFeedId]  = useState(null); // ✅ track visible video
  const { token } = useAuth();

  const BASE_URL = 'https://hafrik.com';
  const viewedPosts = useRef(new Set());

  const addView = useCallback(async (postId) => {
    try {
      await fetch(`${BASE_URL}/api/v1/feed/add_view.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ post_id: postId }),
      });
    } catch (e) {
      console.log('View error:', e);
    }
  }, []);

  const addFeedsToList_store = useStore(state => state.addFeedsToList);

  useEffect(() => {
    if (feeds.length > 0) {
      setInitialLoading(false);
      InteractionManager.runAfterInteractions(() => {
        VideoPreloader.preloadFromFeeds(combinedData);
      });
    }
  }, [feeds.length]);

  const handleLoadMore = useCallback(async () => {
    if (feeds.length === 0 || loadingMoreRef.current || initialLoading) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const nextPage = pageRef.current + 1;
    try {
      const response = await feedsController(API_URL, token, nextPage);
      const moreFeedData =
        Array.isArray(response?.data)       ? response.data      :
        Array.isArray(response?.data?.data) ? response.data.data : null;

      if (response?.status === 200 && moreFeedData?.length) {
        addFeedsToList_store(feedsName, moreFeedData);
        pageRef.current = nextPage;
        InteractionManager.runAfterInteractions(() => {
          VideoPreloader.preloadFromFeeds(moreFeedData);
        });
      }
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [feeds.length, initialLoading, feedsController, API_URL, token]);

  // ✅ Track which feed item is visible on screen (video) + send view to backend once per session
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const firstFeed = viewableItems.find(v => v.item?.type === 'feed');
    setVisibleFeedId(firstFeed?.item?.data?.id ?? null);

    viewableItems.forEach((v) => {
      const postId = v?.item?.type === 'feed' ? v?.item?.data?.id : null;
      if (!v?.isViewable || !postId) return;

      const key = String(postId);
      if (viewedPosts.current.has(key)) return;
      viewedPosts.current.add(key);

      // If needed for debugging:
      // console.log('View triggered for:', postId);
      addView(postId);
    });
  });

  const viewabilityConfig = useMemo(() => ({
    itemVisiblePercentThreshold: 60,
    waitForInteraction: false,
  }), []);

  const renderCombinedItem = useCallback(({ item }) => {
    switch (item.type) {

      case 'banner':
        return <MemoizedBanner feedWidth={item.feedWidth} />;

      case 'quicklinks':
        return <MemoizedQuickLinks />;

      case 'postfeed':
        return <MemoizedPostFeed />;

      case 'feedsheader':
        return <MemoizedFeedsHeader name={item.name} id={item.id} />;

      case 'profileHeader':
        return item.component;

      case 'profileTabs':
        return <ProfileTabs {...item} />;

      case 'profileTimelineComponents':
        return <TimelineComponents {...item} />;

      case 'filtersbar':
        return (
          <InlineFiltersBar
            contentFilter={item.contentFilter}
            onFilterPress={item.onFilterPress}
            onLayout={item.onLayout}
            indicatorX={item.indicatorX}
            indicatorWidth={item.indicatorWidth}
          />
        );

      case 'feed':
        return (
          <View style={styles.feedCardWrapper}>
            {/* ✅ Pass isVisible so video pauses when scrolled away */}
            <FeedCard
              feed={item.data}
              isVisible={visibleFeedId === item.data.id}
              onPostPress={onPostPress}
            />
          </View>
        );

      default:
        // Generic catch-all: lets Explore/profile sections pass a renderComponent fn
        if (typeof item?.renderComponent === 'function') return item.renderComponent();
        return null;
    }
  }, [visibleFeedId, onPostPress]); // ✅ visibleFeedId and onPostPress in deps

  const renderFooter = useCallback(
    () => <FooterLoader visible={loadingMore} />,
    [loadingMore]
  );

  const keyExtractor = useCallback((item, index) => {
    if (item.type === 'feed') return `feed-${item.data.id}`;
    return `${item.type}-${index}`;
  }, []);

  const getItemType = useCallback(item => item.type, []);

  return (
    <View style={styles.container}>
      <FlashList
        data={combinedData}
        estimatedItemSize={550}
        keyExtractor={keyExtractor}
        getItemType={getItemType}
        renderItem={renderCombinedItem}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onViewableItemsChanged={onViewableItemsChanged.current} // ✅
        viewabilityConfig={viewabilityConfig}           // ✅
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        stickyHeaderIndices={stickyHeaderIndices?.length ? stickyHeaderIndices : []}
        removeClippedSubviews
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      <CommentModal />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: BG_BASE },
  listContent: { backgroundColor: BG_BASE, paddingBottom: 40 },
  separator:   { height: 6, backgroundColor: BG_BASE },

  feedCardWrapper: {
    backgroundColor: BG_CARD,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },

  footerContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
  },
  footerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
  },
  footerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: ACCENT,
  },

  // Filter bar
  filterWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#0C3F44',
  },
  filterContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
    borderRadius: 20,
  },
  filterButtonActive: {
    backgroundColor: '#0C3F44',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2b2b2b',
  },
  filterTextActive: {
    color: '#fff',
  },
  filterIndicator: {
    position: 'absolute',
    top: 10,
    bottom: 10,
    backgroundColor: '#0C3F44',
    borderRadius: 20,
    zIndex: -1,
  },
});

export default Feeds;