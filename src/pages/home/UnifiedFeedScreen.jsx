/**
 * UnifiedFeedScreen
 * ------------------
 * One component for every main feed tab. Receives `tabConfig` (from FEED_TABS)
 * and renders the standard feed list with pagination, pull-to-refresh, live
 * refresh polling, and interstitial cards.
 *
 * It talks to the unified endpoint `GET /api/v1/feed/list.php?get=<tabConfig.get>`
 * and writes to the Zustand store using the `tabConfig.listName` slot.
 */
import React, {
  useState, useEffect, useRef, useMemo, useCallback, memo,
} from 'react';
import {
  View, Text, StyleSheet, Animated, Easing, TouchableOpacity, AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext.js';
import Feeds from './feeds/feeds.jsx';
import ReelsGridView from './feeds/ReelsGridView.jsx';
import GetFeedsController from '../../controllers/getfeedscontroller.js';
import useStore from '../../repository/store.js';
import AppDetails from '../../helpers/appdetails.js';
import { Colors } from '../../theme';
import OnlineNowStrip from './OnlineNowStrip.jsx';
import ExchangeRateTicker from './ExchangeRateTicker.jsx';

const BG     = Colors.white;
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const AUTO_REFRESH_MS = 20_000;

const UnifiedFeedScreen = ({ tabConfig, feedWidth }) => {
  const { token }    = useAuth();
  const navigation   = useNavigation();
  const feedsName    = tabConfig.listName;

  // ── Store selectors ─────────────────────────────────────────────────────────
  const clearFeedsList_store     = useStore(s => s.clearFeedsList);
  const addFeedsToList_store     = useStore(s => s.addFeedsToList);
  const setFeedsMeta_store       = useStore(s => s.setFeedsMeta);
  const refreshSignal            = useStore(s => s.refreshSignal);
  const selectedCountryId        = useStore(s => s.selectedCountryId);
  const contentFilter            = useStore(s => s.feedContentFilter);
  const ids                      = useStore(s => s.feeds.lists[feedsName] || []);
  const feedsById                = useStore(s => s.feeds.feedsById);

  const feedsFromStore = useMemo(
    () => ids.map(id => feedsById[id]).filter(Boolean),
    [ids, feedsById],
  );

  // ── Client-side country filter (secondary safety net after server filter) ──
    const feedsFromStoreFiltered = feedsFromStore; // Country filter removed: show all feeds

  // ── Local state ─────────────────────────────────────────────────────────────
  const [feeds,            setFeeds]            = useState([]);
  const [version,          setVersion]          = useState(0);
  const [refreshing,       setRefreshing]       = useState(false);
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const [peopleList,    setPeopleList]    = useState([]);
  const [bizList,       setBizList]       = useState([]);
  const [communityList, setCommunityList] = useState([]);
  const [loadingMore,   setLoadingMore]   = useState(false);

  const isReelsTab = tabConfig.key === 'reels';
  const pageRef    = useRef(1);
  const hasMoreRef = useRef(true);

  const [displayFeeds, setDisplayFeeds] = useState([]);
  const displayFeedsIdsRef  = useRef(new Set());
  // true before a hard/refresh load → replace; false → pagination append
  const pendingFreshSortRef = useRef(true);

  // New-posts badge
  const [pendingCount,  setPendingCount]  = useState(0);
  const pillAnim     = useRef(new Animated.Value(-56)).current;
  const pillVisible  = useRef(false);
  const feedScrollTopRef = useRef(null);

  // ── Build the API URL from tab config + content filter + country ──────────
  const apiUrl = useMemo(() => {
    const base = AppDetails.apis.feedApi;
    const url  = new URL(base);
    url.searchParams.set('get', tabConfig.get);
    url.searchParams.set('limit', '10');
    if (contentFilter) {
      url.searchParams.set('filter', contentFilter);
    }
    if (selectedCountryId && selectedCountryId !== 'all') {
      url.searchParams.set('country', String(selectedCountryId));
    }
    return url.toString();
  }, [tabConfig.get, contentFilter, selectedCountryId]);

  // ── Fetch interstitials on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    fetch('https://hafrik.com/api/v1/people/list.php', { headers })
      .then(r => r.json())
      .then(d => setPeopleList(Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []))
      .catch(() => {});

    fetch('https://hafrik.com/api/v1/business/list.php?limit=5', { headers })
      .then(r => r.json())
      .then(d => {
        const list = d?.data?.data ?? d?.data?.businesses ?? d?.data?.pages ?? d?.data ?? [];
        setBizList(Array.isArray(list) ? list : []);
      })
      .catch(() => {});

    fetch('https://hafrik.com/api/v1/communities/list.php?limit=5', { headers })
      .then(r => r.json())
      .then(d => {
        const list = d?.data?.data ?? d?.data?.groups ?? d?.data?.communities ?? d?.data ?? [];
        setCommunityList(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  }, [token]);

  // ── Manage displayFeeds: exact API order on fresh load, append on pagination ─
  useEffect(() => {
    if (!initialFetchDone || feeds.length === 0) return;

    if (pendingFreshSortRef.current) {
      // Fresh load — show feeds exactly as returned by the API, no reordering
      pendingFreshSortRef.current = false;
      setDisplayFeeds(feeds);
      displayFeedsIdsRef.current = new Set(feeds.map(f => String(f.id)));
    } else {
      // Pagination: append only truly new posts (preserve existing display order)
      const newItems = feeds.filter(f => !displayFeedsIdsRef.current.has(String(f.id)));
      if (newItems.length === 0) return;

      setDisplayFeeds(prev => [...prev, ...newItems]);
      newItems.forEach(f => displayFeedsIdsRef.current.add(String(f.id)));
    }
  }, [initialFetchDone, feeds]);

  // ── Pill show / hide ──────────────────────────────────────────────────────
  const showPill = useCallback((count) => {
    setPendingCount(count);
    if (!pillVisible.current) {
      pillVisible.current = true;
      Animated.spring(pillAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 120,
        friction: 10,
      }).start();
    }
  }, [pillAnim]);

  const hidePill = useCallback(() => {
    pillVisible.current = false;
    Animated.timing(pillAnim, {
      toValue: -56,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setPendingCount(0));
  }, [pillAnim]);

  // ── Hard load (clears list and reloads page 1) ─────────────────────────────
  const getFeeds = useCallback(async (url) => {
    pendingFreshSortRef.current = true;
    clearFeedsList_store(feedsName);
    try {
      const response = await GetFeedsController(url, token, 1);
      const feedsArray = Array.isArray(response?.data) ? response.data : [];
      if (response?.status === 200) {
        addFeedsToList_store(feedsName, feedsArray);
        if (response.meta) {
          setFeedsMeta_store(feedsName, response.meta);
        }
      }
    } finally {
      setInitialFetchDone(true);
    }
  }, [token, feedsName]);

  // ── Pull-to-refresh ───────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    hidePill();
    pendingFreshSortRef.current = true;
    setRefreshing(true);
    try {
      clearFeedsList_store(feedsName);
      const response = await GetFeedsController(apiUrl, token, 1);
      const feedsArray = Array.isArray(response?.data) ? response.data : [];
      if (response?.status === 200) {
        addFeedsToList_store(feedsName, feedsArray);
        if (response.meta) {
          setFeedsMeta_store(feedsName, response.meta);
        }
      }
    } finally {
      setRefreshing(false);
    }
  }, [apiUrl, token, feedsName, hidePill]);

  const onRefreshRef = useRef(onRefresh);
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  // ── Auto-refresh when a new post is created ───────────────────────────────
  const prevRefreshSignal = useRef(refreshSignal);
  useEffect(() => {
    if (refreshSignal === prevRefreshSignal.current) return;
    prevRefreshSignal.current = refreshSignal;
    if (refreshSignal === 0) return;
    onRefreshRef.current?.();
  }, [refreshSignal]);

  // ── Re-fetch when API URL changes (tab switch or filter change) ──────────
  useEffect(() => {
    setInitialFetchDone(false);
    setVersion(v => v + 1);
    getFeeds(apiUrl);
  }, [apiUrl]);

  // ── Sync store → local feeds state ────────────────────────────────────────
  useEffect(() => {
    setFeeds(feedsFromStoreFiltered);
  }, [feedsFromStoreFiltered]);

  // ── Silent background poll — detects new posts without disrupting scroll ──
  const silentRefresh = useCallback(async () => {
    try {
      const response = await GetFeedsController(apiUrl, token, 1);
      if (response?.status !== 200 || !Array.isArray(response?.data)) return;
      const fetched = response.data;
      if (fetched.length === 0) return;

      // Count how many returned posts are not already in the display
      const newCount = fetched.filter(
        (f) => !displayFeedsIdsRef.current.has(String(f.id))
      ).length;

      if (newCount > 0) {
        showPill(newCount);
      }
    } catch {}
  }, [apiUrl, token, showPill]);

  // ── Tap pill: scroll to top + full refresh ───────────────────────────────
  const handleNewPostsPress = useCallback(() => {
    hidePill();
    feedScrollTopRef.current?.();
    onRefreshRef.current?.();
  }, [hidePill]);

  // ── Auto-poll while screen is focused ─────────────────────────────────────
  const isFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      let interval = null;

      const startInterval = () => {
        if (interval) clearInterval(interval);
        interval = setInterval(silentRefresh, AUTO_REFRESH_MS);
      };

      const delayTimer = setTimeout(() => {
        if (!isFirstFocus.current) {
          silentRefresh();
        }
        isFirstFocus.current = false;
        startInterval();
      }, 200);

      const handleAppState = (nextState) => {
        if (nextState === 'active') {
          silentRefresh();
          startInterval();
        } else {
          if (interval) { clearInterval(interval); interval = null; }
        }
      };
      const appStateSub = AppState.addEventListener('change', handleAppState);

      return () => {
        clearTimeout(delayTimer);
        if (interval) clearInterval(interval);
        appStateSub.remove();
      };
    }, [silentRefresh]),
  );

  // ── Combined list data for FlashList ──────────────────────────────────────
  const combinedData = useMemo(() => {
    const items = [
      { type: 'banner', feedWidth: feedWidth || 0 },
      { type: 'feedquicklinks' },
      { type: 'feedsheader', name: tabConfig.feedTitle ?? tabConfig.label, description: tabConfig.description, id: feedsName },
      { type: 'postfeed' },
      { type: 'onlinestrip', data: peopleList },
    ];

    // Interstitial pool (fixed order, no shuffle)
    const pool = [];
    if (peopleList.length    > 0) pool.push({ type: 'peoplecard',    data: peopleList });
    if (bizList.length       > 0) pool.push({ type: 'bizcard',       data: bizList });
    if (communityList.length > 0) pool.push({ type: 'communitycard', data: communityList });

    const MAX_INTERSTITIALS = 3;
    const FIRST_AT          = 4;
    const STEP              = 7;
    let poolIdx    = 0;
    let nextInsert = FIRST_AT;

    // Feed posts in original API order, no boosted re-ordering
    displayFeeds.forEach((feed, i) => {
      items.push({ type: 'feed', data: feed });
      if ((i + 1) === nextInsert && poolIdx < pool.length && poolIdx < MAX_INTERSTITIALS) {
        items.push(pool[poolIdx++]);
        nextInsert += STEP;
      }
    });

    return items;
  }, [displayFeeds, feedWidth, peopleList, bizList, communityList, tabConfig.label, feedsName, tabConfig.description]);

  // Discover uses the same FeedCard layout as Following (no masonry)
  const finalCombinedData = combinedData;

  const handlePostPress = useCallback((postId) => {
    navigation.navigate('PostDetail', { postId });
  }, [navigation]);

  // ── Reels grid: load more pages ────────────────────────────────────────────
  const handleReelsLoadMore = useCallback(async () => {
    if (!isReelsTab || loadingMore || !hasMoreRef.current) return;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const response = await GetFeedsController(apiUrl, token, nextPage);
      const feedsArray = Array.isArray(response?.data) ? response.data : [];
      if (response?.status === 200 && feedsArray.length > 0) {
        addFeedsToList_store(feedsName, feedsArray);
        if (response.meta) setFeedsMeta_store(feedsName, response.meta);
        pageRef.current = nextPage;
        if (response.meta?.page >= response.meta?.total_pages || feedsArray.length < 10) {
          hasMoreRef.current = false;
        }
      } else {
        hasMoreRef.current = false;
      }
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  }, [isReelsTab, loadingMore, apiUrl, token, feedsName]);


  // Reset page refs when API URL changes
  useEffect(() => {
    pageRef.current = 1;
    hasMoreRef.current = true;
  }, [apiUrl]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (isReelsTab) {
    return (
      <View style={styles.container}>
        <ReelsGridView
          feeds={feeds}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onEndReached={handleReelsLoadMore}
          loadingMore={loadingMore}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Feeds
        key={`${feedsName}-${version}`}
        feedsName={feedsName}
        combinedData={finalCombinedData}
        feeds={feeds}
        initialDataLoaded={initialFetchDone}
        API_URL={apiUrl}
        feedsController={GetFeedsController}
        stickyHeaderIndices={[]}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onPostPress={handlePostPress}
        scrollToTopRef={feedScrollTopRef}
      />

      {/* ── New posts pill ────────────────────────────────────────────────── */}
      {pendingCount > 0 && (
        <Animated.View
          style={[styles.pillWrapper, { transform: [{ translateY: pillAnim }] }]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={styles.pill}
            activeOpacity={0.88}
            onPress={handleNewPostsPress}
          >
            <Ionicons name="arrow-up" size={14} color={BRAND} style={styles.pillIcon} />
            <Text style={styles.pillText}>
              {pendingCount} new post{pendingCount > 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

export default memo(UnifiedFeedScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  pillWrapper: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
    elevation: 999,
    pointerEvents: 'box-none',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: BRAND,
    borderRadius: 999,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
  pillIcon: {
    marginRight: 2,
  },
  pillText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
