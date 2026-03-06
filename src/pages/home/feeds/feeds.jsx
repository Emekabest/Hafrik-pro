import {
  StyleSheet,
  View,
  ActivityIndicator,
  InteractionManager,
  Animated,
  TouchableOpacity,
  Text,
  ScrollView,
  Image,
  Platform,
} from "react-native";
import FeedCard from "./feedcard.jsx";
import { useEffect, useState, useCallback, useRef, useMemo, memo } from "react";
import AppDetails from "../../../helpers/appdetails";
import Banner from "../banner.jsx";
import QuickLinks from "../quicklinks.jsx";
import PostFeed from "../postfeed.jsx";
import { useAuth } from "../../../AuthContext.js";
import FeedsHeader from "../feedsheader.jsx";
import { useIsFocused, useNavigation } from '@react-navigation/native';
import useStore from "../../../repository/store.js";
import VideoPreloader from "../../../helpers/VideoPreloader.js";
import { FlashList } from "@shopify/flash-list";
import { useGlobalVideoPlayer } from "../../../helpers/GlobalVideoPlayerContext.js";
import CommentModal from "./comments/commentmodal.jsx";
import ProfileTabs from "../../profile/tabs.jsx";
import TimelineComponents from "../../profile/timeline/timelineComponents.jsx";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../theme";

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG_BASE = Colors.surfaceTint;
const BG_CARD = Colors.white;
const BRAND   = Colors.primaryDark;
const ACCENT  = Colors.primary;
const MUTED   = Colors.secondaryText;

// ─── Filter definitions ───────────────────────────────────────────────────────
const FEED_FILTERS = [
  { label: 'All',      value: '',        icon: 'grid-outline',      params: {} },
  { label: 'Photos',   value: 'photos',  icon: 'image-outline',     params: { type: 'photos' } },
  { label: 'Videos',   value: 'video',   icon: 'videocam-outline',  params: { type: 'video' } },
  { label: 'Reels',    value: 'reel',    icon: 'flame-outline',     params: { type: 'reel' } },
  { label: 'Articles', value: 'article', icon: 'newspaper-outline', params: { type: 'article' } },
];

// ─── People You May Know card ─────────────────────────────────────────────────
const PeopleYouMayKnow = memo(({ people }) => {
  const navigation = useNavigation();
  const filtered = (people?.filter(p => !!(p.avatar || p.profile_picture)) ?? []).slice(0, 4);
  if (!filtered.length) return null;
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <View style={[styles.sectionIconBubble, { backgroundColor: BRAND }]}>
            <Ionicons name="people" size={14} color={Colors.white} />
          </View>
          <Text style={styles.sectionTitle}>People You May Know</Text>
        </View>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.sectionSeeAll}>See All</Text>
        </TouchableOpacity>
      </View>

      {filtered.map((person, idx) => (
        <TouchableOpacity
          key={person.id ?? idx}
          style={[styles.suggestionRow, idx < filtered.length - 1 && styles.suggestionRowBorder]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Profile', { userId: person.id })}
        >
          <Image
            source={{ uri: person.avatar || person.profile_picture }}
            style={styles.suggestionAvatar}
          />
          <View style={styles.suggestionInfo}>
            <Text style={styles.suggestionName} numberOfLines={1}>
              {person.name || person.username}
            </Text>
            {!!person.mutual_friends && (
              <Text style={styles.suggestionMeta}>{person.mutual_friends} mutual connections</Text>
            )}
          </View>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: BRAND }]} activeOpacity={0.8}>
            <Ionicons name="person-add-outline" size={11} color={Colors.white} style={{ marginRight: 3 }} />
            <Text style={styles.actionBtnText}>Connect</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );
});

