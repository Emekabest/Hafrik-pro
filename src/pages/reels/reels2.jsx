/**
 * Reels2 – TikTok-style vertical reels feed.
 *
 * Tabs:        Discover (mode=discover) | Latest (mode=for_you)
 * session_id:  Generated on mount and on each refresh/tab-switch.
 *              Kept stable while the user scrolls the same feed.
 * Pagination:  Append-only. Stops when the returned array is empty.
 * Load-more:   Triggered when the user is within 2 reels of the end.
 * Refresh:     Pull-to-refresh generates a new session_id and reloads page 1.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useAuth } from '../../AuthContext';
import ReelHeader from './reelheader';
import ReelCard from './reelcard';
import SkeletonReelCard from './skelentonreelcard';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { fetchReels } from './reelsApi';
import useStore from '../../repository/store';
import { Colors } from '../../theme/colors';

const { height: SCREEN_H } = Dimensions.get('window');
const SKELETON_ID = '__skeleton_end__';

/** Generates a short random session ID. */
const newSessionId = () => Math.random().toString(36).substring(2, 13);
const engagementId = (reel) => reel?.post_id ?? reel?.id;

const Reels2 = () => {
  const { token }     = useAuth();
  const navigation    = useNavigation();
  const route         = useRoute();
  const initialMode   = route.params?.mode ?? 'discover';
  const initialReelId = route.params?.initialReelId ?? null;
  const initialReels  = route.params?.initialReels ?? null;
  const startIndex    = route.params?.startIndex ?? 0;

  const isFocused      = useIsFocused();
  const setCurrentReel = useStore((s) => s.setCurrentReel);

  const [reels,      setReels]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mode,       setMode]       = useState(initialMode);
  const [itemHeight, setItemHeight] = useState(SCREEN_H);
  const hasSeededRef = useRef(false);

  const flatListRef       = useRef(null);
  const pageRef           = useRef(1);
  const hasMoreRef        = useRef(true);
  const modeRef           = useRef(mode);
  const reelsRef          = useRef([]);
  const sessionIdRef      = useRef(newSessionId());   // stable for the current feed session
  const isLoadingMoreRef  = useRef(false);
  const didScrollInitial  = useRef(false);
  const activeIndexRef    = useRef(0);
  const hasAutoplayedRef  = useRef(false);
  const hasFocusedOnceRef = useRef(false);

  useEffect(() => { modeRef.current  = mode;  }, [mode]);
  useEffect(() => { reelsRef.current = reels; }, [reels]);

  // ── Container height measurement ──────────────────────────────────────────
  const handleLayout = useCallback((e) => {
    const h = Math.floor(e.nativeEvent.layout.height);
    if (h > 0) setItemHeight(h);
  }, []);

  // ── Fast item layout (required for scrollToIndex) ─────────────────────────
  const getItemLayout = useCallback(
    (_, index) => ({ length: itemHeight, offset: itemHeight * index, index }),
    [itemHeight],
  );

  // ── Pause all when leaving screen ─────────────────────────────────────────
  useEffect(() => {
    if (!isFocused) setCurrentReel({ shouldPlay: false, reelId: null });
  }, [isFocused, setCurrentReel]);

  // ── Fetch helpers ─────────────────────────────────────────────────────────
  const applyReels = useCallback((data, append) => {
    setReels((prev) => {
      const base     = append ? prev.filter((r) => r?.type !== 'skeleton') : [];
      const existing = new Set();
      base.forEach((r) => {
        if (r?.id) existing.add(`id:${String(r.id)}`);
        if (r?.post_id) existing.add(`id:${String(r.post_id)}`);
        const video = r?.media?.video_url || r?.media?.video_path || r?.video_url;
        if (video) existing.add(`video:${String(video)}`);
      });
      const fresh    = [];
      data.forEach((r) => {
        const id = r?.id ?? r?.post_id;
        const video = r?.media?.video_url || r?.media?.video_path || r?.video_url;
        const idKey = id ? `id:${String(id)}` : null;
        const videoKey = video ? `video:${String(video)}` : null;
        if (!id || (idKey && existing.has(idKey)) || (videoKey && existing.has(videoKey))) return;
        existing.add(idKey);
        if (videoKey) existing.add(videoKey);
        fresh.push(r);
      });
      return [...base, ...fresh, { id: SKELETON_ID, type: 'skeleton' }];
    });
  }, []);

  const doFetch = useCallback(
    async (m, page, sessionId, append = false) => {
      try {
        const { reels: data, hasMore } = await fetchReels(
          { page, limit: 10, mode: m, session_id: sessionId },
          token,
        );
        // Stop paginating when the response is empty
        hasMoreRef.current = hasMore && data.length > 0;

        if (data.length > 0) {
          applyReels(data, append);
          if (append) pageRef.current = page;
        } else if (!append) {
          setReels([]);
        }
      } catch (e) {
        console.log('[Reels2] fetch error:', e?.message ?? e);
        if (!append) setReels([]);
      }
    },
    [token, applyReels],
  );

  // ── Reset helpers (shared by initial load, tab switch, refresh) ───────────
  const resetFeed = useCallback(() => {
    pageRef.current       = 1;
    hasMoreRef.current    = true;
    activeIndexRef.current   = 0;
    didScrollInitial.current = false;
    hasAutoplayedRef.current = false;
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, []);

  // ── Initial load / mode change ────────────────────────────────────────────
  useEffect(() => {
    resetFeed();

    // Seed from pre-loaded reels passed via navigation params (e.g. grid tap)
    if (initialReels?.length > 0 && !hasSeededRef.current) {
      hasSeededRef.current = true;
      const validReels = initialReels
        .filter((r) => r?.id)
        .map((r) => ({
          ...r,
          media: Array.isArray(r.media) ? (r.media[0] ?? null) : r.media,
        }));

      if (validReels.length > 0) {
        setLoading(false);
        setReels([...validReels, { id: SKELETON_ID, type: 'skeleton' }]);
        const target = validReels[startIndex] ?? validReels[0];
        if (target) {
          activeIndexRef.current   = startIndex;
          hasAutoplayedRef.current = true;
          didScrollInitial.current = true;
          setCurrentReel({ shouldPlay: true, reelId: engagementId(target) });
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: startIndex, animated: false });
          }, 150);
        }
        // Fetch fresh reels to append in background
        doFetch(mode, 1, sessionIdRef.current, true);
        return;
      }
    }

    setReels([]);
    setLoading(true);
    setCurrentReel({ shouldPlay: false, reelId: null });
    doFetch(mode, 1, sessionIdRef.current, false).finally(() => setLoading(false));
  }, [mode, token]); // intentionally omitting stable callbacks

  // ── Pull-to-refresh ───────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setCurrentReel({ shouldPlay: false, reelId: null });
    // New session_id so the server returns a fresh personalised set
    sessionIdRef.current = newSessionId();
    resetFeed();
    await doFetch(modeRef.current, 1, sessionIdRef.current, false);
    setRefreshing(false);
  }, [doFetch, resetFeed, setCurrentReel]);

  // ── Refresh every time user returns to / opens the reels screen ───────────
  useEffect(() => {
    if (!isFocused) return;
    if (!hasFocusedOnceRef.current) {
      hasFocusedOnceRef.current = true;
      return;
    }
    if (initialReels?.length > 0) return;
    setCurrentReel({ shouldPlay: false, reelId: null });
    sessionIdRef.current = newSessionId();
    resetFeed();
    setLoading(true);
    doFetch(modeRef.current, 1, sessionIdRef.current, false).finally(() => setLoading(false));
  }, [doFetch, initialReels?.length, isFocused, resetFeed, setCurrentReel]);

  // ── Autoplay first reel once data arrives ─────────────────────────────────
  useEffect(() => {
    if (!isFocused || hasAutoplayedRef.current) return;
    const first = reels.find((r) => r?.type !== 'skeleton' && r?.id);
    if (!first) return;
    hasAutoplayedRef.current = true;
    setCurrentReel({ shouldPlay: true, reelId: engagementId(first) });
  }, [reels, isFocused]);

  // ── Scroll to initialReelId ───────────────────────────────────────────────
  useEffect(() => {
    if (!initialReelId || didScrollInitial.current) return;
    const real = reels.filter((r) => r?.type !== 'skeleton');
    if (!real.length) return;
    const idx = real.findIndex((r) => (
      String(r.id) === String(initialReelId) ||
      String(r.post_id) === String(initialReelId) ||
      String(r.reel_id) === String(initialReelId)
    ));
    if (idx < 0) return;
    const target = real[idx];
    didScrollInitial.current = true;
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index: idx, animated: false });
      setCurrentReel({ shouldPlay: true, reelId: engagementId(target) });
    }, 300);
  }, [reels, initialReelId]);

  // ── Load more ─────────────────────────────────────────────────────────────
  const handleLoadMore = useCallback(() => {
    if (isLoadingMoreRef.current || !hasMoreRef.current) return;
    isLoadingMoreRef.current = true;
    doFetch(modeRef.current, pageRef.current + 1, sessionIdRef.current, true).finally(() => {
      isLoadingMoreRef.current = false;
    });
  }, [doFetch]);

  // ── Viewability → autoplay + load-more trigger ───────────────────────────
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const primary = viewableItems.find((v) => v.isViewable && v.item?.type !== 'skeleton');
    if (!primary) {
      setCurrentReel({ shouldPlay: false, reelId: null });
      return;
    }
    activeIndexRef.current = primary.index ?? 0;
    setCurrentReel({ shouldPlay: true, reelId: engagementId(primary.item) });

    // Load-more when within 2 reels of the end
    const totalReal = reelsRef.current.filter((r) => r?.type !== 'skeleton').length;
    if ((primary.index ?? 0) >= totalReal - 2) handleLoadMore();
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 70,
    minimumViewTime: 80,
    waitForInteraction: false,
  }).current;

  // ── Tab (mode) switch — generates a new session ───────────────────────────
  const handleModeChange = useCallback((newMode) => {
    if (newMode === modeRef.current) return;
    // New session for the new feed tab
    sessionIdRef.current = newSessionId();
    setCurrentReel({ shouldPlay: false, reelId: null });
    setMode(newMode);
  }, [setCurrentReel]);

  const handleSwipeMode = useCallback((direction) => {
    const nextMode = direction === 'left' ? 'for_you' : 'discover';
    if (nextMode === modeRef.current) return;
    handleModeChange(nextMode);
  }, [handleModeChange]);

  // ── Momentum scroll → belt-and-suspenders sync ───────────────────────────
  const onMomentumScrollEnd = useCallback((e) => {
    const index = Math.round(e.nativeEvent.contentOffset.y / itemHeight);
    activeIndexRef.current = index;
    const reel = reelsRef.current[index];
    if (reel?.type !== 'skeleton') setCurrentReel({ shouldPlay: true, reelId: engagementId(reel) });
  }, [itemHeight, setCurrentReel]);

  // ── Render ────────────────────────────────────────────────────────────────
  const renderItem = useCallback(({ item }) => {
    if (item?.type === 'skeleton') return <SkeletonReelCard height={itemHeight} />;
    return <ReelCard reel={item} height={itemHeight} onSwipeMode={handleSwipeMode} />;
  }, [handleSwipeMode, itemHeight]);

  return (
    <View style={styles.container} onLayout={handleLayout}>

      <ReelHeader
        mode={mode}
        onModeChange={handleModeChange}
        onSearchPress={() => navigation.navigate('SearchScreen')}
      />

      {/* Initial skeleton while first page loads */}
      {loading && reels.length === 0 && <SkeletonReelCard height={itemHeight} />}

      <FlatList
        ref={flatListRef}
        data={reels}
        keyExtractor={(item, index) => `${item.id ?? 'reel'}-${index}`}
        renderItem={renderItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        onMomentumScrollEnd={onMomentumScrollEnd}
        removeClippedSubviews
        windowSize={3}
        initialNumToRender={3}
        maxToRenderPerBatch={2}
        initialScrollIndex={initialReels?.length > 0 ? startIndex : undefined}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
          }, 200);
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.white}
            colors={[Colors.white]}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
});

export default Reels2;
