// src/pages/earnings/EarningsScreen.jsx — Overview: 3 financial cards + Add Funds
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView, RefreshControl, Animated, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../../AuthContext';
import { Colors } from '../../theme';
import AppDetails from '../../helpers/appdetails';
import { getWalletBalance } from '../../api/walletApi';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const BG     = Colors.background ?? '#F7F8FA';
const WHITE  = Colors.white;
const TEXT_H = Colors.black;
const TEXT_M = Colors.secondaryText;
const CARD   = Colors.white;
const BORDER = Colors.borderSoft ?? Colors.border;
const GOLD   = Colors.star  ?? '#ffd700';
const ORANGE = Colors.warm  ?? '#f4a535';
const GREEN  = Colors.success ?? '#22c55e';
const PURPLE = Colors.purple  ?? '#9c27b0';
const VIOLET = '#6d28d9';

const FONT_B = AppDetails?.fontFamily?.redex?.bold    ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';
const FONT_M = AppDetails?.fontFamily?.inter?.medium  ?? 'System';

const fmtMoney  = (n) => `¥${Number(n ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPoints = (n) => Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

// ─── Earnings card ─────────────────────────────────────────────────────────────
const EarningsCard = ({ gradient, icon, title, mainValue, sub, onPress }) => (
  <TouchableOpacity style={cs.card} onPress={onPress} activeOpacity={0.88}>
    <LinearGradient colors={gradient} style={cs.cardGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <View style={cs.cardBubble1} />
      <View style={cs.cardBubble2} />
      <View style={cs.cardRow}>
        <View style={cs.cardIconWrap}>
          <Ionicons name={icon} size={20} color={WHITE} />
        </View>
        <Text style={cs.cardTitle}>{title}</Text>
        <Ionicons name="chevron-forward" size={16} color={WHITE + '88'} style={{ marginLeft: 'auto' }} />
      </View>
      <Text style={cs.cardValue}>{mainValue}</Text>
      <Text style={cs.cardSub}>{sub}</Text>
    </LinearGradient>
  </TouchableOpacity>
);

// ─── Quick action button ────────────────────────────────────────────────────────
const QuickAction = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={cs.qaItem} onPress={onPress} activeOpacity={0.82}>
    <View style={[cs.qaIcon, { backgroundColor: color + '18' }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={cs.qaLabel}>{label}</Text>
  </TouchableOpacity>
);

// ─────────────────────────────────────────────────────────────────────────────
export default function EarningsScreen() {
  const navigation = useNavigation();
  const { token }  = useAuth();
  const insets     = useSafeAreaInsets();

  const [balance,    setBalance]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;

  const fetchData = useCallback(async () => {
    try {
      const json = await getWalletBalance(token);
      if (json?.status === 'success') setBalance(json.data);
    } catch { /* silent */ }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchData().then(() => {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }),
      ]).start();
    });
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const walletBal    = balance?.wallet_balance    ?? 0;
  const affiliateBal = balance?.affiliate_balance ?? 0;
  const pointsBal    = balance?.points            ?? 0;

  const totalValue = Number(walletBal) + Number(affiliateBal);

  const handleAddFunds = () => {
    Alert.alert(
      '💳 Add Funds',
      'Top-up via bank transfer or card is coming soon!\n\nYou can earn money through points conversion, affiliates, and creator monetization.',
      [{ text: 'Got it', style: 'default' }]
    );
  };

  return (
    <View style={[cs.root, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <LinearGradient
        colors={[BRAND, ACCENT + 'EE']}
        style={cs.topBar}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={cs.backBtn} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </TouchableOpacity>
        <Text style={cs.topTitle}>Earnings</Text>
        <View style={{ width: 38 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
      >
        {loading ? (
          <ActivityIndicator color={ACCENT} size="large" style={{ marginTop: 80 }} />
        ) : (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            {/* ── Total balance hero ── */}
            <LinearGradient
              colors={[BRAND, ACCENT + 'CC', BRAND + 'F0']}
              style={cs.hero}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={cs.heroOrb1} />
              <View style={cs.heroOrb2} />
              <Text style={cs.heroLabel}>Total Balance</Text>
              <Text style={cs.heroValue}>{fmtMoney(totalValue)}</Text>
              <Text style={cs.heroSub}>Wallet + Affiliates combined</Text>

              {/* Quick actions row */}
              <View style={cs.heroActions}>
                <TouchableOpacity style={cs.heroActionBtn} onPress={() => navigation.navigate('WalletScreen')} activeOpacity={0.85}>
                  <Ionicons name="send-outline" size={16} color={WHITE} />
                  <Text style={cs.heroActionTxt}>Send</Text>
                </TouchableOpacity>

                <View style={cs.heroActionDivider} />

                <TouchableOpacity style={cs.heroActionBtn} onPress={handleAddFunds} activeOpacity={0.85}>
                  <Ionicons name="add-circle-outline" size={16} color={WHITE} />
                  <Text style={cs.heroActionTxt}>Add Funds</Text>
                  <View style={cs.comingSoonBadge}>
                    <Text style={cs.comingSoonTxt}>Soon</Text>
                  </View>
                </TouchableOpacity>

                <View style={cs.heroActionDivider} />

                <TouchableOpacity style={cs.heroActionBtn} onPress={() => navigation.navigate('WalletScreen')} activeOpacity={0.85}>
                  <Ionicons name="download-outline" size={16} color={WHITE} />
                  <Text style={cs.heroActionTxt}>Withdraw</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* ── Section label ── */}
            <View style={cs.sectionLabel}>
              <View style={cs.sectionAccent} />
              <Text style={cs.sectionLabelTxt}>MY ACCOUNTS</Text>
            </View>

            {/* ── Points card ── */}
            <EarningsCard
              gradient={[GOLD + 'EE', ORANGE, '#e65100']}
              icon="star"
              title="Points"
              mainValue={`${fmtPoints(pointsBal)} pts`}
              sub="Earn from likes, comments & daily activity"
              onPress={() => navigation.navigate('PointsScreen', { points: pointsBal })}
            />

            {/* ── Wallet card ── */}
            <EarningsCard
              gradient={[GREEN, '#16a34a', '#064e3b']}
              icon="wallet"
              title="Wallet"
              mainValue={fmtMoney(walletBal)}
              sub="Withdraw, send or receive money"
              onPress={() => navigation.navigate('WalletScreen')}
            />

            {/* ── Affiliates card ── */}
            <EarningsCard
              gradient={[PURPLE, VIOLET, '#1e1b4b']}
              icon="git-network"
              title="Affiliates"
              mainValue={fmtMoney(affiliateBal)}
              sub="Earn from referrals & invites"
              onPress={() => navigation.navigate('AffiliatesScreen')}
            />

            {/* ── Quick links ── */}
            <View style={cs.quickCard}>
              <Text style={cs.quickTitle}>Quick Actions</Text>
              <View style={cs.qaRow}>
                <QuickAction
                  icon="send"
                  label="Send Money"
                  color={ACCENT}
                  onPress={() => navigation.navigate('SendMoneyScreen')}
                />
                <QuickAction
                  icon="star"
                  label="Convert Pts"
                  color={ORANGE}
                  onPress={() => navigation.navigate('WalletScreen')}
                />
                <QuickAction
                  icon="git-network"
                  label="Refer Friends"
                  color={PURPLE}
                  onPress={() => navigation.navigate('AffiliatesScreen')}
                />
                <QuickAction
                  icon="add-circle"
                  label="Add Funds"
                  color={GREEN}
                  onPress={handleAddFunds}
                />
              </View>
            </View>

            {/* ── Tips ── */}
            <View style={cs.tipsCard}>
              <Text style={cs.tipsTitle}>How to Earn More</Text>
              {[
                { icon: 'star',       text: 'Stay active — daily engagement earns points' },
                { icon: 'videocam',   text: 'Post reels — trending reels earn bonus rewards' },
                { icon: 'people',     text: 'Refer friends — earn per successful sign-up' },
                { icon: 'storefront', text: 'Create a page — monetize with promotions' },
              ].map((tip, i) => (
                <View key={i} style={cs.tipRow}>
                  <View style={cs.tipIconWrap}>
                    <Ionicons name={tip.icon} size={14} color={ACCENT} />
                  </View>
                  <Text style={cs.tipText}>{tip.text}</Text>
                </View>
              ))}
            </View>

          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const cs = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 14,
    backgroundColor: WHITE + '1A', alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { fontSize: 17, fontWeight: '900', color: WHITE, fontFamily: FONT_B },

  // Hero
  hero: {
    marginHorizontal: 16, marginTop: 20, borderRadius: 24,
    padding: 22, overflow: 'hidden',
    shadowColor: BRAND, shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25, shadowRadius: 20, elevation: 10,
  },
  heroOrb1: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: WHITE + '07', top: -60, right: -40 },
  heroOrb2: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: WHITE + '07', bottom: -20, left: -20 },
  heroLabel: { fontSize: 11, color: WHITE + 'A0', fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: FONT_R },
  heroValue: { fontSize: 38, fontWeight: '900', color: WHITE, fontFamily: FONT_B, letterSpacing: -1.5, marginTop: 4, marginBottom: 4 },
  heroSub:   { fontSize: 12, color: WHITE + '80', fontFamily: FONT_R, marginBottom: 20 },

  heroActions: {
    flexDirection: 'row', backgroundColor: WHITE + '14',
    borderRadius: 16, overflow: 'hidden',
  },
  heroActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 12,
  },
  heroActionDivider: { width: 1, backgroundColor: WHITE + '20', marginVertical: 10 },
  heroActionTxt: { fontSize: 12, fontWeight: '700', color: WHITE, fontFamily: FONT_M },
  comingSoonBadge: {
    backgroundColor: ORANGE + 'AA', borderRadius: 6,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  comingSoonTxt: { fontSize: 8, fontWeight: '800', color: WHITE, fontFamily: FONT_B, letterSpacing: 0.5 },

  // Section label
  sectionLabel: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, marginTop: 24, marginBottom: 10,
  },
  sectionAccent: { width: 3, height: 14, borderRadius: 2, backgroundColor: ACCENT },
  sectionLabelTxt: { fontSize: 11, fontWeight: '800', color: TEXT_M, letterSpacing: 1.4, fontFamily: FONT_B },

  // Cards
  card: {
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, shadowRadius: 14, elevation: 6,
  },
  cardGrad:    { borderRadius: 20, padding: 18, overflow: 'hidden' },
  cardBubble1: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: WHITE + '08', top: -30, right: -20 },
  cardBubble2: { position: 'absolute', width: 70,  height: 70,  borderRadius: 35, backgroundColor: WHITE + '08', bottom: -15, left: -10 },
  cardRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  cardIconWrap:{ width: 38, height: 38, borderRadius: 12, backgroundColor: WHITE + '22', alignItems: 'center', justifyContent: 'center' },
  cardTitle:   { fontSize: 12, fontWeight: '800', color: WHITE + 'CC', fontFamily: FONT_B, letterSpacing: 0.3 },
  cardValue:   { fontSize: 30, fontWeight: '900', color: WHITE, fontFamily: FONT_B, letterSpacing: -1, marginBottom: 4 },
  cardSub:     { fontSize: 11, color: WHITE + 'BB', fontFamily: FONT_R },

  // Quick actions
  quickCard: {
    marginHorizontal: 16, marginBottom: 12, marginTop: 4,
    backgroundColor: CARD, borderRadius: 20, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  quickTitle: { fontSize: 14, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B, marginBottom: 14 },
  qaRow:      { flexDirection: 'row', gap: 8 },
  qaItem:     { flex: 1, alignItems: 'center', gap: 6 },
  qaIcon:     { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  qaLabel:    { fontSize: 10.5, fontWeight: '700', color: TEXT_H, textAlign: 'center', fontFamily: FONT_M },

  // Tips
  tipsCard: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: CARD, borderRadius: 18, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  tipsTitle:   { fontSize: 14, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B, marginBottom: 14 },
  tipRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  tipIconWrap: { width: 30, height: 30, borderRadius: 10, backgroundColor: ACCENT + '14', alignItems: 'center', justifyContent: 'center' },
  tipText:     { flex: 1, fontSize: 12.5, color: TEXT_H, lineHeight: 18, fontFamily: FONT_R },
});
