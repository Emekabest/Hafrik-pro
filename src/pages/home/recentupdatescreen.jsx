import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, StyleSheet, Animated, InteractionManager, AppState,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext.js';
import Feeds from "./feeds/feeds.jsx";
import GetFeedsController from '../../controllers/getfeedscontroller.js';
import useStore from "../../repository/store.js";
import AppDetails from '../../helpers/appdetails.js';
import { Colors } from '../../theme';

const BG = Colors.white;

// Poll every 30 s while the screen is focused (was 60 s — halved so feed feels live)
const AUTO_REFRESH_MS = 30_000;

const RecentUpdatesScreen = ({ feedWidth }) => {
  const { token }      = useAuth();
  const navigation     = useNavigation();
  const feedsName      = 'recentUpdateFeeds';

  // ── Store selectors ─────────────────────────────────────────────────────────
  const clearFeedsList_store     = useStore(s => s.clearFeedsList);
  const addFeedsToList_store     = useStore(s => s.addFeedsToList);
  const prependFeedsToList_store = useStore(s => s.prependFeedsToList);
  // refreshSignal is incremented every time a post is created successfully
  const refreshSignal            = useStore(s => s.refreshSignal);
  const ids                      = useStore(s => s.feeds.lists.recentUpdateFeeds);
  const feedsById                = useStore(s => s.feeds.feedsById);

  const recentFeedsFromStore = useMemo(
    () => ids.map(id => feedsById[id]).filter(Boolean),
    [ids, feedsById],
  );

  // ── Local state ─────────────────────────────────────────────────────────────
  const [feeds,         setFeeds]         = useState([]);
  const [contentFilter, setContentFilter] = useState('');
  const [filterParams,  setFilterParams]  = useState({});
  const [version,       setVersion]       = useState(0);
  const [layoutData,    setLayoutData]    = useState([]);
  const [refreshing,    setRefreshing]    = useState(false);
  const [peopleList,    setPeopleList]    = useState([]);
  const [adsList,       setAdsList]       = useState([]);
  const [bizList,       setBizList]       = useState([]);
  const [communityList, setCommunityList] = useState([]);

  const BASE_API_URL = AppDetails.apis.recentUpdateApi;

  // ── Fetch people + ads on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    fetch('https://hafrik.com/api/v1/people/list.php', { headers })
      .then(r => r.json())
      .then(d => setPeopleList(Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []))
      .catch(() => {});

    fetch('https://hafrik.com/api/v1/ads/list.php', { headers })
      .then(r => r.json())
      .then(d => {
        const raw = d?.data;
        setAdsList(Array.isArray(raw) ? raw : (raw?.id ? [raw] : []));
      })
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

  const indicatorX     = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;

  // ── Filtered URL ──────────────────────────────────────────────────────────────
  const filteredUrl = useMemo(() => {
    const entries = Object.entries(filterParams);
    if (entries.length === 0) return BASE_API_URL;
    const qs = entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    return `${BASE_API_URL}?${qs}`;
  }, [BASE_API_URL, filterParams]);

  // ── Hard load (clears list and reloads page 1) ─────────────────────────────
  const getFeeds = useCallback(async (url) => {
    clearFeedsList_store(feedsName);
    const response    = await GetFeedsController(url, token, 1);
    const feedsArray  = Array.isArray(response?.data) ? response.data : [];
    if (response?.status === 200) {
      addFeedsToList_store(feedsName, feedsArray);
    }
  }, [token]);

  // ── Pull-to-refresh ───────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      clearFeedsList_store(feedsName);
      const response   = await GetFeedsController(filteredUrl, token, 1);
      const feedsArray = Array.isArray(response?.data) ? response.data : [];
      if (response?.status === 200) {
        addFeedsToList_store(feedsName, feedsArray);
      }
    } finally {
      setRefreshing(false);
    }
  }, [filteredUrl, token]);

  // Keep a stable ref to the latest onRefresh so the refreshSignal effect
  // never holds a stale closure even if filteredUrl / token change.
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  // ── Auto-refresh immediately when a new post is created ───────────────────
  // PostComposerModal calls store.triggerRefresh() on success, which bumps
  // refreshSignal. We watch it here and reload so the new post appears instantly.
  const prevRefreshSignal = useRef(refreshSignal);
  useEffect(() => {
    if (refreshSignal === prevRefreshSignal.current) return;
    prevRefreshSignal.current = refreshSignal;
    if (refreshSignal === 0) return; // skip initial value
    onRefreshRef.current?.();
  }, [refreshSignal]);

  // ── Re-fetch when filter changes ──────────────────────────────────────────
  useEffect(() => {
    setVersion(v => v + 1);
    getFeeds(filteredUrl);
  }, [filteredUrl]);

  // ── Sync store → local feeds state ────────────────────────────────────────
  useEffect(() => {
    setFeeds(recentFeedsFromStore);
  }, [recentFeedsFromStore]);

  // ── Silent background refresh ──────────────────────────────────────────────
  // Prepends only genuinely new items so the user's scroll position is preserved.
  // The store update is deferred via InteractionManager so it never collides with
  // a navigation animation and freezes the UI.
  const silentRefresh = useCallback(async () => {
    try {
      const response = await GetFeedsController(filteredUrl, token, 1);
      if (response?.status === 200 && Array.isArray(response?.data)) {
        InteractionManager.runAfterInteractions(() => {
          prependFeedsToList_store(feedsName, response.data);
        });
      }
    } catch {}
  }, [filteredUrl, token]);

  // ── Auto-poll while screen is focused ─────────────────────────────────────
  // FIX: was causing a hang because silentRefresh fired immediately on every
  // focus return while the navigation animation was still running.  We now wait
  // 400 ms before the first refresh so the transition settles first.
  // FIX: was 60 s — reduced to 30 s so the feed stays noticeably live.
  // FIX: interval was not started on first focus, so users who never left the
  // home screen never got auto-updates. Now always started (with the 400 ms delay).
  const isFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      let interval = null;

      const startInterval = () => {
        if (interval) clearInterval(interval);
        interval = setInterval(silentRefresh, AUTO_REFRESH_MS);
      };

      const delayTimer = setTimeout(() => {
        // On first focus, initial data is already loading via getFeeds(filteredUrl).
        // Subsequent focuses get an immediate silent refresh to catch up.
        if (!isFirstFocus.current) {
          silentRefresh();
        }
        isFirstFocus.current = false;
        startInterval();
      }, 200); // shorter delay so the feed feels more responsive

      // Pause polling when the app goes to background; resume + refresh immediately
      // when it comes back to the foreground — this prevents the UI from hanging
      // after the device was idle or the app was backgrounded for a while.
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

  // ── Filter bar ────────────────────────────────────────────────────────────
  const handleFilterPress = useCallback((item, index) => {
    setContentFilter(item.value);
    setFilterParams(item.params || {});
    if (layoutData[index]) {
      Animated.parallel([
        Animated.spring(indicatorX,     { toValue: layoutData[index].x,     useNativeDriver: false }),
        Animated.spring(indicatorWidth, { toValue: layoutData[index].width, useNativeDriver: false }),
      ]).start();
    }
  }, [layoutData]);

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

  // ── Combined list data for FlashList ──────────────────────────────────────
  const combinedData = useMemo(() => {
    const items = [
      { type: 'banner', feedWidth: feedWidth || 0 },
      {
        type: 'filtersbar',
        contentFilter,
        onFilterPress: handleFilterPress,
        onLayout:      handleLayout,
        indicatorX,
        indicatorWidth,
      },
      { type: 'feedsheader', name: 'Recent Updates', id: feedsName },
    ];

    // Build a one-of-each pool from whatever lists are loaded, then shuffle.
    const pool = [];
    if (adsList.length       > 0) pool.push({ type: 'ad',            data: adsList[0] });
    if (peopleList.length    > 0) pool.push({ type: 'peoplecard',    data: peopleList });
    if (bizList.length       > 0) pool.push({ type: 'bizcard',       data: bizList });
    if (communityList.length > 0) pool.push({ type: 'communitycard', data: communityList });
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // Show at most 2 interstitials, first after 5 posts then every 8 after that.
    const MAX_INTERSTITIALS = 2;
    const FIRST_AT          = 5;
    const STEP              = 8;
    let poolIdx    = 0;
    let nextInsert = FIRST_AT;

    feeds.forEach((feed, i) => {
      items.push({ type: 'feed', data: feed });

      if ((i + 1) === nextInsert && poolIdx < pool.length && poolIdx < MAX_INTERSTITIALS) {
        items.push(pool[poolIdx++]);
        nextInsert += STEP;
      }
    });

    return items;
  }, [feeds, feedWidth, contentFilter, adsList, peopleList, bizList, communityList]);

  const stickyHeaderIndices = [1];

  const handlePostPress = useCallback((postId) => {
    navigation.navigate('PostDetail', { postId });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Feeds
        key={version}
        feedsName={feedsName}
        combinedData={combinedData}
        feeds={feeds}
        API_URL={filteredUrl}
        feedsController={GetFeedsController}
        stickyHeaderIndices={stickyHeaderIndices}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onPostPress={handlePostPress}
      />
    </View>
  );
};

export default RecentUpdatesScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
});
