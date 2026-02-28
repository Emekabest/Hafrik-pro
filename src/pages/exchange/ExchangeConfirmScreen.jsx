// ExchangeConfirmScreen — order review + recipient details + submit.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, StatusBar, Animated, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import { createOrder } from './exchangeApi';

const PRIMARY = '#0C3F44';
const ACCENT  = '#13C296';
const DARK    = '#0D1B1E';
const BG      = '#F4F6F8';

const CUR_SYMBOLS = { NGN: '₦', GHS: 'GH₵', RMB: '¥' };
const CUR_FLAGS   = { NGN: '🇳🇬', GHS: '🇬🇭', RMB: '🇨🇳' };

const fmtNum = (n, d = 2) =>
  Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

// ── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, visible }) => {
  const slideY = useRef(new Animated.Value(-80)).current;
  useEffect(() => {
    Animated.spring(slideY, {
      toValue: visible ? 0 : -80,
      useNativeDriver: true, tension: 80,
    }).start();
  }, [visible]);
  const bg = type === 'error' ? '#E03B3B' : ACCENT;
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

// ── Summary Row ───────────────────────────────────────────────────────────────
const SummaryRow = ({ label, value, accent, large }) => (
  <View style={styles.sumRow}>
    <Text style={styles.sumLabel}>{label}</Text>
    <Text style={[styles.sumValue, accent && { color: ACCENT }, large && styles.sumValueLarge]}>
      {value}
    </Text>
  </View>
);

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ExchangeConfirmScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const { top }    = useSafeAreaInsets();
  const { token }  = useAuth();

  const {
    fromCurrency, amount, fee, feePercent,
    net, rmbAmount, rate, selectedBank,
  } = route.params;

  const sym = CUR_SYMBOLS[fromCurrency] ?? '';

  const [recipientAccount, setRecipientAccount] = useState('');
  const [recipientName,    setRecipientName]    = useState('');
  const [notes,            setNotes]            = useState('');
  const [isSubmitting,     setIsSubmitting]     = useState(false);
  const [toast,            setToast]            = useState({ visible: false, message: '', type: 'success' });

  const showToast = useCallback((message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3500);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!recipientAccount.trim()) {
      showToast('Enter your WeChat / Alipay account', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await createOrder(token, {
        from_currency:     fromCurrency,
        to_currency:       'RMB',
        amount:            amount,
        bank_id:           selectedBank?.id ?? selectedBank?.bank_id,
        recipient_account: recipientAccount.trim(),
        recipient_name:    recipientName.trim(),
        notes:             notes.trim(),
      });
      showToast('Order placed successfully!');
      setTimeout(() => {
        navigation.reset({
          index: 1,
          routes: [
            { name: 'ExchangeHome' },
            { name: 'ExchangeHistory' },
          ],
        });
      }, 1500);
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to place order. Try again.';
      showToast(msg, 'error');
    }
    setIsSubmitting(false);
  }, [token, fromCurrency, amount, selectedBank, recipientAccount, recipientName, notes]);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={['#062A2E', PRIMARY, '#0a5a62']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: top + 12 }]}
      >
        <View style={styles.blob1} />
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirm Order</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.headerAccent} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Order summary card ────────────────────────────────────────── */}
        <View style={styles.sectionLabel}>
          <Ionicons name="receipt-outline" size={15} color={ACCENT} />
          <Text style={styles.sectionText}>Order Summary</Text>
        </View>

        <View style={styles.card}>
          {/* Currencies row */}
          <View style={styles.currencyRow}>
            <View style={styles.currencyBox}>
              <Text style={styles.curFlag}>{CUR_FLAGS[fromCurrency]}</Text>
              <View>
                <Text style={styles.curCode}>{fromCurrency}</Text>
                <Text style={styles.curAmount}>{sym}{fmtNum(amount)}</Text>
              </View>
            </View>
            <View style={styles.arrowCircle}>
              <Ionicons name="swap-horizontal" size={18} color={ACCENT} />
            </View>
            <View style={styles.currencyBox}>
              <Text style={styles.curFlag}>🇨🇳</Text>
              <View>
                <Text style={styles.curCode}>RMB</Text>
                <Text style={[styles.curAmount, { color: ACCENT }]}>¥{fmtNum(rmbAmount)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <SummaryRow label="Amount Sent"         value={`${sym}${fmtNum(amount)}`} />
          <SummaryRow label={`Fee (${fmtNum(feePercent, 1)}%)`} value={`−${sym}${fmtNum(fee)}`} />
          <SummaryRow label="Net Amount"          value={`${sym}${fmtNum(net)}`} />
          <SummaryRow label="Exchange Rate"       value={`1 RMB = ${fmtNum(rate, 2)} ${fromCurrency}`} />
          <View style={styles.divider} />
          <SummaryRow label="You Receive"         value={`¥${fmtNum(rmbAmount)}`} accent large />
        </View>

        {/* ── Payment bank card ─────────────────────────────────────────── */}
        <View style={styles.sectionLabel}>
          <Ionicons name="business-outline" size={15} color={ACCENT} />
          <Text style={styles.sectionText}>Send Payment To</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.bankRow}>
            <View style={styles.bankIcon}>
              <Ionicons name="card" size={22} color={PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bankName}>{selectedBank?.bank_name}</Text>
              <Text style={styles.bankDetail}>Account: {selectedBank?.account_number}</Text>
              <Text style={styles.bankDetail}>Name: {selectedBank?.account_name}</Text>
            </View>
          </View>
          <View style={styles.bankNotice}>
            <Ionicons name="information-circle-outline" size={14} color="#888" style={{ marginRight: 6 }} />
            <Text style={styles.bankNoticeText}>
              Send {sym}{fmtNum(amount)} to the account above, then submit this order.
            </Text>
          </View>
        </View>

        {/* ── Recipient details ─────────────────────────────────────────── */}
        <View style={styles.sectionLabel}>
          <Ionicons name="person-outline" size={15} color={ACCENT} />
          <Text style={styles.sectionText}>Your RMB Receiving Account</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>WeChat Pay / Alipay Number *</Text>
          <TextInput
            style={styles.field}
            value={recipientAccount}
            onChangeText={setRecipientAccount}
            placeholder="e.g. 138XXXXXXXX"
            placeholderTextColor="#C5CDD2"
            keyboardType="default"
            returnKeyType="next"
          />
          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Account Holder Name</Text>
          <TextInput
            style={styles.field}
            value={recipientName}
            onChangeText={setRecipientName}
            placeholder="Full name on account"
            placeholderTextColor="#C5CDD2"
            returnKeyType="next"
          />
          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Notes (optional)</Text>
          <TextInput
            style={[styles.field, { height: 72, textAlignVertical: 'top', paddingTop: 10 }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional information…"
            placeholderTextColor="#C5CDD2"
            multiline
          />
        </View>

        {/* ── Submit button ─────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <LinearGradient
            colors={[ACCENT, '#0ea37a']}
            style={styles.submitGrad}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.submitText}>Confirm & Place Order</Text>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          By placing this order you agree to Hafrik Exchange terms. Rates are locked at order creation.
        </Text>
        <View style={{ height: 50 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  toast: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },

  header: {
    paddingHorizontal: 16, paddingBottom: 16, overflow: 'hidden',
  },
  blob1: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(19,194,150,0.1)', top: -50, right: -30,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, textAlign: 'center', fontSize: 17, color: '#fff',
    fontWeight: '800', letterSpacing: 0.3,
  },
  headerAccent: { height: 1, backgroundColor: 'rgba(19,194,150,0.25)', marginTop: 14 },

  content: { paddingHorizontal: 16, paddingTop: 20 },

  sectionLabel: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 10, marginTop: 4,
  },
  sectionText: {
    fontSize: 13, fontWeight: '700', color: '#555',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },

  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 4,
  },

  // Currency row
  currencyRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  currencyBox: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  curFlag:   { fontSize: 28 },
  curCode:   { fontSize: 12, color: '#888', fontWeight: '600' },
  curAmount: { fontSize: 20, fontWeight: '800', color: DARK },
  arrowCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(19,194,150,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },

  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 10 },

  sumRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 5 },
  sumLabel: { fontSize: 14, color: '#888' },
  sumValue: { fontSize: 14, fontWeight: '600', color: DARK },
  sumValueLarge: { fontSize: 20, fontWeight: '800', color: ACCENT },

  // Bank card
  bankRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  bankIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(12,63,68,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  bankName: { fontSize: 15, fontWeight: '700', color: DARK, marginBottom: 3 },
  bankDetail: { fontSize: 12, color: '#888', marginBottom: 2 },
  bankNotice: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#F8F9FA', borderRadius: 10, padding: 10,
  },
  bankNoticeText: { flex: 1, fontSize: 12, color: '#888', lineHeight: 17 },

  // Fields
  fieldLabel: { fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  field: {
    borderWidth: 1.5, borderColor: '#E8EDEF', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: DARK,
  },

  // Submit
  submitBtn: { borderRadius: 18, overflow: 'hidden', marginTop: 8 },
  submitBtnDisabled: { opacity: 0.7 },
  submitGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 10,
  },
  submitText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },

  disclaimer: {
    fontSize: 11, color: '#bbb', textAlign: 'center', lineHeight: 16,
    marginTop: 14, marginHorizontal: 10,
  },
});
