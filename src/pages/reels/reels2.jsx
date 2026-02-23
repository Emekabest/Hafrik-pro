import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, FlatList, InteractionManager, View } from "react-native";
import { useAuth } from "../../AuthContext";
import ReelHeader from "./reelheader";
import ReelCard from "./reelcard";
import useStore from "../../repository/store";
import ReelsManager from "../../helpers/reelsmanager";
import SkeletonReelCard from "./skelentonreelcard";
import { useIsFocused, useNavigation, useRoute } from "@react-navigation/native";
import VideoPreloader from "../../helpers/VideoPreloader";
import { fetchReels } from "./reelsApi";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const ITEM_HEIGHT = SCREEN_HEIGHT;
const SKELETON_ID = "__skeleton_end__";

const Reels2 = () => {
  const { token } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const initialReelId = route.params?.initialReelId ?? null;
  const initialMode   = route.params?.mode ?? "for_you";

  const [reels, setReels] = useState([]);
  const [mode, setMode] = useState(initialMode);
  const [delayedFocus, setDelayedFocus] = useState(false);

  const isLoadingMore = useRef(false);
  const pageRef = useRef(1);
  const reelsRef = useRef([]);
  const reelSeedRef = useRef(null);
  const modeRef = useRef(mode);
  const hasInitializedRef = useRef(false);
  const flatListRef = useRef(null);
  const didScrollToInitial = useRef(false);

  const reelsFromStore = useStore((state) => state.reels);
  const setReelsToStore = useStore((state) => state.setReels);

  const isFocused = useIsFocused();
  const isAppActive_store = useStore((state) => state.isAppActive);
  const setCurrentReel_store = useStore((state) => state.setCurrentReel);

  useEffect(() => {
    reelsRef.current = reels;
  }, [reels]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // ✅ Load reels when mode changes
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
          // no data — clear store so UI shows skeleton only
          setReelsToStore([]);
        }
      } catch (e) {
        console.log("[Reels2] fetch error:", e?.message || e);
        setReelsToStore([]);
      }
    };

    load();
  }, [mode, token, setReelsToStore]);

  // ✅ make list stable
  const getItemLayout = useCallback((_, index) => {
    return { length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index };
  }, []);

  // ✅ focus handling
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

  const renderReels = useCallback(({ item, index }) => {
    if (item?.type === "skeleton") return <SkeletonReelCard />;
    return <ReelCard reel={item} index={index} />;
  }, []);

  // ✅ always append skeleton at the end
  useEffect(() => {
    const raw = Array.isArray(reelsFromStore) ? [...reelsFromStore] : [];

    const cleaned = raw.filter(
      (item) => item && item.type !== "skeleton" && String(item.id) !== SKELETON_ID
    );

    const data = [...cleaned, { id: SKELETON_ID, type: "skeleton" }];
    setReels(data);
  }, [reelsFromStore]);

  // ✅ autoplay first REAL reel (not skeleton)
  useEffect(() => {
    if (!delayedFocus) return;
    if (hasInitializedRef.current) return;

    const firstReal = reels.find((r) => r && r.type !== "skeleton" && r.id);
    if (!firstReal) return;

    hasInitializedRef.current = true;
    setCurrentReel_store({ shouldPlay: true, reelId: firstReal.id });
  }, [reels, delayedFocus, setCurrentReel_store]);

  // ✅ scroll to initialReelId when reels load
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

  // ✅ load more
  const handleLoadMoreReels = useCallback(async () => {
    if (isLoadingMore.current) return;
    isLoadingMore.current = true;

    const nextPage = pageRef.current + 1;

    try {
      const data = await fetchReels(
        {
          page: nextPage,
          limit: 10,
          mode: modeRef.current,
          seed: reelSeedRef.current,
        },
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

  // ✅ mode change
  const handleModeChange = useCallback(
    (newMode) => {
      if (newMode === modeRef.current) return;

      ReelsManager.clearAll();
      setCurrentReel_store({ shouldPlay: false, reelId: null });
      setReelsToStore([]);
      setMode(newMode);
    },
    [setReelsToStore, setCurrentReel_store]
  );

  // ✅ viewability
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const primary = viewableItems.find((v) => v.isViewable);
    const item = primary?.item;

    if (!item || item.type === "skeleton") {
      setCurrentReel_store({ shouldPlay: false, reelId: null });
      return;
    }

    ReelsManager.singlePause();
    setCurrentReel_store({ shouldPlay: true, reelId: item.id });

    // trigger load more when we reach near end (before skeleton)
    const idx = primary?.index ?? -1;
    const lastRealIndex = reelsRef.current.length - 2;
    if (idx >= lastRealIndex - 1) {
      handleLoadMoreReels();
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 70,
    minimumViewTime: 150,
    waitForInteraction: true,
  }).current;

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
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
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="start"
        removeClippedSubviews
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={5}
      />
    </View>
  );
};

export default Reels2;