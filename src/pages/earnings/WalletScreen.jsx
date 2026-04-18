// src/pages/earnings/WalletScreen.jsx — Wallet detail (fintech style)
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Animated, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform,
  TouchableWithoutFeedback, Keyboard, Linking,
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
  withdrawPoints, withdrawAffiliates,
} from '../../api/walletApi';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const BG     = Colors.background ?? '#F7F8FA';
const CARD   = Colors.white;
const BORDER = Colors.borderSoft ?? Colors.border;
const TEXT_H = Colors.black;
const TEXT_M = Colors.secondaryText;
const WHITE  = Colors.white;
const GREEN  = Colors.success ?? '#22c55e';
const RED    = Colors.destructive ?? '#d32f2f';
const ORANGE = Colors.warm ?? '#f4a535';
const GOLD   = Colors.star ?? '#ffd700';

const FONT_B = AppDetails?.fontFamily?.redex?.bold    ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';
const FONT_M = AppDetails?.fontFamily?.inter?.medium  ?? 'System';

const AVA_FB = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

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
        <Text style={[ws.txAmount, isIn ? { color: GREEN } : { color: RED }]}>
          {isIn ? '+' : '−'}{fmtMoney(tx.amount)}
        </Text>
        <Text style={ws.txId}>#{tx.transaction_id}</Text>
      </View>
    </View>
  );
};

const WEB_SESSION_API = 'https://hafrik.com/api/v1/auth/web-session';
const HAFRIK_WEB_URL  = 'https://hafrik.com';

