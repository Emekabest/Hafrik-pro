// src/pages/earnings/EarningsScreen.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, Animated, RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";

import { useAuth } from "../../AuthContext";
import { Colors } from "../../theme";
import AppDetails from "../../helpers/appdetails";

const { width: SCREEN_W } = Dimensions.get("window");

const BRAND   = Colors.primaryDark;
const ACCENT  = Colors.primary;
const BG      = Colors.background ?? "#F7F8FA";
const CARD    = Colors.white;
const BORDER  = Colors.borderSoft ?? Colors.border;
const TEXT_H  = Colors.black;
const TEXT_B  = Colors.black;
const TEXT_M  = Colors.secondaryText;
const WHITE   = Colors.white;
const GREEN   = Colors.success ?? "#22c55e";
const RED     = Colors.destructive ?? "#d32f2f";
const ORANGE  = Colors.warm ?? "#f4a535";

const FONT_B = AppDetails?.fontFamily?.redex?.bold ?? "System";
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? "System";
const FONT_M = AppDetails?.fontFamily?.inter?.medium ?? "System";

// ── Dummy transactions ──────────────────────────────────────────────────────
const DUMMY_TRANSACTIONS = [
  { id: "t1", type: "credit", title: "Ad Revenue", desc: "Video ad impression earnings", amount: 2450, currency: "NGN", date: "2026-03-06T10:30:00Z", icon: "play-circle", color: ACCENT },
  { id: "t2", type: "credit", title: "Post Boost Refund", desc: "Unused boost budget returned", amount: 500, currency: "NGN", date: "2026-03-05T14:20:00Z", icon: "arrow-undo-circle", color: GREEN },
  { id: "t3", type: "debit",  title: "Boosted Post", desc: "Post #4821 promotion — 7 days", amount: 3000, currency: "NGN", date: "2026-03-04T09:15:00Z", icon: "rocket", color: ORANGE },
  { id: "t4", type: "credit", title: "Points Converted", desc: "250 pts → wallet", amount: 1250, currency: "NGN", date: "2026-03-03T18:45:00Z", icon: "star", color: Colors.star ?? "#ffd700" },
  { id: "t5", type: "credit", title: "Referral Bonus", desc: "New user sign-up via your link", amount: 1000, currency: "NGN", date: "2026-03-02T11:00:00Z", icon: "people", color: ACCENT },
  { id: "t6", type: "debit",  title: "Page Promotion", desc: "Business page ad — 3 days", amount: 1500, currency: "NGN", date: "2026-03-01T08:30:00Z", icon: "storefront", color: RED },
  { id: "t7", type: "credit", title: "Content Reward", desc: "Trending reel bonus", amount: 5000, currency: "NGN", date: "2026-02-28T16:10:00Z", icon: "videocam", color: GREEN },
  { id: "t8", type: "debit",  title: "Withdrawal", desc: "Bank transfer to GTBank ****1234", amount: 10000, currency: "NGN", date: "2026-02-27T12:00:00Z", icon: "arrow-down-circle", color: RED },
];

