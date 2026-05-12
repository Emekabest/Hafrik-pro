// src/pages/earnings/WalletScreen.jsx — Wallet detail (fintech style)
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Animated, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../../AuthContext';
import { Colors } from '../../theme';
import AppDetails from '../../helpers/appdetails';
import {
  getWalletBalance, getWalletTransactions,
} from '../../api/walletApi';
import AddFundsModal from '../../components/AddFundsModal';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const CARD   = Colors.white;
const BORDER = Colors.borderSoft ?? Colors.border;
const TEXT_H = Colors.black;
const TEXT_M = Colors.secondaryText;
const WHITE  = Colors.white;
const GREEN  = Colors.success ?? '#22c55e';
const RED    = Colors.destructive ?? '#d32f2f';
const ORANGE = Colors.warm ?? '#f4a535';

const FONT_B = AppDetails?.fontFamily?.redex?.bold    ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';
const FONT_M = AppDetails?.fontFamily?.inter?.medium  ?? 'System';

const fmtMoney = (n) => `¥${Number(n ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate  = (raw) => {
  const d = new Date(raw);
  if (isNaN(d)) return raw ?? '';
  const diff = Date.now() - d;
  if (diff < 60_000)      return 'Just now';
  if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)  return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 172_800_000) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const txIcon = (nodeType, txType) => {
  const map = {
    user: txType === 'in' ? 'arrow-down-circle' : 'arrow-up-circle',
    tip: 'gift', boost: 'rocket', points: 'star',
    affiliate: 'git-network', withdrawal: 'card', monetization: 'bar-chart',
  };
  return map[nodeType] ?? (txType === 'in' ? 'arrow-down-circle' : 'arrow-up-circle');
};

// ─── Transaction row ──────────────────────────────────────────────────────────
const TxRow = ({ tx }) => {
  const isIn  = tx.type === 'in';
  const color = isIn ? GREEN : RED;
  const icon  = txIcon(tx.node_type, tx.type);
  const name  = tx.user?.name ?? 'Hafrik';
  const ava   = tx.user?.avatar ?? null;
  return (
    <View style={ws.txRow}>
      {ava ? (
        <ExpoImage source={{ uri: ava }} style={ws.txAvatar} contentFit="cover" />
      ) : (
        <View style={[ws.txIconWrap, { backgroundColor: color + '18' }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
      )}
      <View style={ws.txMid}>
        <Text style={ws.txTitle} numberOfLines={1}>{isIn ? `From ${name}` : `To ${name}`}</Text>
        <Text style={ws.txDesc} numberOfLines={1}>
          {(tx.node_type ?? 'transfer').charAt(0).toUpperCase() + (tx.node_type ?? 'transfer').slice(1)}
          {' · '}{fmtDate(tx.date)}
        </Text>
      </View>
      <View style={ws.txRight}>
        <Text style={[ws.txAmount, isIn ? { color: GREEN } : { color: RED }]} numberOfLines={1}>
          {isIn ? '+' : '−'}{fmtMoney(tx.amount)}
        </Text>
        <Text style={ws.txId} numberOfLines={1}>#{tx.transaction_id}</Text>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
export default function WalletScreen() {
  const navigation = useNavigation();
  const { token }  = useAuth();
  const insets     = useSafeAreaInsets();

  const [balance,    setBalance]    = useState(null);
  const [balLoading, setBalLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [txPage,     setTxPage]     = useState(1);
  const [txTotal,    setTxTotal]    = useState(0);
  const [txLoading,  setTxLoading]  = useState(false);
  const [txLoadMore, setTxLoadMore] = useState(false);
  const [activeTab,  setActiveTab]  = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const [addFundsOpen, setAddFundsOpen] = useState(false);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  const fetchBalance = useCallback(async () => {
    setBalLoading(true);
    try {
      const json = await getWalletBalance(token);
      if (json?.status === 'success') setBalance(json.data);
    } catch { /* silent */ }
    setBalLoading(false);
  }, [token]);

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const json = await getWalletTransactions(token, 1, 20);
      const list  = json?.data?.transactions ?? json?.transactions ?? [];
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
      const json = await getWalletTransactions(token, next, 20);
      const list  = json?.data?.transactions ?? json?.transactions ?? [];
      setTransactions((p) => [...p, ...list]);
      setTxPage(next);
    } catch { /* silent */ }
    setTxLoadMore(false);
  }, [token, txPage, txTotal, transactions.length, txLoadMore]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchBalance(), fetchTransactions()]);
  }, [fetchBalance, fetchTransactions]);

  useEffect(() => {
    refreshAll().then(() => {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 480, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 6,   useNativeDriver: true }),
      ]).start();
    });
  }, [token]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }, [refreshAll]);

  const walletBal    = balance?.wallet_balance    ?? 0;
  const affiliateBal = balance?.affiliate_balance ?? 0;
  const pointsBal    = balance?.points            ?? 0;
  const pointsValue  = Number(pointsBal) / 1000;
  const totalValue   = Number(walletBal) + Number(affiliateBal) + pointsValue;

  const filteredTx = transactions.filter((tx) => {
    if (activeTab === 'in')  return tx.type === 'in';
    if (activeTab === 'out') return tx.type === 'out';
    return true;
  });

  const ListHeader = () => (
    <>
      {/* Hero balance */}
      <Animated.View style={[ws.heroWrap, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient colors={['#062D32', BRAND, '#0C6B70']} style={ws.heroGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={ws.heroGlow} />
          <View style={ws.heroRing} />
          <View style={ws.heroTopRow}>
            <View>
              <Text style={ws.heroEyebrow}>Hafrik Wallet</Text>
              <Text style={ws.heroLabel}>Available Balance</Text>
            </View>
            <View style={ws.currencyPill}>
              <Ionicons name="cash-outline" size={14} color={WHITE} />
              <Text style={ws.currencyPillTxt}>CNY</Text>
            </View>
          </View>
          {balLoading ? (
            <ActivityIndicator color={WHITE} size="large" style={{ marginVertical: 18 }} />
          ) : (
            <Text style={ws.heroAmount}>{fmtMoney(walletBal)}</Text>
          )}
          <Text style={ws.heroHint}>Fund your wallet, send money, and manage Hafrik earnings from one place.</Text>
          <View style={ws.heroDivider} />
          <View style={ws.heroStatsRow}>
            <MiniStat label="Affiliate" value={fmtMoney(affiliateBal)} icon="git-network-outline" />
            <MiniStat label="Points" value={`${Number(pointsBal).toLocaleString()} pts`} icon="star-outline" />
            <MiniStat label="Total value" value={fmtMoney(totalValue)} icon="layers-outline" />
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Action buttons */}
      <View style={ws.actionsPanel}>
        <View style={ws.actionsHeader}>
          <Text style={ws.sectionTitle}>Quick actions</Text>
          <Text style={ws.sectionSub}>Move money faster</Text>
        </View>
        <View style={ws.actionsGrid}>
          <ActionBtn
            icon="add"
            label="Add Funds"
            color={GREEN}
            onPress={() => setAddFundsOpen(true)}
          />
          <ActionBtn
            icon="send"
            label="Send"
            color={ACCENT}
            onPress={() => navigation.navigate('SendMoneyScreen')}
          />
          <ActionBtn
            icon="star"
            label="Points"
            color={ORANGE}
            onPress={() => navigation.navigate('PointsScreen', { points: pointsBal })}
          />
          <ActionBtn
            icon="git-network"
            label="Affiliates"
            color={Colors.purple ?? '#9c27b0'}
            onPress={() => navigation.navigate('AffiliatesScreen')}
          />
        </View>
      </View>

      <View style={ws.insightCard}>
        <LinearGradient colors={[ACCENT + '18', GREEN + '12']} style={ws.insightIcon}>
          <Ionicons name="shield-checkmark-outline" size={22} color={ACCENT} />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={ws.insightTitle}>Wallet-ready checkout</Text>
          <Text style={ws.insightText}>Use your RMB balance for marketplace orders and Hafrik services.</Text>
        </View>
        <TouchableOpacity style={ws.insightBtn} onPress={() => setAddFundsOpen(true)} activeOpacity={0.85}>
          <Text style={ws.insightBtnTxt}>Top up</Text>
        </TouchableOpacity>
      </View>

      {/* Legacy actions kept available through compact controls */}
      <View style={ws.secondaryActions}>
        <TouchableOpacity
          style={ws.withdrawPill}
          onPress={() => Alert.alert('Coming Soon', 'Bank withdrawal is coming soon.')}
          activeOpacity={0.85}
        >
          <Ionicons name="card-outline" size={16} color={BRAND} />
          <Text style={ws.withdrawPillTxt}>Withdraw to bank</Text>
        </TouchableOpacity>
      </View>

      {/* Tx section header + tabs */}
      <View style={ws.txSection}>
        <View style={ws.txHeader}>
          <View>
            <Text style={ws.txHeaderTitle}>Recent activity</Text>
            <Text style={ws.txHeaderSub}>Track every wallet movement</Text>
          </View>
          <View style={ws.txCountPill}>
            <Text style={ws.txCount}>{txTotal} total</Text>
          </View>
        </View>
        <View style={ws.tabRow}>
          {[{ key: 'all', label: 'All' }, { key: 'in', label: 'Income' }, { key: 'out', label: 'Spent' }].map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity key={tab.key} style={[ws.tab, active && ws.tabActive]} onPress={() => setActiveTab(tab.key)} activeOpacity={0.8}>
                <Text style={[ws.tabText, active && ws.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </>
  );

  const ListFooter = () => (
    <>
      {txLoadMore && <ActivityIndicator color={ACCENT} style={{ marginVertical: 16 }} />}
      {!txLoading && filteredTx.length === 0 && (
        <View style={ws.emptyTx}>
          <Ionicons name="receipt-outline" size={36} color={BORDER} />
          <Text style={ws.emptyText}>No transactions yet</Text>
        </View>
      )}
    </>
  );

  return (
    <View style={[ws.root, { paddingTop: insets.top }]}>
      <View style={ws.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={ws.backBtn} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </TouchableOpacity>
        <Text style={ws.topTitle}>Wallet</Text>
        <View style={{ width: 38 }} />
      </View>

      <FlatList
        style={ws.list}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingTop: 18 }}
        showsVerticalScrollIndicator={false}
        data={filteredTx}
        keyExtractor={(item) => String(item.transaction_id)}
        renderItem={({ item }) => <TxRow tx={item} />}
        ListHeaderComponent={<ListHeader />}
        ListFooterComponent={<ListFooter />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={WHITE} />}
      />

      <AddFundsModal
        visible={addFundsOpen}
        onClose={() => {
          setAddFundsOpen(false);
          refreshAll();
        }}
      />
    </View>
  );
}

const ActionBtn = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={ws.actionItem} onPress={onPress} activeOpacity={0.8}>
    <View style={[ws.actionIcon, { backgroundColor: color + '18' }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={ws.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const MiniStat = ({ icon, label, value }) => (
  <View style={ws.miniStat}>
    <Ionicons name={icon} size={14} color={WHITE + 'D8'} />
    <Text style={ws.miniStatLabel}>{label}</Text>
    <Text style={ws.miniStatValue} numberOfLines={1}>{value}</Text>
  </View>
);

const ws = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#062D32' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 8, paddingBottom: 14,
  },
  backBtn: { width: 40, height: 40, borderRadius: 16, backgroundColor: WHITE + '18', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: WHITE + '18' },
  topTitle: { fontSize: 18, fontWeight: '900', color: WHITE, fontFamily: FONT_B, letterSpacing: 0.2 },
  list: { flex: 1, backgroundColor: '#EEF4F2', borderTopLeftRadius: 30, borderTopRightRadius: 30 },

  heroWrap: { marginHorizontal: 16 },
  heroGrad: {
    borderRadius: 30, padding: 22, overflow: 'hidden',
    shadowColor: '#062D32', shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22, shadowRadius: 24, elevation: 10,
  },
  heroGlow: { position: 'absolute', width: 210, height: 210, borderRadius: 105, backgroundColor: GREEN + '24', top: -70, right: -54 },
  heroRing: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 18, borderColor: WHITE + '08', bottom: -52, left: -36 },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  heroEyebrow:{ fontSize: 11, color: WHITE + 'B8', fontWeight: '800', fontFamily: FONT_M, letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 7 },
  heroLabel:  { fontSize: 13, color: WHITE + 'D0', fontWeight: '700', fontFamily: FONT_R },
  heroAmount: { fontSize: 43, fontWeight: '900', color: WHITE, fontFamily: FONT_B, marginTop: 10, marginBottom: 8, letterSpacing: -1.8 },
  heroHint:   { fontSize: 12.5, color: WHITE + 'C8', fontFamily: FONT_R, lineHeight: 19, maxWidth: 285 },
  currencyPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, backgroundColor: WHITE + '16', borderWidth: 1, borderColor: WHITE + '18' },
  currencyPillTxt: { fontSize: 11, fontWeight: '900', color: WHITE, fontFamily: FONT_B },
  heroDivider: { height: 1, backgroundColor: WHITE + '16', marginVertical: 18 },
  heroStatsRow: { flexDirection: 'row', gap: 8 },
  miniStat: { flex: 1, minHeight: 74, borderRadius: 18, padding: 10, backgroundColor: WHITE + '12', borderWidth: 1, borderColor: WHITE + '12', justifyContent: 'space-between' },
  miniStatLabel: { fontSize: 10.5, color: WHITE + 'B8', fontFamily: FONT_R, marginTop: 4 },
  miniStatValue: { fontSize: 12.5, fontWeight: '900', color: WHITE, fontFamily: FONT_B },

  actionsPanel: {
    backgroundColor: CARD, borderRadius: 26, marginHorizontal: 16, marginTop: 16, padding: 16,
    shadowColor: '#0B3337', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 4,
  },
  actionsHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B },
  sectionSub:   { fontSize: 11.5, color: TEXT_M, fontFamily: FONT_R },
  actionsGrid:  { flexDirection: 'row', gap: 10 },
  secondaryActions: { marginHorizontal: 16, marginTop: 10, alignItems: 'flex-start' },
  withdrawPill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: CARD, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#DDE9E6' },
  withdrawPillTxt: { fontSize: 12, fontWeight: '900', color: BRAND, fontFamily: FONT_B },
  actionItem: { flex: 1, minWidth: 72, alignItems: 'center', gap: 7 },
  actionIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  actionLabel:{ fontSize: 11, fontWeight: '800', color: TEXT_H, textAlign: 'center', fontFamily: FONT_M },

  insightCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: CARD, borderRadius: 22, marginHorizontal: 16, marginTop: 12, padding: 14,
    borderWidth: 1, borderColor: '#DDE9E6',
  },
  insightIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  insightTitle: { fontSize: 14, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B },
  insightText:  { fontSize: 11.5, color: TEXT_M, fontFamily: FONT_R, lineHeight: 16, marginTop: 2 },
  insightBtn:   { backgroundColor: BRAND, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  insightBtnTxt:{ fontSize: 11.5, fontWeight: '900', color: WHITE, fontFamily: FONT_B },

  txSection: { backgroundColor: CARD, borderRadius: 26, marginHorizontal: 16, marginTop: 20, paddingTop: 18, paddingBottom: 12, shadowColor: '#0B3337', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3 },
  txHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, marginBottom: 14 },
  txHeaderTitle: { fontSize: 17, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B },
  txHeaderSub: { fontSize: 11.5, color: TEXT_M, fontFamily: FONT_R, marginTop: 2 },
  txCountPill: { backgroundColor: '#EEF4F2', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  txCount:   { fontSize: 11.5, fontWeight: '800', color: BRAND, fontFamily: FONT_B },
  tabRow:    { flexDirection: 'row', gap: 8, paddingHorizontal: 18, marginBottom: 8 },
  tab:       { paddingHorizontal: 17, paddingVertical: 9, borderRadius: 100, backgroundColor: '#EEF4F2' },
  tabActive: { backgroundColor: BRAND },
  tabText:   { fontSize: 12, fontWeight: '800', color: TEXT_M, fontFamily: FONT_M },
  tabTextActive: { color: WHITE },

  txRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14, marginHorizontal: 16, marginTop: 10, borderRadius: 18, backgroundColor: CARD, borderWidth: 1, borderColor: '#DDE9E6' },
  txAvatar:  { width: 42, height: 42, borderRadius: 21 },
  txIconWrap:{ width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  txMid:     { flex: 1 },
  txTitle:   { fontSize: 14, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B },
  txDesc:    { fontSize: 11.5, color: TEXT_M, marginTop: 3, fontFamily: FONT_R },
  txRight:   { alignItems: 'flex-end', maxWidth: 118 },
  txAmount:  { fontSize: 13.5, fontWeight: '900', fontFamily: FONT_B },
  txId:      { fontSize: 9.5, color: TEXT_M, marginTop: 2, fontFamily: FONT_R, maxWidth: 110 },

  emptyTx:   { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 13, color: TEXT_M, fontFamily: FONT_R },

});