// ─── Ad card ─────────────────────────────────────────────────────────────────
const AdCard = memo(({ ad }) => {
  const navigation = useNavigation();
  if (!ad) return null;
  return (
    <TouchableOpacity
      style={styles.adCard}
      activeOpacity={0.9}
      onPress={() => ad.url && navigation.navigate('WebView', { url: ad.url, title: ad.title || 'Ad' })}
    >
      {/* Image or gradient fallback */}
      <View style={styles.adImageWrapper}>
        {ad.image ? (
          <Image source={{ uri: ad.image }} style={styles.adImage} resizeMode="cover" />
        ) : (
          <View style={styles.adImageFallback} />
        )}
        {/* Sponsored badge overlay */}
        <View style={styles.adBadge}>
          <View style={styles.adBadgeDot} />
          <Text style={styles.adBadgeText}>Sponsored</Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.adBody}>
        <View style={styles.adBodyText}>
          <Text style={styles.adTitle} numberOfLines={2}>{ad.title}</Text>
          {!!ad.description && (
            <Text style={styles.adDesc} numberOfLines={2}>{ad.description}</Text>
          )}
        </View>
        <View style={styles.adCta}>
          <Text style={styles.adCtaText}>Learn More</Text>
          <Ionicons name="arrow-forward" size={13} color={ACCENT} />
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ─── Businesses to Follow card ────────────────────────────────────────────────
const BusinessToFollow = memo(({ items }) => {
  const navigation = useNavigation();
  const list = items?.slice(0, 2) ?? [];
  if (!list.length) return null;
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <View style={[styles.sectionIconBubble, { backgroundColor: ACCENT }]}>
            <Ionicons name="storefront" size={14} color={Colors.white} />
          </View>
          <Text style={styles.sectionTitle}>Businesses to Follow</Text>
        </View>
      </View>
      {list.map((biz, idx) => (
        <TouchableOpacity
          key={biz.id ?? idx}
          style={[styles.suggestionRow, idx < list.length - 1 && styles.suggestionRowBorder]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('BusinessDetails', { pageId: biz.id })}
        >
          <Image source={{ uri: biz.avatar ?? biz.logo ?? biz.image }} style={styles.suggestionAvatar} />
          <View style={styles.suggestionInfo}>
            <Text style={styles.suggestionName} numberOfLines={1}>{biz.title ?? biz.name}</Text>
            {!!biz.about && (
              <Text style={styles.suggestionMeta} numberOfLines={1}>
                {biz.about.replace(/<[^>]+>/g, '')}
              </Text>
            )}
            {!!biz.followers_count && (
              <Text style={styles.suggestionMeta}>{biz.followers_count?.toLocaleString()} followers</Text>
            )}
          </View>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: ACCENT }]} activeOpacity={0.8}>
            <Text style={styles.actionBtnText}>Follow</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );
});

// ─── Communities to Join card ─────────────────────────────────────────────────
const CommunityToJoin = memo(({ items }) => {
  const navigation = useNavigation();
  const list = items?.slice(0, 2) ?? [];
  if (!list.length) return null;
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <View style={[styles.sectionIconBubble, { backgroundColor: BRAND }]}>
            <Ionicons name="people-circle" size={14} color={Colors.white} />
          </View>
          <Text style={styles.sectionTitle}>Communities to Join</Text>
        </View>
      </View>
      {list.map((group, idx) => (
        <TouchableOpacity
          key={group.id ?? idx}
          style={[styles.suggestionRow, idx < list.length - 1 && styles.suggestionRowBorder]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('GroupDetails', { groupId: group.id })}
        >
          <Image source={{ uri: group.avatar ?? group.cover ?? group.image }} style={styles.suggestionAvatar} />
          <View style={styles.suggestionInfo}>
            <Text style={styles.suggestionName} numberOfLines={1}>{group.title ?? group.name}</Text>
            {!!group.description && (
              <Text style={styles.suggestionMeta} numberOfLines={1}>
                {group.description.replace(/<[^>]+>/g, '')}
              </Text>
            )}
            {!!group.members_count && (
              <Text style={styles.suggestionMeta}>{group.members_count?.toLocaleString()} members</Text>
            )}
          </View>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: BRAND }]} activeOpacity={0.8}>
            <Text style={styles.actionBtnText}>Join</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );
});

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
            onPress={() => onFilterPress(item, index)}
            onLayout={(e) => onLayout(e, index, contentFilter, item.value)}
          >
            <Ionicons
              name={item.icon}
              size={16}
              color={active ? Colors.white : Colors.black}
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
// ─── Stable separator (never re-created) ────────────────────────────────────────────
const Separator = () => <View style={styles.separator} />;
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
  const [visibleFeedId,  setVisibleFeedId]  = useState(null); // drives extraData re-render
  const visibleFeedIdRef  = useRef(null);   // stable ref for renderItem (immediate)
  const visibleDebounceRef = useRef(null);  // debounce timer for extraData state
  const flashListRef       = useRef(null);
  const [showScrollTop,  setShowScrollTop]  = useState(false);
  const scrollTopVisible  = useRef(false);
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

  // Track scroll offset → show/hide back-to-top button
  const handleScroll = useCallback((e) => {
    const y = e.nativeEvent.contentOffset.y;
    const shouldShow = y > 900;
    if (shouldShow !== scrollTopVisible.current) {
      scrollTopVisible.current = shouldShow;
      setShowScrollTop(shouldShow);
    }
  }, []);

  const scrollToTop = useCallback(() => {
    flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Track which feed item is visible on screen (video) + send view to backend once per session
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const firstFeed = viewableItems.find(v => v.item?.type === 'feed');
    const nextId = firstFeed?.item?.data?.id ?? null;
    // Update the ref immediately so renderCombinedItem always reads the right value
    visibleFeedIdRef.current = nextId;
    // Debounce the state update that drives extraData — prevents FlashList from
    // re-evaluating all visible cells on every single scroll tick
    clearTimeout(visibleDebounceRef.current);
    visibleDebounceRef.current = setTimeout(() => setVisibleFeedId(nextId), 150);

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
    itemVisiblePercentThreshold: 70,
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
            {/* read from ref so this callback stays stable (no visibleFeedId dep) */}
            <FeedCard
              feed={item.data}
              isVisible={visibleFeedIdRef.current === item.data.id}
              onPostPress={onPostPress}
            />
          </View>
        );

      case 'peoplecard':
        return <PeopleYouMayKnow people={item.data} />;

      case 'bizcard':
        return <BusinessToFollow items={item.data} />;

      case 'communitycard':
        return <CommunityToJoin items={item.data} />;

      case 'ad':
        return <AdCard ad={item.data} />;

      default:
        // Generic catch-all: lets Explore/profile sections pass a renderComponent fn
        if (typeof item?.renderComponent === 'function') return item.renderComponent();
        return null;
    }
  }, [onPostPress]); // stable — visibleFeedId read via ref, not closure

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
        ref={flashListRef}
        data={combinedData}
        estimatedItemSize={550}
        keyExtractor={keyExtractor}
        getItemType={getItemType}
        renderItem={renderCombinedItem}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig}
        extraData={visibleFeedId}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        stickyHeaderIndices={stickyHeaderIndices?.length ? stickyHeaderIndices : []}
        onScroll={handleScroll}
        scrollEventThrottle={200}
        removeClippedSubviews
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        ItemSeparatorComponent={Separator}
      />

      {/* ── Back-to-top FAB ──────────────────────────────────────────────── */}
      {showScrollTop && (
        <TouchableOpacity
          style={styles.scrollTopBtn}
          onPress={scrollToTop}
          activeOpacity={0.85}
        >
          <Ionicons name="chevron-up" size={20} color={Colors.white} />
        </TouchableOpacity>
      )}

      <CommentModal />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: BG_BASE },
  listContent: { backgroundColor: BG_BASE, paddingBottom: 40 },
  separator:   { height: 6, backgroundColor: BG_BASE },

  scrollTopBtn: {
    position:        'absolute',
    bottom:          24,
    right:           18,
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: BRAND,
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     BRAND,
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.35,
    shadowRadius:    8,
    elevation:       8,
    zIndex:          50,
  },

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

  // ── Suggestion cards (People / Biz / Community) ──────────────────────────
  sectionCard: {
    backgroundColor: BG_CARD,
    marginHorizontal: 0,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight ?? '#F0F0F0',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIconBubble: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND,
    letterSpacing: -0.2,
  },
  sectionSeeAll: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: '600',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  suggestionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight ?? '#F5F5F5',
  },
  suggestionAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.surfaceTint,
  },
  suggestionInfo: {
    flex: 1,
    gap: 2,
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND,
  },
  suggestionMeta: {
    fontSize: 11,
    color: MUTED,
    lineHeight: 15,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    minWidth: 68,
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: '700',
  },

  // ── Ad card ──────────────────────────────────────────────────────────────
  adCard: {
    backgroundColor: BG_CARD,
    overflow: 'hidden',
  },
  adImageWrapper: {
    position: 'relative',
  },
  adImage: {
    width: '100%',
    height: 190,
  },
  adImageFallback: {
    width: '100%',
    height: 190,
    backgroundColor: BRAND,
  },
  adBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.black + '8C',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  adBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  adBadgeText: {
    fontSize: 10,
    color: Colors.white,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  adBody: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  adBodyText: {
    flex: 1,
  },
  adTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.black,
    lineHeight: 19,
  },
  adDesc: {
    fontSize: 12,
    color: MUTED,
    marginTop: 3,
    lineHeight: 16,
  },
  adCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: ACCENT,
  },
  adCtaText: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: '700',
  },

  // Filter bar
  filterWrapper: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: BRAND,
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
    backgroundColor: BRAND,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.black,
  },
  filterTextActive: {
    color: Colors.white,
  },
  filterIndicator: {
    position: 'absolute',
    top: 10,
    bottom: 10,
    backgroundColor: BRAND,
    borderRadius: 20,
    zIndex: -1,
  },
});

export default Feeds;