const fmtMoney = (amount, currency = "NGN") => {
  const sym = currency === "NGN" ? "₦" : currency === "USD" ? "$" : currency === "GHS" ? "₵" : currency + " ";
  return `${sym}${Number(amount ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtDate = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 172_800_000) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

// ── Quick-action chip ───────────────────────────────────────────────────────
const QuickAction = ({ icon, label, onPress, gradient }) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={st.qaWrap}>
    <LinearGradient colors={gradient} style={st.qaIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <Ionicons name={icon} size={18} color={WHITE} />
    </LinearGradient>
    <Text style={st.qaLabel}>{label}</Text>
  </TouchableOpacity>
);

// ── Transaction row ─────────────────────────────────────────────────────────
const TxRow = ({ tx }) => {
  const isCredit = tx.type === "credit";
  return (
    <View style={st.txRow}>
      <View style={[st.txIconWrap, { backgroundColor: tx.color + "18" }]}>
        <Ionicons name={tx.icon} size={18} color={tx.color} />
      </View>
      <View style={st.txMid}>
        <Text style={st.txTitle} numberOfLines={1}>{tx.title}</Text>
        <Text style={st.txDesc} numberOfLines={1}>{tx.desc}</Text>
      </View>
      <View style={st.txRight}>
        <Text style={[st.txAmount, isCredit ? st.txCredit : st.txDebit]}>
          {isCredit ? "+" : "−"}{fmtMoney(tx.amount, tx.currency)}
        </Text>
        <Text style={st.txDate}>{fmtDate(tx.date)}</Text>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
export default function EarningsScreen() {
  const navigation = useNavigation();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const [loading, setLoading]   = useState(true);
  const [wallet, setWallet]     = useState(null);
  const [points, setPoints]     = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab]   = useState("all"); // all | credits | debits

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const fetchBalance = useCallback(async () => {
    try {
      const res = await axios.get("https://hafrik.com/api/v1/balance/balance.php", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.status === "success") {
        setWallet(res.data.data.wallet);
        setPoints(res.data.data.points);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchBalance().then(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBalance();
    setRefreshing(false);
  }, [fetchBalance]);

  const filteredTx = DUMMY_TRANSACTIONS.filter((tx) => {
    if (activeTab === "credits") return tx.type === "credit";
    if (activeTab === "debits") return tx.type === "debit";
    return true;
  });

  const totalIn = DUMMY_TRANSACTIONS.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const totalOut = DUMMY_TRANSACTIONS.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0);

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      {/* ── Top bar ── */}
      <View style={st.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.85} style={st.backBtn}>
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </TouchableOpacity>
        <Text style={st.topTitle}>Earnings</Text>
        <TouchableOpacity activeOpacity={0.85} style={st.topRight}>
          <Ionicons name="ellipsis-horizontal" size={20} color={WHITE + "80"} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={st.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={WHITE} />}
      >
        {/* ── Hero Balance Card ── */}
        <Animated.View style={[st.heroWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient
            colors={[BRAND, ACCENT + "EE", ACCENT]}
            style={st.heroGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Decorative circles */}
            <View style={[st.heroCircle, st.heroCircle1]} />
            <View style={[st.heroCircle, st.heroCircle2]} />

            <Text style={st.heroLabel}>Total Balance</Text>
            {loading ? (
              <ActivityIndicator color={WHITE} size="small" style={{ marginVertical: 12 }} />
            ) : (
              <Text style={st.heroAmount}>
                {wallet ? fmtMoney(wallet.available, wallet.currency) : "₦0.00"}
              </Text>
            )}

            {/* Points row */}
            <View style={st.pointsRow}>
              <View style={st.pointsDot} />
              <Text style={st.pointsLabel}>Hafrik Points</Text>
              <Text style={st.pointsValue}>
                {loading ? "..." : points ? `${Number(points.available).toLocaleString()} pts` : "0 pts"}
              </Text>
            </View>

            {/* In / Out summary */}
            <View style={st.ioRow}>
              <View style={st.ioItem}>
                <View style={st.ioIconWrap}>
                  <Ionicons name="arrow-down" size={12} color={WHITE} />
                </View>
                <View>
                  <Text style={st.ioLabel}>Income</Text>
                  <Text style={st.ioValue}>{fmtMoney(totalIn)}</Text>
                </View>
              </View>
              <View style={st.ioDivider} />
              <View style={st.ioItem}>
                <View style={[st.ioIconWrap, { backgroundColor: RED + "55" }]}>
                  <Ionicons name="arrow-up" size={12} color={WHITE} />
                </View>
                <View>
                  <Text style={st.ioLabel}>Spent</Text>
                  <Text style={st.ioValue}>{fmtMoney(totalOut)}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Quick Actions ── */}
        <View style={st.qaRow}>
          <QuickAction
            icon="arrow-down-circle"
            label="Withdraw"
            gradient={[GREEN, Colors.tealAccentDark ?? "#0a9e78"]}
            onPress={() => {}}
          />
          <QuickAction
            icon="rocket"
            label="Boost Post"
            gradient={[ACCENT, BRAND]}
            onPress={() => {}}
          />
          <QuickAction
            icon="swap-horizontal"
            label="Convert Pts"
            gradient={[ORANGE, Colors.orangeStrong ?? "#f97316"]}
            onPress={() => {}}
          />
          <QuickAction
            icon="gift"
            label="Rewards"
            gradient={[Colors.purple ?? "#9c27b0", Colors.violetDeep ?? "#6d28d9"]}
            onPress={() => {}}
          />
        </View>

        {/* ── Info Card ── */}
        <View style={st.infoCard}>
          <View style={st.infoIconWrap}>
            <Ionicons name="information-circle" size={20} color={ACCENT} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.infoTitle}>How Earnings Work</Text>
            <Text style={st.infoText}>
              Earn money from ad revenue on your posts, reels, and pages. Accumulate Hafrik Points through engagement, referrals, and content rewards — then convert them to wallet balance anytime. Boost
              your posts or pages directly from your wallet.
            </Text>
          </View>
        </View>

        {/* ── Transactions ── */}
        <View style={st.txSection}>
          <View style={st.txHeader}>
            <Text style={st.txHeaderTitle}>Transactions</Text>
            <TouchableOpacity activeOpacity={0.85}>
              <Text style={st.txSeeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={st.tabRow}>
            {[
              { key: "all", label: "All" },
              { key: "credits", label: "Income" },
              { key: "debits", label: "Spent" },
            ].map((tab) => {
              const active = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[st.tab, active && st.tabActive]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.85}
                >
                  <Text style={[st.tabText, active && st.tabTextActive]}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Transaction list */}
          <View style={st.txList}>
            {filteredTx.length === 0 ? (
              <View style={st.emptyTx}>
                <Ionicons name="receipt-outline" size={36} color={BORDER} />
                <Text style={st.emptyTxText}>No transactions yet</Text>
              </View>
            ) : (
              filteredTx.map((tx) => <TxRow key={tx.id} tx={tx} />)
            )}
          </View>
        </View>

        {/* ── Earning Tips ── */}
        <View style={st.tipsCard}>
          <Text style={st.tipsTitle}>Tips to Earn More</Text>
          {[
            { icon: "videocam", text: "Post reels — trending reels earn bonus rewards" },
            { icon: "people", text: "Refer friends — get ₦1,000 per sign-up" },
            { icon: "storefront", text: "Create a page — monetize with page promotions" },
            { icon: "star", text: "Stay active — daily engagement earns points" },
          ].map((tip, i) => (
            <View key={i} style={st.tipRow}>
              <View style={st.tipIconWrap}>
                <Ionicons name={tip.icon} size={14} color={ACCENT} />
              </View>
              <Text style={st.tipText}>{tip.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: BRAND },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: WHITE + "1A",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: WHITE,
    letterSpacing: -0.2,
    fontFamily: FONT_B,
  },
  topRight: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: WHITE + "1A",
    alignItems: "center",
    justifyContent: "center",
  },

  scroll: { flex: 1, backgroundColor: BG, borderTopLeftRadius: 26, borderTopRightRadius: 26 },

  // Hero
  heroWrap: { marginHorizontal: 16, marginTop: 20 },
  heroGrad: {
    borderRadius: 24,
    padding: 24,
    overflow: "hidden",
  },
  heroCircle: {
    position: "absolute",
    borderRadius: 9999,
    backgroundColor: WHITE + "0A",
  },
  heroCircle1: { width: 180, height: 180, top: -60, right: -40 },
  heroCircle2: { width: 120, height: 120, bottom: -30, left: -20 },
  heroLabel: {
    fontSize: 13,
    color: WHITE + "B0",
    fontWeight: "600",
    fontFamily: FONT_R,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroAmount: {
    fontSize: 36,
    fontWeight: "900",
    color: WHITE,
    fontFamily: FONT_B,
    marginTop: 4,
    marginBottom: 16,
    letterSpacing: -1,
  },
  pointsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: WHITE + "18",
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  pointsDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.star ?? "#ffd700" },
  pointsLabel: { fontSize: 12, color: WHITE + "CC", fontWeight: "600", fontFamily: FONT_M },
  pointsValue: { fontSize: 13, color: WHITE, fontWeight: "900", fontFamily: FONT_B },

  // Income / Spent
  ioRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE + "14",
    borderRadius: 16,
    padding: 14,
  },
  ioItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  ioIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: GREEN + "55",
    alignItems: "center",
    justifyContent: "center",
  },
  ioLabel: { fontSize: 11, color: WHITE + "99", fontWeight: "600", fontFamily: FONT_R },
  ioValue: { fontSize: 14, color: WHITE, fontWeight: "900", fontFamily: FONT_B, marginTop: 1 },
  ioDivider: { width: 1, height: 30, backgroundColor: WHITE + "22", marginHorizontal: 8 },

  // Quick actions
  qaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 10,
  },
  qaWrap: { alignItems: "center", flex: 1, gap: 6 },
  qaIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  qaLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT_B,
    textAlign: "center",
    fontFamily: FONT_M,
  },

  // Info card
  infoCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: ACCENT + "0F",
    borderWidth: 1,
    borderColor: ACCENT + "22",
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
  },
  infoIconWrap: { marginTop: 1 },
  infoTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: BRAND,
    fontFamily: FONT_B,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12.5,
    color: TEXT_M,
    lineHeight: 19,
    fontFamily: FONT_R,
  },

  // Transactions section
  txSection: {
    marginTop: 24,
    backgroundColor: CARD,
    borderRadius: 22,
    marginHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  txHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  txHeaderTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: TEXT_H,
    fontFamily: FONT_B,
  },
  txSeeAll: {
    fontSize: 13,
    fontWeight: "700",
    color: ACCENT,
    fontFamily: FONT_M,
  },

  // Tabs
  tabRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: BG,
  },
  tabActive: { backgroundColor: BRAND },
  tabText: { fontSize: 12, fontWeight: "700", color: TEXT_M, fontFamily: FONT_M },
  tabTextActive: { color: WHITE },

  // Tx list
  txList: { paddingHorizontal: 10 },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER + "66",
  },
  txIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  txMid: { flex: 1 },
  txTitle: { fontSize: 13.5, fontWeight: "800", color: TEXT_H, fontFamily: FONT_B },
  txDesc: { fontSize: 11.5, color: TEXT_M, marginTop: 2, fontFamily: FONT_R },
  txRight: { alignItems: "flex-end" },
  txAmount: { fontSize: 13.5, fontWeight: "900", fontFamily: FONT_B },
  txCredit: { color: GREEN },
  txDebit: { color: RED },
  txDate: { fontSize: 10.5, color: TEXT_M, marginTop: 2, fontFamily: FONT_R },

  emptyTx: { alignItems: "center", paddingVertical: 30, gap: 8 },
  emptyTxText: { fontSize: 13, color: TEXT_M, fontFamily: FONT_R },

  // Tips
  tipsCard: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 18,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: TEXT_H,
    fontFamily: FONT_B,
    marginBottom: 14,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  tipIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: ACCENT + "14",
    alignItems: "center",
    justifyContent: "center",
  },
  tipText: {
    flex: 1,
    fontSize: 12.5,
    color: TEXT_B,
    lineHeight: 18,
    fontFamily: FONT_R,
  },
});
