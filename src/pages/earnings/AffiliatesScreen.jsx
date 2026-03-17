// src/pages/earnings/AffiliatesScreen.jsx — Affiliates detail screen
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Animated, Alert, Share,
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
import { getWalletBalance, withdrawAffiliates } from '../../api/walletApi';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const BG     = Colors.background ?? '#F7F8FA';
const CARD   = Colors.white;
const BORDER = Colors.borderSoft ?? Colors.border;
const TEXT_H = Colors.black;
const TEXT_M = Colors.secondaryText;
const WHITE  = Colors.white;
const PURPLE = Colors.purple ?? '#9c27b0';
const VIOLET = '#6d28d9';
const GREEN  = Colors.success ?? '#22c55e';

const FONT_B = AppDetails?.fontFamily?.redex?.bold    ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';
const FONT_M = AppDetails?.fontFamily?.inter?.medium  ?? 'System';

const fmtMoney = (n) =>
  `¥${Number(n ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const AVA_FB = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

// ─── Referral row ──────────────────────────────────────────────────────────────
const ReferralRow = ({ item }) => (
  <View style={as.refRow}>
    <ExpoImage
      source={{ uri: item.avatar || AVA_FB }}
      style={as.refAvatar}
      contentFit="cover"
    />
    <View style={as.refMid}>
      <Text style={as.refName} numberOfLines={1}>{item.name ?? item.username}</Text>
      <Text style={as.refJoined} numberOfLines={1}>Joined {item.joined_at ?? ''}</Text>
    </View>
    <View style={as.refRight}>
      <Text style={as.refEarned}>{fmtMoney(item.earned ?? 0)}</Text>
      <Text style={as.refEarnedLabel}>earned</Text>
    </View>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
export default function AffiliatesScreen() {
  const navigation = useNavigation();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();

  const [balance,    setBalance]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied,     setCopied]     = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  const referralLink = `https://hafrik.com/ref/${user?.username ?? user?.id ?? ''}`;

  const fetchBalance = useCallback(async () => {
    try {
      const json = await getWalletBalance(token);
      if (json?.status === 'success') setBalance(json.data);
    } catch { /* silent */ }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchBalance().then(() => {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 480, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 6,   useNativeDriver: true }),
      ]).start();
    });
  }, [token]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBalance();
    setRefreshing(false);
  }, [fetchBalance]);

  const handleCopy = useCallback(() => {
    Clipboard.setString(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [referralLink]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Join Hafrik and earn points together! Sign up with my link:\n${referralLink}`,
        url: referralLink,
      });
    } catch { /* silent */ }
  }, [referralLink]);

  const affiliateBal  = balance?.affiliate_balance  ?? 0;
  const totalReferrals = balance?.total_referrals   ?? 0;
  const totalEarned   = balance?.total_affiliate_earned ?? affiliateBal;

  // Placeholder referral list — real data would come from a dedicated API
  const referrals = balance?.referrals ?? [];

  return (
    <View style={[as.root, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={as.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={as.backBtn} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </TouchableOpacity>
        <Text style={as.topTitle}>Affiliates</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={as.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={WHITE} />}
      >
        {/* ── Hero balance card ── */}
        <Animated.View style={[as.heroWrap, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient
            colors={[PURPLE, VIOLET, '#1e1b4b']}
            style={as.heroGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={as.heroBubble1} />
            <View style={as.heroBubble2} />
            <Text style={as.heroLabel}>Affiliate Balance</Text>
            {loading
              ? <ActivityIndicator color={WHITE} size="large" style={{ marginVertical: 14 }} />
              : <Text style={as.heroAmount}>{fmtMoney(affiliateBal)}</Text>
            }
            <View style={as.heroStats}>
              <View style={as.heroStat}>
                <Text style={as.heroStatVal}>{totalReferrals}</Text>
                <Text style={as.heroStatLabel}>Referrals</Text>
              </View>
              <View style={as.heroStatDivider} />
              <View style={as.heroStat}>
                <Text style={as.heroStatVal}>{fmtMoney(totalEarned)}</Text>
                <Text style={as.heroStatLabel}>Total Earned</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Withdraw button ── */}
        <TouchableOpacity
          style={as.withdrawBtn}
          activeOpacity={0.85}
          onPress={() =>
            Alert.alert(
              'Withdraw Affiliate Balance',
              'Go to Wallet to move your affiliate earnings to your wallet balance.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Wallet', onPress: () => navigation.navigate('WalletScreen') },
              ]
            )
          }
        >
          <LinearGradient colors={[GREEN, '#16a34a']} style={as.withdrawGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="card-outline" size={18} color={WHITE} />
            <Text style={as.withdrawText}>Move to Wallet</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Referral link card ── */}
        <View style={as.card}>
          <View style={as.cardHeader}>
            <View style={[as.cardIconWrap, { backgroundColor: PURPLE + '18' }]}>
              <Ionicons name="link" size={16} color={PURPLE} />
            </View>
            <Text style={as.cardTitle}>Your Referral Link</Text>
          </View>
          <View style={as.linkBox}>
            <Text style={as.linkText} numberOfLines={1}>{referralLink}</Text>
          </View>
          <View style={as.linkActions}>
            <TouchableOpacity
              style={[as.linkBtn, { backgroundColor: copied ? GREEN + '18' : PURPLE + '12' }]}
              onPress={handleCopy}
              activeOpacity={0.8}
            >
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={copied ? GREEN : PURPLE} />
              <Text style={[as.linkBtnText, { color: copied ? GREEN : PURPLE }]}>
                {copied ? 'Copied!' : 'Copy Link'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[as.linkBtn, { backgroundColor: ACCENT + '12' }]}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <Ionicons name="share-social-outline" size={16} color={ACCENT} />
              <Text style={[as.linkBtnText, { color: ACCENT }]}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── How it works ── */}
        <View style={as.card}>
          <View style={as.cardHeader}>
            <View style={[as.cardIconWrap, { backgroundColor: ACCENT + '15' }]}>
              <Ionicons name="information-circle-outline" size={16} color={ACCENT} />
            </View>
            <Text style={as.cardTitle}>How It Works</Text>
          </View>
          {[
            { icon: 'share-social', text: 'Share your unique referral link with friends' },
            { icon: 'person-add',   text: 'They sign up and join Hafrik' },
            { icon: 'star',         text: 'You earn points & affiliate credits for each sign-up' },
            { icon: 'wallet',       text: 'Move affiliate earnings to your wallet anytime' },
          ].map((step, i) => (
            <View key={i} style={as.howRow}>
              <View style={as.howNum}>
                <Text style={as.howNumText}>{i + 1}</Text>
              </View>
              <View style={[as.howIconWrap, { backgroundColor: PURPLE + '14' }]}>
                <Ionicons name={step.icon} size={15} color={PURPLE} />
              </View>
              <Text style={as.howText}>{step.text}</Text>
            </View>
          ))}
        </View>

        {/* ── Referral list ── */}
        <View style={as.card}>
          <View style={as.cardHeader}>
            <View style={[as.cardIconWrap, { backgroundColor: PURPLE + '18' }]}>
              <Ionicons name="people-outline" size={16} color={PURPLE} />
            </View>
            <Text style={as.cardTitle}>People You Referred</Text>
            {totalReferrals > 0 && <Text style={as.refCount}>{totalReferrals}</Text>}
          </View>
          {loading ? (
            <ActivityIndicator color={PURPLE} style={{ paddingVertical: 24 }} />
          ) : referrals.length === 0 ? (
            <View style={as.emptyRef}>
              <Ionicons name="people-outline" size={34} color={BORDER} />
              <Text style={as.emptyText}>No referrals yet</Text>
              <Text style={as.emptySub}>Share your link to start earning from referrals</Text>
            </View>
          ) : (
            referrals.map((item, i) => <ReferralRow key={i} item={item} />)
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const as = StyleSheet.create({
  root:  { flex: 1, backgroundColor: BRAND },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 14,
    backgroundColor: WHITE + '1A', alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { fontSize: 17, fontWeight: '900', color: WHITE, fontFamily: FONT_B },
  scroll:   { flex: 1, backgroundColor: BG, borderTopLeftRadius: 26, borderTopRightRadius: 26 },

  // Hero
  heroWrap:    { marginHorizontal: 16, marginTop: 20 },
  heroGrad:    { borderRadius: 24, padding: 24, overflow: 'hidden' },
  heroBubble1: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: WHITE + '08', top: -60, right: -40 },
  heroBubble2: { position: 'absolute', width: 110, height: 110, borderRadius: 55, backgroundColor: WHITE + '08', bottom: -30, left: -20 },
  heroLabel:   { fontSize: 12, color: WHITE + 'B0', fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', fontFamily: FONT_R },
  heroAmount:  { fontSize: 40, fontWeight: '900', color: WHITE, fontFamily: FONT_B, marginTop: 4, letterSpacing: -1.5 },
  heroStats:   { flexDirection: 'row', marginTop: 18, gap: 0 },
  heroStat:    { flex: 1, alignItems: 'center' },
  heroStatDivider: { width: 1, backgroundColor: WHITE + '30', marginVertical: 4 },
  heroStatVal: { fontSize: 18, fontWeight: '900', color: WHITE, fontFamily: FONT_B },
  heroStatLabel: { fontSize: 11, color: WHITE + 'AA', fontFamily: FONT_R, marginTop: 2 },

  // Withdraw button
  withdrawBtn:  { marginHorizontal: 16, marginTop: 16, borderRadius: 16, overflow: 'hidden' },
  withdrawGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  withdrawText: { fontSize: 14, fontWeight: '800', color: WHITE, fontFamily: FONT_B },

  // Cards
  card: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: CARD, borderRadius: 20,
    paddingTop: 18, paddingBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, marginBottom: 14 },
  cardIconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B, flex: 1 },
  refCount:  { fontSize: 12, color: PURPLE, fontWeight: '800', fontFamily: FONT_B },

  // Referral link
  linkBox: {
    backgroundColor: BG, borderRadius: 12, marginHorizontal: 18,
    paddingHorizontal: 14, paddingVertical: 11, marginBottom: 12,
  },
  linkText: { fontSize: 12.5, color: TEXT_M, fontFamily: FONT_R },
  linkActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 18 },
  linkBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 10 },
  linkBtnText: { fontSize: 13, fontWeight: '700', fontFamily: FONT_M },

  // How it works
  howRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, marginBottom: 12 },
  howNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: PURPLE + '20', alignItems: 'center', justifyContent: 'center' },
  howNumText: { fontSize: 11, fontWeight: '900', color: PURPLE, fontFamily: FONT_B },
  howIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  howText: { flex: 1, fontSize: 13, color: TEXT_H, lineHeight: 18, fontFamily: FONT_R },

  // Referral rows
  refRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 18,
    borderTopWidth: 1, borderTopColor: BORDER + '55',
  },
  refAvatar: { width: 40, height: 40, borderRadius: 20 },
  refMid:    { flex: 1 },
  refName:   { fontSize: 13.5, fontWeight: '700', color: TEXT_H, fontFamily: FONT_B },
  refJoined: { fontSize: 11.5, color: TEXT_M, marginTop: 2, fontFamily: FONT_R },
  refRight:  { alignItems: 'flex-end' },
  refEarned: { fontSize: 13, fontWeight: '800', color: GREEN, fontFamily: FONT_B },
  refEarnedLabel: { fontSize: 10, color: TEXT_M, fontFamily: FONT_R, marginTop: 1 },

  // Empty
  emptyRef:  { alignItems: 'center', paddingVertical: 32, gap: 8, paddingHorizontal: 24 },
  emptyText: { fontSize: 14, color: TEXT_M, fontWeight: '600', fontFamily: FONT_M },
  emptySub:  { fontSize: 12, color: TEXT_M, textAlign: 'center', fontFamily: FONT_R, lineHeight: 18 },
});
