import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, FlatList, InteractionManager, StyleSheet, View } from "react-native";
import { useAuth } from "../../AuthContext";
import ReelHeader from "./reelheader";
import ReelCard from "./reelcard";
import useStore from "../../repository/store";
import ReelsManager from "../../helpers/reelsmanager";
import SkeletonReelCard from "./skelentonreelcard";
import { useIsFocused, useNavigation, useRoute } from "@react-navigation/native";
import VideoPreloader from "../../helpers/VideoPreloader";
import { fetchReels } from "./reelsApi";
import AppDetails from "../../helpers/appdetails";
import { Colors } from '../../theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
// Estimate full-screen height minus tab bar; corrected by onLayout.
const ESTIMATED_HEIGHT = SCREEN_HEIGHT - AppDetails.mainTabNavigatorHeight;
const SKELETON_ID = "__skeleton_end__";

const Reels2 = () => {
  const { token } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const initialReelId = route.params?.initialReelId ?? null;
  const initialMode   = route.params?.mode ?? "for_you";

  const [reels, setReels]             = useState([]);
  const [mode, setMode]               = useState(initialMode);
  const [delayedFocus, setDelayedFocus] = useState(false);
  const [itemHeight, setItemHeight]   = useState(ESTIMATED_HEIGHT);
  const itemHeightRef = useRef(ESTIMATED_HEIGHT);

  // Measure actual container height so every card fills it exactly
  const handleContainerLayout = useCallback((e) => {
    const h = Math.floor(e.nativeEvent.layout.height);
    if (h > 0 && h !== itemHeightRef.current) {
      itemHeightRef.current = h;
      setItemHeight(h);
    }
  }, []);

  const isLoadingMore     = useRef(false);
  const pageRef           = useRef(1);
  const reelsRef          = useRef([]);
  const reelSeedRef       = useRef(null);
  const modeRef           = useRef(mode);
  const hasInitializedRef = useRef(false);
  const flatListRef       = useRef(null);
  const didScrollToInitial = useRef(false);

  const reelsFromStore   = useStore((s) => s.reels);
  const setReelsToStore  = useStore((s) => s.setReels);
  const isFocused        = useIsFocused();
  const isAppActive_store = useStore((s) => s.isAppActive);
  const setCurrentReel_store = useStore((s) => s.setCurrentReel);

  useEffect(() => { reelsRef.current = reels; }, [reels]);
  useEffect(() => { modeRef.current  = mode;  }, [mode]);

  // ── Fetch reels whenever mode changes ────────────────────────────────────
  useEffect(() => {
    const seed = Math.floor(Math.random() * 2147483647);
    reelSeedRef.current = seed;
    pageRef.current = 1;
    hasInitializedRef.current = false;

    const load = async () => {
      try {
        const data = await fetchReels({ page: 1, limit: 10, mode, seed }, token);
        if (Array.isArray(data) && data.length > 0) {
          setReelsToStore(data);
          InteractionManager.runAfterInteractions(() => {
            VideoPreloader.preloadFromReels(data);
          });
        } else {
          setReelsToStore([]);
        }
      } catch (e) {
        console.log("[Reels2] fetch error:", e?.message || e);
        setReelsToStore([]);
      }
    };
    load();
  }, [mode, token, setReelsToStore]);

  // ── Stable item layout for snapping ──────────────────────────────────────
  const getItemLayout = useCallback((_, index) => {
    const h = itemHeightRef.current;
    return { length: h, offset: h * index, index };
  }, []);

  // ── Focus / blur ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isFocused && isAppActive_store) {
      const timer = setTimeout(() => setDelayedFocus(true), 150);
      return () => clearTimeout(timer);
    } else {
      setDelayedFocus(false);
      ReelsManager.clearAll();
      setCurrentReel_store({ shouldPlay: false, reelId: null });
    }
  }, [isFocused, isAppActive_store, setCurrentReel_store]);

  // ── Render item ───────────────────────────────────────────────────────────
  const renderReels = useCallback(({ item, index }) => {
    if (item?.type === "skeleton") return <SkeletonReelCard height={itemHeight} />;
    return <ReelCard reel={item} index={index} height={itemHeight} />;
  }, [itemHeight]);

  // ── Always keep skeleton at end ───────────────────────────────────────────
  useEffect(() => {
    const raw = Array.isArray(reelsFromStore) ? [...reelsFromStore] : [];
    const cleaned = raw.filter(
      (r) => r && r.type !== "skeleton" && String(r.id) !== SKELETON_ID
    );
    setReels([...cleaned, { id: SKELETON_ID, type: "skeleton" }]);
  }, [reelsFromStore]);

  // ── Autoplay first reel ───────────────────────────────────────────────────
  useEffect(() => {
    if (!delayedFocus) return;
    if (hasInitializedRef.current) return;
    const firstReal = reels.find((r) => r && r.type !== "skeleton" && r.id);
    if (!firstReal) return;
    hasInitializedRef.current = true;
    setCurrentReel_store({ shouldPlay: true, reelId: firstReal.id });
  }, [reels, delayedFocus, setCurrentReel_store]);

  // ── Scroll to initialReelId ───────────────────────────────────────────────
  useEffect(() => {
    if (!initialReelId || didScrollToInitial.current) return;
    const realReels = reels.filter((r) => r && r.type !== "skeleton");
    if (!realReels.length) return;
    const idx = realReels.findIndex((r) => String(r.id) === String(initialReelId));
    if (idx < 0) return;
    didScrollToInitial.current = true;
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index: idx, animated: false });
      setCurrentReel_store({ shouldPlay: true, reelId: initialReelId });
    }, 300);
  }, [reels, initialReelId, setCurrentReel_store]);

  // ── Load more ─────────────────────────────────────────────────────────────
  const handleLoadMoreReels = useCallback(async () => {
    if (isLoadingMore.current) return;
    isLoadingMore.current = true;
    const nextPage = pageRef.current + 1;
    try {
      const data = await fetchReels(
        { page: nextPage, limit: 10, mode: modeRef.current, seed: reelSeedRef.current },
        token
      );
      if (Array.isArray(data) && data.length > 0) {
        const base = (reelsRef.current || []).filter(
          (r) => r && r.type !== "skeleton" && String(r.id) !== SKELETON_ID
        );
        const existing = new Set(base.map((r) => String(r.id)));
        const newItems = data.filter((i) => i && !existing.has(String(i.id)));
        if (newItems.length > 0) {
          setReelsToStore([...base, ...newItems]);
          pageRef.current = nextPage;
          InteractionManager.runAfterInteractions(() => {
            VideoPreloader.preloadFromReels(newItems);
          });
        }
      }
    } catch (e) {
      console.log("[Reels2] loadMore error:", e?.message || e);
    }
    isLoadingMore.current = false;
  }, [token, setReelsToStore]);

  // ── Mode change ───────────────────────────────────────────────────────────
  const handleModeChange = useCallback((newMode) => {
    if (newMode === modeRef.current) return;
    ReelsManager.clearAll();
    setCurrentReel_store({ shouldPlay: false, reelId: null });
    setReelsToStore([]);
    setMode(newMode);
  }, [setReelsToStore, setCurrentReel_store]);

  // ── Viewability → autoplay / load-more trigger ────────────────────────────
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const primary = viewableItems.find((v) => v.isViewable);
    const item = primary?.item;
    if (!item || item.type === "skeleton") {
      setCurrentReel_store({ shouldPlay: false, reelId: null });
      return;
    }
    ReelsManager.singlePause();
    setCurrentReel_store({ shouldPlay: true, reelId: item.id });
    const idx = primary?.index ?? -1;
    const lastRealIndex = reelsRef.current.length - 2;
    if (idx >= lastRealIndex - 1) handleLoadMoreReels();
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 60,
    waitForInteraction: false,
  }).current;

  return (
    <View style={styles.container} onLayout={handleContainerLayout}>
      {/* Overlay header (Following / For You + Search) */}
      <ReelHeader
        mode={mode}
        onModeChange={handleModeChange}
        onSearchPress={() => navigation.navigate('SearchScreen')}
      />

      <FlatList
        ref={flatListRef}
        data={reels}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderReels}
        decelerationRate="fast"
        getItemLayout={getItemLayout}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        snapToInterval={itemHeight}
        snapToAlignment="start"
        disableIntervalMomentum
        removeClippedSubviews
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={5}
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
