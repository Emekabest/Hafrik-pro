import React, { useState, memo, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, Dimensions, StatusBar, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import apiClient from '../../api/apiClient';

const BG     = '#f7fff7';
const BRAND  = '#0c3f44';
const TEAL   = '#1f8e93';
const CARD   = '#ffffff';
const BORDER = '#e4eeef';
const MUTED  = '#5f6b6d';
const WHITE  = '#ffffff';
const GOLD   = '#c9a84c';

const CURRENCIES = [
  { code: 'NGN', flag: '🇳🇬', name: 'Nigerian Naira',     symbol: '₦'   },
  { code: 'GHS', flag: '🇬🇭', name: 'Ghanaian Cedi',      symbol: '₵'   },
  { code: 'KES', flag: '🇰🇪', name: 'Kenyan Shilling',    symbol: 'KSh' },
  { code: 'ZAR', flag: '🇿🇦', name: 'South African Rand', symbol: 'R'   },
  { code: 'EGP', flag: '🇪🇬', name: 'Egyptian Pound',     symbol: 'E£'  },
  { code: 'USD', flag: '🇺🇸', name: 'US Dollar',          symbol: '$'   },
];

const STATUS_META = {
  pending_payment:  { label: 'Pending Payment',  color: '#f59e0b', icon: 'time-outline' },
  receipt_uploaded: { label: 'Receipt Uploaded', color: '#3b82f6', icon: 'cloud-upload-outline' },
  waiting_admin:    { label: 'Under Review',     color: '#8b5cf6', icon: 'hourglass-outline' },
  approved:         { label: 'Approved',         color: '#10b981', icon: 'checkmark-circle-outline' },
  rmb_sent:         { label: 'RMB Sent',         color: '#10b981', icon: 'send-outline' },
  completed:        { label: 'Completed',        color: '#10b981', icon: 'checkmark-done-circle' },
  rejected:         { label: 'Rejected',         color: '#ef4444', icon: 'close-circle-outline' },
};

const getSymbol = (code) => CURRENCIES.find(c => c.code === code)?.symbol ?? '¥';
const getFlag   = (code) => CURRENCIES.find(c => c.code === code)?.flag   ?? '';

const fmtNum = (n) => {
  const v = Number(n ?? 0);
  return v >= 1_000 ? v.toLocaleString() : String(v);
};

const fmtDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr.replace(' ', 'T')).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return dateStr; }
};

// ─── Currency Picker Pill ─────────────────────────────────────────────────────
const CurrencyPicker = memo(({ selected, onPress }) => {
  const c = CURRENCIES.find(x => x.code === selected);
  return (
    <TouchableOpacity style={styles.pickerPill} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.pickerFlag}>{c?.flag}</Text>
      <Text style={styles.pickerCode}>{c?.code}</Text>
      <Ionicons name="chevron-down" size={14} color={MUTED} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
});

