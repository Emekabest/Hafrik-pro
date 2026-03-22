import { StyleSheet, View, Alert, Text, Animated, FlatList, Image, TouchableOpacity } from "react-native";
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

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const WHITE  = Colors.white;
const MUTED  = Colors.secondaryText;
const DARK   = Colors.black;
const CARD   = Colors.white;

const FONT_B = AppDetails?.fontFamily?.redex?.bold    ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';
const FONT_M = AppDetails?.fontFamily?.inter?.medium  ?? 'System';

// Rank movement deltas for top-5 (positive = rising, negative = dropping)
const RANK_DELTAS = [2, -1, 0, 1, -2];

const MEDAL_COLORS = [
  ['#f59e0b', '#d97706', '#92400e'],  // #1 gold
  ['#9ca3af', '#6b7280', '#374151'],  // #2 silver
  ['#cd7c2f', '#a16207', '#7c4d14'],  // #3 bronze
  [BRAND, ACCENT, BRAND],             // #4
  [BRAND, ACCENT, BRAND],             // #5
];

const MEDAL_ICONS = ['🥇', '🥈', '🥉', null, null];

const fmtNum = (n) => {
  const v = Number(n || 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}k`;
  return String(v);
};

// ─────────────────────────────────────────────────────────────────────────────
// Rank Strip — premium rank badge before each top-5 post
// ─────────────────────────────────────────────────────────────────────────────
const RankStrip = memo(({ rank, delta }) => {
  const pulse   = useRef(new Animated.Value(1)).current;
  const slideIn = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,  { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideIn,  { toValue: 0, friction: 7, tension: 120, useNativeDriver: true }),
    ]).start();

    if (delta !== 0) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1,   duration: 600, useNativeDriver: true }),
          Animated.delay(3000),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [delta]);

  const up     = delta > 0;
  const stable = delta === 0;
  const colors = MEDAL_COLORS[rank - 1] || [BRAND, ACCENT, BRAND];
  const medal  = MEDAL_ICONS[rank - 1];

  return (
    <Animated.View style={[rs.wrap, { opacity, transform: [{ translateX: slideIn }] }]}>
      <LinearGradient colors={colors} style={rs.strip} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        {/* Rank number + medal */}
        <View style={rs.rankSection}>
          {medal ? (
            <Text style={rs.medal}>{medal}</Text>
          ) : (
            <View style={rs.numCircle}>
              <Text style={rs.numText}>{rank}</Text>
            </View>
          )}
          <View>
            <Text style={rs.trendingLabel}>#{rank} Trending</Text>
            <Text style={rs.trendingOnHafrik}>on Hafrik</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={rs.divider} />

        {/* Delta */}
        {stable ? (
          <View style={rs.deltaWrap}>
            <Text style={rs.stableText}>Holding</Text>
          </View>
        ) : (
          <Animated.View style={[rs.deltaWrap, { transform: [{ scale: pulse }] }]}>
            <View style={[rs.deltaChip, { backgroundColor: up ? '#22c55e22' : '#ef444422' }]}>
              <Ionicons name={up ? 'caret-up' : 'caret-down'} size={11} color={up ? '#4ade80' : '#f87171'} />
              <Text style={[rs.deltaText, { color: up ? '#4ade80' : '#f87171' }]}>
                {up ? `+${delta}` : delta}
              </Text>
            </View>
            <Text style={rs.deltaLabel}>{up ? 'Rising' : 'Dropping'}</Text>
          </Animated.View>
        )}

        {/* Fire pulse for top 3 */}
        {rank <= 3 && (
          <View style={rs.fireWrap}>
            <Text style={rs.fire}>🔥</Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
});

const rs = StyleSheet.create({
  wrap:  { marginHorizontal: 14, marginTop: 10, marginBottom: 2 },
  strip: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12,
    overflow: 'hidden',
  },
  rankSection: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  medal:       { fontSize: 22, lineHeight: 28 },
  numCircle:   {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: WHITE + '25', alignItems: 'center', justifyContent: 'center',
  },
  numText:         { fontSize: 15, fontWeight: '900', color: WHITE, fontFamily: FONT_B },
  trendingLabel:   { fontSize: 13, fontWeight: '900', color: WHITE, fontFamily: FONT_B },
  trendingOnHafrik:{ fontSize: 10, color: WHITE + 'AA', fontFamily: FONT_R },
  divider:         { width: 1, height: 28, backgroundColor: WHITE + '30', marginHorizontal: 4 },
  deltaWrap:       { alignItems: 'center', gap: 2 },
  deltaChip:       { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
  deltaText:       { fontSize: 11, fontWeight: '900', fontFamily: FONT_B },
  deltaLabel:      { fontSize: 9, color: WHITE + 'AA', fontFamily: FONT_R },
  stableText:      { fontSize: 11, color: WHITE + 'AA', fontFamily: FONT_R },
  fireWrap:        { marginLeft: 'auto' },
  fire:            { fontSize: 18 },
});

// ─────────────────────────────────────────────────────────────────────────────
// Trending Header (premium edge-to-edge)
// ─────────────────────────────────────────────────────────────────────────────
const TrendingHeader = ({ count, totalViews }) => {
  const opacity  = useRef(new Animated.Value(0)).current;
  const slideY   = useRef(new Animated.Value(16)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,   { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideY,    { toValue: 0, friction: 7,   tension: 120, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 7,   tension: 120, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY: slideY }, { scale: scaleAnim }] }}>
      <LinearGradient
        colors={[BRAND, ACCENT + 'DD', '#0f172a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={th.wrap}
      >
        {/* Decorative orbs */}
        <View style={th.orb1} />
        <View style={th.orb2} />
        <View style={th.orb3} />

        {/* Top badge row */}
        <View style={th.badgeRow}>
          <View style={th.badge}>
            <Text style={th.badgeEmoji}>🔥</Text>
            <Text style={th.badgeTxt}>TRENDING NOW</Text>
          </View>
          <View style={th.livePill}>
            <View style={th.liveDot} />
            <Text style={th.liveTxt}>LIVE</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={th.title}>What's Hot{'\n'}on Hafrik</Text>

        {/* Stats chips */}
        <View style={th.statsRow}>
          <View style={th.statChip}>
            <Ionicons name="flame" size={13} color='#fb923c' />
            <Text style={th.statVal}>{count}</Text>
            <Text style={th.statLbl}>posts</Text>
          </View>
          <View style={th.statDivider} />
          <View style={th.statChip}>
            <Ionicons name="eye" size={13} color={ACCENT} />
            <Text style={th.statVal}>{fmtNum(totalViews)}</Text>
            <Text style={th.statLbl}>views</Text>
          </View>
          <View style={th.statDivider} />
          <View style={th.statChip}>
            <Ionicons name="people" size={13} color='#a78bfa' />
            <Text style={th.statLbl}>Community picks</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const th = StyleSheet.create({
  wrap: {
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 26,
    overflow: 'hidden',
  },
  orb1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: WHITE + '06', top: -80, right: -60 },
  orb2: { position: 'absolute', width: 130, height: 130, borderRadius: 65,  backgroundColor: WHITE + '06', bottom: -40, left: -30 },
  orb3: { position: 'absolute', width: 80,  height: 80,  borderRadius: 40,  backgroundColor: ACCENT + '18', top: 20, right: 40 },

  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: WHITE + '16', borderRadius: 100,
    borderWidth: 1, borderColor: WHITE + '28',
    paddingHorizontal: 12, paddingVertical: 5,
  },
  badgeEmoji: { fontSize: 13 },
  badgeTxt:   { fontSize: 10, fontWeight: '800', color: WHITE, letterSpacing: 1.5, fontFamily: FONT_B },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#ef4444' + '22', borderRadius: 100,
    borderWidth: 1, borderColor: '#ef4444' + '55',
    paddingHorizontal: 10, paddingVertical: 5,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' },
  liveTxt: { fontSize: 9, fontWeight: '800', color: '#fca5a5', letterSpacing: 1.2, fontFamily: FONT_B },

  title: {
    fontSize: 30, fontWeight: '900', color: WHITE,
    lineHeight: 36, marginBottom: 20, letterSpacing: -0.5,
    fontFamily: FONT_B,
  },

  statsRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: WHITE + '10', borderRadius: 14, padding: 12 },
  statChip:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statVal:     { fontSize: 13, fontWeight: '900', color: WHITE, fontFamily: FONT_B },
  statLbl:     { fontSize: 11, color: WHITE + '90', fontFamily: FONT_R },
  statDivider: { width: 1, height: 14, backgroundColor: WHITE + '25' },
});

// ─────────────────────────────────────────────────────────────────────────────
// Most Active Users This Week (premium redesign)
// ─────────────────────────────────────────────────────────────────────────────
const ActiveUserChip = ({ user, rank }) => {
  const navigation = useNavigation();
  const name   = user.username ?? user.full_name ?? user.name ?? 'User';
  const avatar = user.avatar ?? user.user_picture ?? null;
  const posts  = user.posts_count ?? user.total_posts ?? 0;
  const isTop3 = rank < 3;

  return (
    <TouchableOpacity
      style={mau.chip}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('UserProfile', { userId: user.id ?? user.user_id })}
    >
      {/* Avatar with gradient ring for top 3 */}
      <View style={mau.avatarOuter}>
        {isTop3 && (
          <LinearGradient
            colors={rank === 0 ? ['#f59e0b', '#d97706'] : rank === 1 ? ['#9ca3af', '#6b7280'] : ['#cd7c2f', '#a16207']}
            style={mau.avatarRing}
          />
        )}
        <View style={[mau.avatarInner, isTop3 && mau.avatarInnerRinged]}>
          {avatar
            ? <Image source={{ uri: avatar }} style={mau.avatar} />
            : <LinearGradient colors={[BRAND, ACCENT]} style={[mau.avatar, mau.avatarFb]}>
                <Text style={mau.avatarTxt}>{name.slice(0, 1).toUpperCase()}</Text>
              </LinearGradient>
          }
        </View>
        <View style={mau.activeDot} />
        {isTop3 && (
          <View style={mau.rankBadge}>
            <Text style={mau.rankBadgeTxt}>{['🥇','🥈','🥉'][rank]}</Text>
          </View>
        )}
      </View>
      <Text style={mau.chipName} numberOfLines={1}>{name}</Text>
      {posts > 0 && (
        <View style={mau.chipSubWrap}>
          <Text style={mau.chipSub}>{fmtNum(posts)} posts</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const MostActiveUsers = ({ users }) => {
  if (!users || users.length === 0) return null;
  return (
    <View style={mau.wrap}>
      <LinearGradient colors={[BRAND + '08', ACCENT + '06']} style={mau.headerGrad}>
        <View style={mau.labelRow}>
          <View style={mau.labelAccent} />
          <Text style={mau.labelTxt}>MOST ACTIVE THIS WEEK</Text>
          <Text style={mau.fireLabel}>🔥</Text>
        </View>
      </LinearGradient>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={users.slice(0, 12)}
        keyExtractor={(u, i) => `mau-${u.id ?? u.user_id ?? i}`}
        renderItem={({ item, index }) => <ActiveUserChip user={item} rank={index} />}
        contentContainerStyle={{ paddingHorizontal: 14, gap: 14, paddingBottom: 16, paddingTop: 4 }}
      />
    </View>
  );
};

const mau = StyleSheet.create({
  wrap: {
    backgroundColor: CARD, marginHorizontal: 14, marginBottom: 6,
    borderRadius: 20, overflow: 'hidden',
    shadowColor: DARK, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 12, elevation: 4,
    borderWidth: 1, borderColor: BRAND + '10',
  },
  headerGrad: { paddingTop: 14, paddingBottom: 4 },
  labelRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, marginBottom: 4 },
  labelAccent: { width: 3, height: 14, borderRadius: 2, backgroundColor: ACCENT },
  labelTxt:    { flex: 1, fontSize: 11, fontWeight: '800', color: MUTED, letterSpacing: 1.4, fontFamily: FONT_B },
  fireLabel:   { fontSize: 14 },

  chip:        { alignItems: 'center', width: 76, gap: 5 },
  avatarOuter: { position: 'relative', width: 62, height: 62, alignItems: 'center', justifyContent: 'center' },
  avatarRing:  { position: 'absolute', width: 62, height: 62, borderRadius: 31 },
  avatarInner: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden' },
  avatarInnerRinged: { width: 54, height: 54, borderRadius: 27 },
  avatar:      { width: '100%', height: '100%', borderRadius: 99 },
  avatarFb:    { alignItems: 'center', justifyContent: 'center' },
  avatarTxt:   { color: WHITE, fontWeight: '900', fontSize: 22, fontFamily: FONT_B },
  activeDot:   {
    position: 'absolute', bottom: 1, right: 1,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: '#22c55e', borderWidth: 2, borderColor: WHITE,
  },
  rankBadge:   { position: 'absolute', top: -2, left: -2 },
  rankBadgeTxt:{ fontSize: 13 },
  chipName:    { fontSize: 11, fontWeight: '700', color: DARK, textAlign: 'center', maxWidth: 72, fontFamily: FONT_M },
  chipSubWrap: { backgroundColor: ACCENT + '12', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 },
  chipSub:     { fontSize: 9.5, color: ACCENT, textAlign: 'center', fontWeight: '700', fontFamily: FONT_B },
});

// ─────────────────────────────────────────────────────────────────────────────
// Normalize a feed item — ensures likes_count and reactions are always present
// ─────────────────────────────────────────────────────────────────────────────
const normalizeFeed = (feed) => {
  if (!feed) return feed;

  // Normalise the reactions object — API may return it under different keys
  const reactions = feed.reactions ?? feed.reaction_counts ?? feed.reactionCounts ?? null;

  const rawCount = feed.likes_count ?? feed.total_likes ?? feed.like_count ??
    reactions?.total ?? feed.total_reactions ??
    feed.reaction_count ?? feed.reactions_count ?? 0;

  return { ...feed, likes_count: Number(rawCount) || 0, reactions };
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
const TrendingOnHafrikScreen = () => {
  const feedsName = "trendingFeeds";
  const { token } = useAuth();
  const navigation = useNavigation();

  const clearFeedsList_store = useStore(state => state.clearFeedsList);
  const addFeedsToList_store = useStore(state => state.addFeedsToList);

  const ids        = useStore(state => state.feeds.lists.trendingFeeds || []);
  const feedsById  = useStore(state => state.feeds.feedsById || {});

  const trendingFeedsFromStore = useMemo(
    () => ids.map(id => feedsById[id]).filter(Boolean),
    [ids, feedsById]
  );

  const refreshSignal = useStore(state => state.refreshSignal);
  const [version, setVersion] = useState(0);

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

  const getFeeds = useCallback(async () => {
    try {
      const response = await GetFeedsController(API_URL, token, 1);
      const rawArray = Array.isArray(response?.data) ? response.data : [];
      // Normalize each feed so likes_count is always populated
      const normalized = rawArray.map(normalizeFeed);

      if (response?.status === 200) {
        addFeedsToList_store(feedsName, normalized);
      } else {
        Alert.alert("Error", "Failed to fetch Trending Feeds.");
      }
    } catch {
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
        <TrendingHeader count={trendingFeedsFromStore.length} totalViews={totalViews} />
      ),
    };

    // Interstitial pool
    const pool = [];
    if (adsList.length       > 0) pool.push({ type: 'ad',            data: adsList[0] });
    if (bizList.length       > 0) pool.push({ type: 'bizcard',       data: bizList });
    if (communityList.length > 0) pool.push({ type: 'communitycard', data: communityList });
    // Shuffle
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
      // Premium rank strip before each of the top-5 posts
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
  container: { flex: 1 },
});

export default TrendingOnHafrikScreen;
