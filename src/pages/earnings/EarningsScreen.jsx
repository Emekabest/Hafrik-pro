// src/pages/earnings/EarningsScreen.jsx
import React, {
  useEffect, useState, useCallback, useRef,
} from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Animated, RefreshControl, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform,
  TouchableWithoutFeedback, Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image as ExpoImage } from "expo-image";
import { useNavigation } from "@react-navigation/native";

import { useAuth } from "../../AuthContext";
import { Colors } from "../../theme";
import AppDetails from "../../helpers/appdetails";
import {
  getWalletBalance,
  getWalletTransactions,
  transferMoney,
  withdrawPoints,
  withdrawAffiliates,
} from "../../api/walletApi";

// ─── Design tokens ────────────────────────────────────────────────────────────
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const BG     = Colors.background ?? "#F7F8FA";
const CARD   = Colors.white;
const BORDER = Colors.borderSoft ?? Colors.border;
const TEXT_H = Colors.black;
const TEXT_M = Colors.secondaryText;
const WHITE  = Colors.white;
const GREEN  = Colors.success ?? "#22c55e";
const RED    = Colors.destructive ?? "#d32f2f";
const ORANGE = Colors.warm ?? "#f4a535";
const GOLD   = Colors.star ?? "#ffd700";

const FONT_B = AppDetails?.fontFamily?.redex?.bold     ?? "System";
const FONT_R = AppDetails?.fontFamily?.inter?.regular  ?? "System";
const FONT_M = AppDetails?.fontFamily?.inter?.medium   ?? "System";

