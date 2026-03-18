// src/pages/earnings/AffiliatesScreen.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Animated, Share,
  Clipboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../../AuthContext';
import { Colors } from '../../theme';
import AppDetails from '../../helpers/appdetails';

// ─── Constants ────────────────────────────────────────────────────────────────
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const BG     = '#F7F8FA';
const CARD   = Colors.white;
const TEXT_H = Colors.black;
const TEXT_M = Colors.secondaryText;
const WHITE  = Colors.white;
const GREEN  = Colors.success ?? '#22c55e';
const GOLD   = '#f59e0b';
const ORANGE = '#f97316';
const DEEP_O = '#ea580c';

const FONT_B = AppDetails?.fontFamily?.redex?.bold    ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';
const FONT_M = AppDetails?.fontFamily?.inter?.medium  ?? 'System';

const API_URL = 'https://hafrik.com/api/v1/affiliates/index.php';
const AVA_FB  = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

const fmtMoney = (n) =>
  `¥${Number(n ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Skeleton block ────────────────────────────────────────────────────────────
const SkeletonBlock = ({ width, height, radius = 8, style }) => {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1,   duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: '#E0E0E0', opacity: anim }, style]}
    />
  );
};

// ─── Referral skeleton row ─────────────────────────────────────────────────────
const RefSkeleton = () => (
  <View style={sk.row}>
    <SkeletonBlock width={42} height={42} radius={21} />
    <View style={{ flex: 1, gap: 7 }}>
      <SkeletonBlock width={120} height={12} />
      <SkeletonBlock width={80}  height={10} />
    </View>
    <SkeletonBlock width={48} height={12} radius={6} />
  </View>
);

// ─── Level card ───────────────────────────────────────────────────────────────
const LevelCard = ({ level, reward, description, color, bg }) => (
  <View style={[as.levelCard, { backgroundColor: bg }]}>
    <View style={[as.levelBadge, { backgroundColor: color + '22' }]}>
      <Text style={[as.levelBadgeTxt, { color }]}>L{level}</Text>
    </View>
    <Text style={[as.levelReward, { color }]}>{fmtMoney(reward)}</Text>
    <Text style={as.levelDesc}>{description}</Text>
  </View>
);

// ─── Referral row ──────────────────────────────────────────────────────────────
const ReferralRow = ({ item, isFirst }) => (
  <View style={[as.refRow, !isFirst && as.refRowBorder]}>
    <View style={as.refAvaWrap}>
      <ExpoImage
        source={{ uri: item.avatar || item.picture || AVA_FB }}
        style={as.refAvatar}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    </View>
    <View style={as.refMid}>
      <View style={as.refNameRow}>
        <Text style={as.refUsername} numberOfLines={1}>
          {item.username ?? item.name ?? '—'}
        </Text>
        {(item.verified === true || item.verified === '1' || item.verified === 1) && (
          <Ionicons name="checkmark-circle" size={14} color={ACCENT} style={{ marginLeft: 4 }} />
        )}
      </View>
      {!!item.name && item.name !== item.username && (
        <Text style={as.refFullName} numberOfLines={1}>{item.name}</Text>
      )}
    </View>
    <View style={as.refRight}>
      <Text style={[as.refEarned, Number(item.earnings ?? item.earned ?? 0) > 0 && { color: GREEN }]}>
        {fmtMoney(item.earnings ?? item.earned ?? 0)}
      </Text>
      <Text style={as.refEarnedLabel}>earned</Text>
    </View>
  </View>
);

// ─── Empty state ───────────────────────────────────────────────────────────────
const EmptyReferrals = ({ onShare }) => (
  <View style={as.emptyWrap}>
    <LinearGradient colors={[GOLD + '20', ORANGE + '10']} style={as.emptyIllustration}>
      <Ionicons name="people-outline" size={44} color={GOLD} />
    </LinearGradient>
    <Text style={as.emptyTitle}>No referrals yet</Text>
    <Text style={as.emptySub}>Share your link to start earning when friends join Hafrik</Text>
    <TouchableOpacity style={as.emptyAction} onPress={onShare} activeOpacity={0.85}>
      <Ionicons name="share-social-outline" size={16} color={WHITE} />
      <Text style={as.emptyActionTxt}>Share My Link</Text>
    </TouchableOpacity>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
export default function AffiliatesScreen() {
  const navigation = useNavigation();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();

  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refLoading, setRefLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied,     setCopied]     = useState(false);

  const heroAnim  = useRef(new Animated.Value(0)).current;
  const bodyAnim  = useRef(new Animated.Value(0)).current;
  const bodySlide = useRef(new Animated.Value(20)).current;

  const fallbackLink = `https://hafrik.com/?ref=${user?.username ?? user?.id ?? ''}`;
  const referralLink = data?.referral_link || fallbackLink;

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res  = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (json?.status === 'success' && json?.data) {
        setData(json.data);
      }
    } catch { /* silent */ }
    setLoading(false);
    setRefLoading(false);
  }, [token]);

  useEffect(() => {
    fetchData().then(() => {
      Animated.parallel([
        Animated.timing(heroAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(120),
          Animated.parallel([
            Animated.timing(bodyAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.spring(bodySlide, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }),
          ]),
        ]),
      ]).start();
    });
  }, [token]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleCopy = useCallback(() => {
    Clipboard.setString(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  }, [referralLink]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Join Hafrik and start earning! Sign up with my link:\n${referralLink}`,
        url: referralLink,
      });
    } catch { /* silent */ }
  }, [referralLink]);

  // ── Data ───────────────────────────────────────────────────────────────────
  const balance       = data?.balance        ?? 0;
  const totalReferrals = data?.total_referrals ?? 0;
  const levels        = Array.isArray(data?.levels)
    ? data.levels
    : [
        { level: 1, reward: '0.15', description: 'Direct referral' },
        { level: 2, reward: '0.10', description: "Referral's referral" },
        { level: 3, reward: '0.05', description: 'Extended network' },
      ];
  const referrals = Array.isArray(data?.referrals) ? data.referrals : [];

  const LEVEL_COLORS = [
    { color: GOLD,   bg: GOLD   + '0E' },
    { color: ORANGE, bg: ORANGE + '0E' },
    { color: DEEP_O, bg: DEEP_O + '0E' },
  ];

  return (
    <View style={as.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />
        }
      >
        {/* ── Hero (merged header + balance) ── */}
        <Animated.View style={{ opacity: heroAnim }}>
          <LinearGradient
            colors={[GOLD, ORANGE, DEEP_O]}
            style={[as.hero, { paddingTop: insets.top + 8 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={as.heroOrb1} />
            <View style={as.heroOrb2} />
            <View style={as.heroOrb3} />

            {/* Nav */}
            <View style={as.heroNav}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={as.heroBack} activeOpacity={0.85}>
                <Ionicons name="arrow-back" size={20} color={WHITE} />
              </TouchableOpacity>
              <Text style={as.heroNavTitle}>Affiliates</Text>
              <View style={{ width: 38 }} />
            </View>

            {/* Balance */}
            <Text style={as.heroEyebrow}>TOTAL EARNED</Text>
            {loading ? (
              <View style={{ marginVertical: 12 }}>
                <SkeletonBlock width={140} height={48} radius={10} style={{ backgroundColor: WHITE + '30' }} />
              </View>
            ) : (
              <Text style={as.heroAmount}>{fmtMoney(balance)}</Text>
            )}

            {/* Referral count pill */}
            <View style={as.heroPill}>
              <Ionicons name="people" size={13} color={WHITE + 'CC'} />
              <Text style={as.heroPillTxt}>
                {loading ? '—' : `${totalReferrals} Referral${totalReferrals !== 1 ? 's' : ''}`}
              </Text>
            </View>

            <Text style={as.heroTagline}>
              Earn rewards when your friends join Hafrik using your link
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* ── Body ── */}
        <Animated.View style={{ opacity: bodyAnim, transform: [{ translateY: bodySlide }] }}>

          {/* ── Referral Link card ── */}
          <View style={as.card}>
            <View style={as.cardHeader}>
              <View style={[as.cardIconWrap, { backgroundColor: GOLD + '18' }]}>
                <Ionicons name="link" size={15} color={GOLD} />
              </View>
              <Text style={as.cardTitle}>Your Referral Link</Text>
            </View>
            <View style={as.linkBox}>
              <Text style={as.linkText} numberOfLines={1}>{referralLink}</Text>
            </View>
            <View style={as.linkBtns}>
              <TouchableOpacity
                style={[as.linkBtn, { backgroundColor: copied ? GREEN + '14' : GOLD + '14' }]}
                onPress={handleCopy}
                activeOpacity={0.8}
              >
                <Ionicons name={copied ? 'checkmark-circle' : 'copy-outline'} size={16} color={copied ? GREEN : GOLD} />
                <Text style={[as.linkBtnTxt, { color: copied ? GREEN : GOLD }]}>
                  {copied ? 'Copied!' : 'Copy Link'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[as.linkBtn, { backgroundColor: ACCENT + '12' }]}
                onPress={handleShare}
                activeOpacity={0.8}
              >
                <Ionicons name="share-social-outline" size={16} color={ACCENT} />
                <Text style={[as.linkBtnTxt, { color: ACCENT }]}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Invite CTA ── */}
          <TouchableOpacity style={as.inviteBtn} onPress={handleShare} activeOpacity={0.88}>
            <LinearGradient
              colors={[GOLD, ORANGE]}
              style={as.inviteBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="person-add-outline" size={18} color={WHITE} />
              <Text style={as.inviteBtnTxt}>Invite &amp; Earn</Text>
              <Ionicons name="arrow-forward" size={16} color={WHITE + 'CC'} />
            </LinearGradient>
          </TouchableOpacity>

          {/* ── Levels (horizontal scroll) ── */}
          <View style={as.sectionLabel}>
            <View style={as.sectionAccent} />
            <Text style={as.sectionTxt}>HOW IT WORKS</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={as.levelsScroll}
          >
            {levels.map((lv, i) => {
              const palette = LEVEL_COLORS[i] ?? LEVEL_COLORS[0];
              return (
                <LevelCard
                  key={i}
                  level={lv.level ?? i + 1}
                  reward={lv.reward ?? lv.amount ?? 0}
                  description={lv.description ?? lv.label ?? ''}
                  color={palette.color}
                  bg={palette.bg}
                />
              );
            })}

            {/* Info card at end */}
            <View style={[as.levelCard, { backgroundColor: '#F0F0F5', width: 150 }]}>
              <Ionicons name="information-circle-outline" size={22} color={TEXT_M} />
              <Text style={[as.levelReward, { color: TEXT_M, fontSize: 13 }]}>More levels</Text>
              <Text style={as.levelDesc}>coming soon</Text>
            </View>
          </ScrollView>

          {/* ── Move to Wallet ── */}
          <TouchableOpacity
            style={as.moveBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('WalletScreen')}
          >
            <LinearGradient
              colors={[GREEN, '#16a34a']}
              style={as.moveBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="wallet-outline" size={17} color={WHITE} />
              <Text style={as.moveBtnTxt}>Move Balance to Wallet</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* ── Referral List ── */}
          <View style={as.sectionLabel}>
            <View style={as.sectionAccent} />
            <Text style={as.sectionTxt}>YOUR REFERRALS</Text>
            {!refLoading && totalReferrals > 0 && (
              <View style={as.countPill}>
                <Text style={as.countPillTxt}>{totalReferrals}</Text>
              </View>
            )}
          </View>

          <View style={as.refCard}>
            {refLoading ? (
              <>
                <RefSkeleton />
                <RefSkeleton />
                <RefSkeleton />
              </>
            ) : referrals.length === 0 ? (
              <EmptyReferrals onShare={handleShare} />
            ) : (
              referrals.map((item, i) => (
                <ReferralRow key={item.id ?? i} item={item} isFirst={i === 0} />
              ))
            )}
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const as = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Hero
  hero: {
    paddingHorizontal: 22, paddingBottom: 28, overflow: 'hidden',
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    shadowColor: ORANGE, shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 12,
  },
  heroOrb1: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: WHITE + '0A', top: -80, right: -60 },
  heroOrb2: { position: 'absolute', width: 140, height: 140, borderRadius: 70,  backgroundColor: WHITE + '07', bottom: -50, left: -40 },
  heroOrb3: { position: 'absolute', width: 80,  height: 80,  borderRadius: 40,  backgroundColor: WHITE + '06', top: 20, left: 30 },

  heroNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 22,
  },
  heroBack: {
    width: 38, height: 38, borderRadius: 13,
    backgroundColor: WHITE + '1E', alignItems: 'center', justifyContent: 'center',
  },
  heroNavTitle: { fontSize: 16, fontWeight: '900', color: WHITE, fontFamily: FONT_B },

  heroEyebrow: {
    fontSize: 10, color: WHITE + '90', fontWeight: '700',
    letterSpacing: 1.6, textTransform: 'uppercase', fontFamily: FONT_R,
  },
  heroAmount: {
    fontSize: 48, fontWeight: '900', color: WHITE,
    fontFamily: FONT_B, letterSpacing: -2, marginTop: 4, marginBottom: 10,
  },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: WHITE + '18', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, marginBottom: 14,
  },
  heroPillTxt: { fontSize: 13, fontWeight: '700', color: WHITE, fontFamily: FONT_M },
  heroTagline: { fontSize: 12.5, color: WHITE + 'BB', fontFamily: FONT_R, lineHeight: 18 },

  // Section labels
  sectionLabel: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, marginTop: 22, marginBottom: 10,
  },
  sectionAccent: { width: 3, height: 14, borderRadius: 2, backgroundColor: GOLD },
  sectionTxt:    { fontSize: 11, fontWeight: '800', color: TEXT_M, letterSpacing: 1.4, fontFamily: FONT_B, flex: 1 },
  countPill:     { backgroundColor: GOLD + '20', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  countPillTxt:  { fontSize: 11, fontWeight: '800', color: GOLD, fontFamily: FONT_B },

  // Cards
  card: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: CARD, borderRadius: 20,
    paddingTop: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, marginBottom: 12 },
  cardIconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  cardTitle:    { fontSize: 15, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B, flex: 1 },

  // Referral link
  linkBox: {
    backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1, borderColor: '#EBEBEB',
    marginHorizontal: 18, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
  },
  linkText:    { fontSize: 12.5, color: TEXT_M, fontFamily: FONT_R },
  linkBtns:    { flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingBottom: 18 },
  linkBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 11 },
  linkBtnTxt:  { fontSize: 13, fontWeight: '700', fontFamily: FONT_M },

  // Invite CTA
  inviteBtn:     { marginHorizontal: 16, marginTop: 12, borderRadius: 18, overflow: 'hidden' },
  inviteBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16,
    shadowColor: ORANGE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12,
  },
  inviteBtnTxt: { fontSize: 15, fontWeight: '900', color: WHITE, fontFamily: FONT_B },

  // Level cards (horizontal scroll)
  levelsScroll: { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },
  levelCard: {
    width: 130, borderRadius: 18, padding: 16, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  levelBadge:    { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  levelBadgeTxt: { fontSize: 14, fontWeight: '900', fontFamily: FONT_B },
  levelReward:   { fontSize: 22, fontWeight: '900', fontFamily: FONT_B, marginTop: 2 },
  levelDesc:     { fontSize: 11.5, color: TEXT_M, fontFamily: FONT_R, lineHeight: 16 },

  // Move to wallet
  moveBtn:     { marginHorizontal: 16, marginTop: 12, borderRadius: 16, overflow: 'hidden' },
  moveBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  moveBtnTxt:  { fontSize: 14, fontWeight: '800', color: WHITE, fontFamily: FONT_B },

  // Referral list
  refCard: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: CARD, borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  refRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 18 },
  refRowBorder: { borderTopWidth: 1, borderTopColor: '#F3F3F3' },
  refAvaWrap:   { position: 'relative' },
  refAvatar:    { width: 44, height: 44, borderRadius: 22 },
  refMid:       { flex: 1 },
  refNameRow:   { flexDirection: 'row', alignItems: 'center' },
  refUsername:  { fontSize: 14, fontWeight: '700', color: TEXT_H, fontFamily: FONT_B },
  refFullName:  { fontSize: 12, color: TEXT_M, fontFamily: FONT_R, marginTop: 2 },
  refRight:     { alignItems: 'flex-end' },
  refEarned:    { fontSize: 14, fontWeight: '800', color: TEXT_M, fontFamily: FONT_B },
  refEarnedLabel: { fontSize: 10, color: TEXT_M + 'AA', fontFamily: FONT_R, marginTop: 1 },

  // Empty state
  emptyWrap: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 28, gap: 10 },
  emptyIllustration: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle:     { fontSize: 16, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B },
  emptySub:       { fontSize: 13, color: TEXT_M, textAlign: 'center', fontFamily: FONT_R, lineHeight: 20 },
  emptyAction:    {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 6, backgroundColor: GOLD, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 11,
  },
  emptyActionTxt: { fontSize: 13, fontWeight: '800', color: WHITE, fontFamily: FONT_B },
});

// ─── Skeleton styles ──────────────────────────────────────────────────────────
const sk = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 18,
    borderTopWidth: 1, borderTopColor: '#F3F3F3',
  },
});
