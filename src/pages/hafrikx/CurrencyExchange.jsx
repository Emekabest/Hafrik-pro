import React, { useState, memo, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, StatusBar, ActivityIndicator, Image, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '../../api/apiClient';

// ─── Palette ──────────────────────────────────────────────────────────────────
const BRAND  = '#0c3f44';
const TEAL   = '#1f8e93';
const TEAL_L = '#e8f6f7';
const WHITE  = '#ffffff';
const MUTED  = '#6b7a7c';
const DARK   = '#0d1f22';
const BG     = '#f4f9fa';
const GOLD   = '#d4a017';
const SUCCESS= '#10b981';

const a = (hex, op) => {
  const n = (hex || '').replace('#', '');
  const alpha = Math.round(Math.max(0, Math.min(1, op)) * 255).toString(16).padStart(2, '0');
  return `#${n}${alpha}`;
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const CURRENCIES = [
  { code: 'NGN', flag: '🇳🇬', name: 'Nigerian Naira',     symbol: '₦'   },
  { code: 'GHS', flag: '🇬🇭', name: 'Ghanaian Cedi',      symbol: '₵'   },
  { code: 'KES', flag: '🇰🇪', name: 'Kenyan Shilling',    symbol: 'KSh' },
  { code: 'ZAR', flag: '🇿🇦', name: 'South African Rand', symbol: 'R'   },
  { code: 'EGP', flag: '🇪🇬', name: 'Egyptian Pound',     symbol: 'E£'  },
  { code: 'USD', flag: '🇺🇸', name: 'US Dollar',          symbol: '$'   },
];

const PAYOUT_OPTIONS = [
  { key: 'wallet', icon: 'wallet',     label: 'Hafrik Wallet', desc: 'Credited in RMB' },
  { key: 'wechat', icon: 'logo-wechat',label: 'WeChat Pay',    desc: 'Via QR code'     },
  { key: 'bank',   icon: 'card',       label: 'Bank Account',  desc: 'Chinese bank'    },
];

const STATUS_META = {
  pending_payment:  { label: 'Pending Payment',  color: '#f59e0b', icon: 'time-outline'               },
  receipt_uploaded: { label: 'Receipt Uploaded', color: '#3b82f6', icon: 'cloud-upload-outline'       },
  waiting_admin:    { label: 'Under Review',     color: '#8b5cf6', icon: 'hourglass-outline'          },
  approved:         { label: 'Approved',         color: SUCCESS,   icon: 'checkmark-circle-outline'   },
  rmb_sent:         { label: 'RMB Sent',         color: SUCCESS,   icon: 'send-outline'               },
  completed:        { label: 'Completed',        color: SUCCESS,   icon: 'checkmark-done-circle'      },
  rejected:         { label: 'Rejected',         color: '#ef4444', icon: 'close-circle-outline'       },
};

const getC   = (code) => CURRENCIES.find(c => c.code === code) ?? CURRENCIES[0];
const fmtNum = (n)    => { const v = Number(n ?? 0); return v >= 1_000 ? v.toLocaleString() : String(v); };
const fmtDate = (ds)  => {
  if (!ds) return '';
  try { return new Date(ds.replace(' ', 'T')).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return ds; }
};

// ─── Currency Modal ───────────────────────────────────────────────────────────
const CurrencyModal = memo(({ visible, selected, onSelect, onClose }) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={cs.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={[cs.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={cs.handle} />
          <View style={cs.sheetHeader}>
            <Text style={cs.sheetTitle}>Select Currency</Text>
            <TouchableOpacity onPress={onClose} style={cs.closeBtn}>
              <Ionicons name="close" size={18} color={DARK} />
            </TouchableOpacity>
          </View>
          {CURRENCIES.map(c => {
            const active = selected === c.code;
            return (
              <TouchableOpacity
                key={c.code}
                style={[cs.currItem, active && cs.currItemActive]}
                onPress={() => { onSelect(c.code); onClose(); }}
                activeOpacity={0.75}
              >
                <View style={cs.flagCircle}>
                  <Text style={{ fontSize: 22 }}>{c.flag}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[cs.currCode, active && { color: TEAL }]}>{c.code}</Text>
                  <Text style={cs.currName}>{c.name}</Text>
                </View>
                <Text style={cs.currSymbol}>{c.symbol}</Text>
                {active && <View style={cs.checkBadge}><Ionicons name="checkmark" size={12} color={WHITE} /></View>}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
});

// ─── History Card ─────────────────────────────────────────────────────────────
const HistoryCard = memo(({ item, onPress }) => {
  const meta  = STATUS_META[item.status] ?? { label: item.status, color: MUTED, icon: 'ellipse-outline' };
  const fromC = getC(item.from);
  return (
    <TouchableOpacity style={hs.card} activeOpacity={0.82} onPress={() => onPress(item)}>
      <View style={hs.iconWrap}>
        <Text style={{ fontSize: 22 }}>{fromC.flag}</Text>
        <Text style={hs.arrow}>→</Text>
        <Text style={{ fontSize: 22 }}>🇨🇳</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={hs.amounts}>
          {fromC.symbol}{fmtNum(item.amount)} <Text style={hs.dim}>{item.from}</Text>
          {'  '}→{'  '}
          <Text style={{ color: GOLD, fontWeight: '900' }}>¥{fmtNum(item.converted_amount)}</Text>
          <Text style={hs.dim}> CNY</Text>
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <View style={[hs.badge, { backgroundColor: a(meta.color, 0.12) }]}>
            <Ionicons name={meta.icon} size={10} color={meta.color} />
            <Text style={[hs.badgeTxt, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <Text style={hs.date}>{fmtDate(item.created_at ?? item.date)}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={a(MUTED, 0.5)} />
    </TouchableOpacity>
  );
});

// ─── Step Dot ─────────────────────────────────────────────────────────────────
const StepDot = ({ n, active, done }) => (
  <View style={[sd.dot, done && sd.dotDone, active && sd.dotActive]}>
    {done
      ? <Ionicons name="checkmark" size={11} color={WHITE} />
      : <Text style={[sd.n, (active || done) && { color: WHITE }]}>{n}</Text>
    }
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CurrencyExchange() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();

  const [from,         setFrom]         = useState('NGN');
  const [amount,       setAmount]       = useState('');
  const [pickerOpen,   setPickerOpen]   = useState(false);
  const [payoutMethod, setPayoutMethod] = useState('wallet');
  const [wechatQr,     setWechatQr]     = useState(null);
  const [bankName,     setBankName]     = useState('');
  const [bankAccount,  setBankAccount]  = useState('');
  const [accountName,  setAccountName]  = useState('');
  const [bankBranch,   setBankBranch]   = useState('');
  const [liveRate,     setLiveRate]     = useState(null);
  const [rateLoading,  setRateLoading]  = useState(false);
  const [creating,     setCreating]     = useState(false);
  const [history,      setHistory]      = useState([]);
  const [histLoading,  setHistLoading]  = useState(false);
  const rateTimerRef = useRef(null);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const fromC        = getC(from);
  const estimatedRmb = liveRate != null && amount && !isNaN(parseFloat(amount))
    ? (parseFloat(amount) * liveRate).toFixed(2) : null;

  // Active step: 1 = amount, 2 = payout, 3 = confirm (always shows 3)
  const step = !amount.trim() ? 1 : 2;

  // ── Fetch rate ────────────────────────────────────────────────────────────────
  const fetchRate = useCallback(async (fromCode) => {
    setRateLoading(true);
    try {
      const res = await apiClient.get(`/hafrikx/exchange/rate.php?from=${fromCode}&to=CNY`);
      if (res.data?.status === 'success' && res.data?.data?.rate != null) {
        setLiveRate(Number(res.data.data.rate));
      }
    } catch { /* silent */ } finally { setRateLoading(false); }
  }, []);

  // ── Fetch history ─────────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const res = await apiClient.get('/hafrikx/exchange/history.php?page=1&limit=10');
      if (res.data?.status === 'success') {
        const rows = res.data?.data?.data ?? res.data?.data ?? [];
        setHistory(Array.isArray(rows) ? rows : []);
      }
    } catch { /* silent */ } finally { setHistLoading(false); }
  }, []);

  useEffect(() => {
    fetchRate(from); fetchHistory();
    rateTimerRef.current = setInterval(() => fetchRate(from), 30_000);
    return () => clearInterval(rateTimerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(useCallback(() => { fetchHistory(); }, [fetchHistory]));

  useEffect(() => {
    setLiveRate(null); fetchRate(from);
    clearInterval(rateTimerRef.current);
    rateTimerRef.current = setInterval(() => fetchRate(from), 30_000);
    return () => clearInterval(rateTimerRef.current);
  }, [from, fetchRate]);

  // ── Pick WeChat QR ────────────────────────────────────────────────────────────
  const handlePickQR = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, quality: 0.8,
    });
    if (!result.cancelled && result.assets?.[0]) {
      const asset = result.assets[0];
      setWechatQr({ uri: asset.uri, type: asset.type, name: asset.fileName || 'wechat_qr.jpg' });
    }
  }, []);

  // ── Create Order ──────────────────────────────────────────────────────────────
  const handleCreateOrder = useCallback(async () => {
    const num = parseFloat(amount);
    if (!num || isNaN(num) || num <= 0) { Alert.alert('Invalid Amount', 'Please enter a valid amount.'); return; }
    if (payoutMethod === 'wechat' && !wechatQr) { Alert.alert('Missing QR Code', 'Please upload your WeChat Pay QR code.'); return; }
    if (payoutMethod === 'bank') {
      if (!accountName.trim()) { Alert.alert('Missing Info', 'Please enter account holder name.'); return; }
      if (!bankAccount.trim()) { Alert.alert('Missing Info', 'Please enter bank account number.'); return; }
      if (!bankName.trim())    { Alert.alert('Missing Info', 'Please enter bank name.'); return; }
    }

    setCreating(true);
    try {
      const navigate = (order) => {
        navigation.navigate('ExchangeOrderStatus', { order_id: order.order_id });
      };

      if (payoutMethod === 'wechat' && wechatQr) {
        const formData = new FormData();
        formData.append('from', from); formData.append('amount', num);
        formData.append('payout_method', 'wechat');
        formData.append('wechat_qr', { uri: wechatQr.uri, type: wechatQr.type, name: wechatQr.name });
        const res = await apiClient.post('/hafrikx/exchange/create-order.php', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        if (res.data?.status === 'success') { setAmount(''); setWechatQr(null); fetchHistory(); navigate(res.data.data ?? res.data); }
        else Alert.alert('Error', res.data?.message ?? 'Could not create order.');
      } else if (payoutMethod === 'bank') {
        const body = { from, amount: num, payout_method: 'bank', bank_account_holder: accountName.trim(), bank_account_number: bankAccount.trim(), bank_name: bankName.trim(), bank_branch: bankBranch.trim() };
        const res  = await apiClient.post('/hafrikx/exchange/create-order.php', body);
        if (res.data?.status === 'success') { setAmount(''); setAccountName(''); setBankAccount(''); setBankName(''); setBankBranch(''); fetchHistory(); navigate(res.data.data ?? res.data); }
        else Alert.alert('Error', res.data?.message ?? 'Could not create order.');
      } else {
        const res = await apiClient.post('/hafrikx/exchange/create-order.php', { from, amount: num, payout_method: 'wallet' });
        if (res.data?.status === 'success') { setAmount(''); fetchHistory(); navigate(res.data.data ?? res.data); }
        else Alert.alert('Error', res.data?.message ?? 'Could not create order.');
      }
    } catch { Alert.alert('Error', 'Unable to reach server. Check your connection.'); }
    finally { setCreating(false); }
  }, [amount, from, payoutMethod, wechatQr, accountName, bankAccount, bankName, bankBranch, navigation, fetchHistory]);

  const handleHistoryPress = useCallback((item) => {
    navigation.navigate('ExchangeOrderStatus', { order_id: item.order_id });
  }, [navigation]);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Header ── */}
      <LinearGradient
        colors={[BRAND, '#144f55', TEAL]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={s.deco1} /><View style={s.deco2} />
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={WHITE} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Currency Exchange</Text>
            <Text style={s.headerSub}>Exchange to RMB (Chinese Yuan)</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Live rate chip ── */}
        <View style={s.rateChip}>
          {rateLoading
            ? <ActivityIndicator size="small" color={a(WHITE, 0.8)} style={{ marginRight: 6 }} />
            : <Ionicons name="trending-up" size={13} color={a(WHITE, 0.8)} />
          }
          <Text style={s.rateChipTxt}>
            {liveRate != null ? `1 ${from} = ${Number(liveRate).toFixed(4)} CNY` : 'Fetching live rate…'}
          </Text>
          <TouchableOpacity onPress={() => fetchRate(from)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="refresh" size={13} color={a(WHITE, 0.7)} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ══════════════════════════════════════════════════════════
            STEP INDICATOR
        ══════════════════════════════════════════════════════════ */}
        <View style={s.stepsRow}>
          {['Enter Amount', 'Receive Method', 'Confirm'].map((label, i) => {
            const n      = i + 1;
            const active = step === n;
            const done   = step > n;
            return (
              <React.Fragment key={label}>
                <View style={s.stepItem}>
                  <StepDot n={n} active={active} done={done} />
                  <Text style={[s.stepLabel, (active || done) && s.stepLabelActive]}>{label}</Text>
                </View>
                {i < 2 && <View style={[s.stepLine, done && s.stepLineDone]} />}
              </React.Fragment>
            );
          })}
        </View>

        {/* ══════════════════════════════════════════════════════════
            EXCHANGE WIDGET (Step 1)
        ══════════════════════════════════════════════════════════ */}
        <View style={s.exchangeCard}>
          {/* You Send */}
          <Text style={s.exchangeLabel}>You Send</Text>
          <View style={s.exchangeRow}>
            <TouchableOpacity style={s.currPill} onPress={() => setPickerOpen(true)} activeOpacity={0.85}>
              <Text style={{ fontSize: 22 }}>{fromC.flag}</Text>
              <Text style={s.currPillCode}>{fromC.code}</Text>
              <Ionicons name="chevron-down" size={13} color={MUTED} />
            </TouchableOpacity>
            <TextInput
              style={s.amountInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={a(DARK, 0.25)}
              returnKeyType="done"
            />
          </View>

          {/* Divider with arrow */}
          <View style={s.arrowDivider}>
            <View style={s.arrowLine} />
            <View style={s.arrowCircle}>
              <Ionicons name="arrow-down" size={16} color={WHITE} />
            </View>
            <View style={s.arrowLine} />
          </View>

          {/* You Receive */}
          <Text style={s.exchangeLabel}>You Receive (estimated)</Text>
          <View style={s.exchangeRow}>
            <View style={[s.currPill, { backgroundColor: a(TEAL, 0.08), borderColor: a(TEAL, 0.2) }]}>
              <Text style={{ fontSize: 22 }}>🇨🇳</Text>
              <Text style={[s.currPillCode, { color: TEAL }]}>CNY</Text>
            </View>
            <View style={s.receiveAmountWrap}>
              {estimatedRmb
                ? <Text style={s.receiveAmount}>¥{Number(estimatedRmb).toLocaleString()}</Text>
                : <Text style={s.receiveAmountPlaceholder}>{liveRate == null ? 'Loading rate…' : 'Enter amount above'}</Text>
              }
            </View>
          </View>

          {/* Note */}
          <Text style={s.exchangeNote}>
            Final rate confirmed at order creation · No hidden fees
          </Text>
        </View>

        {/* ══════════════════════════════════════════════════════════
            PAYOUT METHOD (Step 2)
        ══════════════════════════════════════════════════════════ */}
        <View style={s.sectionHeader}>
          <View style={s.sectionDot} />
          <Text style={s.sectionTitle}>How would you like to receive?</Text>
        </View>

        <View style={s.payoutRow}>
          {PAYOUT_OPTIONS.map(opt => {
            const active = payoutMethod === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[s.payoutCard, active && s.payoutCardActive]}
                onPress={() => setPayoutMethod(opt.key)}
                activeOpacity={0.8}
              >
                <View style={[s.payoutIconWrap, active && s.payoutIconWrapActive]}>
                  <Ionicons name={opt.icon} size={22} color={active ? WHITE : TEAL} />
                </View>
                <Text style={[s.payoutLabel, active && s.payoutLabelActive]}>{opt.label}</Text>
                <Text style={s.payoutDesc}>{opt.desc}</Text>
                {active && <View style={s.payoutCheck}><Ionicons name="checkmark" size={10} color={WHITE} /></View>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Payout detail panels ── */}
        {payoutMethod === 'wallet' && (
          <View style={s.infoPanel}>
            <Ionicons name="checkmark-circle" size={20} color={SUCCESS} />
            <View style={{ flex: 1 }}>
              <Text style={s.infoPanelTitle}>Credited to your Hafrik Wallet</Text>
              <Text style={s.infoPanelSub}>RMB will appear in your wallet balance within 1–3 hours after payment confirmation.</Text>
            </View>
          </View>
        )}

        {payoutMethod === 'wechat' && (
          <View>
            <Text style={s.uploadLabel}>Upload your WeChat Pay / Alipay QR Code</Text>
            <TouchableOpacity
              style={[s.qrBox, wechatQr && s.qrBoxFilled]}
              onPress={handlePickQR}
              activeOpacity={0.8}
            >
              {wechatQr ? (
                <>
                  <Image source={{ uri: wechatQr.uri }} style={s.qrImg} resizeMode="cover" />
                  <TouchableOpacity style={s.qrRemove} onPress={() => setWechatQr(null)}>
                    <Ionicons name="close-circle" size={26} color={WHITE} />
                  </TouchableOpacity>
                </>
              ) : (
                <View style={s.qrPlaceholder}>
                  <View style={s.qrIconCircle}>
                    <Ionicons name="qr-code-outline" size={30} color={TEAL} />
                  </View>
                  <Text style={s.qrUploadTxt}>Tap to upload QR code</Text>
                  <Text style={s.qrUploadSub}>Choose from your photo library</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={s.infoPanel}>
              <Ionicons name="information-circle-outline" size={18} color={TEAL} />
              <Text style={[s.infoPanelSub, { flex: 1 }]}>We'll scan your QR and send RMB directly to your WeChat / Alipay account.</Text>
            </View>
          </View>
        )}

        {payoutMethod === 'bank' && (
          <View style={s.bankForm}>
            {[
              { label: 'Account Holder Name *', value: accountName, set: setAccountName, placeholder: 'Your full name', keyboard: 'default' },
              { label: 'Bank Account Number *', value: bankAccount, set: setBankAccount, placeholder: 'e.g. 6225 7621 0000 1234', keyboard: 'numeric' },
              { label: 'Bank Name *',           value: bankName,    set: setBankName,    placeholder: 'e.g. China Construction Bank', keyboard: 'default' },
              { label: 'Bank Branch (optional)',value: bankBranch,  set: setBankBranch,  placeholder: 'e.g. Guangzhou Finance Branch', keyboard: 'default' },
            ].map(f => (
              <View key={f.label} style={s.bankField}>
                <Text style={s.bankFieldLabel}>{f.label}</Text>
                <TextInput
                  style={s.bankInput}
                  value={f.value}
                  onChangeText={f.set}
                  placeholder={f.placeholder}
                  placeholderTextColor={a(MUTED, 0.5)}
                  keyboardType={f.keyboard}
                />
              </View>
            ))}
            <View style={s.infoPanel}>
              <Ionicons name="information-circle-outline" size={18} color={TEAL} />
              <Text style={[s.infoPanelSub, { flex: 1 }]}>RMB will be transferred directly to your Chinese bank account.</Text>
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════
            HOW IT WORKS (3 steps)
        ══════════════════════════════════════════════════════════ */}
        <View style={s.sectionHeader}>
          <View style={s.sectionDot} />
          <Text style={s.sectionTitle}>How it works</Text>
        </View>

        <View style={s.howCard}>
          {[
            { icon: 'create-outline',       color: '#6366f1', title: 'Create Order',       sub: 'Fill in your amount and receive method, then submit your order.'     },
            { icon: 'card-outline',          color: '#f59e0b', title: 'Make Payment',       sub: "Pay to our bank account. You'll see the details after order creation." },
            { icon: 'cloud-upload-outline',  color: TEAL,      title: 'Upload Receipt',    sub: 'Upload your payment receipt so our team can verify it quickly.'        },
            { icon: 'checkmark-done-circle', color: SUCCESS,   title: 'Receive your RMB',  sub: 'Admin confirms your payment and sends RMB to your chosen method.'      },
          ].map((step, i, arr) => (
            <View key={step.title} style={s.howStep}>
              <View style={s.howLeft}>
                <View style={[s.howIconWrap, { backgroundColor: a(step.color, 0.12) }]}>
                  <Ionicons name={step.icon} size={20} color={step.color} />
                </View>
                {i < arr.length - 1 && <View style={s.howConnector} />}
              </View>
              <View style={s.howRight}>
                <Text style={s.howStepTitle}>{step.title}</Text>
                <Text style={s.howStepSub}>{step.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ══════════════════════════════════════════════════════════
            CTA BUTTON
        ══════════════════════════════════════════════════════════ */}
        <TouchableOpacity
          onPress={handleCreateOrder}
          disabled={creating || !amount.trim()}
          activeOpacity={0.88}
          style={[s.ctaWrap, (creating || !amount.trim()) && s.ctaWrapOff]}
        >
          <LinearGradient colors={[BRAND, TEAL]} style={s.cta} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {creating ? (
              <ActivityIndicator size="small" color={WHITE} />
            ) : (
              <>
                <Ionicons name="arrow-forward-circle-outline" size={22} color={WHITE} />
                <View>
                  <Text style={s.ctaTxt}>Create Exchange Order</Text>
                  {estimatedRmb && (
                    <Text style={s.ctaSub}>You receive ≈ ¥{Number(estimatedRmb).toLocaleString()} CNY</Text>
                  )}
                </View>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* ══════════════════════════════════════════════════════════
            HISTORY
        ══════════════════════════════════════════════════════════ */}
        <View style={s.histHeader}>
          <View style={s.sectionDot} />
          <Text style={s.sectionTitle}>Recent Orders</Text>
          {histLoading && <ActivityIndicator size="small" color={TEAL} style={{ marginLeft: 8 }} />}
        </View>

        {!histLoading && history.length === 0 ? (
          <View style={s.histEmpty}>
            <View style={s.histEmptyIcon}>
              <Ionicons name="receipt-outline" size={30} color={MUTED} />
            </View>
            <Text style={s.histEmptyTitle}>No orders yet</Text>
            <Text style={s.histEmptySub}>Your exchange orders will appear here</Text>
          </View>
        ) : (
          history.map((item, i) => (
            <HistoryCard key={item.order_id ?? i} item={item} onPress={handleHistoryPress} />
          ))
        )}
      </ScrollView>

      <CurrencyModal
        visible={pickerOpen}
        selected={from}
        onSelect={setFrom}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  content: { paddingHorizontal: 16, paddingTop: 24 },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: { paddingHorizontal: 16, paddingBottom: 20, overflow: 'hidden' },
  deco1: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: a(WHITE, 0.04), top: -80, right: -60 },
  deco2: { position: 'absolute', width: 120, height: 120, borderRadius: 60,  backgroundColor: a(WHITE, 0.05), bottom: -40, left: -20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: a(WHITE, 0.15), alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: WHITE, fontSize: 17, fontWeight: '800' },
  headerSub:   { color: a(WHITE, 0.65), fontSize: 11.5, marginTop: 2 },
  rateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: a(WHITE, 0.12), borderRadius: 100,
    paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'center',
    borderWidth: 1, borderColor: a(WHITE, 0.15),
  },
  rateChipTxt: { color: WHITE, fontSize: 12.5, fontWeight: '700', flex: 1 },

  // ── Step indicator ───────────────────────────────────────────────────────────
  stepsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  stepItem: { alignItems: 'center', gap: 5 },
  stepLine: { flex: 1, height: 2, backgroundColor: a(MUTED, 0.2), marginBottom: 18 },
  stepLineDone: { backgroundColor: TEAL },
  stepLabel: { fontSize: 10, fontWeight: '600', color: a(MUTED, 0.7), textAlign: 'center', maxWidth: 64 },
  stepLabelActive: { color: BRAND },

  // ── Exchange card ────────────────────────────────────────────────────────────
  exchangeCard: {
    backgroundColor: WHITE, borderRadius: 24,
    padding: 20, marginBottom: 22,
    shadowColor: DARK, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08, shadowRadius: 18, elevation: 6,
  },
  exchangeLabel: { fontSize: 11.5, fontWeight: '700', color: MUTED, marginBottom: 10, letterSpacing: 0.5 },
  exchangeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  currPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: BG, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: a(MUTED, 0.15),
  },
  currPillCode: { fontSize: 14, fontWeight: '800', color: DARK },
  amountInput: {
    flex: 1, fontSize: 32, fontWeight: '900', color: DARK,
    textAlign: 'right', paddingVertical: 4,
  },
  arrowDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  arrowLine: { flex: 1, height: 1.5, backgroundColor: a(MUTED, 0.12) },
  arrowCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 10,
    shadowColor: TEAL, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  receiveAmountWrap: { flex: 1, alignItems: 'flex-end', paddingRight: 4 },
  receiveAmount:     { fontSize: 32, fontWeight: '900', color: GOLD },
  receiveAmountPlaceholder: { fontSize: 15, color: a(MUTED, 0.5), fontStyle: 'italic' },
  exchangeNote: { fontSize: 11.5, color: a(MUTED, 0.7), textAlign: 'center', marginTop: 14 },

  // ── Section header ───────────────────────────────────────────────────────────
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionDot:    { width: 4, height: 16, borderRadius: 2, backgroundColor: TEAL },
  sectionTitle:  { fontSize: 14, fontWeight: '800', color: DARK },

  // ── Payout cards ─────────────────────────────────────────────────────────────
  payoutRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  payoutCard: {
    flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8,
    backgroundColor: WHITE, borderRadius: 18,
    borderWidth: 1.5, borderColor: a(MUTED, 0.12),
    position: 'relative',
    shadowColor: DARK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  payoutCardActive: { borderColor: TEAL, backgroundColor: a(TEAL, 0.04), shadowColor: TEAL, shadowOpacity: 0.1 },
  payoutIconWrap: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: TEAL_L, alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  payoutIconWrapActive: { backgroundColor: TEAL },
  payoutLabel: { fontSize: 11.5, fontWeight: '800', color: DARK, textAlign: 'center' },
  payoutLabelActive: { color: TEAL },
  payoutDesc:  { fontSize: 10, color: MUTED, marginTop: 3, textAlign: 'center' },
  payoutCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center',
  },

  // ── Info panel ───────────────────────────────────────────────────────────────
  infoPanel: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: a(TEAL, 0.07), borderRadius: 14,
    padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: a(TEAL, 0.15),
  },
  infoPanelTitle: { fontSize: 13, fontWeight: '700', color: DARK, marginBottom: 3 },
  infoPanelSub:   { fontSize: 12.5, color: MUTED, lineHeight: 19 },

  // ── QR upload ────────────────────────────────────────────────────────────────
  uploadLabel: { fontSize: 12.5, fontWeight: '700', color: MUTED, marginBottom: 10 },
  qrBox: {
    borderRadius: 18, borderWidth: 2, borderColor: a(TEAL, 0.3), borderStyle: 'dashed',
    overflow: 'hidden', marginBottom: 12, minHeight: 160,
    alignItems: 'center', justifyContent: 'center',
  },
  qrBoxFilled: { borderStyle: 'solid', borderColor: a(TEAL, 0.4) },
  qrImg:       { width: '100%', height: 200 },
  qrRemove:    { position: 'absolute', top: 10, right: 10, backgroundColor: a(DARK, 0.5), borderRadius: 16 },
  qrPlaceholder: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  qrIconCircle: { width: 64, height: 64, borderRadius: 20, backgroundColor: TEAL_L, alignItems: 'center', justifyContent: 'center' },
  qrUploadTxt: { fontSize: 14, fontWeight: '700', color: DARK },
  qrUploadSub: { fontSize: 12, color: MUTED },

  // ── Bank form ─────────────────────────────────────────────────────────────────
  bankForm: { marginBottom: 4 },
  bankField: { marginBottom: 12 },
  bankFieldLabel: { fontSize: 12, fontWeight: '700', color: MUTED, marginBottom: 7 },
  bankInput: {
    backgroundColor: WHITE, borderRadius: 14,
    borderWidth: 1, borderColor: a(MUTED, 0.18),
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 14, color: DARK,
    shadowColor: DARK, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },

  // ── How it works ──────────────────────────────────────────────────────────────
  howCard:   { backgroundColor: WHITE, borderRadius: 20, padding: 20, marginBottom: 24, shadowColor: DARK, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  howStep:   { flexDirection: 'row', gap: 14 },
  howLeft:   { alignItems: 'center' },
  howIconWrap:  { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  howConnector: { width: 2, flex: 1, backgroundColor: a(MUTED, 0.1), marginVertical: 4 },
  howRight:     { flex: 1, paddingBottom: 20 },
  howStepTitle: { fontSize: 14, fontWeight: '800', color: DARK, marginBottom: 4 },
  howStepSub:   { fontSize: 12.5, color: MUTED, lineHeight: 19 },

  // ── CTA ───────────────────────────────────────────────────────────────────────
  ctaWrap: { borderRadius: 18, overflow: 'hidden', marginBottom: 32, shadowColor: BRAND, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  ctaWrapOff: { opacity: 0.55, shadowOpacity: 0 },
  cta:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 12 },
  ctaTxt:  { fontSize: 16, fontWeight: '900', color: WHITE },
  ctaSub:  { fontSize: 11.5, color: a(WHITE, 0.75), marginTop: 2 },

  // ── History ───────────────────────────────────────────────────────────────────
  histHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  histEmpty: { alignItems: 'center', gap: 10, paddingVertical: 36, backgroundColor: WHITE, borderRadius: 20 },
  histEmptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  histEmptyTitle: { fontSize: 15, fontWeight: '800', color: DARK },
  histEmptySub:   { fontSize: 12.5, color: MUTED, textAlign: 'center' },
});

// ─── Step dot styles ──────────────────────────────────────────────────────────
const sd = StyleSheet.create({
  dot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: a(MUTED, 0.1), borderWidth: 1.5, borderColor: a(MUTED, 0.2),
    alignItems: 'center', justifyContent: 'center',
  },
  dotActive: { backgroundColor: BRAND, borderColor: BRAND },
  dotDone:   { backgroundColor: TEAL,  borderColor: TEAL  },
  n: { fontSize: 12, fontWeight: '800', color: MUTED },
});

// ─── History card styles ──────────────────────────────────────────────────────
const hs = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: WHITE, borderRadius: 18,
    padding: 16, marginBottom: 10,
    shadowColor: DARK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  iconWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  arrow: { fontSize: 13, color: TEAL, fontWeight: '900' },
  amounts: { fontSize: 14.5, fontWeight: '800', color: DARK },
  dim: { fontWeight: '500', color: MUTED },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt: { fontSize: 10.5, fontWeight: '700' },
  date: { fontSize: 11, color: MUTED },
});

// ─── Currency modal styles ────────────────────────────────────────────────────
const cs = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: a(DARK, 0.5), justifyContent: 'flex-end' },
  sheet: { backgroundColor: WHITE, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 6 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: a(MUTED, 0.25), alignSelf: 'center', marginVertical: 10 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: a(MUTED, 0.15), marginBottom: 6 },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: DARK },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: a(MUTED, 0.1), alignItems: 'center', justifyContent: 'center' },
  currItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 13 },
  currItemActive: { backgroundColor: a(TEAL, 0.06) },
  flagCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  currCode:   { fontSize: 15, fontWeight: '800', color: DARK },
  currName:   { fontSize: 12, color: MUTED, marginTop: 2 },
  currSymbol: { fontSize: 16, fontWeight: '900', color: MUTED, marginRight: 4 },
  checkBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
});
