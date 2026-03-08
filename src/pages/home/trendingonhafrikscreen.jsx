import { StyleSheet, View, Alert, Text, Animated, Dimensions, FlatList, Image, TouchableOpacity } from "react-native";
import { useAuth } from "../../AuthContext";
import { useEffect, useMemo, useState, useCallback, useRef, memo } from "react";
import React from "react";
import { useNavigation } from "@react-navigation/native";
import Feeds from "./feeds/feeds";
import GetFeedsController from "../../controllers/getfeedscontroller";
import useStore from "../../repository/store.js";
import AppDetails from "../../helpers/appdetails.js";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../theme";

const { width: SCREEN_W } = Dimensions.get("window");
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const WHITE  = Colors.white;
const MUTED  = Colors.secondaryText;
const DARK   = Colors.black;
const CARD   = Colors.white;

// Hardcoded rank movement deltas for top-5 trending (positive=rising, negative=dropping)
const RANK_DELTAS = [2, -1, 0, 1, -2];

// ─────────────────────────────────────────────────────
// Rank Strip — compact rank badge injected before each top-5 feed
// ─────────────────────────────────────────────────────
const RankStrip = memo(({ rank, delta }) => {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (delta === 0) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.4, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 500, useNativeDriver: true }),
        Animated.delay(2500),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [delta]);

  const up     = delta > 0;
  const stable = delta === 0;

  return (
    <View style={rs.strip}>
      <Text style={[rs.rankNum, rank === 1 && rs.gold]}>{rank}</Text>
      <View style={rs.divider} />
      <Text style={rs.rankLabel}>#{rank} Trending</Text>
      <View style={{ flex: 1 }} />
      {stable ? (
        <Text style={rs.stableText}>—</Text>
      ) : (
        <Animated.View style={[rs.deltaWrap, { transform: [{ scale: pulse }] }]}>
          <Ionicons
            name={up ? 'caret-up' : 'caret-down'}
            size={10}
            color={up ? '#22c55e' : '#ef4444'}
          />
          <Text style={[rs.deltaText, { color: up ? '#22c55e' : '#ef4444' }]}>
            {up ? '+' : ''}{delta}
          </Text>
        </Animated.View>
      )}
    </View>
  );
});

const rs = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 2,
  },
  rankNum:    { fontSize: 20, fontWeight: '900', color: BRAND, lineHeight: 24, width: 24, textAlign: 'center' },
  gold:       { color: '#f59e0b' },
  divider:    { width: 1, height: 16, backgroundColor: BRAND + '30' },
  rankLabel:  { fontSize: 11, fontWeight: '700', color: BRAND + 'A0' },
  deltaWrap:  { flexDirection: 'row', alignItems: 'center', gap: 2 },
  deltaText:  { fontSize: 10, fontWeight: '800' },
  stableText: { fontSize: 12, fontWeight: '700', color: BRAND + '60' },
});

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
        colors={[BRAND, ACCENT + "CC", BRAND + "F0"]}
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
  dot: { width: 38, height: 38, borderRadius: 19, backgroundColor: WHITE },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: ACCENT + "2E",
    borderWidth: 1,
    borderColor: ACCENT + "59",
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
    color: WHITE,
    lineHeight: 32,
    marginBottom: 18,
    letterSpacing: -0.3,
  },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  statChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  statVal:  { fontSize: 13, fontWeight: "800", color: WHITE },
  statLbl:  { fontSize: 11, color: WHITE + "8C" },
  statDivider: { width: 1, height: 12, backgroundColor: WHITE + "2E" },
});

// ─────────────────────────────────────────────────────
// Most Active Users This Week
// ─────────────────────────────────────────────────────

const ActiveUserChip = ({ user }) => {
  const navigation = useNavigation();
  const name   = user.username ?? user.full_name ?? user.name ?? 'User';
  const avatar = user.avatar ?? user.user_picture ?? null;
  const posts  = user.posts_count ?? user.total_posts ?? 0;
  const fmtN   = (n) => { const v = Number(n || 0); return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v); };
  return (
    <TouchableOpacity
      style={mau.chip}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('UserProfile', { userId: user.id ?? user.user_id })}
    >
      <View style={mau.avatarWrap}>
        {avatar
          ? <Image source={{ uri: avatar }} style={mau.avatar} />
          : <View style={[mau.avatar, mau.avatarFb]}><Text style={mau.avatarTxt}>{name.slice(0, 1).toUpperCase()}</Text></View>
        }
        <View style={mau.activeDot} />
      </View>
      <Text style={mau.chipName} numberOfLines={1}>{name}</Text>
      {posts > 0 && <Text style={mau.chipSub}>{fmtN(posts)} posts</Text>}
    </TouchableOpacity>
  );
};

