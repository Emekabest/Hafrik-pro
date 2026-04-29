// src/pages/earnings/EarningsScreen.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, RefreshControl, Animated, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../../AuthContext';
import { Colors } from '../../theme';
import AppDetails from '../../helpers/appdetails';
import { getWalletBalance } from '../../api/walletApi';
import AddFundsModal from '../../components/AddFundsModal';

// ─── Constants ────────────────────────────────────────────────────────────────
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const BG     = '#F7F8FA';
const WHITE  = Colors.white;
const TEXT_H = Colors.black;
const TEXT_M = Colors.secondaryText;
const CARD   = Colors.white;
const GOLD   = Colors.star  ?? '#f59e0b';
const ORANGE = Colors.warm  ?? '#f4a535';
const GREEN  = Colors.success ?? '#22c55e';
const PURPLE = Colors.purple  ?? '#9c27b0';
const VIOLET = '#6d28d9';
const DANGER = '#ef4444';

const FONT_B = AppDetails?.fontFamily?.redex?.bold    ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';
const FONT_M = AppDetails?.fontFamily?.inter?.medium  ?? 'System';

const fmtMoney  = (n) => `¥${Number(n ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPoints = (n) => Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });


// ─── Account card ─────────────────────────────────────────────────────────────
const AccountCard = ({ accentColor, icon, label, value, sub, onPress }) => (
  <TouchableOpacity style={cs.accCard} onPress={onPress} activeOpacity={0.88}>
    <View style={[cs.accIconWrap, { backgroundColor: accentColor + '18' }]}>
      <Ionicons name={icon} size={22} color={accentColor} />
    </View>
    <View style={cs.accMid}>
      <Text style={cs.accLabel}>{label}</Text>
      <Text style={cs.accValue}>{value}</Text>
      <Text style={cs.accSub}>{sub}</Text>
    </View>
    <Ionicons name="chevron-forward" size={16} color={TEXT_M + '60'} />
  </TouchableOpacity>
);

// ─────────────────────────────────────────────────────────────────────────────
export default function EarningsScreen() {
  const navigation = useNavigation();
  const { token, user } = useAuth();
  const insets     = useSafeAreaInsets();

  const [balance,         setBalance]         = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [addFundsVisible, setAddFundsVisible] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(32)).current;

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

  const walletBal    = Number(balance?.wallet_balance    ?? 0);
  const affiliateBal = Number(balance?.affiliate_balance ?? 0);
  const pointsBal    = Number(balance?.points            ?? 0);
  const pointsValue  = pointsBal / 1000;
  const totalValue   = walletBal + affiliateBal + pointsValue;
  const totalReferrals = balance?.total_referrals ?? 0;

  return (
    <View style={cs.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
      >
        {loading ? (
          <LinearGradient
            colors={[BRAND, '#1a237e']}
            style={[cs.hero, { paddingTop: insets.top + 8 }]}
          >
            <View style={cs.heroNav}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={cs.heroBack} activeOpacity={0.85}>
                <Ionicons name="arrow-back" size={20} color={WHITE} />
              </TouchableOpacity>
              <Text style={cs.heroNavTitle}>Earnings</Text>
              <View style={{ width: 38 }} />
            </View>
            <ActivityIndicator color={WHITE + 'CC'} size="large" style={{ marginTop: 40, marginBottom: 40 }} />
          </LinearGradient>
        ) : (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            {/* ── Hero = header + balance (merged) ── */}
            <LinearGradient
              colors={[BRAND, '#1a237e', BRAND + 'F0']}
              style={[cs.hero, { paddingTop: insets.top + 8 }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={cs.heroOrb1} />
              <View style={cs.heroOrb2} />

              {/* Nav row */}
              <View style={cs.heroNav}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={cs.heroBack} activeOpacity={0.85}>
                  <Ionicons name="arrow-back" size={20} color={WHITE} />
                </TouchableOpacity>
                <Text style={cs.heroNavTitle}>Earnings</Text>
                <View style={{ width: 38 }} />
              </View>

              <Text style={cs.heroEyebrow}>TOTAL BALANCE</Text>
              <Text style={cs.heroAmount}>{fmtMoney(totalValue)}</Text>

              {/* Breakdown row */}
              <View style={cs.breakdownRow}>
                <View style={cs.breakdownItem}>
                  <Ionicons name="wallet-outline" size={11} color={WHITE + '90'} />
                  <Text style={cs.breakdownKey}>Wallet</Text>
                  <Text style={cs.breakdownVal}>{fmtMoney(walletBal)}</Text>
                </View>
                <View style={cs.breakdownSep} />
                <View style={cs.breakdownItem}>
                  <Ionicons name="star-outline" size={11} color={WHITE + '90'} />
                  <Text style={cs.breakdownKey}>Points</Text>
                  <Text style={cs.breakdownVal}>{fmtMoney(pointsValue)}</Text>
                </View>
                <View style={cs.breakdownSep} />
                <View style={cs.breakdownItem}>
                  <Ionicons name="git-network-outline" size={11} color={WHITE + '90'} />
                  <Text style={cs.breakdownKey}>Affiliates</Text>
                  <Text style={cs.breakdownVal}>{fmtMoney(affiliateBal)}</Text>
                </View>
              </View>

              {/* Action buttons */}
              <View style={cs.actionRow}>
                <TouchableOpacity style={cs.actionBtn} onPress={() => setAddFundsVisible(true)} activeOpacity={0.85}>
                  <View style={cs.actionBtnIcon}>
                    <Ionicons name="add" size={18} color={BRAND} />
                  </View>
                  <Text style={cs.actionBtnTxt}>Add Funds</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={cs.actionBtn}
                  onPress={() => navigation.navigate('SendMoneyScreen')}
                  activeOpacity={0.85}
                >
                  <View style={cs.actionBtnIcon}>
                    <Ionicons name="send" size={16} color={BRAND} />
                  </View>
                  <Text style={cs.actionBtnTxt}>Send</Text>
                </TouchableOpacity>

                <TouchableOpacity style={cs.actionBtn} onPress={() => navigation.navigate('WalletScreen')} activeOpacity={0.85}>
                  <View style={cs.actionBtnIcon}>
                    <Ionicons name="download" size={18} color={BRAND} />
                  </View>
                  <Text style={cs.actionBtnTxt}>Withdraw</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* ── My Accounts ── */}
            <View style={cs.sectionLabel}>
              <View style={cs.sectionAccent} />
              <Text style={cs.sectionTxt}>MY ACCOUNTS</Text>
            </View>

            <AccountCard
              accentColor={GOLD}
              icon="star"
              label="Points"
              value={`${fmtPoints(pointsBal)} pts`}
              sub={`≈ ${fmtMoney(pointsValue)} · Earn from daily activity`}
              onPress={() => navigation.navigate('PointsScreen', { points: pointsBal })}
            />
            <AccountCard
              accentColor={GREEN}
              icon="wallet"
              label="Wallet"
              value={fmtMoney(walletBal)}
              sub="Send · Withdraw · Receive"
              onPress={() => navigation.navigate('WalletScreen')}
            />
            <AccountCard
              accentColor={PURPLE}
              icon="git-network"
              label="Affiliates"
              value={fmtMoney(affiliateBal)}
              sub={`${totalReferrals} referral${totalReferrals !== 1 ? 's' : ''} · Earn from invites`}
              onPress={() => navigation.navigate('AffiliatesScreen')}
            />

            {/* ── How You Earn ── */}
            <View style={cs.sectionLabel}>
              <View style={cs.sectionAccent} />
              <Text style={cs.sectionTxt}>HOW YOU EARN</Text>
            </View>

            <View style={cs.earnCard}>
              {/* A — Points */}
              <View style={cs.earnItem}>
                <View style={[cs.earnIconWrap, { backgroundColor: GOLD + '18' }]}>
                  <Ionicons name="star" size={18} color={GOLD} />
                </View>
                <View style={cs.earnContent}>
                  <Text style={cs.earnTitle}>Earn Points</Text>
                  <Text style={cs.earnDesc}>Earn points by interacting on Hafrik.</Text>
                  <View style={cs.earnPills}>
                    {['Post +5', 'Comment +5', 'React +5', 'Views +0.001'].map((p, i) => (
                      <View key={i} style={[cs.earnPill, { backgroundColor: GOLD + '15' }]}>
                        <Text style={[cs.earnPillTxt, { color: GOLD }]}>{p}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              <View style={cs.earnDivider} />

              {/* B — Conversion */}
              <View style={cs.earnItem}>
                <View style={[cs.earnIconWrap, { backgroundColor: GREEN + '18' }]}>
                  <Ionicons name="swap-horizontal" size={18} color={GREEN} />
                </View>
                <View style={cs.earnContent}>
                  <Text style={cs.earnTitle}>Points to Money</Text>
                  <Text style={cs.earnDesc}>Points automatically convert into money value.</Text>
                  <View style={[cs.earnHighlight, { backgroundColor: GREEN + '12', borderColor: GREEN + '30' }]}>
                    <Text style={[cs.earnHighlightTxt, { color: GREEN }]}>1,000 points = ¥1.00</Text>
                  </View>
                </View>
              </View>

              <View style={cs.earnDivider} />

              {/* C — Daily Limit */}
              <View style={cs.earnItem}>
                <View style={[cs.earnIconWrap, { backgroundColor: ACCENT + '18' }]}>
                  <Ionicons name="time-outline" size={18} color={ACCENT} />
                </View>
                <View style={cs.earnContent}>
                  <Text style={cs.earnTitle}>Daily Limit</Text>
                  <Text style={cs.earnDesc}>
                    You can earn up to 10,000 points per day. Resets 24 hours after your last activity.
                  </Text>
                  <View style={[cs.earnHighlight, { backgroundColor: ACCENT + '10', borderColor: ACCENT + '28' }]}>
                    <Text style={[cs.earnHighlightTxt, { color: ACCENT }]}>Max: 10,000 pts / day</Text>
                  </View>
                </View>
              </View>

              <View style={cs.earnDivider} />

              {/* D — Affiliates */}
              <View style={cs.earnItem}>
                <View style={[cs.earnIconWrap, { backgroundColor: PURPLE + '18' }]}>
                  <Ionicons name="git-network" size={18} color={PURPLE} />
                </View>
                <View style={cs.earnContent}>
                  <Text style={cs.earnTitle}>Refer & Earn</Text>
                  <Text style={cs.earnDesc}>Earn when users sign up using your referral link.</Text>
                  <View style={cs.earnPills}>
                    {[
                      { label: 'Level 1  ¥0.15', color: PURPLE },
                      { label: 'Level 2  ¥0.10', color: VIOLET },
                      { label: 'Level 3  ¥0.05', color: '#4a1d96' },
                    ].map((lv, i) => (
                      <View key={i} style={[cs.earnPill, { backgroundColor: lv.color + '15' }]}>
                        <Text style={[cs.earnPillTxt, { color: lv.color }]}>{lv.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              <View style={cs.earnDivider} />

              {/* E — Withdraw */}
              <View style={[cs.earnItem, { paddingBottom: 0 }]}>
                <View style={[cs.earnIconWrap, { backgroundColor: TEXT_M + '14' }]}>
                  <Ionicons name="download-outline" size={18} color={TEXT_M} />
                </View>
                <View style={cs.earnContent}>
                  <Text style={cs.earnTitle}>Withdraw Earnings</Text>
                  <Text style={cs.earnDesc}>
                    Transfer your earnings to your wallet or withdraw to your bank anytime.
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Smart Tips ── */}
            <View style={cs.sectionLabel}>
              <View style={cs.sectionAccent} />
              <Text style={cs.sectionTxt}>TIPS TO EARN MORE</Text>
            </View>

            <View style={cs.tipsCard}>
              {[
                { icon: 'calendar-outline',  color: ACCENT,  text: 'Post consistently to increase your visibility and daily points' },
                { icon: 'chatbubbles-outline', color: GREEN,  text: 'Engage with others — comments and reactions both earn points' },
                { icon: 'share-social-outline', color: PURPLE, text: 'Share your referral link on social media to grow your network' },
                { icon: 'videocam-outline',   color: GOLD,   text: 'Create reels — trending video content earns bonus rewards' },
              ].map((tip, i) => (
                <View key={i} style={[cs.tipRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#F2F2F2' }]}>
                  <View style={[cs.tipIcon, { backgroundColor: tip.color + '14' }]}>
                    <Ionicons name={tip.icon} size={15} color={tip.color} />
                  </View>
                  <Text style={cs.tipText}>{tip.text}</Text>
                </View>
              ))}
            </View>

          </Animated.View>
        )}
      </ScrollView>

      <AddFundsModal
        visible={addFundsVisible}
        onClose={() => setAddFundsVisible(false)}
      />
    </View>
  );
}

const cs = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Hero (merged header + balance card)
  hero: {
    paddingHorizontal: 22, paddingBottom: 28, overflow: 'hidden',
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28, shadowRadius: 20, elevation: 12,
  },
  heroNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20,
  },
  heroBack: {
    width: 38, height: 38, borderRadius: 13,
    backgroundColor: WHITE + '1A', alignItems: 'center', justifyContent: 'center',
  },
  heroNavTitle: { fontSize: 16, fontWeight: '900', color: WHITE, fontFamily: FONT_B },
  heroOrb1: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: WHITE + '07', top: -60, right: -50 },
  heroOrb2: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: WHITE + '05', bottom: -40, left: -30 },
  heroEyebrow: { fontSize: 10, color: WHITE + '90', fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: FONT_R },
  heroAmount:  { fontSize: 42, fontWeight: '900', color: WHITE, fontFamily: FONT_B, letterSpacing: -2, marginTop: 4, marginBottom: 14 },

  // Breakdown
  breakdownRow:  { flexDirection: 'row', backgroundColor: WHITE + '10', borderRadius: 14, padding: 12, marginBottom: 18, gap: 0 },
  breakdownItem: { flex: 1, alignItems: 'center', gap: 3 },
  breakdownSep:  { width: 1, backgroundColor: WHITE + '20', marginVertical: 4 },
  breakdownKey:  { fontSize: 10, color: WHITE + '80', fontFamily: FONT_R, marginTop: 1 },
  breakdownVal:  { fontSize: 13, fontWeight: '800', color: WHITE, fontFamily: FONT_B },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, alignItems: 'center', gap: 7 },
  actionBtnIcon: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6,
  },
  actionBtnTxt: { fontSize: 11, fontWeight: '700', color: WHITE, fontFamily: FONT_M },

  // Section label
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginTop: 24, marginBottom: 10 },
  sectionAccent: { width: 3, height: 14, borderRadius: 2, backgroundColor: ACCENT },
  sectionTxt:    { fontSize: 11, fontWeight: '800', color: TEXT_M, letterSpacing: 1.4, fontFamily: FONT_B },

  // Account cards
  accCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: CARD, borderRadius: 18,
    padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  accIconWrap: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  accMid:      { flex: 1 },
  accLabel:    { fontSize: 10.5, fontWeight: '700', color: TEXT_M, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: FONT_B, marginBottom: 2 },
  accValue:    { fontSize: 20, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B, letterSpacing: -0.5 },
  accSub:      { fontSize: 11.5, color: TEXT_M, fontFamily: FONT_R, marginTop: 2 },

  // How You Earn card
  earnCard: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: CARD, borderRadius: 20,
    paddingTop: 4, paddingBottom: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  earnItem:    { flexDirection: 'row', gap: 14, paddingHorizontal: 18, paddingVertical: 16 },
  earnDivider: { height: 1, backgroundColor: '#F2F2F2', marginHorizontal: 18 },
  earnIconWrap:{ width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  earnContent: { flex: 1, gap: 6 },
  earnTitle:   { fontSize: 14, fontWeight: '800', color: TEXT_H, fontFamily: FONT_B },
  earnDesc:    { fontSize: 12.5, color: TEXT_M, fontFamily: FONT_R, lineHeight: 18 },
  earnPills:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  earnPill:    { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  earnPillTxt: { fontSize: 11, fontWeight: '700', fontFamily: FONT_M },
  earnHighlight: {
    alignSelf: 'flex-start', borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 6, marginTop: 2,
  },
  earnHighlightTxt: { fontSize: 13, fontWeight: '800', fontFamily: FONT_B },

  // Smart Tips card
  tipsCard: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: CARD, borderRadius: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
    overflow: 'hidden',
  },
  tipRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  tipIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tipText: { flex: 1, fontSize: 13, color: TEXT_H, lineHeight: 18, fontFamily: FONT_R },
});

// ─── AddFunds Modal Styles ────────────────────────────────────────────────────
