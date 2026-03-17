// src/pages/earnings/PointsScreen.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useAuth } from '../../AuthContext';
import { Colors } from '../../theme';
import AppDetails from '../../helpers/appdetails';
import {
  getPointsBalance,
  getRemainingPoints,
  getPointsTransactions,
  getLeaderboard,
  getMyRank,
} from '../../api/pointsApi';

// ─── Design tokens ────────────────────────────────────────────────────────────
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const BG     = Colors.background ?? '#F7F8FA';
const CARD   = Colors.white;
const BORDER = Colors.borderSoft ?? Colors.border;
const TEXT_H = Colors.black;
const TEXT_M = Colors.secondaryText;
const WHITE  = Colors.white;
const ORANGE = Colors.warm ?? '#f4a535';
const GOLD   = Colors.star ?? '#ffd700';

const FONT_B = AppDetails?.fontFamily?.redex?.bold    ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';
const FONT_M = AppDetails?.fontFamily?.inter?.medium  ?? 'System';

const AVATAR_FALLBACK = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

const RANGE_TABS = [
  { key: 'today',    label: 'Today' },
  { key: 'week',     label: 'This Week' },
  { key: 'all_time', label: 'All Time' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtPoints = (n) => Number(n ?? 0).toFixed(3);

const fmtDate = (raw) => {
  const d = new Date(raw);
  if (isNaN(d)) return raw;
  const now = new Date();
  const diff = now - d;
  if (diff < 60_000)      return 'Just now';
  if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)  return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 172_800_000) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const txTypeLabel = (type) => {
  const map = {
    post_view:     'Post View',
    post_like:     'Liked a Post',
    post_comment:  'Comment',
    post_reaction: 'Reaction',
    referral:      'Referral Bonus',
    daily_login:   'Daily Login',
    reel_view:     'Reel View',
    share:         'Share',
    follow:        'Follow',
  };
  return map[type] ?? type?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? 'Activity';
};

const txTypeIcon = (type) => {
  const map = {
    post_view:     'eye-outline',
    post_like:     'heart-outline',
    post_comment:  'chatbubble-outline',
    post_reaction: 'happy-outline',
    referral:      'people-outline',
    daily_login:   'log-in-outline',
    reel_view:     'play-circle-outline',
    share:         'share-outline',
    follow:        'person-add-outline',
  };
  return map[type] ?? 'star-outline';
};

// ─── Rank medal helper ────────────────────────────────────────────────────────
const RankMedal = ({ rank }) => {
  if (rank === 1) return <Text style={ps.medal}>🥇</Text>;
  if (rank === 2) return <Text style={ps.medal}>🥈</Text>;
  if (rank === 3) return <Text style={ps.medal}>🥉</Text>;
  return <Text style={ps.rankNum}>#{rank}</Text>;
};

// ─────────────────────────────────────────────────────────────────────────────
export default function PointsScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const { token }  = useAuth();
  const insets     = useSafeAreaInsets();

  // ── Points balance & remaining ────────────────────────────────────────────
  const [points,    setPoints]    = useState(route.params?.points ?? null);
  const [remaining, setRemaining] = useState(null);
  const [balLoading, setBalLoading] = useState(true);

  // ── Leaderboard ────────────────────────────────────────────────────────────
  const [range,        setRange]        = useState('today');
  const [leaderboard,  setLeaderboard]  = useState([]);
  const [myRank,       setMyRank]       = useState(null);  // { rank, points }
  const [lbLoading,    setLbLoading]    = useState(false);

  // ── Transactions ───────────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState([]);
  const [txPage,       setTxPage]       = useState(1);
  const [txTotal,      setTxTotal]      = useState(0);
  const [txLoading,    setTxLoading]    = useState(false);
  const [txLoadMore,   setTxLoadMore]   = useState(false);

  // ── Refresh ────────────────────────────────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false);

  // ── Animations ────────────────────────────────────────────────────────────
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  // ── Fetch balance + remaining ─────────────────────────────────────────────
  const fetchBalance = useCallback(async () => {
    setBalLoading(true);
    try {
      const [balJson, remJson] = await Promise.all([
        getPointsBalance(token),
        getRemainingPoints(token),
      ]);
      if (balJson?.status === 'success') setPoints(balJson.data?.points ?? 0);
      if (remJson?.status === 'success') setRemaining(remJson.data?.remaining_points ?? 0);
    } catch { /* silent */ }
    setBalLoading(false);
  }, [token]);

  // ── Fetch leaderboard + my rank ───────────────────────────────────────────
  const fetchLeaderboard = useCallback(async (r) => {
    setLbLoading(true);

   try {

  const [lbJson, rankJson] = await Promise.all([
    getLeaderboard(token, r),
    getMyRank(token, r),
  ]);

  if (lbJson?.status === 'success') {
    setLeaderboard(lbJson.data?.leaderboard ?? []);
  }

  if (rankJson?.status === 'success') {
    setMyRank(rankJson.data ?? null);
  }

} catch (e) {
  console.log("Leaderboard error:", e);
}

    try {
      const rankJson = await getMyRank(token, r);

      if (rankJson?.status === 'success') {
        setMyRank(rankJson.data ?? null);
      }

    } catch (e) {
      console.log("Rank endpoint failed:", e);
    }

    setLbLoading(false);
  }, [token]);

  // ── Fetch transactions page 1 ─────────────────────────────────────────────
  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const json = await getPointsTransactions(token, 1, 20);
      const list  = json?.data?.transactions ?? [];
      const total = json?.data?.total ?? list.length;
      setTransactions(list);
      setTxTotal(total);
      setTxPage(1);
    } catch { /* silent */ }
    setTxLoading(false);
  }, [token]);

  // ── Load more transactions ─────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (txLoadMore || transactions.length >= txTotal) return;
    const next = txPage + 1;
    setTxLoadMore(true);
    try {
      const json = await getPointsTransactions(token, next, 20);
      const list  = json?.data?.transactions ?? [];
      setTransactions((prev) => [...prev, ...list]);
      setTxPage(next);
    } catch { /* silent */ }
    setTxLoadMore(false);
  }, [token, txPage, txTotal, transactions.length, txLoadMore]);

  // ── Initial load ───────────────────────────────────────────────────────────
 useEffect(() => {
  const init = async () => {

    // Load important data first
    await fetchBalance();
    await fetchLeaderboard('today');

    // Show screen animation immediately
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    // Load heavy data in background
    fetchTransactions();
  };

  init();
}, []);
  // ── Range tab change ───────────────────────────────────────────────────────
  const handleRangeChange = useCallback((r) => {
    setRange(r);
    fetchLeaderboard(r);
  }, [fetchLeaderboard]);

  // ── Pull-to-refresh ────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchBalance(), fetchLeaderboard(range), fetchTransactions()]);
    setRefreshing(false);
  }, [fetchBalance, fetchLeaderboard, fetchTransactions, range]);

  // ─────────────────────────────────────────────────────────────────────────
  // List header — everything above the transaction rows
  // ─────────────────────────────────────────────────────────────────────────
  const ListHeader = () => (
    <>
      {/* ── Hero card ── */}
      <Animated.View style={[ps.heroWrap, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient
          colors={[GOLD + 'EE', ORANGE, BRAND]}
          style={ps.heroGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={ps.heroCircle1} />
          <View style={ps.heroCircle2} />

          <Ionicons name="star" size={24} color={WHITE + 'CC'} style={{ marginBottom: 6 }} />
          <Text style={ps.heroLabel}>My Points</Text>

          {balLoading ? (
            <ActivityIndicator color={WHITE} size="large" style={{ marginVertical: 14 }} />
          ) : (
            <Text style={ps.heroPoints}>{fmtPoints(points)}</Text>
          )}

          {remaining !== null && !balLoading && (
            <View style={ps.remainingPill}>
              <Ionicons name="flash" size={12} color={GOLD} />
              <Text style={ps.remainingText}>
                You can still earn <Text style={ps.remainingBold}>{fmtPoints(remaining)} pts</Text> today
              </Text>
            </View>
          )}
        </LinearGradient>
      </Animated.View>

      {/* ── Leaderboard ── */}
      <View style={ps.sectionCard}>
        {/* Section title */}
        <View style={ps.sectionHeader}>
          <View style={ps.sectionIconWrap}>
            <Ionicons name="trophy" size={15} color={GOLD} />
          </View>
          <Text style={ps.sectionTitle}>Leaderboard</Text>
        </View>

        {/* Range tabs */}
        <View style={ps.tabRow}>
          {RANGE_TABS.map((tab) => {
            const active = range === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[ps.tab, active && ps.tabActive]}
                onPress={() => handleRangeChange(tab.key)}
                activeOpacity={0.8}
              >
                <Text style={[ps.tabText, active && ps.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* My rank banner */}
        {myRank && !lbLoading && (
          <View style={ps.myRankBanner}>
            <Ionicons name="person-circle-outline" size={18} color={ACCENT} />
            <Text style={ps.myRankText}>
              You are ranked{' '}
              <Text style={ps.myRankBold}>#{myRank.rank}</Text>
              {' '}({fmtPoints(myRank.points)} pts){' '}
              {range === 'today' ? 'today' : range === 'week' ? 'this week' : 'all time'}
            </Text>
          </View>
        )}

        {/* Leaderboard rows */}
        {lbLoading ? (
          <ActivityIndicator color={ACCENT} style={{ paddingVertical: 24 }} />
        ) : leaderboard.length === 0 ? (
          <View style={ps.emptyLb}>
            <Ionicons name="trophy-outline" size={30} color={BORDER} />
            <Text style={ps.emptyText}>No data yet</Text>
          </View>
        ) : (
          leaderboard.map((item, idx) => (
            <TouchableOpacity
              key={item.user?.id ?? idx}
              style={ps.lbRow}
              activeOpacity={0.75}
              onPress={() =>
                item.user?.id &&
                navigation.navigate('UserProfile', {
                  userId: item.user.id,
                  username: item.user.username ?? '',
                })
              }
            >
              {/* Rank */}
              <View style={ps.rankWrap}>
                <RankMedal rank={idx + 1} />
              </View>

              {/* Avatar */}
              <ExpoImage
                source={{ uri: item.user?.avatar ?? AVATAR_FALLBACK }}
                style={ps.lbAvatar}
                contentFit="cover"
              />

              {/* Name */}
              <View style={ps.lbMid}>
                <View style={ps.lbNameRow}>
                  <Text style={ps.lbUsername} numberOfLines={1}>{item.user?.username ?? 'User'}</Text>
                  {!!item.user?.verified && (
                    <Ionicons name="checkmark-circle" size={13} color={ACCENT} style={{ marginLeft: 4 }} />
                  )}
                </View>
              </View>

              {/* Points */}
              <Text style={[ps.lbPoints, idx === 0 && { color: GOLD }]}>
                {fmtPoints(item.points)} pts
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* ── Points History header ── */}
      <View style={ps.historyHeader}>
        <View style={ps.sectionIconWrap}>
          <Ionicons name="time" size={15} color={ACCENT} />
        </View>
        <Text style={ps.sectionTitle}>Points History</Text>
      </View>
    </>
  );

  // ── Transaction row ────────────────────────────────────────────────────────
  const renderTxItem = ({ item }) => (
    <TouchableOpacity
      style={ps.txRow}
      activeOpacity={0.75}
      onPress={() =>
        item.post?.id &&
        navigation.navigate('PostDetail', { postId: item.post.id })
      }
    >
      <View style={[ps.txIconWrap, { backgroundColor: ACCENT + '15' }]}>
        <Ionicons name={txTypeIcon(item.type)} size={17} color={ACCENT} />
      </View>
      <View style={ps.txMid}>
        <Text style={ps.txType}>{txTypeLabel(item.type)}</Text>
        {!!item.post?.text && (
          <Text style={ps.txPost} numberOfLines={1}>{item.post.text}</Text>
        )}
        <Text style={ps.txTime}>{fmtDate(item.time)}</Text>
      </View>
      <View style={ps.txRight}>
        <Text style={ps.txPoints}>+{fmtPoints(item.points)}</Text>
        <Text style={ps.txPts}>pts</Text>
      </View>
    </TouchableOpacity>
  );

  const ListFooter = () => (
    <>
      {txLoading && (
        <ActivityIndicator color={ACCENT} style={{ paddingVertical: 24 }} />
      )}
      {txLoadMore && (
        <ActivityIndicator color={ACCENT} style={{ paddingVertical: 16 }} />
      )}
      {!txLoading && transactions.length === 0 && (
        <View style={ps.emptyTx}>
          <Ionicons name="receipt-outline" size={34} color={BORDER} />
          <Text style={ps.emptyText}>No points activity yet</Text>
          <Text style={ps.emptySubText}>Like, comment and share posts to earn points</Text>
        </View>
      )}
    </>
  );



  return (
    // <View style={[ps.root, { paddingTop: insets.top }]}>
    //   {/* Top bar */}
    //   <View style={ps.topBar}>
    //     <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.85} style={ps.backBtn}>
    //       <Ionicons name="arrow-back" size={20} color={WHITE} />
    //     </TouchableOpacity>
    //     <Text style={ps.topTitle}>Hafrik Points</Text>
    //     <View style={{ width: 38 }} />
    //   </View>

    //   <FlatList
    //     style={ps.list}
    //     contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
    //     showsVerticalScrollIndicator={false}
    //     data={transactions}
    //     keyExtractor={(item) => String(item.log_id)}
    //     renderItem={renderTxItem}
    //     ListHeaderComponent={<ListHeader />}
    //     ListFooterComponent={<ListFooter />}
    //     onEndReached={loadMore}
    //     onEndReachedThreshold={0.4}
    //     refreshControl={
    //       <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={WHITE} />
    //     }
    //   />
    // </View>
    <View style={[ps.root, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{color:"#fff"}}>Coming Soon</Text>
        <Ionicons name="star" size={48} color="#fff" />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ps = StyleSheet.create({
  root: { flex: 1, backgroundColor: BRAND },

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 14,
    backgroundColor: WHITE + '1A', alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { fontSize: 17, fontWeight: '900', color: WHITE, fontFamily: FONT_B },
  list: { flex: 1, backgroundColor: BG, borderTopLeftRadius: 26, borderTopRightRadius: 26 },

  // Hero
  heroWrap: { marginHorizontal: 16, marginTop: 20 },
  heroGrad: { borderRadius: 24, padding: 24, alignItems: 'center', overflow: 'hidden' },
  heroCircle1: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: WHITE + '08', top: -60, right: -40,
  },
  heroCircle2: {
    position: 'absolute', width: 110, height: 110, borderRadius: 55,
    backgroundColor: WHITE + '08', bottom: -30, left: -20,
  },
  heroLabel:  { fontSize: 12, color: WHITE + 'CC', fontWeight: '600', fontFamily: FONT_R, letterSpacing: 1, textTransform: 'uppercase' },
  heroPoints: { fontSize: 54, fontWeight: '900', color: WHITE, fontFamily: FONT_B, letterSpacing: -2, marginTop: 4 },

  remainingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: WHITE + '18', borderRadius: 100,
    paddingHorizontal: 14, paddingVertical: 8, marginTop: 16,
  },
  remainingText: { fontSize: 12, color: WHITE + 'CC', fontFamily: FONT_R },
  remainingBold: { color: WHITE, fontWeight: '800', fontFamily: FONT_B },

  // Section card
  sectionCard: {
    marginHorizontal: 16, marginTop: 20,
    backgroundColor: CARD, borderRadius: 20,
    paddingTop: 18, paddingBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, marginBottom: 14,
  },
  sectionIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: GOLD + '22', alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B },

  // Range tabs
  tabRow: {
    flexDirection: 'row', gap: 6,
    paddingHorizontal: 18, marginBottom: 12,
  },
  tab: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 100, backgroundColor: BG,
  },
  tabActive:     { backgroundColor: BRAND },
  tabText:       { fontSize: 12, fontWeight: '700', color: TEXT_M, fontFamily: FONT_M },
  tabTextActive: { color: WHITE },

  // My rank banner
  myRankBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: ACCENT + '0F', borderRadius: 12,
    marginHorizontal: 18, marginBottom: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  myRankText: { flex: 1, fontSize: 12.5, color: TEXT_M, fontFamily: FONT_R },
  myRankBold: { color: BRAND, fontWeight: '800', fontFamily: FONT_B },

  // Leaderboard rows
  lbRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 18,
    borderTopWidth: 1, borderTopColor: BORDER + '55',
  },
  rankWrap: { width: 32, alignItems: 'center' },
  medal:   { fontSize: 20 },
  rankNum: { fontSize: 13, fontWeight: '800', color: TEXT_M, fontFamily: FONT_B },
  lbAvatar: { width: 38, height: 38, borderRadius: 19 },
  lbMid:    { flex: 1 },
  lbNameRow:{ flexDirection: 'row', alignItems: 'center' },
  lbUsername: { fontSize: 13.5, fontWeight: '700', color: TEXT_H, fontFamily: FONT_B },
  lbPoints:  { fontSize: 13, fontWeight: '800', color: ACCENT, fontFamily: FONT_B },

  emptyLb: { alignItems: 'center', paddingVertical: 30, gap: 8 },

  // History header
  historyHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, marginTop: 24, marginBottom: 4,
  },

  // Transaction rows
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: CARD,
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: BORDER + '55',
  },
  txIconWrap: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  txMid:  { flex: 1 },
  txType: { fontSize: 13.5, fontWeight: '700', color: TEXT_H, fontFamily: FONT_B },
  txPost: { fontSize: 12, color: TEXT_M, marginTop: 2, fontFamily: FONT_R },
  txTime: { fontSize: 11, color: TEXT_M, marginTop: 3, fontFamily: FONT_R },
  txRight: { alignItems: 'flex-end' },
  txPoints: { fontSize: 14, fontWeight: '900', color: ACCENT, fontFamily: FONT_B },
  txPts:    { fontSize: 10, color: TEXT_M, fontFamily: FONT_R, marginTop: 1 },

  emptyTx: { alignItems: 'center', paddingVertical: 40, gap: 8, paddingHorizontal: 24 },
  emptyText:    { fontSize: 14, color: TEXT_M, fontWeight: '600', fontFamily: FONT_M },
  emptySubText: { fontSize: 12, color: TEXT_M, textAlign: 'center', fontFamily: FONT_R, lineHeight: 18 },
});