const AVATAR_FALLBACK = "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtMoney = (amount, currency = "CNY") => {
  const sym = currency === "CNY" ? "¥" : currency === "USD" ? "$" : currency === "EUR" ? "€" : `${currency} `;
  return `${sym}${Number(amount ?? 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtDate = (raw) => {
  const d = new Date(raw);
  if (isNaN(d)) return raw;
  const now = new Date();
  const diff = now - d;
  if (diff < 60_000)      return "Just now";
  if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)  return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 172_800_000) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const txIcon = (nodeType, txType) => {
  const map = {
    user:         txType === "in" ? "arrow-down-circle"  : "arrow-up-circle",
    tip:          "gift",
    boost:        "rocket",
    points:       "star",
    affiliate:    "git-network",
    withdrawal:   "card",
    monetization: "bar-chart",
  };
  return map[nodeType] ?? (txType === "in" ? "arrow-down-circle" : "arrow-up-circle");
};

const txColor = (txType) => (txType === "in" ? GREEN : RED);

// ─── Transaction row ──────────────────────────────────────────────────────────
const TxRow = ({ tx }) => {
  const isIn    = tx.type === "in";
  const color   = txColor(tx.type);
  const icon    = txIcon(tx.node_type, tx.type);
  const name    = tx.user?.name ?? "Hafrik";
  const avatar  = tx.user?.avatar ?? null;

  return (
    <View style={st.txRow}>
      {avatar ? (
        <ExpoImage
          source={{ uri: avatar }}
          style={st.txAvatar}
          contentFit="cover"
          defaultSource={{ uri: AVATAR_FALLBACK }}
        />
      ) : (
        <View style={[st.txIconWrap, { backgroundColor: color + "18" }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
      )}
      <View style={st.txMid}>
        <Text style={st.txTitle} numberOfLines={1}>
          {isIn ? `From ${name}` : `To ${name}`}
        </Text>
        <Text style={st.txDesc} numberOfLines={1}>
          {(tx.node_type ?? "transfer").charAt(0).toUpperCase() + (tx.node_type ?? "transfer").slice(1)}
          {" · "}
          {fmtDate(tx.date)}
        </Text>
      </View>
      <View style={st.txRight}>
        <Text style={[st.txAmount, isIn ? st.txCredit : st.txDebit]}>
          {isIn ? "+" : "−"}{fmtMoney(tx.amount)}
        </Text>
        <Text style={st.txId}>#{tx.transaction_id}</Text>
      </View>
    </View>
  );
};

// ─── Action modal (amount + optional userId) ─────────────────────────────────
const ActionModal = ({
  visible, onClose, title, subtitle, icon, gradient,
  showUserId, availableLabel, availableValue,
  onSubmit, submitting, error,
}) => {
  const [amount,  setAmount]  = useState("");
  const [userId,  setUserId]  = useState("");

  const reset = () => { setAmount(""); setUserId(""); };
  const close = () => { reset(); onClose(); };

  const handleSubmit = () => {
    onSubmit({ amount: amount.trim(), userId: userId.trim() });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={st.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={st.modalSheet}>
              <View style={st.modalHandle} />

              {/* Header */}
              <View style={st.modalHeader}>
                <LinearGradient colors={gradient} style={st.modalIconWrap} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name={icon} size={20} color={WHITE} />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={st.modalTitle}>{title}</Text>
                  {!!subtitle && <Text style={st.modalSubtitle}>{subtitle}</Text>}
                </View>
                <TouchableOpacity onPress={close} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={22} color={TEXT_M} />
                </TouchableOpacity>
              </View>

              {/* Available balance hint */}
              {availableLabel != null && (
                <View style={st.availableRow}>
                  <Text style={st.availableLabel}>{availableLabel}</Text>
                  <Text style={st.availableValue}>{availableValue}</Text>
                </View>
              )}

              {/* User ID field */}
              {showUserId && (
                <>
                  <Text style={st.inputLabel}>Recipient User ID</Text>
                  <TextInput
                    style={st.modalInput}
                    value={userId}
                    onChangeText={setUserId}
                    placeholder="Enter user ID"
                    placeholderTextColor={TEXT_M}
                    keyboardType="numeric"
                  />
                </>
              )}

              {/* Amount field */}
              <Text style={st.inputLabel}>Amount</Text>
              <TextInput
                style={st.modalInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={TEXT_M}
                keyboardType="decimal-pad"
              />

              {!!error && <Text style={st.modalError}>{error}</Text>}

              <View style={st.modalActions}>
                <TouchableOpacity style={st.modalCancelBtn} onPress={close} activeOpacity={0.75}>
                  <Text style={st.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[st.modalSubmitBtn, { backgroundColor: gradient[0] }, submitting && st.modalBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting
                    ? <ActivityIndicator size="small" color={WHITE} />
                    : <Text style={st.modalSubmitText}>Confirm</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
export default function EarningsScreen() {
  const navigation = useNavigation();
  const { token }  = useAuth();
  const insets     = useSafeAreaInsets();

  // ── Balance state ──────────────────────────────────────────────────────────
  const [balance,    setBalance]    = useState(null);   // { wallet_balance, affiliate_balance, points, monetization_balance }
  const [balLoading, setBalLoading] = useState(true);

  // ── Transactions state ─────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState([]);
  const [txPage,       setTxPage]       = useState(1);
  const [txTotal,      setTxTotal]      = useState(0);
  const [txLoading,    setTxLoading]    = useState(false);
  const [txLoadMore,   setTxLoadMore]   = useState(false);
  const [activeTab,    setActiveTab]    = useState("all");

  // ── Pull-to-refresh ────────────────────────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false);

  // ── Modal state ────────────────────────────────────────────────────────────
  const [sendMoneyOpen,      setSendMoneyOpen]      = useState(false);
  const [withdrawPtsOpen,    setWithdrawPtsOpen]    = useState(false);
  const [withdrawAffOpen,    setWithdrawAffOpen]    = useState(false);
  const [modalSubmitting,    setModalSubmitting]    = useState(false);
  const [modalError,         setModalError]         = useState("");

  // ── Animations ────────────────────────────────────────────────────────────
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // ── Fetch balance ──────────────────────────────────────────────────────────
  const fetchBalance = useCallback(async () => {
    try {
      const json = await getWalletBalance(token);
      if (json?.status === "success") setBalance(json.data);
    } catch { /* silent */ }
    setBalLoading(false);
  }, [token]);

  // ── Fetch transactions (page 1 reset) ─────────────────────────────────────
  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const json = await getWalletTransactions(token, 1, 20);
      const list  = json?.data?.transactions ?? json?.transactions ?? [];
      const total = json?.data?.total ?? list.length;
      setTransactions(list);
      setTxTotal(total);
      setTxPage(1);
    } catch { /* silent */ }
    setTxLoading(false);
  }, [token]);

  // ── Load more transactions ─────────────────────────────────────────────────
  const loadMoreTransactions = useCallback(async () => {
    if (txLoadMore || transactions.length >= txTotal) return;
    const nextPage = txPage + 1;
    setTxLoadMore(true);
    try {
      const json = await getWalletTransactions(token, nextPage, 20);
      const list  = json?.data?.transactions ?? json?.transactions ?? [];
      setTransactions((prev) => [...prev, ...list]);
      setTxPage(nextPage);
    } catch { /* silent */ }
    setTxLoadMore(false);
  }, [token, txPage, txTotal, transactions.length, txLoadMore]);

  // ── Refresh everything ─────────────────────────────────────────────────────
  const refreshAll = useCallback(async () => {
    await Promise.all([fetchBalance(), fetchTransactions()]);
  }, [fetchBalance, fetchTransactions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }, [refreshAll]);

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    refreshAll().then(() => {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    });
  }, []);

  // ── Wallet action helpers ──────────────────────────────────────────────────
  const handleSendMoney = useCallback(async ({ amount, userId }) => {
    if (!userId || !amount) { setModalError("Please fill in all fields."); return; }
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) { setModalError("Enter a valid amount."); return; }
    setModalSubmitting(true); setModalError("");
    try {
      const json = await transferMoney(token, userId, num);
      if (json?.status === "success") {
        setSendMoneyOpen(false);
        Alert.alert("Sent!", json.message ?? "Transfer successful.");
        refreshAll();
      } else {
        setModalError(json?.message ?? "Transfer failed.");
      }
    } catch (e) {
      setModalError(e?.message ?? "Network error.");
    }
    setModalSubmitting(false);
  }, [token, refreshAll]);

  const handleWithdrawPoints = useCallback(async ({ amount }) => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) { setModalError("Enter a valid amount."); return; }
    setModalSubmitting(true); setModalError("");
    try {
      const json = await withdrawPoints(token, num);
      if (json?.status === "success") {
        setWithdrawPtsOpen(false);
        Alert.alert("Done!", json.message ?? "Points converted to wallet.");
        refreshAll();
      } else {
        setModalError(json?.message ?? "Conversion failed.");
      }
    } catch (e) {
      setModalError(e?.message ?? "Network error.");
    }
    setModalSubmitting(false);
  }, [token, refreshAll]);

  const handleWithdrawAffiliate = useCallback(async ({ amount }) => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) { setModalError("Enter a valid amount."); return; }
    setModalSubmitting(true); setModalError("");
    try {
      const json = await withdrawAffiliates(token, num);
      if (json?.status === "success") {
        setWithdrawAffOpen(false);
        Alert.alert("Done!", json.message ?? "Affiliate earnings moved to wallet.");
        refreshAll();
      } else {
        setModalError(json?.message ?? "Withdrawal failed.");
      }
    } catch (e) {
      setModalError(e?.message ?? "Network error.");
    }
    setModalSubmitting(false);
  }, [token, refreshAll]);

  // ── Modal open helper (clear error) ───────────────────────────────────────
  const openModal = (setter) => { setModalError(""); setter(true); };

  // ── Filtered transactions for tab ─────────────────────────────────────────
  const filteredTx = transactions.filter((tx) => {
    if (activeTab === "in")  return tx.type === "in";
    if (activeTab === "out") return tx.type === "out";
    return true;
  });

  // ── Balance values ─────────────────────────────────────────────────────────
  const walletBal   = balance?.wallet_balance      ?? 0;
  const affiliateBal = balance?.affiliate_balance  ?? 0;
  const pointsBal   = balance?.points              ?? 0;
  const monetBal    = balance?.monetization_balance ?? 0;

  // ── List header (everything above the transaction rows) ────────────────────
  const ListHeader = () => (
    <>
      {/* ── Hero Balance Card ── */}
      <Animated.View style={[st.heroWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient
          colors={[BRAND, ACCENT + "EE", ACCENT]}
          style={st.heroGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[st.heroCircle, st.heroCircle1]} />
          <View style={[st.heroCircle, st.heroCircle2]} />

          <Text style={st.heroLabel}>Wallet Balance</Text>
          {balLoading ? (
            <ActivityIndicator color={WHITE} size="small" style={{ marginVertical: 14 }} />
          ) : (
            <Text style={st.heroAmount}>{fmtMoney(walletBal)}</Text>
          )}

          {/* Secondary balances row */}
          <View style={st.secBalRow}>
            <View style={st.secBalItem}>
              <Text style={st.secBalLabel}>Affiliate</Text>
              <Text style={st.secBalValue}>{fmtMoney(affiliateBal)}</Text>
            </View>
            <View style={st.secBalDivider} />
            <View style={st.secBalItem}>
              <Text style={st.secBalLabel}>Monetization</Text>
              <Text style={st.secBalValue}>{fmtMoney(monetBal)}</Text>
            </View>
          </View>

          {/* Points pill — tappable → PointsScreen */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={st.pointsRow}
            onPress={() => navigation.navigate("PointsScreen", { points: pointsBal })}
          >
            <View style={st.pointsDot} />
            <Text style={st.pointsLabel}>Hafrik Points</Text>
            <Text style={st.pointsValue}>
              {balLoading ? "..." : `${Number(pointsBal).toLocaleString()} pts`}
            </Text>
            <Ionicons name="chevron-forward" size={13} color={WHITE + "AA"} style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>

      {/* ── Quick Actions ── */}
      <View style={st.qaRow}>
        <QuickAction
          icon="send"
          label="Send Money"
          gradient={[ACCENT, BRAND]}
          onPress={() => openModal(setSendMoneyOpen)}
        />
        <QuickAction
          icon="star"
          label="Convert Pts"
          gradient={[ORANGE, Colors.orangeStrong ?? "#f97316"]}
          onPress={() => openModal(setWithdrawPtsOpen)}
        />
        <QuickAction
          icon="git-network"
          label="Withdraw Aff."
          gradient={[Colors.purple ?? "#9c27b0", Colors.violetDeep ?? "#6d28d9"]}
          onPress={() => openModal(setWithdrawAffOpen)}
        />
        <QuickAction
          icon="card"
          label="Withdraw"
          gradient={[BRAND, ACCENT]}
          onPress={() => Alert.alert("Coming Soon", "Withdraw to bank is coming soon.")}
        />
      </View>

      {/* ── Transactions header + tabs ── */}
      <View style={st.txSection}>
        <View style={st.txHeader}>
          <Text style={st.txHeaderTitle}>Transactions</Text>
          <Text style={st.txCount}>{txTotal} total</Text>
        </View>
        <View style={st.tabRow}>
          {[
            { key: "all", label: "All" },
            { key: "in",  label: "Income" },
            { key: "out", label: "Spent" },
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
      </View>
    </>
  );

  const ListFooter = () => (
    <>
      {txLoadMore && (
        <ActivityIndicator color={ACCENT} style={{ marginVertical: 16 }} />
      )}
      {!txLoading && filteredTx.length === 0 && (
        <View style={st.emptyTx}>
          <Ionicons name="receipt-outline" size={36} color={BORDER} />
          <Text style={st.emptyTxText}>No transactions yet</Text>
        </View>
      )}
      {/* Earn tips */}
      <View style={st.tipsCard}>
        <Text style={st.tipsTitle}>Tips to Earn More</Text>
        {[
          { icon: "videocam",   text: "Post reels — trending reels earn bonus rewards" },
          { icon: "people",     text: "Refer friends — earn per successful sign-up" },
          { icon: "storefront", text: "Create a page — monetize with page promotions" },
          { icon: "star",       text: "Stay active — daily engagement earns points" },
        ].map((tip, i) => (
          <View key={i} style={st.tipRow}>
            <View style={st.tipIconWrap}>
              <Ionicons name={tip.icon} size={14} color={ACCENT} />
            </View>
            <Text style={st.tipText}>{tip.text}</Text>
          </View>
        ))}
      </View>
    </>
  );

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      {/* ── Top bar ── */}
      <View style={st.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.85} style={st.backBtn}>
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </TouchableOpacity>
        <Text style={st.topTitle}>Earnings & Wallet</Text>
        <View style={st.topRight} />
      </View>

      <FlatList
        style={st.list}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        data={filteredTx}
        keyExtractor={(item) => String(item.transaction_id)}
        renderItem={({ item }) => <TxRow tx={item} />}
        ListHeaderComponent={<ListHeader />}
        ListFooterComponent={<ListFooter />}
        onEndReached={loadMoreTransactions}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={WHITE} />
        }
      />

      {/* ── Send Money Modal ── */}
      <ActionModal
        visible={sendMoneyOpen}
        onClose={() => setSendMoneyOpen(false)}
        title="Send Money"
        subtitle="Transfer wallet balance to another user"
        icon="send"
        gradient={[ACCENT, BRAND]}
        showUserId
        availableLabel="Available Balance"
        availableValue={fmtMoney(walletBal)}
        onSubmit={handleSendMoney}
        submitting={modalSubmitting}
        error={modalError}
      />

      {/* ── Convert Points Modal ── */}
      <ActionModal
        visible={withdrawPtsOpen}
        onClose={() => setWithdrawPtsOpen(false)}
        title="Convert Points"
        subtitle="Convert Hafrik Points to wallet balance"
        icon="star"
        gradient={[ORANGE, Colors.orangeStrong ?? "#f97316"]}
        showUserId={false}
        availableLabel="Available Points"
        availableValue={`${Number(pointsBal).toLocaleString()} pts`}
        onSubmit={handleWithdrawPoints}
        submitting={modalSubmitting}
        error={modalError}
      />

      {/* ── Withdraw Affiliate Modal ── */}
      <ActionModal
        visible={withdrawAffOpen}
        onClose={() => setWithdrawAffOpen(false)}
        title="Withdraw Affiliate"
        subtitle="Move affiliate earnings to your wallet"
        icon="git-network"
        gradient={[Colors.purple ?? "#9c27b0", Colors.violetDeep ?? "#6d28d9"]}
        showUserId={false}
        availableLabel="Affiliate Balance"
        availableValue={fmtMoney(affiliateBal)}
        onSubmit={handleWithdrawAffiliate}
        submitting={modalSubmitting}
        error={modalError}
      />
    </View>
  );
}

// ─── Quick action chip ────────────────────────────────────────────────────────
const QuickAction = ({ icon, label, onPress, gradient }) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={st.qaWrap}>
    <LinearGradient colors={gradient} style={st.qaIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <Ionicons name={icon} size={18} color={WHITE} />
    </LinearGradient>
    <Text style={st.qaLabel}>{label}</Text>
  </TouchableOpacity>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root:  { flex: 1, backgroundColor: BRAND },

  // Top bar
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 10,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 14,
    backgroundColor: WHITE + "1A",
    alignItems: "center", justifyContent: "center",
  },
  topTitle: { fontSize: 17, fontWeight: "900", color: WHITE, letterSpacing: -0.2, fontFamily: FONT_B },
  topRight: { width: 38 },

  list: { flex: 1, backgroundColor: BG, borderTopLeftRadius: 26, borderTopRightRadius: 26 },

  // Hero
  heroWrap: { marginHorizontal: 16, marginTop: 20 },
  heroGrad: { borderRadius: 24, padding: 24, overflow: "hidden" },
  heroCircle: { position: "absolute", borderRadius: 9999, backgroundColor: WHITE + "0A" },
  heroCircle1: { width: 180, height: 180, top: -60, right: -40 },
  heroCircle2: { width: 120, height: 120, bottom: -30, left: -20 },
  heroLabel: {
    fontSize: 12, color: WHITE + "B0", fontWeight: "600",
    fontFamily: FONT_R, letterSpacing: 1, textTransform: "uppercase",
  },
  heroAmount: {
    fontSize: 36, fontWeight: "900", color: WHITE,
    fontFamily: FONT_B, marginTop: 4, marginBottom: 16, letterSpacing: -1,
  },

  // Secondary balances
  secBalRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: WHITE + "14", borderRadius: 14, padding: 12,
    marginBottom: 14,
  },
  secBalItem: { flex: 1, alignItems: "center" },
  secBalDivider: { width: 1, height: 28, backgroundColor: WHITE + "22", marginHorizontal: 8 },
  secBalLabel: { fontSize: 10, color: WHITE + "99", fontWeight: "600", fontFamily: FONT_R, textTransform: "uppercase", letterSpacing: 0.5 },
  secBalValue: { fontSize: 14, fontWeight: "900", color: WHITE, fontFamily: FONT_B, marginTop: 2 },

  // Points pill
  pointsRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: WHITE + "18", borderRadius: 100,
    paddingHorizontal: 14, paddingVertical: 8, alignSelf: "flex-start",
  },
  pointsDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: GOLD },
  pointsLabel: { fontSize: 12, color: WHITE + "CC", fontWeight: "600", fontFamily: FONT_M },
  pointsValue: { fontSize: 13, color: WHITE, fontWeight: "900", fontFamily: FONT_B },

  // Quick actions
  qaRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 16, marginTop: 20, gap: 10,
  },
  qaWrap:  { alignItems: "center", flex: 1, gap: 6 },
  qaIcon:  { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  qaLabel: { fontSize: 10.5, fontWeight: "700", color: TEXT_H, textAlign: "center", fontFamily: FONT_M },

  // Transactions
  txSection: {
    backgroundColor: CARD, borderRadius: 22, marginHorizontal: 16,
    marginTop: 24, paddingTop: 18, paddingBottom: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  txHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 18, marginBottom: 10,
  },
  txHeaderTitle: { fontSize: 16, fontWeight: "900", color: TEXT_H, fontFamily: FONT_B },
  txCount:        { fontSize: 12, color: TEXT_M, fontFamily: FONT_R },
  tabRow: { flexDirection: "row", gap: 6, paddingHorizontal: 18, marginBottom: 8 },
  tab:       { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, backgroundColor: BG },
  tabActive: { backgroundColor: BRAND },
  tabText:       { fontSize: 12, fontWeight: "700", color: TEXT_M, fontFamily: FONT_M },
  tabTextActive: { color: WHITE },

  // Tx row
  txRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, paddingHorizontal: 18,
    borderBottomWidth: 1, borderBottomColor: BORDER + "55",
  },
  txAvatar: { width: 42, height: 42, borderRadius: 21 },
  txIconWrap: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  txMid:  { flex: 1 },
  txTitle: { fontSize: 13.5, fontWeight: "800", color: TEXT_H, fontFamily: FONT_B },
  txDesc:  { fontSize: 11.5, color: TEXT_M, marginTop: 2, fontFamily: FONT_R },
  txRight: { alignItems: "flex-end" },
  txAmount: { fontSize: 13.5, fontWeight: "900", fontFamily: FONT_B },
  txCredit: { color: GREEN },
  txDebit:  { color: RED },
  txId: { fontSize: 10, color: TEXT_M, marginTop: 2, fontFamily: FONT_R },

  emptyTx: { alignItems: "center", paddingVertical: 40, gap: 10, paddingHorizontal: 18 },
  emptyTxText: { fontSize: 13, color: TEXT_M, fontFamily: FONT_R },

  // Tips
  tipsCard: {
    marginHorizontal: 16, marginTop: 20,
    backgroundColor: CARD, borderRadius: 18, padding: 18,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  tipsTitle: { fontSize: 15, fontWeight: "900", color: TEXT_H, fontFamily: FONT_B, marginBottom: 14 },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  tipIconWrap: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: ACCENT + "14", alignItems: "center", justifyContent: "center",
  },
  tipText: { flex: 1, fontSize: 12.5, color: TEXT_H, lineHeight: 18, fontFamily: FONT_R },

  // Action modal
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet: {
    backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: Platform.OS === "ios" ? 36 : 24, paddingTop: 12,
  },
  modalHandle: {
    width: 40, height: 5, borderRadius: 3,
    backgroundColor: BORDER, alignSelf: "center", marginBottom: 16,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  modalIconWrap: {
    width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center",
  },
  modalTitle: { fontSize: 16, fontWeight: "800", color: TEXT_H, fontFamily: FONT_B },
  modalSubtitle: { fontSize: 12, color: TEXT_M, fontFamily: FONT_R, marginTop: 2 },

  availableRow: {
    flexDirection: "row", justifyContent: "space-between",
    backgroundColor: ACCENT + "0E", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14,
  },
  availableLabel: { fontSize: 12, color: TEXT_M, fontFamily: FONT_R },
  availableValue: { fontSize: 13, fontWeight: "800", color: BRAND, fontFamily: FONT_B },

  inputLabel: { fontSize: 11, fontWeight: "700", color: TEXT_M, fontFamily: FONT_M, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, marginTop: 6 },
  modalInput: {
    borderWidth: 1.5, borderColor: BORDER, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: TEXT_H, fontFamily: FONT_R,
    backgroundColor: BG, marginBottom: 4,
  },
  modalError: { fontSize: 12.5, color: RED, marginVertical: 8, fontFamily: FONT_R },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 14 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 14,
    borderWidth: 1.5, borderColor: BORDER, alignItems: "center",
  },
  modalCancelText: { fontSize: 14, fontWeight: "600", color: TEXT_M, fontFamily: FONT_M },
  modalSubmitBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  modalBtnDisabled: { opacity: 0.6 },
  modalSubmitText: { fontSize: 14, fontWeight: "800", color: WHITE, fontFamily: FONT_B },
});