const MostActiveUsers = ({ users }) => {
  if (!users || users.length === 0) return null;
  return (
    <View style={mau.wrap}>
      <View style={mau.labelRow}>
        <View style={mau.labelAccent} />
        <Text style={mau.labelTxt}>MOST ACTIVE THIS WEEK</Text>
        <Ionicons name="flame" size={13} color={ACCENT} />
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={users.slice(0, 12)}
        keyExtractor={(u, i) => `mau-${u.id ?? u.user_id ?? i}`}
        renderItem={({ item }) => <ActiveUserChip user={item} />}
        contentContainerStyle={{ paddingHorizontal: 14, gap: 12, paddingBottom: 14 }}
      />
    </View>
  );
};

const mau = StyleSheet.create({
  wrap:        { backgroundColor: CARD, marginHorizontal: 14, marginBottom: 4, borderRadius: 18, borderWidth: 1, borderColor: BRAND + '12', paddingTop: 12, overflow: 'hidden', shadowColor: DARK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  labelRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, marginBottom: 10 },
  labelAccent: { width: 3, height: 14, borderRadius: 2, backgroundColor: ACCENT },
  labelTxt:    { flex: 1, fontSize: 11, fontWeight: '800', color: MUTED, letterSpacing: 1.4 },
  chip:        { alignItems: 'center', width: 76, gap: 4 },
  avatarWrap:  { position: 'relative' },
  avatar:      { width: 54, height: 54, borderRadius: 27 },
  avatarFb:    { backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:   { color: WHITE, fontWeight: '900', fontSize: 20 },
  activeDot:   { position: 'absolute', bottom: 1, right: 1, width: 13, height: 13, borderRadius: 7, backgroundColor: ACCENT, borderWidth: 2, borderColor: WHITE },
  chipName:    { fontSize: 11, fontWeight: '700', color: DARK, textAlign: 'center', maxWidth: 70 },
  chipSub:     { fontSize: 10, color: MUTED, textAlign: 'center' },
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

  // ── Interstitial data ────────────────────────────────────────────────────
  const [adsList,       setAdsList]       = useState([]);
  const [peopleList,    setPeopleList]    = useState([]);
  const [bizList,       setBizList]       = useState([]);
  const [communityList, setCommunityList] = useState([]);

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    fetch('https://hafrik.com/api/v1/ads/list.php', { headers })
      .then(r => r.json())
      .then(d => {
        const raw = d?.data;
        setAdsList(Array.isArray(raw) ? raw : (raw?.id ? [raw] : []));
      })
      .catch(() => {});

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

    // Build interstitial pool (people moved to dedicated section above)
    const pool = [];
    if (adsList.length       > 0) pool.push({ type: 'ad',            data: adsList[0] });
    if (bizList.length       > 0) pool.push({ type: 'bizcard',       data: bizList });
    if (communityList.length > 0) pool.push({ type: 'communitycard', data: communityList });
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const MAX_INTERSTITIALS = 2;
    const FIRST_AT          = 5;
    const STEP              = 8;
    let poolIdx    = 0;
    let nextInsert = FIRST_AT;

    const feedItems = [];
    trendingFeedsFromStore.forEach((feed, i) => {
      // Inject rank strip before each of the top-5 posts
      if (i < RANK_DELTAS.length) {
        const rank  = i + 1;
        const delta = RANK_DELTAS[i];
        feedItems.push({
          type: 'renderComponent',
          renderComponent: () => <RankStrip rank={rank} delta={delta} />,
        });
      }

      feedItems.push({
        type: "feed",
        data: {
          ...feed,
          rankingLabel:
            Array.isArray(feed.ranking_reason) && feed.ranking_reason.length > 0
              ? feed.ranking_reason.join(" • ")
              : null,
        },
      });

      if ((i + 1) === nextInsert && poolIdx < pool.length && poolIdx < MAX_INTERSTITIALS) {
        feedItems.push(pool[poolIdx++]);
        nextInsert += STEP;
      }
    });

    const mostActiveItem = peopleList.length > 0
      ? { type: 'renderComponent', renderComponent: () => <MostActiveUsers users={peopleList} /> }
      : null;

    return [hero, ...(mostActiveItem ? [mostActiveItem] : []), ...feedItems];
  }, [trendingFeedsFromStore, totalViews, adsList, peopleList, bizList, communityList]);

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