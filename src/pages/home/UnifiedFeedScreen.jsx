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
  View, StyleSheet, Animated, InteractionManager, AppState,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../AuthContext.js';
import Feeds from './feeds/feeds.jsx';
import ReelsGridView from './feeds/ReelsGridView.jsx';
import GetFeedsController from '../../controllers/getfeedscontroller.js';
import useStore from '../../repository/store.js';
import AppDetails from '../../helpers/appdetails.js';
import { Colors } from '../../theme';

const BG = Colors.white;
const AUTO_REFRESH_MS = 30_000;

const UnifiedFeedScreen = ({ tabConfig, contentFilter = '', feedWidth }) => {
  const { token }    = useAuth();
  const navigation   = useNavigation();
  const feedsName    = tabConfig.listName;

  // ── Store selectors ─────────────────────────────────────────────────────────
  const clearFeedsList_store     = useStore(s => s.clearFeedsList);
  const addFeedsToList_store     = useStore(s => s.addFeedsToList);
  const prependFeedsToList_store = useStore(s => s.prependFeedsToList);
  const setFeedsMeta_store       = useStore(s => s.setFeedsMeta);
  const refreshSignal            = useStore(s => s.refreshSignal);
  const selectedCountryId        = useStore(s => s.selectedCountryId);
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

  // ── Seen-posts tracking (per-tab, persisted in AsyncStorage) ─────────────
  const SEEN_KEY            = `hafrik_seen_posts_${tabConfig.key}`;
  const MAX_SEEN_IDS        = 500;
  const seenIdsRef          = useRef(new Set());
  const [displayFeeds, setDisplayFeeds] = useState([]);
  const displayFeedsIdsRef  = useRef(new Set());
  // Set to true before a hard/refresh load so the effect re-sorts; false → pagination append
  const pendingFreshSortRef = useRef(true);

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

  // ── Load seen post IDs from AsyncStorage (once per tab key) ─────────────
  useEffect(() => {
    AsyncStorage.getItem(SEEN_KEY)
      .then(raw => {
        if (raw) {
          try {
            const arr = JSON.parse(raw);
            seenIdsRef.current = new Set(arr.map(String));
          } catch {}
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SEEN_KEY]);

  // ── Manage displayFeeds: sort on fresh load, append on pagination ─────────
  useEffect(() => {
    if (!initialFetchDone || feeds.length === 0) return;

    if (pendingFreshSortRef.current) {
      // Fresh load (initial / refresh / tab switch): sort unseen to top, shuffle each group
      pendingFreshSortRef.current = false;

      const shuffle = (arr) => {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      };

      const unseen = feeds.filter(f => !seenIdsRef.current.has(String(f.id)));
      const seen   = feeds.filter(f =>  seenIdsRef.current.has(String(f.id)));
      // If unseen posts exist: shuffle unseen → top, shuffle seen → bottom
      // If all posts seen: shuffle everything
      const sorted = unseen.length > 0
        ? [...shuffle(unseen), ...shuffle(seen)]
        : shuffle(feeds);

      setDisplayFeeds(sorted);
      displayFeedsIdsRef.current = new Set(sorted.map(f => String(f.id)));

      // Mark all as seen and persist (cap at MAX_SEEN_IDS to bound storage size)
      sorted.forEach(f => seenIdsRef.current.add(String(f.id)));
      if (seenIdsRef.current.size > MAX_SEEN_IDS) {
        const trimmed = [...seenIdsRef.current].slice(-MAX_SEEN_IDS);
        seenIdsRef.current = new Set(trimmed);
      }
      AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...seenIdsRef.current])).catch(() => {});
    } else {
      // Pagination: append only truly new posts (preserve existing display order)
      const newItems = feeds.filter(f => !displayFeedsIdsRef.current.has(String(f.id)));
      if (newItems.length === 0) return;

      setDisplayFeeds(prev => [...prev, ...newItems]);
      newItems.forEach(f => {
        displayFeedsIdsRef.current.add(String(f.id));
        seenIdsRef.current.add(String(f.id));
      });
      AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...seenIdsRef.current])).catch(() => {});
    }
  }, [initialFetchDone, feeds]);

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
  }, [apiUrl, token, feedsName]);

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

  // ── Silent background refresh ──────────────────────────────────────────────
  const silentRefresh = useCallback(async () => {
    try {
      const response = await GetFeedsController(apiUrl, token, 1);
      if (response?.status === 200 && Array.isArray(response?.data) && response.data.length > 0) {
        InteractionManager.runAfterInteractions(() => {
          prependFeedsToList_store(feedsName, response.data);
          if (response.meta) {
            setFeedsMeta_store(feedsName, response.meta);
          }
        });
      }
    } catch {}
  }, [apiUrl, token, feedsName]);

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
      { type: 'feedsheader', name: tabConfig.label, description: tabConfig.description, id: feedsName },
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
  }, [displayFeeds, feedWidth, peopleList, bizList, communityList, tabConfig.label, feedsName]);

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
      />
    </View>
  );
};

export default memo(UnifiedFeedScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
});
