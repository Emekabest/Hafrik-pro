// ExchangeHomeScreen — premium fintech-style currency exchange home screen.
// Shows live rates, currency toggle, amount input, fee breakdown, bank selector.
import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, StatusBar, RefreshControl, Animated,
  ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import { getRates, getBanks } from './exchangeApi';

const PRIMARY = '#0C3F44';
const ACCENT  = '#13C296';
const DARK    = '#0D1B1E';
const BG      = '#F4F6F8';

const CURRENCIES = [
  { code: 'NGN', flag: '🇳🇬', symbol: '₦', name: 'Nigerian Naira',   label: 'NGN → RMB' },
  { code: 'GHS', flag: '🇬🇭', symbol: 'GH₵', name: 'Ghanaian Cedi', label: 'GHS → RMB' },
];

const STATUS = {
  idle: 'idle', loading: 'loading', error: 'error',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtNum = (n, decimals = 2) =>
  Number(n).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const parseAmount = (str) => parseFloat(String(str).replace(/[^0-9.]/g, '')) || 0;

// ── SkeletonBox ───────────────────────────────────────────────────────────────
const SkeletonBox = ({ width, height, style }) => {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.8, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      style={[{ width, height, borderRadius: 10, backgroundColor: '#E0E0E0', opacity: pulse }, style]}
    />
  );
};

// ── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, visible }) => {
  const slideY = useRef(new Animated.Value(-80)).current;
  useEffect(() => {
    if (visible) {
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 80 }).start();
    } else {
      Animated.timing(slideY, { toValue: -80, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible]);
  const bg = type === 'error' ? '#E03B3B' : type === 'info' ? '#0066CC' : ACCENT;
  return (
    <Animated.View style={[styles.toast, { backgroundColor: bg, transform: [{ translateY: slideY }] }]}>
      <Ionicons
        name={type === 'error' ? 'alert-circle' : 'checkmark-circle'}
        size={18} color="#fff" style={{ marginRight: 8 }}
      />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
};

// ── BankCard ──────────────────────────────────────────────────────────────────
const BankCard = ({ bank, selected, onSelect }) => (
  <TouchableOpacity
    style={[styles.bankCard, selected && styles.bankCardSelected]}
    activeOpacity={0.82}
    onPress={() => onSelect(bank)}
  >
    <View style={[styles.bankIconWrap, selected && styles.bankIconSelected]}>
      <Ionicons name="card" size={20} color={selected ? '#fff' : PRIMARY} />
    </View>
    <Text style={[styles.bankName, selected && styles.bankNameSelected]} numberOfLines={1}>
      {bank.bank_name}
    </Text>
    <Text style={styles.bankAcc} numberOfLines={1}>
      {bank.account_number}
    </Text>
    <Text style={styles.bankHolder} numberOfLines={1}>
      {bank.account_name}
    </Text>
    {selected && (
      <View style={styles.bankCheck}>
        <Ionicons name="checkmark-circle" size={16} color={ACCENT} />
      </View>
    )}
  </TouchableOpacity>
);

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ExchangeHomeScreen() {
  const navigation  = useNavigation();
  const { top }     = useSafeAreaInsets();
  const { token }   = useAuth();

  const [status,         setStatus]         = useState(STATUS.loading);
  const [isRefreshing,   setIsRefreshing]   = useState(false);
  const [rateMap,        setRateMap]        = useState({});   // { NGN: {rate,fee_percent,...}, GHS: {...} }
  const [banks,          setBanks]          = useState([]);
  const [fromCurrency,   setFromCurrency]   = useState('NGN');
  const [amountStr,      setAmountStr]      = useState('');
  const [selectedBank,   setSelectedBank]   = useState(null);
  const [toast,          setToast]          = useState({ visible: false, message: '', type: 'success' });
  const [rateUpdated,    setRateUpdated]    = useState('');

  const breakdownAnim = useRef(new Animated.Value(0)).current;
  const refreshSpin   = useRef(new Animated.Value(0)).current;

  // ── Show Toast ────────────────────────────────────────────────────────────
  const showToast = useCallback((message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }, []);

  // ── Fetch Data ────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setStatus(STATUS.loading);
    try {
      const [ratesRes, banksRes] = await Promise.all([
        getRates(token),
        getBanks(token),
      ]);
      const r = ratesRes.data?.rates || ratesRes.data || {};
      setRateMap(r);
      setRateUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      const b = banksRes.data?.banks || banksRes.data?.data || [];
      setBanks(b);
      if (b.length > 0 && !selectedBank) setSelectedBank(b[0]);
      setStatus(STATUS.idle);
    } catch (e) {
      setStatus(STATUS.error);
      if (silent) showToast('Failed to refresh rates', 'error');
    }
    setIsRefreshing(false);
  }, [token, selectedBank, showToast]);

  useEffect(() => { fetchData(); }, []);

  // ── Pull to Refresh ───────────────────────────────────────────────────────
  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  // ── Calculation ───────────────────────────────────────────────────────────
  const calc = useMemo(() => {
    const rateInfo  = rateMap[fromCurrency] || {};
    const rate      = parseFloat(rateInfo.rate)        || 0;
    const feeP      = parseFloat(rateInfo.fee_percent)  || 0;
    const amount    = parseAmount(amountStr);
    const fee       = amount * feeP / 100;
    const net       = amount - fee;
    const rmb       = rate > 0 ? net / rate : 0;
    return { rate, feeP, amount, fee, net, rmb };
  }, [rateMap, fromCurrency, amountStr]);

  // ── Animate breakdown in/out ──────────────────────────────────────────────
  useEffect(() => {
    Animated.timing(breakdownAnim, {
      toValue: calc.amount > 0 ? 1 : 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [calc.amount > 0]);

  const cur = CURRENCIES.find(c => c.code === fromCurrency);
  const rateInfo = rateMap[fromCurrency] || {};

  const canContinue = calc.amount > 0 && selectedBank && status === STATUS.idle;

  const handleContinue = () => {
    if (!canContinue) return;
    navigation.navigate('ExchangeConfirm', {
      fromCurrency,
      amount:      calc.amount,
      fee:         calc.fee,
      feePercent:  calc.feeP,
      net:         calc.net,
      rmbAmount:   calc.rmb,
      rate:        calc.rate,
      selectedBank,
    });
  };

  // ── Render skeleton ───────────────────────────────────────────────────────
  if (status === STATUS.loading) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#062A2E', PRIMARY, '#0a5a62']}
          style={[styles.header, { paddingTop: top + 12 }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Hafrik Exchange</Text>
            <View style={styles.headerBtn} />
          </View>
        </LinearGradient>
        <ScrollView contentContainerStyle={styles.skeletonContent}>
          <SkeletonBox height={90} style={{ borderRadius: 18, marginBottom: 16 }} />
          <SkeletonBox height={54} style={{ borderRadius: 14, marginBottom: 12 }} />
          <SkeletonBox height={100} style={{ borderRadius: 18, marginBottom: 12 }} />
          <SkeletonBox height={140} style={{ borderRadius: 18, marginBottom: 12 }} />
          <SkeletonBox height={120} style={{ borderRadius: 18, marginBottom: 12 }} />
        </ScrollView>
      </View>
    );
  }

  // ── Render error ──────────────────────────────────────────────────────────
  if (status === STATUS.error) {
    return (
      <View style={[styles.screen, styles.center]}>
        <StatusBar barStyle="dark-content" />
        <Ionicons name="wifi-outline" size={56} color="#ccc" />
        <Text style={styles.errTitle}>Connection failed</Text>
        <Text style={styles.errSub}>Check your internet and try again</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />

      {/* Toast */}
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={['#062A2E', PRIMARY, '#0a5a62']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: top + 12 }]}
      >
        {/* Decorative blobs */}
        <View style={styles.blob1} />
        <View style={styles.blob2} />

        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Hafrik Exchange</Text>
          </View>
          <TouchableOpacity
            style={styles.headerBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ExchangeHistory')}
          >
            <Ionicons name="time-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Rate banner */}
        <View style={styles.rateBanner}>
          <View style={styles.rateLeft}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
            <Text style={styles.rateValue}>
              {calc.rate > 0 ? `1 RMB = ${fmtNum(calc.rate, 2)} ${fromCurrency}` : 'Loading rate…'}
            </Text>
          </View>
          {rateUpdated ? (
            <Text style={styles.rateTime}>Updated {rateUpdated}</Text>
          ) : null}
        </View>

        <View style={styles.headerAccent} />
      </LinearGradient>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={ACCENT} colors={[ACCENT]} />}
      >
        {/* ── Currency toggle ───────────────────────────────────────────── */}
        <View style={styles.toggleRow}>
          {CURRENCIES.map(c => (
            <TouchableOpacity
              key={c.code}
              style={[styles.togglePill, fromCurrency === c.code && styles.togglePillActive]}
              activeOpacity={0.8}
              onPress={() => { setFromCurrency(c.code); setAmountStr(''); }}
            >
              <Text style={styles.toggleFlag}>{c.flag}</Text>
              <Text style={[styles.toggleLabel, fromCurrency === c.code && styles.toggleLabelActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Amount input card ─────────────────────────────────────────── */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>You Send</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputCurrencyBadge}>
              <Text style={styles.inputFlag}>{cur.flag}</Text>
              <Text style={styles.inputCode}>{cur.code}</Text>
            </View>
            <TextInput
              style={styles.amountInput}
              value={amountStr}
              onChangeText={setAmountStr}
              placeholder="0.00"
              placeholderTextColor="#C5CDD2"
              keyboardType="decimal-pad"
              maxLength={14}
            />
          </View>
          {rateInfo.min_amount || rateInfo.max_amount ? (
            <Text style={styles.inputHint}>
              Min: {cur.symbol}{fmtNum(rateInfo.min_amount || 0, 0)}
              {rateInfo.max_amount ? `  ·  Max: ${cur.symbol}${fmtNum(rateInfo.max_amount || 0, 0)}` : ''}
            </Text>
          ) : null}
        </View>

        {/* ── Breakdown card ────────────────────────────────────────────── */}
        <Animated.View style={[styles.breakdownCard, {
          opacity: breakdownAnim,
          transform: [{ translateY: breakdownAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        }]}>
          <View style={styles.bdHeader}>
            <Ionicons name="calculator-outline" size={16} color={ACCENT} />
            <Text style={styles.bdTitle}>Breakdown</Text>
          </View>
          <View style={styles.bdDivider} />
          <BdRow label="You Send"   value={`${cur.symbol}${fmtNum(calc.amount)}`} />
          <BdRow
            label={`Fee (${fmtNum(calc.feeP, 1)}%)`}
            value={`−${cur.symbol}${fmtNum(calc.fee)}`}
            valueStyle={{ color: '#E07B39' }}
          />
          <BdRow label="Net Amount" value={`${cur.symbol}${fmtNum(calc.net)}`} />
          <View style={styles.bdDivider} />
          <View style={styles.receiveRow}>
            <Text style={styles.receiveLabel}>You Receive</Text>
            <View style={styles.receiveRight}>
              <Text style={styles.receiveFlag}>🇨🇳</Text>
              <Text style={styles.receiveAmount}>¥{fmtNum(calc.rmb)} RMB</Text>
            </View>
          </View>
          <Text style={styles.rateNote}>Rate: 1 RMB = {fmtNum(calc.rate, 2)} {fromCurrency}</Text>
        </Animated.View>

        {/* ── Bank selection ────────────────────────────────────────────── */}
        {banks.length > 0 ? (
          <View style={styles.bankSection}>
            <Text style={styles.bankSectionTitle}>Payment Account</Text>
            <Text style={styles.bankSectionSub}>
              Send your {fromCurrency} to this account after placing the order
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bankScroll}
            >
              {banks.map(bank => (
                <BankCard
                  key={bank.id ?? bank.bank_id}
                  bank={bank}
                  selected={selectedBank?.id === bank.id || selectedBank?.bank_id === bank.bank_id}
                  onSelect={setSelectedBank}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* ── Continue button ───────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
          activeOpacity={canContinue ? 0.85 : 1}
          onPress={handleContinue}
        >
          <LinearGradient
            colors={canContinue ? [ACCENT, '#0ea37a'] : ['#C5CDD2', '#B0B8BD']}
            style={styles.continueBtnGrad}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={styles.continueBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────────
const BdRow = ({ label, value, valueStyle }) => (
  <View style={styles.bdRow}>
    <Text style={styles.bdLabel}>{label}</Text>
    <Text style={[styles.bdValue, valueStyle]}>{value}</Text>
  </View>
);

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: BG },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },

  // Toast
  toast: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },

  // Header
  header: {
    paddingHorizontal: 16, paddingBottom: 16, overflow: 'hidden',
  },
  blob1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(19,194,150,0.12)', top: -60, right: -40,
  },
  blob2: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -30, left: -20,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: 17, color: '#fff', fontWeight: '800', letterSpacing: 0.3,
  },
  rateBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  rateLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ACCENT },
  liveText: {
    fontSize: 10, color: ACCENT, fontWeight: '800', letterSpacing: 0.8,
    backgroundColor: 'rgba(19,194,150,0.18)', paddingHorizontal: 6,
    paddingVertical: 2, borderRadius: 5,
  },
  rateValue: { fontSize: 14, color: '#fff', fontWeight: '700' },
  rateTime:  { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  headerAccent: { height: 1, backgroundColor: 'rgba(19,194,150,0.25)', marginTop: 14 },

  // Body
  body:        { flex: 1 },
  bodyContent: { paddingHorizontal: 16, paddingTop: 20 },

  // Currency toggle
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  togglePill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 14,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E8EDEF',
  },
  togglePillActive: { borderColor: ACCENT, backgroundColor: 'rgba(19,194,150,0.06)' },
  toggleFlag:  { fontSize: 18 },
  toggleLabel: { fontSize: 13, fontWeight: '600', color: '#888' },
  toggleLabelActive: { color: ACCENT, fontWeight: '700' },

  // Amount input card
  inputCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 4,
  },
  inputLabel: { fontSize: 12, color: '#999', fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inputCurrencyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: BG, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: '#E8EDEF',
  },
  inputFlag: { fontSize: 20 },
  inputCode: { fontSize: 14, fontWeight: '700', color: DARK },
  amountInput: {
    flex: 1, fontSize: 34, fontWeight: '700', color: DARK, paddingVertical: 0,
  },
  inputHint: { fontSize: 11, color: '#aaa', marginTop: 8 },

  // Breakdown card
  breakdownCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 4,
    borderWidth: 1, borderColor: 'rgba(19,194,150,0.1)',
  },
  bdHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  bdTitle:  { fontSize: 13, fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 },
  bdDivider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 10 },
  bdRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 5 },
  bdLabel: { fontSize: 14, color: '#888' },
  bdValue: { fontSize: 14, fontWeight: '600', color: DARK },
  receiveRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginVertical: 6,
  },
  receiveLabel: { fontSize: 15, fontWeight: '700', color: DARK },
  receiveRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  receiveFlag:  { fontSize: 18 },
  receiveAmount: { fontSize: 22, fontWeight: '800', color: ACCENT },
  rateNote: { fontSize: 11, color: '#aaa', marginTop: 4 },

  // Bank selection
  bankSection: { marginBottom: 20 },
  bankSectionTitle: { fontSize: 15, fontWeight: '700', color: DARK, marginBottom: 4 },
  bankSectionSub:   { fontSize: 12, color: '#aaa', marginBottom: 14, lineHeight: 18 },
  bankScroll: { gap: 12, paddingRight: 4 },
  bankCard: {
    width: 180, backgroundColor: '#fff', borderRadius: 18, padding: 16,
    borderWidth: 1.5, borderColor: '#E8EDEF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, position: 'relative',
  },
  bankCardSelected: { borderColor: ACCENT, backgroundColor: 'rgba(19,194,150,0.04)' },
  bankIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(12,63,68,0.08)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  bankIconSelected: { backgroundColor: ACCENT },
  bankName:   { fontSize: 13, fontWeight: '700', color: DARK, marginBottom: 4 },
  bankNameSelected: { color: PRIMARY },
  bankAcc:    { fontSize: 11, color: '#aaa', marginBottom: 2 },
  bankHolder: { fontSize: 11, color: '#888' },
  bankCheck:  { position: 'absolute', top: 12, right: 12 },

  // Continue button
  continueBtn: { marginTop: 4, borderRadius: 18, overflow: 'hidden' },
  continueBtnDisabled: { opacity: 0.6 },
  continueBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 10,
  },
  continueBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },

  // Error / skeleton
  skeletonContent: { paddingHorizontal: 16, paddingTop: 20 },
  errTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginTop: 16, marginBottom: 8 },
  errSub:   { fontSize: 14, color: '#aaa', textAlign: 'center', marginBottom: 24 },
  retryBtn: {
    paddingHorizontal: 28, paddingVertical: 12,
    backgroundColor: PRIMARY, borderRadius: 14,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
