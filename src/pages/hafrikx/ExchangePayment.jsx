import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, ActivityIndicator, Alert, Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import apiClient from '../../api/apiClient';

const BG     = '#070d1a';
const CARD   = '#0f1a2e';
const BORDER = '#1e2d45';
const GOLD   = '#c9a84c';
const MUTED  = '#6b7f95';
const WHITE  = '#f5f6fa';
const GREEN  = '#10b981';

const fmtNum = (n) => {
  const v = Number(n ?? 0);
  return v >= 1_000 ? v.toLocaleString() : String(v);
};

const CopyRow = ({ label, value }) => {
  const handleCopy = () => {
    Clipboard.setString(String(value ?? ''));
    Alert.alert('Copied', `${label} copied to clipboard.`);
  };
  return (
    <View style={styles.copyRow}>
      <View style={styles.copyLeft}>
        <Text style={styles.copyLabel}>{label}</Text>
        <Text style={styles.copyValue} selectable>{value}</Text>
      </View>
      <TouchableOpacity onPress={handleCopy} style={styles.copyBtn} activeOpacity={0.75}>
        <Ionicons name="copy-outline" size={16} color={GOLD} />
      </TouchableOpacity>
    </View>
  );
};

export default function ExchangePayment() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();
  const route      = useRoute();

  const { order_id, from, amount, converted_amount, rate } = route.params ?? {};

  const [account, setAccount]   = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get(
          `/hafrikx/exchange/get-account.php?order_id=${order_id}`
        );
        if (res.data?.status === 'success') {
          setAccount(res.data.data ?? res.data);
        } else {
          Alert.alert('Error', res.data?.message ?? 'Could not load bank details.');
        }
      } catch {
        Alert.alert('Error', 'Failed to load payment details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    if (order_id) load();
  }, [order_id]);

  const handlePaid = useCallback(() => {
    navigation.navigate('ExchangeUploadReceipt', {
      order_id,
      from,
      amount,
      converted_amount,
    });
  }, [navigation, order_id, from, amount, converted_amount]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Instructions</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress steps */}
      <View style={styles.stepsRow}>
        {['Order', 'Pay', 'Receipt', 'QR', 'Done'].map((s, i) => (
          <React.Fragment key={i}>
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, i <= 1 && styles.stepCircleActive]}>
                {i < 1
                  ? <Ionicons name="checkmark" size={12} color={BG} />
                  : <Text style={[styles.stepNum, i <= 1 && styles.stepNumActive]}>{i + 1}</Text>
                }
              </View>
              <Text style={[styles.stepLabel, i <= 1 && styles.stepLabelActive]}>{s}</Text>
            </View>
            {i < 4 && <View style={[styles.stepLine, i < 1 && styles.stepLineDone]} />}
          </React.Fragment>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary card */}
        <LinearGradient colors={['#0f1f3d', '#091428']} style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Order Reference</Text>
          <Text style={styles.summaryOrderId}>{order_id}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>You Pay</Text>
              <Text style={styles.summaryItemVal}>{fmtNum(amount)} {from}</Text>
            </View>
            <View style={styles.summaryArrow}>
              <Ionicons name="arrow-forward" size={18} color={GOLD} />
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>You Receive</Text>
              <Text style={[styles.summaryItemVal, { color: GOLD }]}>¥{fmtNum(converted_amount)} CNY</Text>
            </View>
          </View>
          <Text style={styles.summaryRate}>Rate: 1 {from} = {Number(rate).toFixed(6)} CNY</Text>
        </LinearGradient>

        {/* Bank details */}
        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={GOLD} />
            <Text style={styles.loaderTxt}>Loading bank details…</Text>
          </View>
        ) : account ? (
          <View style={styles.bankCard}>
            <View style={styles.bankCardHeader}>
              <Ionicons name="business" size={18} color={GOLD} />
              <Text style={styles.bankCardTitle}>Payment Account</Text>
            </View>

            <CopyRow label="Bank Name"      value={account.bank_name}      />
            <CopyRow label="Account Name"   value={account.account_name}   />
            <CopyRow label="Account Number" value={account.account_number} />
            {account.bank_code    && <CopyRow label="Sort Code / IFSC" value={account.bank_code} />}
            {account.swift_code   && <CopyRow label="SWIFT Code"        value={account.swift_code} />}
            {account.routing      && <CopyRow label="Routing Number"    value={account.routing} />}

            {account.instructions && (
              <View style={styles.instructionBox}>
                <Ionicons name="information-circle" size={16} color={GOLD} style={{ marginRight: 8, marginTop: 1 }} />
                <Text style={styles.instructionTxt}>{account.instructions}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.bankCard}>
            <Text style={styles.errorTxt}>Could not load payment details. Please go back and try again.</Text>
          </View>
        )}

        {/* Important notice */}
        <View style={styles.noticeCard}>
          <Ionicons name="warning" size={16} color={GOLD} />
          <View style={{ flex: 1 }}>
            <Text style={styles.noticeTxt}>
              Use <Text style={{ color: GOLD, fontFamily: 'WorkSans_700Bold' }}>{order_id}</Text> as your payment reference / narration when making the transfer.
            </Text>
          </View>
        </View>

        {/* I Have Paid button */}
        <TouchableOpacity
          onPress={handlePaid}
          activeOpacity={0.87}
          disabled={loading || !account}
          style={[styles.paidBtnWrap, (loading || !account) && { opacity: 0.5 }]}
        >
          <LinearGradient colors={[GREEN, '#047857']} style={styles.paidBtn}>
            <Ionicons name="checkmark-circle" size={20} color={WHITE} />
            <Text style={styles.paidBtnTxt}>I Have Paid — Upload Receipt</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelLink}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('ExchangeOrderStatus', { order_id })}
        >
          <Text style={styles.cancelLinkTxt}>I'll pay later — View order status</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: BG },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER },
  headerTitle: { flex: 1, textAlign: 'center', color: WHITE, fontSize: 17, fontFamily: 'ReadexPro_600SemiBold' },

  stepsRow:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  stepItem:         { alignItems: 'center', gap: 4 },
  stepCircle:       { width: 26, height: 26, borderRadius: 13, backgroundColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  stepCircleActive: { backgroundColor: GOLD },
  stepNum:          { color: MUTED, fontSize: 11, fontFamily: 'WorkSans_700Bold' },
  stepNumActive:    { color: BG },
  stepLabel:        { color: MUTED, fontSize: 9, fontFamily: 'WorkSans_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 },
  stepLabelActive:  { color: GOLD },
  stepLine:         { flex: 1, height: 2, backgroundColor: BORDER, marginBottom: 12 },
  stepLineDone:     { backgroundColor: GOLD },

  scrollContent: { paddingHorizontal: 16, paddingTop: 6 },

  summaryCard:   { borderRadius: 18, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#1e3060' },
  summaryLabel:  { color: MUTED, fontSize: 11, fontFamily: 'WorkSans_500Medium', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  summaryOrderId:{ color: GOLD, fontSize: 16, fontFamily: 'ReadexPro_600SemiBold', marginBottom: 16 },
  summaryRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  summaryItem:   { flex: 1 },
  summaryItemLabel:{ color: MUTED, fontSize: 11, fontFamily: 'WorkSans_400Regular', marginBottom: 4 },
  summaryItemVal:  { color: WHITE, fontSize: 18, fontFamily: 'ReadexPro_600SemiBold' },
  summaryArrow:  { paddingHorizontal: 12 },
  summaryRate:   { color: MUTED, fontSize: 11.5, fontFamily: 'WorkSans_400Regular' },

  loaderWrap:   { alignItems: 'center', paddingVertical: 40, gap: 12 },
  loaderTxt:    { color: MUTED, fontFamily: 'WorkSans_400Regular', fontSize: 13 },

  bankCard:      { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 18, marginBottom: 14 },
  bankCardHeader:{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  bankCardTitle: { color: WHITE, fontSize: 14, fontFamily: 'ReadexPro_600SemiBold' },

  copyRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER + '66', gap: 10 },
  copyLeft:   { flex: 1 },
  copyLabel:  { color: MUTED, fontSize: 11, fontFamily: 'WorkSans_500Medium', marginBottom: 3 },
  copyValue:  { color: WHITE, fontSize: 14, fontFamily: 'WorkSans_600SemiBold' },
  copyBtn:    { width: 34, height: 34, borderRadius: 8, backgroundColor: GOLD + '14', alignItems: 'center', justifyContent: 'center' },

  instructionBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: GOLD + '0e', borderRadius: 10, padding: 12, marginTop: 14 },
  instructionTxt: { flex: 1, color: WHITE, fontSize: 12.5, fontFamily: 'WorkSans_400Regular', lineHeight: 18 },
  errorTxt:       { color: MUTED, textAlign: 'center', fontFamily: 'WorkSans_400Regular', fontSize: 13, padding: 20 },

  noticeCard:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: GOLD + '10', borderRadius: 12, borderWidth: 1, borderColor: GOLD + '2a', padding: 14, marginBottom: 20 },
  noticeTxt:   { color: WHITE, fontSize: 12.5, fontFamily: 'WorkSans_400Regular', lineHeight: 18 },

  paidBtnWrap: { marginBottom: 14 },
  paidBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 16, gap: 10 },
  paidBtnTxt:  { color: WHITE, fontSize: 15, fontFamily: 'WorkSans_700Bold' },

  cancelLink:    { alignItems: 'center', paddingVertical: 8 },
  cancelLinkTxt: { color: MUTED, fontSize: 13, fontFamily: 'WorkSans_500Medium', textDecorationLine: 'underline' },
});
