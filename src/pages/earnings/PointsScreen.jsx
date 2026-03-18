// src/pages/earnings/PointsScreen.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Animated,
  Modal, ScrollView, Dimensions, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useAuth } from '../../AuthContext';
import { Colors } from '../../theme';
import AppDetails from '../../helpers/appdetails';
import {
  getPointsBalance,
  getRemainingPoints,
  getPointsTransactions,
} from '../../api/pointsApi';

const { height: SCREEN_H } = Dimensions.get('window');

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
const GREEN  = Colors.success ?? '#22c55e';

const FONT_B = AppDetails?.fontFamily?.redex?.bold    ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';
const FONT_M = AppDetails?.fontFamily?.inter?.medium  ?? 'System';

const DAILY_LIMIT = 10_000;

const fmtPoints = (n) => Number(n ?? 0).toFixed(3);
const fmtNum    = (n) => Number(n ?? 0).toLocaleString();
const fmtMoney  = (n) => `¥${(Number(n ?? 0) / 1000).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (raw) => {
  const d = new Date(raw);
  if (isNaN(d)) return raw;
  const diff = Date.now() - d;
  if (diff < 60_000)      return 'Just now';
  if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)  return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 172_800_000) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const txTypeLabel = (type) => {
  const map = {
    post_view: 'Post View', post_like: 'Liked a Post',
    post_comment: 'Comment', post_reaction: 'Reaction',
    referral: 'Referral Bonus', daily_login: 'Daily Login',
    reel_view: 'Reel View', share: 'Share', follow: 'Follow',
  };
  return map[type] ?? type?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? 'Activity';
};

const txTypeIcon = (type) => {
  const map = {
    post_view: 'eye-outline', post_like: 'heart-outline',
    post_comment: 'chatbubble-outline', post_reaction: 'happy-outline',
    referral: 'people-outline', daily_login: 'log-in-outline',
    reel_view: 'play-circle-outline', share: 'share-outline', follow: 'person-add-outline',
  };
  return map[type] ?? 'star-outline';
};

// ─── Points Info Modal ────────────────────────────────────────────────────────
const INFO_SECTIONS = [
  {
    icon: 'information-circle',
    iconColor: ACCENT,
    title: 'Overview',
    body: 'Points are rewards you earn for engaging on Hafrik. The more active you are, the more points you collect.',
  },
  {
    icon: 'cash',
    iconColor: GREEN,
    title: 'Conversion Rate',
    body: '1,000 points = ¥1.00\n\nYou can convert your accumulated points to real money in your wallet.',
    highlight: '1,000 pts = ¥1.00',
  },
  {
    icon: 'flash',
    iconColor: GOLD,
    title: 'Ways to Earn',
    list: [
      { action: 'Create a post',       pts: '+5 pts' },
      { action: 'Get a comment',       pts: '+5 pts' },
      { action: 'Comment on a post',   pts: '+5 pts' },
      { action: 'React to a post',     pts: '+5 pts' },
      { action: 'Post view',           pts: '+0.001 pts' },
      { action: 'Gain a follower',     pts: '+5 pts' },
    ],
  },
  {
    icon: 'today',
    iconColor: ORANGE,
    title: 'Daily Limit',
    body: 'You can earn up to 10,000 points per day. This keeps the system fair for everyone.',
    highlight: '10,000 pts / day',
  },
  {
    icon: 'refresh-circle',
    iconColor: '#a78bfa',
    title: 'Daily Reset',
    body: 'Your daily limit resets 24 hours after your last earning action.',
  },
  {
    icon: 'wallet',
    iconColor: GREEN,
    title: 'Withdraw & Wallet',
    body: 'You can convert points to money and transfer the balance to your Hafrik wallet at any time.',
  },
];

const PointsInfoModal = ({ visible, onClose }) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 280, useNativeDriver: true }).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={im.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <Animated.View style={[im.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Handle */}
          <View style={im.handle} />

          {/* Header */}
          <View style={im.header}>
            <LinearGradient colors={[GOLD + 'EE', ORANGE]} style={im.headerIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="star" size={18} color={WHITE} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={im.headerTitle}>How Points Work</Text>
              <Text style={im.headerSub}>Everything you need to know about Hafrik Points</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={22} color={TEXT_M} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
            {INFO_SECTIONS.map((sec, i) => (
              <View key={i} style={im.section}>
                <View style={im.secRow}>
                  <View style={[im.secIcon, { backgroundColor: sec.iconColor + '18' }]}>
                    <Ionicons name={sec.icon} size={17} color={sec.iconColor} />
                  </View>
                  <Text style={im.secTitle}>{sec.title}</Text>
                </View>

                {sec.highlight && (
                  <View style={[im.highlight, { borderLeftColor: sec.iconColor }]}>
                    <Text style={[im.highlightTxt, { color: sec.iconColor }]}>{sec.highlight}</Text>
                  </View>
                )}

                {sec.body && <Text style={im.secBody}>{sec.body}</Text>}

                {sec.list && (
                  <View style={im.earnList}>
                    {sec.list.map((row, j) => (
                      <View key={j} style={im.earnRow}>
                        <View style={im.earnDot} />
                        <Text style={im.earnAction}>{row.action}</Text>
                        <View style={im.earnPtsBadge}>
                          <Text style={im.earnPts}>{row.pts}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {i < INFO_SECTIONS.length - 1 && <View style={im.divider} />}
              </View>
            ))}

            {/* Microcopy */}
            <View style={im.microcopy}>
              <Ionicons name="shield-checkmark-outline" size={14} color={GREEN} />
              <Text style={im.microcopyTxt}>
                Points are tracked in real-time and updated instantly after valid actions.
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const im = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: CARD, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: SCREEN_H * 0.78, paddingHorizontal: 20, paddingTop: 12,
  },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  headerIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B },
  headerSub:   { fontSize: 11.5, color: TEXT_M, fontFamily: FONT_R, marginTop: 2 },
  section:     { paddingVertical: 4 },
  secRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  secIcon:     { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  secTitle:    { fontSize: 14, fontWeight: '800', color: TEXT_H, fontFamily: FONT_B },
  secBody:     { fontSize: 13, color: TEXT_M, lineHeight: 20, fontFamily: FONT_R, paddingLeft: 42 },
  highlight: {
    borderLeftWidth: 3, borderRadius: 4,
    backgroundColor: BG, marginLeft: 42, marginBottom: 6,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  highlightTxt: { fontSize: 15, fontWeight: '900', fontFamily: FONT_B },
  earnList:    { paddingLeft: 42, gap: 8 },
  earnRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  earnDot:     { width: 5, height: 5, borderRadius: 3, backgroundColor: GOLD },
  earnAction:  { flex: 1, fontSize: 13, color: TEXT_H, fontFamily: FONT_R },
  earnPtsBadge:{ backgroundColor: GOLD + '22', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
  earnPts:     { fontSize: 11, fontWeight: '800', color: ORANGE, fontFamily: FONT_B },
  divider:     { height: 1, backgroundColor: BORDER + '55', marginVertical: 14, marginLeft: 42 },
  microcopy: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: GREEN + '0E', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginTop: 8,
  },
  microcopyTxt: { flex: 1, fontSize: 12, color: TEXT_M, lineHeight: 18, fontFamily: FONT_R },
});

// ─────────────────────────────────────────────────────────────────────────────
export default function PointsScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const { token }  = useAuth();
  const insets     = useSafeAreaInsets();

  const [points,     setPoints]     = useState(route.params?.points ?? null);
  const [remaining,  setRemaining]  = useState(null);
  const [balLoading, setBalLoading] = useState(true);
  const [infoOpen,   setInfoOpen]   = useState(false);

  const [transactions, setTransactions] = useState([]);
  const [txPage,       setTxPage]       = useState(1);
  const [txTotal,      setTxTotal]      = useState(0);
  const [txLoading,    setTxLoading]    = useState(false);
  const [txLoadMore,   setTxLoadMore]   = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

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

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const json = await getPointsTransactions(token, 1, 20);
      const list  = json?.data?.transactions ?? [];
      setTransactions(list);
      setTxTotal(json?.data?.total ?? list.length);
      setTxPage(1);
    } catch { /* silent */ }
    setTxLoading(false);
  }, [token]);

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

  useEffect(() => {
    const init = async () => {
      await fetchBalance();
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 6,   useNativeDriver: true }),
      ]).start();
      fetchTransactions();
    };
    init();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchBalance(), fetchTransactions()]);
    setRefreshing(false);
  }, [fetchBalance, fetchTransactions]);

  // Daily progress: how much used today = DAILY_LIMIT - remaining
  const usedToday    = remaining !== null ? Math.max(0, DAILY_LIMIT - Number(remaining)) : 0;
  const progressPct  = Math.min(usedToday / DAILY_LIMIT, 1);
  const moneyEquiv   = (Number(points ?? 0) / 1000).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

          <Ionicons name="star" size={22} color={WHITE + 'CC'} style={{ marginBottom: 4 }} />
          <Text style={ps.heroLabel}>Total Points</Text>

          {balLoading ? (
            <ActivityIndicator color={WHITE} size="large" style={{ marginVertical: 14 }} />
          ) : (
            <Text style={ps.heroPoints}>{fmtNum(Math.floor(Number(points ?? 0)))}</Text>
          )}

          {/* Summary chips row */}
          {!balLoading && (
            <View style={ps.summaryRow}>
              <View style={ps.summaryChip}>
                <Ionicons name="cash-outline" size={12} color={GOLD} />
                <Text style={ps.summaryVal}>¥{moneyEquiv}</Text>
                <Text style={ps.summaryLbl}>Money Value</Text>
              </View>
              <View style={ps.summaryDivider} />
              <View style={ps.summaryChip}>
                <Ionicons name="flash-outline" size={12} color={GOLD} />
                <Text style={ps.summaryVal}>{remaining !== null ? fmtNum(Math.floor(Number(remaining))) : '—'}</Text>
                <Text style={ps.summaryLbl}>Daily Left</Text>
              </View>
              <View style={ps.summaryDivider} />
              <View style={ps.summaryChip}>
                <Ionicons name="today-outline" size={12} color={GOLD} />
                <Text style={ps.summaryVal}>{fmtNum(DAILY_LIMIT)}</Text>
                <Text style={ps.summaryLbl}>Daily Limit</Text>
              </View>
            </View>
          )}
        </LinearGradient>
      </Animated.View>

      {/* ── Daily Progress ── */}
      {!balLoading && remaining !== null && (
        <View style={ps.progressCard}>
          <View style={ps.progressHeader}>
            <View style={ps.progressLabelWrap}>
              <Ionicons name="trending-up-outline" size={14} color={ORANGE} />
              <Text style={ps.progressTitle}>Today's Progress</Text>
            </View>
            <Text style={ps.progressCount}>{fmtNum(usedToday)} / {fmtNum(DAILY_LIMIT)}</Text>
          </View>
          <View style={ps.progressTrack}>
            <Animated.View
              style={[
                ps.progressFill,
                { width: `${Math.round(progressPct * 100)}%` },
                progressPct >= 0.9 && { backgroundColor: '#ef4444' },
              ]}
            />
          </View>
          <Text style={ps.progressSub}>
            {progressPct >= 1
              ? 'Daily limit reached — resets in 24h after last action'
              : `${fmtNum(Math.floor(Number(remaining)))} points remaining today`}
          </Text>
        </View>
      )}

      {/* ── Balance boxes ── */}
      {!balLoading && (
        <View style={ps.balanceRow}>
          <View style={[ps.balBox, { backgroundColor: GOLD + '14' }]}>
            <Ionicons name="star" size={16} color={ORANGE} />
            <Text style={[ps.balValue, { color: ORANGE }]}>{fmtPoints(points)}</Text>
            <Text style={ps.balLabel}>Points Balance</Text>
          </View>
          <View style={[ps.balBox, { backgroundColor: GREEN + '12' }]}>
            <Ionicons name="cash" size={16} color={GREEN} />
            <Text style={[ps.balValue, { color: GREEN }]}>¥{moneyEquiv}</Text>
            <Text style={ps.balLabel}>Money Equivalent</Text>
          </View>
        </View>
      )}

      {/* ── How You Earn Points ── */}
      <View style={ps.earnCard}>
        <View style={ps.earnCardHeader}>
          <View style={ps.earnHeaderLeft}>
            <View style={ps.earnIconWrap}>
              <Ionicons name="flash" size={14} color={ORANGE} />
            </View>
            <Text style={ps.earnCardTitle}>How You Earn Points</Text>
          </View>
        </View>
        <View style={ps.earnGrid}>
          {[
            { icon: 'create-outline',      label: 'Create post',    pts: '+5' },
            { icon: 'chatbubble-outline',   label: 'Get a comment',  pts: '+5' },
            { icon: 'chatbubble-ellipses-outline', label: 'Comment',pts: '+5' },
            { icon: 'happy-outline',        label: 'React',          pts: '+5' },
            { icon: 'eye-outline',          label: 'Post view',      pts: '+0.001' },
            { icon: 'person-add-outline',   label: 'Gain follower',  pts: '+5' },
          ].map((item, i) => (
            <View key={i} style={ps.earnItem}>
              <View style={ps.earnItemIcon}>
                <Ionicons name={item.icon} size={15} color={ACCENT} />
              </View>
              <Text style={ps.earnItemLabel}>{item.label}</Text>
              <View style={ps.earnPtsBadge}>
                <Text style={ps.earnPts}>{item.pts}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* ── Points History header ── */}
      <View style={ps.historyHeader}>
        <View style={ps.sectionIconWrap}>
          <Ionicons name="time" size={14} color={ACCENT} />
        </View>
        <Text style={ps.sectionTitle}>Points History</Text>
      </View>
    </>
  );

  const renderTxItem = ({ item }) => (
    <TouchableOpacity
      style={ps.txRow}
      activeOpacity={0.75}
      onPress={() => item.post?.id && navigation.navigate('PostDetail', { postId: item.post.id })}
    >
      <View style={[ps.txIconWrap, { backgroundColor: ACCENT + '15' }]}>
        <Ionicons name={txTypeIcon(item.type)} size={17} color={ACCENT} />
      </View>
      <View style={ps.txMid}>
        <Text style={ps.txType}>{txTypeLabel(item.type)}</Text>
        {!!item.post?.text && <Text style={ps.txPost} numberOfLines={1}>{item.post.text}</Text>}
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
      {(txLoading || txLoadMore) && <ActivityIndicator color={ACCENT} style={{ paddingVertical: 20 }} />}
      {!txLoading && transactions.length === 0 && (
        <View style={ps.emptyTx}>
          <Ionicons name="receipt-outline" size={34} color={BORDER} />
          <Text style={ps.emptyText}>No points activity yet</Text>
          <Text style={ps.emptySubText}>Like, comment and share posts to earn points</Text>
        </View>
      )}
      {/* Microcopy trust signal */}
      {transactions.length > 0 && (
        <View style={ps.trustRow}>
          <Ionicons name="shield-checkmark-outline" size={13} color={GREEN} />
          <Text style={ps.trustTxt}>Points are tracked in real-time and updated instantly after valid actions.</Text>
        </View>
      )}
    </>
  );

  return (
    <View style={[ps.root, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={ps.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.85} style={ps.backBtn}>
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </TouchableOpacity>
        <Text style={ps.topTitle}>Hafrik Points</Text>
        <TouchableOpacity onPress={() => setInfoOpen(true)} style={ps.infoBtn} activeOpacity={0.8}>
          <Ionicons name="information-circle-outline" size={22} color={WHITE} />
        </TouchableOpacity>
      </View>

      <FlatList
        style={ps.list}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        data={transactions}
        keyExtractor={(item) => String(item.log_id)}
        renderItem={renderTxItem}
        ListHeaderComponent={<ListHeader />}
        ListFooterComponent={<ListFooter />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={WHITE} />}
      />

      <PointsInfoModal visible={infoOpen} onClose={() => setInfoOpen(false)} />
    </View>
  );
}

const ps = StyleSheet.create({
  root: { flex: 1, backgroundColor: BRAND },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 14,
    backgroundColor: WHITE + '1A', alignItems: 'center', justifyContent: 'center',
  },
  infoBtn: {
    width: 38, height: 38, borderRadius: 14,
    backgroundColor: WHITE + '1A', alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { fontSize: 17, fontWeight: '900', color: WHITE, fontFamily: FONT_B },
  list: { flex: 1, backgroundColor: BG, borderTopLeftRadius: 26, borderTopRightRadius: 26 },

  // Hero
  heroWrap: { marginHorizontal: 16, marginTop: 20 },
  heroGrad: { borderRadius: 24, padding: 22, alignItems: 'center', overflow: 'hidden' },
  heroCircle1: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: WHITE + '08', top: -60, right: -40 },
  heroCircle2: { position: 'absolute', width: 110, height: 110, borderRadius: 55, backgroundColor: WHITE + '08', bottom: -30, left: -20 },
  heroLabel:  { fontSize: 11, color: WHITE + 'AA', fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: FONT_R },
  heroPoints: { fontSize: 50, fontWeight: '900', color: WHITE, fontFamily: FONT_B, letterSpacing: -2, marginTop: 4, marginBottom: 16 },

  summaryRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: WHITE + '12', borderRadius: 14, padding: 12, width: '100%' },
  summaryChip:    { flex: 1, alignItems: 'center', gap: 2 },
  summaryDivider: { width: 1, height: 30, backgroundColor: WHITE + '25' },
  summaryVal:     { fontSize: 13, fontWeight: '900', color: WHITE, fontFamily: FONT_B },
  summaryLbl:     { fontSize: 9.5, color: WHITE + '80', fontFamily: FONT_R },

  // Daily progress
  progressCard: {
    marginHorizontal: 16, marginTop: 14,
    backgroundColor: CARD, borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressTitle:  { fontSize: 13, fontWeight: '800', color: TEXT_H, fontFamily: FONT_B },
  progressCount:  { fontSize: 12, fontWeight: '700', color: TEXT_M, fontFamily: FONT_M },
  progressTrack: {
    height: 10, backgroundColor: BG, borderRadius: 5, overflow: 'hidden', marginBottom: 8,
  },
  progressFill: {
    height: '100%', backgroundColor: ORANGE, borderRadius: 5,
  },
  progressSub: { fontSize: 11.5, color: TEXT_M, fontFamily: FONT_R },

  // Balance boxes
  balanceRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 12 },
  balBox: {
    flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', gap: 4,
  },
  balValue: { fontSize: 18, fontWeight: '900', fontFamily: FONT_B },
  balLabel: { fontSize: 10.5, color: TEXT_M, fontFamily: FONT_R, textAlign: 'center' },

  // How you earn
  earnCard: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: CARD, borderRadius: 18,
    paddingTop: 16, paddingBottom: 12, paddingHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  earnCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  earnHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  earnIconWrap:   { width: 26, height: 26, borderRadius: 8, backgroundColor: GOLD + '22', alignItems: 'center', justifyContent: 'center' },
  earnCardTitle:  { fontSize: 14, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B },
  earnGrid:       { gap: 8 },
  earnItem:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  earnItemIcon:   { width: 32, height: 32, borderRadius: 10, backgroundColor: ACCENT + '12', alignItems: 'center', justifyContent: 'center' },
  earnItemLabel:  { flex: 1, fontSize: 12.5, color: TEXT_H, fontFamily: FONT_R },
  earnPtsBadge:   { backgroundColor: GOLD + '22', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
  earnPts:        { fontSize: 11, fontWeight: '800', color: ORANGE, fontFamily: FONT_B },

  // History header
  historyHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, marginTop: 20, marginBottom: 4,
  },
  sectionIconWrap: { width: 26, height: 26, borderRadius: 8, backgroundColor: GOLD + '22', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B },

  // Transaction rows
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: CARD, paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: BORDER + '55',
  },
  txIconWrap: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  txMid:  { flex: 1 },
  txType: { fontSize: 13.5, fontWeight: '700', color: TEXT_H, fontFamily: FONT_B },
  txPost: { fontSize: 12, color: TEXT_M, marginTop: 2, fontFamily: FONT_R },
  txTime: { fontSize: 11, color: TEXT_M, marginTop: 3, fontFamily: FONT_R },
  txRight:  { alignItems: 'flex-end' },
  txPoints: { fontSize: 14, fontWeight: '900', color: ACCENT, fontFamily: FONT_B },
  txPts:    { fontSize: 10, color: TEXT_M, fontFamily: FONT_R, marginTop: 1 },

  emptyTx: { alignItems: 'center', paddingVertical: 40, gap: 8, paddingHorizontal: 24 },
  emptyText:    { fontSize: 14, color: TEXT_M, fontWeight: '600', fontFamily: FONT_M },
  emptySubText: { fontSize: 12, color: TEXT_M, textAlign: 'center', fontFamily: FONT_R, lineHeight: 18 },

  // Trust microcopy
  trustRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    backgroundColor: GREEN + '0E', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  trustTxt: { flex: 1, fontSize: 11.5, color: TEXT_M, lineHeight: 17, fontFamily: FONT_R },
});