// ─── Currency Picker Sheet ────────────────────────────────────────────────────
const CurrencyModal = memo(({ visible, selected, onSelect, onClose }) => {
  if (!visible) return null;
  return (
    <View style={styles.modalOverlay}>
      <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Currency</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={22} color={BRAND} />
          </TouchableOpacity>
        </View>
        {CURRENCIES.map(c => (
          <TouchableOpacity
            key={c.code}
            style={[styles.modalItem, selected === c.code && styles.modalItemActive]}
            onPress={() => { onSelect(c.code); onClose(); }}
            activeOpacity={0.7}
          >
            <Text style={styles.modalFlag}>{c.flag}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalCode}>{c.code}</Text>
              <Text style={styles.modalName}>{c.name}</Text>
            </View>
            {selected === c.code && <Ionicons name="checkmark-circle" size={20} color={TEAL} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});

// ─── History Card ─────────────────────────────────────────────────────────────
const HistoryCard = memo(({ item, onPress }) => {
  const meta = STATUS_META[item.status] ?? { label: item.status, color: MUTED, icon: 'ellipse-outline' };
  return (
    <TouchableOpacity style={styles.histCard} activeOpacity={0.82} onPress={() => onPress(item)}>
      {/* Left */}
      <View style={styles.histLeft}>
        <Text style={styles.histFrom}>
          {getSymbol(item.from)}{fmtNum(item.amount)} <Text style={styles.histCode}>{item.from}</Text>
        </Text>
        <View style={styles.histArrowRow}>
          <Ionicons name="arrow-down" size={12} color={TEAL} />
        </View>
        <Text style={styles.histTo}>
          ¥{fmtNum(item.converted_amount)} <Text style={styles.histCode}>CNY</Text>
        </Text>
      </View>

      <View style={styles.histDivider} />

      {/* Right */}
      <View style={styles.histRight}>
        <Text style={styles.histId} numberOfLines={1}>{item.order_id}</Text>
        <Text style={styles.histDate}>{fmtDate(item.created_at ?? item.date)}</Text>
        <View style={[styles.histStatusBadge, { backgroundColor: meta.color + '22' }]}>
          <Ionicons name={meta.icon} size={10} color={meta.color} />
          <Text style={[styles.histStatusTxt, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={15} color={MUTED} />
    </TouchableOpacity>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CurrencyExchange() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();

  const [from,         setFrom]         = useState('NGN');
  const [amount,       setAmount]       = useState('');
  const [pickerOpen,   setPickerOpen]   = useState(false);

  // Live rate
  const [liveRate,    setLiveRate]    = useState(null);
  const [rateLoading, setRateLoading] = useState(false);

  // Creating order
  const [creating,    setCreating]    = useState(false);

  // History
  const [history,     setHistory]     = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  const rateTimerRef = useRef(null);

  // ── Fetch live rate (always to CNY) ────────────────────────────────────────
  const fetchRate = useCallback(async (fromCode) => {
    setRateLoading(true);
    try {
      const res = await apiClient.get(`/hafrikx/exchange/rate.php?from=${fromCode}&to=CNY`);
      if (res.data?.status === 'success' && res.data?.data?.rate != null) {
        setLiveRate(Number(res.data.data.rate));
      }
    } catch { /* silent */ } finally {
      setRateLoading(false);
    }
  }, []);

  // ── Fetch history ──────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const res = await apiClient.get('/hafrikx/exchange/history.php?page=1&limit=10');
      if (res.data?.status === 'success') {
        const rows = res.data?.data?.data ?? res.data?.data ?? [];
        setHistory(Array.isArray(rows) ? rows : []);
      }
    } catch { /* silent */ } finally {
      setHistLoading(false);
    }
  }, []);

  // On mount
  useEffect(() => {
    fetchRate(from);
    fetchHistory();
    rateTimerRef.current = setInterval(() => fetchRate(from), 30_000);
    return () => clearInterval(rateTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh history when screen comes back into focus (returning from status screen)
  useFocusEffect(useCallback(() => { fetchHistory(); }, [fetchHistory]));

  // When currency changes
  useEffect(() => {
    setLiveRate(null);
    fetchRate(from);
    clearInterval(rateTimerRef.current);
    rateTimerRef.current = setInterval(() => fetchRate(from), 30_000);
    return () => clearInterval(rateTimerRef.current);
  }, [from, fetchRate]);

  // Preview: estimated RMB
  const estimatedRmb = liveRate != null && amount
    ? (parseFloat(amount) * liveRate).toFixed(2)
    : null;

  // ── Create Order ───────────────────────────────────────────────────────────
  const handleCreateOrder = useCallback(async () => {
    const num = parseFloat(amount);
    if (!num || isNaN(num) || num <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount to exchange.');
      return;
    }
    setCreating(true);
    try {
      const res = await apiClient.post('/hafrikx/exchange/create-order.php', {
        from,
        amount: num,
      });
      if (res.data?.status === 'success') {
        const order = res.data.data ?? res.data;
        setAmount('');
        fetchHistory();
        navigation.navigate('ExchangeOrderStatus', {
          order_id: order.order_id,
        });
      } else {
        Alert.alert('Error', res.data?.message ?? 'Could not create order. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Unable to reach server. Please check your connection.');
    } finally {
      setCreating(false);
    }
  }, [amount, from, navigation, fetchHistory]);

  // ── Open order status ──────────────────────────────────────────────────────
  const handleHistoryPress = useCallback((item) => {
    navigation.navigate('ExchangeOrderStatus', { order_id: item.order_id });
  }, [navigation]);

  const rateDisplay = liveRate != null
    ? `1 ${from} = ${Number(liveRate).toFixed(6)} CNY`
    : `Loading rate…`;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0c3f44" translucent={false} />

      {/* ── Header ── */}
      <LinearGradient colors={["#0c3f44", "#1a5a60"]} style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={WHITE} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Currency Exchange</Text>
          <Text style={styles.headerSub}>Exchange to RMB · Manual Order</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Live rate banner ── */}
        <LinearGradient colors={[BRAND, TEAL]} style={styles.rateBanner}>
          {rateLoading
            ? <ActivityIndicator size="small" color={WHITE} />
            : <Ionicons name="trending-up" size={15} color={WHITE} />
          }
          <Text style={styles.rateBannerText}>{rateDisplay}</Text>
          <TouchableOpacity onPress={() => fetchRate(from)} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={14} color={WHITE} />
          </TouchableOpacity>
        </LinearGradient>

        {/* ── From currency ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>From Currency</Text>
          <CurrencyPicker selected={from} onPress={() => setPickerOpen(true)} />
        </View>

        {/* ── To currency (always CNY) ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>To Currency</Text>
          <View style={[styles.pickerPill, { opacity: 0.7 }]}>
            <Text style={styles.pickerFlag}>🇨🇳</Text>
            <Text style={styles.pickerCode}>CNY — Chinese Yuan (RMB)</Text>
          </View>
        </View>

        {/* ── Amount input ── */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount to Exchange</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={MUTED}
            returnKeyType="done"
          />
          <Text style={styles.amountCurrencyLabel}>{getFlag(from)} {from}</Text>
        </View>

        {/* ── Preview ── */}
        {estimatedRmb && (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>You will receive (estimated)</Text>
            <Text style={styles.previewAmount}>¥{fmtNum(estimatedRmb)} <Text style={styles.previewCny}>CNY</Text></Text>
            <Text style={styles.previewNote}>Final amount confirmed after order creation</Text>
          </View>
        )}

        {/* ── How it works ── */}
        <View style={styles.howCard}>
          <Text style={styles.howTitle}>How it works</Text>
          {[
            'Create your exchange order',
            'Pay to our bank account',
            'Upload your payment receipt',
            'Upload your Alipay / WeChat QR',
            'Admin confirms & sends your RMB',
          ].map((step, i) => (
            <View key={i} style={styles.howStep}>
              <View style={styles.howNum}><Text style={styles.howNumTxt}>{i + 1}</Text></View>
              <Text style={styles.howStepTxt}>{step}</Text>
            </View>
          ))}
        </View>

        {/* ── Create Order button ── */}
        <TouchableOpacity
          onPress={handleCreateOrder}
          activeOpacity={0.85}
          disabled={creating}
          style={[styles.createBtnWrap, creating && { opacity: 0.7 }]}
        >
          <LinearGradient colors={[BRAND, TEAL]} style={styles.createBtn}>
            {creating
              ? <ActivityIndicator size="small" color={WHITE} />
              : <><Ionicons name="arrow-forward-circle" size={20} color={WHITE} /><Text style={styles.createBtnTxt}>Create Exchange Order</Text></>
            }
          </LinearGradient>
        </TouchableOpacity>

        {/* ── History section ── */}
        <View style={styles.histHeader}>
          <Text style={styles.histHeaderTxt}>Recent Exchange Orders</Text>
          {histLoading && <ActivityIndicator size="small" color={TEAL} style={{ marginLeft: 8 }} />}
        </View>

        {!histLoading && history.length === 0 ? (
          <View style={styles.histEmpty}>
            <Ionicons name="receipt-outline" size={38} color={MUTED} />
            <Text style={styles.histEmptyTitle}>No orders yet</Text>
            <Text style={styles.histEmptySub}>Your exchange orders will appear here</Text>
          </View>
        ) : (
          history.map((item, i) => (
            <HistoryCard key={item.order_id ?? i} item={item} onPress={handleHistoryPress} />
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Picker modal ── */}
      <CurrencyModal
        visible={pickerOpen}
        selected={from}
        onSelect={setFrom}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerCenter:  { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#ffffff', fontSize: 17, fontFamily: 'ReadexPro_600SemiBold' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: 'WorkSans_400Regular', marginTop: 2 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 18 },

  rateBanner:    { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 18, gap: 8 },
  rateBannerText:{ fontFamily: 'WorkSans_500Medium', fontSize: 13, color: WHITE, flex: 1 },
  refreshBtn:    { padding: 4 },

  fieldGroup:    { marginBottom: 14 },
  fieldLabel:    { fontFamily: 'WorkSans_500Medium', fontSize: 12, color: MUTED, marginBottom: 7 },
  pickerPill:    { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 13, gap: 8 },
  pickerFlag:    { fontSize: 20 },
  pickerCode:    { fontFamily: 'WorkSans_600SemiBold', fontSize: 14, color: BRAND, flex: 1 },

  amountCard:         { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 20, marginBottom: 14 },
  amountLabel:        { fontFamily: 'WorkSans_400Regular', fontSize: 12, color: MUTED, marginBottom: 10 },
  amountInput:        { fontFamily: 'ReadexPro_600SemiBold', fontSize: 36, color: BRAND, textAlign: 'center', paddingVertical: 4 },
  amountCurrencyLabel:{ fontFamily: 'WorkSans_500Medium', fontSize: 13, color: MUTED, textAlign: 'center', marginTop: 6 },

  previewCard:   { backgroundColor: '#e8f5f5', borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 14 },
  previewLabel:  { fontFamily: 'WorkSans_400Regular', fontSize: 12, color: MUTED, marginBottom: 6 },
  previewAmount: { fontFamily: 'ReadexPro_600SemiBold', fontSize: 28, color: TEAL },
  previewCny:    { fontSize: 16, color: TEAL },
  previewNote:   { fontFamily: 'WorkSans_400Regular', fontSize: 11, color: MUTED, marginTop: 4 },

  howCard:      { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 18 },
  howTitle:     { fontFamily: 'WorkSans_700Bold', fontSize: 12, color: MUTED, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14 },
  howStep:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  howNum:       { width: 24, height: 24, borderRadius: 12, backgroundColor: TEAL + '20', borderWidth: 1, borderColor: TEAL + '44', alignItems: 'center', justifyContent: 'center' },
  howNumTxt:    { color: TEAL, fontSize: 11, fontFamily: 'WorkSans_700Bold' },
  howStepTxt:   { color: BRAND, fontSize: 13, fontFamily: 'WorkSans_500Medium', flex: 1 },

  createBtnWrap: { marginBottom: 28 },
  createBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 16, gap: 10 },
  createBtnTxt:  { fontFamily: 'WorkSans_700Bold', fontSize: 16, color: WHITE },

  histHeader:    { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  histHeaderTxt: { fontFamily: 'WorkSans_700Bold', fontSize: 11, color: MUTED, letterSpacing: 1.4, textTransform: 'uppercase' },

  histEmpty:      { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 36, alignItems: 'center', gap: 10 },
  histEmptyTitle: { color: BRAND, fontSize: 15, fontFamily: 'WorkSans_600SemiBold' },
  histEmptySub:   { color: MUTED, fontSize: 12, fontFamily: 'WorkSans_400Regular', textAlign: 'center' },

  histCard:         { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10, gap: 12 },
  histLeft:         { minWidth: 108 },
  histFrom:         { fontFamily: 'WorkSans_600SemiBold', fontSize: 14, color: BRAND },
  histCode:         { color: MUTED, fontSize: 12 },
  histArrowRow:     { width: 22, height: 22, borderRadius: 11, backgroundColor: TEAL + '18', alignItems: 'center', justifyContent: 'center', marginVertical: 4 },
  histTo:           { fontFamily: 'ReadexPro_600SemiBold', fontSize: 15, color: GOLD },
  histDivider:      { width: 1, height: 52, backgroundColor: BORDER },
  histRight:        { flex: 1, gap: 4 },
  histId:           { fontFamily: 'WorkSans_600SemiBold', fontSize: 11.5, color: BRAND },
  histDate:         { fontFamily: 'WorkSans_400Regular', fontSize: 11, color: MUTED },
  histStatusBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start' },
  histStatusTxt:    { fontFamily: 'WorkSans_600SemiBold', fontSize: 10.5 },

  modalOverlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,63,68,0.60)', justifyContent: 'flex-end', zIndex: 100 },
  modalSheet:    { backgroundColor: CARD, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderTopWidth: 1, borderColor: BORDER, paddingBottom: 40, paddingTop: 4 },
  modalHandle:   { width: 36, height: 4, borderRadius: 2, backgroundColor: MUTED + '44', alignSelf: 'center', marginVertical: 10 },
  modalHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 4 },
  modalTitle:    { fontFamily: 'WorkSans_600SemiBold', fontSize: 16, color: BRAND },
  modalItem:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 13, gap: 12 },
  modalItemActive:{ backgroundColor: BORDER + '44' },
  modalFlag:     { fontSize: 24 },
  modalCode:     { fontFamily: 'WorkSans_600SemiBold', fontSize: 14, color: BRAND },
  modalName:     { fontFamily: 'WorkSans_400Regular', fontSize: 12, color: MUTED, marginTop: 1 },
});