// ─── iOS Transfer Modal (App Store compliance — no in-app money movement) ─────
function IOSTransferModal({ visible, onClose }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleOpenWebsite = async () => {
    setLoading(true);
    try {
      const res  = await fetch(WEB_SESSION_API, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const json = await res.json().catch(() => ({}));
      // Backend returns a short-lived, one-time session URL — never a raw token
      const sessionUrl = json?.data?.session_url ?? json?.session_url ?? null;
      const sessionId  = json?.data?.session_id  ?? json?.session_id  ?? null;
      let urlToOpen = HAFRIK_WEB_URL;
      if (sessionUrl) {
        urlToOpen = sessionUrl;
      } else if (sessionId) {
        urlToOpen = `${HAFRIK_WEB_URL}/session-login?session_id=${encodeURIComponent(sessionId)}`;
      }
      await Linking.openURL(urlToOpen);
    } catch {
      await Linking.openURL(HAFRIK_WEB_URL).catch(() => {});
    }
    setLoading(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={iosT.overlay}>
        <View style={iosT.sheet}>
          <View style={iosT.iconWrap}>
            <Ionicons name="lock-closed" size={28} color={BRAND} />
          </View>
          <Text style={iosT.title}>Transfers Not Available on iOS</Text>
          <Text style={iosT.message}>
            Sending money is currently not supported within the iOS app.
          </Text>
          <Text style={iosT.message}>
            You can manage transactions and transfers securely on our website:
          </Text>
          <Text style={iosT.link}>{HAFRIK_WEB_URL}</Text>
          <Text style={iosT.message}>
            You may be required to sign in on the website.
          </Text>
          <TouchableOpacity
            style={iosT.primaryBtn}
            onPress={handleOpenWebsite}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={WHITE} />
              : <>
                  <Ionicons name="open-outline" size={16} color={WHITE} style={{ marginRight: 6 }} />
                  <Text style={iosT.primaryBtnTxt}>Open Website</Text>
                </>
            }
          </TouchableOpacity>
          <TouchableOpacity style={iosT.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={iosT.closeBtnTxt}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Amount modal (for convert/withdraw affiliates) ───────────────────────────
const AmountModal = ({ visible, onClose, title, subtitle, icon, gradient, availableLabel, availableValue, onSubmit, submitting, error }) => {
  const [amount, setAmount] = useState('');
  const close = () => { setAmount(''); onClose(); };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView style={ws.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={ws.sheet}>
              <View style={ws.handle} />
              <View style={ws.sheetHeader}>
                <LinearGradient colors={gradient} style={ws.sheetIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name={icon} size={20} color={WHITE} />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={ws.sheetTitle}>{title}</Text>
                  {!!subtitle && <Text style={ws.sheetSub}>{subtitle}</Text>}
                </View>
                <TouchableOpacity onPress={close} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={22} color={TEXT_M} />
                </TouchableOpacity>
              </View>
              {availableLabel != null && (
                <View style={ws.availRow}>
                  <Text style={ws.availLabel}>{availableLabel}</Text>
                  <Text style={ws.availVal}>{availableValue}</Text>
                </View>
              )}
              <Text style={ws.inputLabel}>Amount</Text>
              <TextInput
                style={ws.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={TEXT_M}
                keyboardType="decimal-pad"
              />
              {!!error && <Text style={ws.inputError}>{error}</Text>}
              <View style={ws.sheetActions}>
                <TouchableOpacity style={ws.cancelBtn} onPress={close} activeOpacity={0.75}>
                  <Text style={ws.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[ws.submitBtn, { backgroundColor: gradient[0] }, submitting && { opacity: 0.6 }]}
                  onPress={() => onSubmit({ amount: amount.trim() })}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting
                    ? <ActivityIndicator size="small" color={WHITE} />
                    : <Text style={ws.submitText}>Confirm</Text>}
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

  const [convertOpen,  setConvertOpen]  = useState(false);
  const [affOpen,      setAffOpen]      = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [modalError,   setModalError]   = useState('');
  const [sendVisible,  setSendVisible]  = useState(false);

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

  const handleConvert = useCallback(async ({ amount }) => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) { setModalError('Enter a valid amount.'); return; }
    setSubmitting(true); setModalError('');
    try {
      const json = await withdrawPoints(token, num);
      if (json?.status === 'success') {
        setConvertOpen(false);
        Alert.alert('Done!', json.message ?? 'Points converted to wallet.');
        refreshAll();
      } else { setModalError(json?.message ?? 'Conversion failed.'); }
    } catch (e) { setModalError(e?.message ?? 'Network error.'); }
    setSubmitting(false);
  }, [token, refreshAll]);

  const handleWithdrawAff = useCallback(async ({ amount }) => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) { setModalError('Enter a valid amount.'); return; }
    setSubmitting(true); setModalError('');
    try {
      const json = await withdrawAffiliates(token, num);
      if (json?.status === 'success') {
        setAffOpen(false);
        Alert.alert('Done!', json.message ?? 'Affiliate earnings moved to wallet.');
        refreshAll();
      } else { setModalError(json?.message ?? 'Withdrawal failed.'); }
    } catch (e) { setModalError(e?.message ?? 'Network error.'); }
    setSubmitting(false);
  }, [token, refreshAll]);

  const walletBal    = balance?.wallet_balance    ?? 0;
  const affiliateBal = balance?.affiliate_balance ?? 0;
  const pointsBal    = balance?.points            ?? 0;

  const filteredTx = transactions.filter((tx) => {
    if (activeTab === 'in')  return tx.type === 'in';
    if (activeTab === 'out') return tx.type === 'out';
    return true;
  });

  const ListHeader = () => (
    <>
      {/* Hero balance */}
      <Animated.View style={[ws.heroWrap, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient colors={[GREEN, '#16a34a', '#064e3b']} style={ws.heroGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={ws.heroBubble1} />
          <View style={ws.heroBubble2} />
          <Text style={ws.heroLabel}>Available Balance</Text>
          {balLoading
            ? <ActivityIndicator color={WHITE} size="large" style={{ marginVertical: 14 }} />
            : <Text style={ws.heroAmount}>{fmtMoney(walletBal)}</Text>
          }
        </LinearGradient>
      </Animated.View>

      {/* Action buttons */}
      <View style={ws.actionsRow}>
        <ActionBtn
          icon="send"
          label="Send Money"
          color={ACCENT}
          onPress={() => Platform.OS === 'ios' ? setSendVisible(true) : navigation.navigate('SendMoneyScreen')}
        />
        <ActionBtn
          icon="star"
          label="Convert Pts"
          color={ORANGE}
          onPress={() => { setModalError(''); setConvertOpen(true); }}
        />
        <ActionBtn
          icon="git-network"
          label="Withdraw Aff"
          color={Colors.purple ?? '#9c27b0'}
          onPress={() => { setModalError(''); setAffOpen(true); }}
        />
        <ActionBtn
          icon="card"
          label="Withdraw"
          color={BRAND}
          onPress={() => Alert.alert('Coming Soon', 'Bank withdrawal is coming soon.')}
        />
      </View>

      {/* Tx section header + tabs */}
      <View style={ws.txSection}>
        <View style={ws.txHeader}>
          <Text style={ws.txHeaderTitle}>Transactions</Text>
          <Text style={ws.txCount}>{txTotal} total</Text>
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
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
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

      {Platform.OS === 'ios' && (
        <IOSTransferModal
          visible={sendVisible}
          onClose={() => setSendVisible(false)}
        />
      )}

      <AmountModal
        visible={convertOpen}
        onClose={() => setConvertOpen(false)}
        title="Convert Points"
        subtitle="Convert Hafrik Points to wallet balance"
        icon="star"
        gradient={[GOLD, ORANGE]}
        availableLabel="Available Points"
        availableValue={`${Number(pointsBal).toLocaleString()} pts`}
        onSubmit={handleConvert}
        submitting={submitting}
        error={modalError}
      />

      <AmountModal
        visible={affOpen}
        onClose={() => setAffOpen(false)}
        title="Withdraw Affiliate"
        subtitle="Move affiliate earnings to your wallet"
        icon="git-network"
        gradient={[Colors.purple ?? '#9c27b0', VIOLET ?? '#6d28d9']}
        availableLabel="Affiliate Balance"
        availableValue={fmtMoney(affiliateBal)}
        onSubmit={handleWithdrawAff}
        submitting={submitting}
        error={modalError}
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

const VIOLET = '#6d28d9';

// ─── iOS Transfer Modal Styles ────────────────────────────────────────────────
const iosT = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: BRAND,
    fontFamily: FONT_B,
    textAlign: 'center',
    marginBottom: 14,
  },
  message: {
    fontSize: 14,
    color: TEXT_M,
    fontFamily: FONT_R,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 6,
  },
  link: {
    fontSize: 14,
    color: ACCENT,
    fontFamily: FONT_M,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND,
    borderRadius: 12,
    height: 48,
    width: '100%',
    marginTop: 18,
  },
  primaryBtnTxt: {
    fontSize: 15,
    fontWeight: '700',
    color: WHITE,
    fontFamily: FONT_M,
  },
  closeBtn: {
    marginTop: 10,
    height: 44,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: BG,
  },
  closeBtnTxt: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_M,
    fontFamily: FONT_M,
  },
});

const ws = StyleSheet.create({
  root: { flex: 1, backgroundColor: BRAND },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  backBtn: { width: 38, height: 38, borderRadius: 14, backgroundColor: WHITE + '1A', alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 17, fontWeight: '900', color: WHITE, fontFamily: FONT_B },
  list: { flex: 1, backgroundColor: BG, borderTopLeftRadius: 26, borderTopRightRadius: 26 },

  heroWrap: { marginHorizontal: 16, marginTop: 20 },
  heroGrad: { borderRadius: 24, padding: 24, overflow: 'hidden' },
  heroBubble1: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: WHITE + '08', top: -60, right: -40 },
  heroBubble2: { position: 'absolute', width: 110, height: 110, borderRadius: 55, backgroundColor: WHITE + '08', bottom: -30, left: -20 },
  heroLabel:  { fontSize: 12, color: WHITE + 'B0', fontWeight: '600', fontFamily: FONT_R, letterSpacing: 1, textTransform: 'uppercase' },
  heroAmount: { fontSize: 40, fontWeight: '900', color: WHITE, fontFamily: FONT_B, marginTop: 4, marginBottom: 4, letterSpacing: -1.5 },

  actionsRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 20, gap: 8 },
  actionItem: { flex: 1, alignItems: 'center', gap: 6 },
  actionIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionLabel:{ fontSize: 10.5, fontWeight: '700', color: TEXT_H, textAlign: 'center', fontFamily: FONT_M },

  txSection: { backgroundColor: CARD, borderRadius: 22, marginHorizontal: 16, marginTop: 24, paddingTop: 18, paddingBottom: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  txHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, marginBottom: 10 },
  txHeaderTitle: { fontSize: 16, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B },
  txCount:   { fontSize: 12, color: TEXT_M, fontFamily: FONT_R },
  tabRow:    { flexDirection: 'row', gap: 6, paddingHorizontal: 18, marginBottom: 8 },
  tab:       { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, backgroundColor: BG },
  tabActive: { backgroundColor: BRAND },
  tabText:   { fontSize: 12, fontWeight: '700', color: TEXT_M, fontFamily: FONT_M },
  tabTextActive: { color: WHITE },

  txRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: BORDER + '55' },
  txAvatar:  { width: 42, height: 42, borderRadius: 21 },
  txIconWrap:{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  txMid:     { flex: 1 },
  txTitle:   { fontSize: 13.5, fontWeight: '800', color: TEXT_H, fontFamily: FONT_B },
  txDesc:    { fontSize: 11.5, color: TEXT_M, marginTop: 2, fontFamily: FONT_R },
  txRight:   { alignItems: 'flex-end' },
  txAmount:  { fontSize: 13.5, fontWeight: '900', fontFamily: FONT_B },
  txId:      { fontSize: 10, color: TEXT_M, marginTop: 2, fontFamily: FONT_R },

  emptyTx:   { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 13, color: TEXT_M, fontFamily: FONT_R },

  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:   { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24, paddingTop: 12 },
  handle:  { width: 40, height: 5, borderRadius: 3, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  sheetIcon:   { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sheetTitle:  { fontSize: 16, fontWeight: '800', color: TEXT_H, fontFamily: FONT_B },
  sheetSub:    { fontSize: 12, color: TEXT_M, fontFamily: FONT_R, marginTop: 2 },
  availRow:    { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: ACCENT + '0E', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14 },
  availLabel:  { fontSize: 12, color: TEXT_M, fontFamily: FONT_R },
  availVal:    { fontSize: 13, fontWeight: '800', color: BRAND, fontFamily: FONT_B },
  inputLabel:  { fontSize: 11, fontWeight: '700', color: TEXT_M, fontFamily: FONT_M, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 6 },
  input:       { borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: TEXT_H, fontFamily: FONT_R, backgroundColor: BG, marginBottom: 4 },
  inputError:  { fontSize: 12.5, color: RED, marginVertical: 8, fontFamily: FONT_R },
  sheetActions:{ flexDirection: 'row', gap: 12, marginTop: 14 },
  cancelBtn:   { flex: 1, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5, borderColor: BORDER, alignItems: 'center' },
  cancelText:  { fontSize: 14, fontWeight: '600', color: TEXT_M, fontFamily: FONT_M },
  submitBtn:   { flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  submitText:  { fontSize: 14, fontWeight: '800', color: WHITE, fontFamily: FONT_B },
});
