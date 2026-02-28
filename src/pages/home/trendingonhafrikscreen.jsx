import { StyleSheet, View, Alert, Text, Animated, Dimensions } from "react-native";
import { useAuth } from "../../AuthContext";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigation } from "@react-navigation/native";
import Feeds from "./feeds/feeds";
import GetFeedsController from "../../controllers/getfeedscontroller";
import useStore from "../../repository/store.js";
import AppDetails from "../../helpers/appdetails.js";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_W } = Dimensions.get("window");
const BRAND  = "#0C3F44";
const ACCENT = "#13C296";
const MUTED  = "#7A9198";

// ─────────────────────────────────────────────────────
// Trending Header
// ─────────────────────────────────────────────────────

const TrendingHeader = ({ count, totalViews }) => {
  const opacity  = useRef(new Animated.Value(0)).current;
  const slideY   = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(slideY, { toValue: 0, tension: 120, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  const fmtViews = (n) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + "k";
    return String(n);
  };

  return (
    <Animated.View style={{ opacity, transform: [{ translateY: slideY }] }}>
      <LinearGradient
        colors={[BRAND, "#0a4a52", "#073038"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={th.wrap}
      >
        <View style={th.dotGrid} pointerEvents="none">
          {[...Array(12)].map((_, i) => (
            <View key={i} style={[th.dot, { opacity: 0.04 + (i % 4) * 0.015 }]} />
          ))}
        </View>

        <View style={th.badge}>
          <Text style={th.badgeTxt}>🔥 TRENDING</Text>
        </View>

        <Text style={th.title}>What's Hot{"\n"}on Hafrik</Text>

        <View style={th.statsRow}>
          <View style={th.statChip}>
            <Ionicons name="flame-outline" size={13} color={ACCENT} />
            <Text style={th.statVal}>{count}</Text>
            <Text style={th.statLbl}>posts</Text>
          </View>

          <View style={th.statDivider} />

          <View style={th.statChip}>
            <Ionicons name="eye-outline" size={13} color={ACCENT} />
            <Text style={th.statVal}>{fmtViews(totalViews)}</Text>
            <Text style={th.statLbl}>views</Text>
          </View>

          <View style={th.statDivider} />

          <View style={th.statChip}>
            <Ionicons name="people-outline" size={13} color={ACCENT} />
            <Text style={th.statLbl}>community picks</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const th = StyleSheet.create({
  wrap: {
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 4,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
    overflow: "hidden",
  },
  dotGrid: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: "row", flexWrap: "wrap", gap: 22, padding: 10,
  },
  dot: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#fff" },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(19,194,150,0.18)",
    borderWidth: 1,
    borderColor: "rgba(19,194,150,0.35)",
    borderRadius: 99,
    paddingHorizontal: 11,
    paddingVertical: 4,
    marginBottom: 12,
  },
  badgeTxt: {
    fontSize: 10,
    fontWeight: "800",
    color: ACCENT,
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#fff",
    lineHeight: 32,
    marginBottom: 18,
    letterSpacing: -0.3,
  },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  statChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  statVal:  { fontSize: 13, fontWeight: "800", color: "#fff" },
  statLbl:  { fontSize: 11, color: "rgba(255,255,255,0.55)" },
  statDivider: { width: 1, height: 12, backgroundColor: "rgba(255,255,255,0.18)" },
});

// ─────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────

const TrendingOnHafrikScreen = () => {
  const feedsName = "trendingFeeds";
  const { token } = useAuth();
  const navigation = useNavigation();

  const clearFeedsList_store = useStore(state => state.clearFeedsList);
  const addFeedsToList_store = useStore(state => state.addFeedsToList);

  const ids = useStore(state => state.feeds.lists.trendingFeeds || []);
  const feedsById = useStore(state => state.feeds.feedsById || {});

  const trendingFeedsFromStore = useMemo(
    () => ids.map(id => feedsById[id]).filter(Boolean),
    [ids, feedsById]
  );

  const refreshSignal = useStore(state => state.refreshSignal);
  const [version, setVersion] = useState(0);

  const API_URL = AppDetails.apis.trendingApi;

  const extractFeedsArray = (response) => {
    const d = response?.data;

    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data)) return d.data;
    if (Array.isArray(d?.data?.data)) return d.data.data;

    return [];
  };

  const getFeeds = useCallback(async () => {
    try {
      const response = await GetFeedsController(API_URL, token, 1);
      const feedsArray = extractFeedsArray(response);

      if (response?.status === 200) {
        addFeedsToList_store(feedsName, feedsArray);
      } else {
        Alert.alert("Error", "Failed to fetch Trending Feeds.");
      }
    } catch (e) {
      Alert.alert("Error", "Failed to fetch Trending Feeds.");
    }
  }, [API_URL, token, addFeedsToList_store]);

  useEffect(() => {
    clearFeedsList_store(feedsName);
    getFeeds();
  }, []);

  useEffect(() => {
    clearFeedsList_store(feedsName);
    getFeeds();
    setVersion(v => v + 1);
  }, [refreshSignal]);

  const totalViews = useMemo(
    () => trendingFeedsFromStore.reduce((sum, f) => sum + (Number(f?.views) || 0), 0),
    [trendingFeedsFromStore]
  );

  const handlePostPress = useCallback((postId) => {
    navigation.navigate('PostDetail', { postId });
  }, [navigation]);

  const combinedData = useMemo(() => {
    const hero = {
      type: "renderComponent",
      renderComponent: () => (
        <TrendingHeader
          count={trendingFeedsFromStore.length}
          totalViews={totalViews}
        />
      ),
    };

    const mappedFeeds = trendingFeedsFromStore.map(feed => ({
      type: "feed",
      data: {
        ...feed,
        rankingLabel:
          Array.isArray(feed.ranking_reason) && feed.ranking_reason.length > 0
            ? feed.ranking_reason.join(" • ")
            : null,
      },
    }));

    return [hero, ...mappedFeeds];
  }, [trendingFeedsFromStore, totalViews]);

  return (
    <View style={styles.container}>
      <Feeds
        key={version}
        feedsName={feedsName}
        combinedData={combinedData}
        feeds={trendingFeedsFromStore}
        API_URL={API_URL}
        feedsController={GetFeedsController}
        onPostPress={handlePostPress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default TrendingOnHafrikScreen;