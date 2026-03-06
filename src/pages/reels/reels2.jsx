/**
 * Reels2 – TikTok-style vertical reels feed.
 *
 * Key design decisions:
 *  - Active reel is tracked via Zustand (`currentReel.reelId`) so ReelCard
 *    components can subscribe individually — no full-list re-render on scroll.
 *  - `pagingEnabled` gives perfect snap without snapToInterval drift.
 *  - VideoPreloader / ReelsManager removed; ReelMedia handles playback itself.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, View } from 'react-native';
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

const Reels2 = () => {
  const { token }     = useAuth();
  const navigation    = useNavigation();
  const route         = useRoute();
  const initialMode   = route.params?.mode ?? 'for_you';
  const initialReelId = route.params?.initialReelId ?? null;
  const initialReels  = route.params?.initialReels ?? null;
  const startIndex    = route.params?.startIndex ?? 0;

  const isFocused       = useIsFocused();
  const setCurrentReel  = useStore((s) => s.setCurrentReel);

  const [reels,     setReels]     = useState([]);
  const [mode,      setMode]      = useState(initialMode);
  const [itemHeight, setItemHeight] = useState(SCREEN_H);
  const hasSeededRef = useRef(false);

  const flatListRef        = useRef(null);
  const pageRef            = useRef(1);
  const seedRef            = useRef(Math.floor(Math.random() * 2_147_483_647));
  const modeRef            = useRef(mode);
  const reelsRef           = useRef([]);
  const isLoadingMoreRef   = useRef(false);
  const didScrollInitial   = useRef(false);
  const activeIndexRef     = useRef(0);
  const hasAutoplayedRef   = useRef(false);

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
    if (!isFocused) {
      setCurrentReel({ shouldPlay: false, reelId: null });
    }
  }, [isFocused, setCurrentReel]);

  // ── Fetch helpers ─────────────────────────────────────────────────────────
  const applyReels = useCallback((data, append) => {
    setReels((prev) => {
      const base = append ? prev.filter((r) => r?.type !== 'skeleton') : [];
      const existing = new Set(base.map((r) => String(r.id)));
      const fresh = data.filter((r) => r && !existing.has(String(r.id)));
      return [...base, ...fresh, { id: SKELETON_ID, type: 'skeleton' }];
    });
  }, []);

  const doFetch = useCallback(
    async (m, seed, page, append = false) => {
      try {
        const data = await fetchReels({ page, limit: 10, mode: m, seed }, token);
        if (Array.isArray(data) && data.length > 0) {
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

  // ── Initial load / mode change ────────────────────────────────────────────
  useEffect(() => {
    const seed = Math.floor(Math.random() * 2_147_483_647);
    seedRef.current = seed;
    pageRef.current = 1;
    activeIndexRef.current = 0;
    didScrollInitial.current = false;
    hasAutoplayedRef.current = false;

    // If we were given pre-loaded reels from the grid, seed the list with them
    if (initialReels?.length > 0 && !hasSeededRef.current) {
      hasSeededRef.current = true;
      // Normalize feed-format items: media may be an array (feed API)
      // but ReelCard expects media as an object (reels API).
      const validReels = initialReels.filter(r => r && r.id).map(r => ({
        ...r,
        media: Array.isArray(r.media) ? (r.media[0] ?? null) : r.media,
      }));
      if (validReels.length > 0) {
        setReels([...validReels, { id: SKELETON_ID, type: 'skeleton' }]);
        // Autoplay the tapped reel immediately
        const targetReel = validReels[startIndex] ?? validReels[0];
        if (targetReel) {
          activeIndexRef.current = startIndex;
          setCurrentReel({ shouldPlay: true, reelId: targetReel.id });
          hasAutoplayedRef.current = true;
          // Scroll to the tapped index after layout
          didScrollInitial.current = true;
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: startIndex, animated: false });
          }, 150);
        }
        // Also fetch fresh reels in the background to append more
        doFetch(mode, seed, 1, true);
        return;
      }
    }

    setReels([]);
    setCurrentReel({ shouldPlay: false, reelId: null });
    doFetch(mode, seed, 1, false);
  }, [mode, token]);   // intentionally omitting doFetch / setCurrentReel (stable refs)

  // ── Autoplay first reel once data arrives ─────────────────────────────────
  useEffect(() => {
    if (!isFocused || hasAutoplayedRef.current) return;
    const first = reels.find((r) => r?.type !== 'skeleton' && r?.id);
    if (!first) return;
    hasAutoplayedRef.current = true;
    setCurrentReel({ shouldPlay: true, reelId: first.id });
  }, [reels, isFocused]);

  // ── Scroll to initialReelId ───────────────────────────────────────────────
  useEffect(() => {
    if (!initialReelId || didScrollInitial.current) return;
    const realReels = reels.filter((r) => r?.type !== 'skeleton');
    if (!realReels.length) return;
    const idx = realReels.findIndex((r) => String(r.id) === String(initialReelId));
    if (idx < 0) return;
    didScrollInitial.current = true;
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index: idx, animated: false });
      setCurrentReel({ shouldPlay: true, reelId: initialReelId });
    }, 300);
  }, [reels, initialReelId]);

  // ── Load more ─────────────────────────────────────────────────────────────
  const handleLoadMore = useCallback(() => {
    if (isLoadingMoreRef.current) return;
    isLoadingMoreRef.current = true;
    doFetch(modeRef.current, seedRef.current, pageRef.current + 1, true).finally(() => {
      isLoadingMoreRef.current = false;
    });
  }, [doFetch]);

  // ── Viewability → autoplay ────────────────────────────────────────────────
  // useRef keeps the callback identity stable — required by FlatList
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const primary = viewableItems.find((v) => v.isViewable && v.item?.type !== 'skeleton');
    if (!primary) {
      setCurrentReel({ shouldPlay: false, reelId: null });
      return;
    }
    activeIndexRef.current = primary.index ?? 0;
    setCurrentReel({ shouldPlay: true, reelId: primary.item.id });

    // Trigger load-more when nearing the end
    const totalReal = reelsRef.current.filter((r) => r?.type !== 'skeleton').length;
    if ((primary.index ?? 0) >= totalReal - 3) handleLoadMore();
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 70,
    minimumViewTime: 80,
    waitForInteraction: false,
  }).current;

  // ── Mode switch ───────────────────────────────────────────────────────────
  const handleModeChange = useCallback((newMode) => {
    if (newMode === modeRef.current) return;
    setCurrentReel({ shouldPlay: false, reelId: null });
    setMode(newMode);
  }, [setCurrentReel]);

  // ── Render ────────────────────────────────────────────────────────────────
  const renderItem = useCallback(({ item }) => {
    if (item?.type === 'skeleton') return <SkeletonReelCard height={itemHeight} />;
    return <ReelCard reel={item} height={itemHeight} />;
  }, [itemHeight]);

  return (
    <View style={styles.container} onLayout={handleLayout}>

      {/* Overlay header — Following / For You + Search */}
      <ReelHeader
        mode={mode}
        onModeChange={handleModeChange}
        onSearchPress={() => navigation.navigate('SearchScreen')}
      />

      <FlatList
        ref={flatListRef}
        data={reels}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        // pagingEnabled gives perfect 1-reel snap, no snapToInterval drift
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        removeClippedSubviews
        initialNumToRender={Math.min(startIndex + 2, 4)}
        maxToRenderPerBatch={2}
        windowSize={5}
        initialScrollIndex={initialReels?.length > 0 ? startIndex : undefined}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
          }, 200);
        }}
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
