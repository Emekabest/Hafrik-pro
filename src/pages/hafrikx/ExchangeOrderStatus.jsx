import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, ActivityIndicator, RefreshControl, Clipboard, Alert,
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
const BLUE   = '#3b82f6';
const PURPLE = '#8b5cf6';
const RED    = '#ef4444';
const ORANGE = '#f59e0b';

const REFRESH_INTERVAL = 25_000; // 25 seconds

const STATUS_CONFIG = {
  pending_payment:  { label: 'Pending Payment',         color: ORANGE, icon: 'time',                  step: 0 },
  receipt_uploaded: { label: 'Receipt Uploaded',         color: BLUE,   icon: 'cloud-done',             step: 1 },
  waiting_admin:    { label: 'Under Review',             color: PURPLE, icon: 'hourglass',              step: 2 },
  approved:         { label: 'Payment Approved',         color: GREEN,  icon: 'checkmark-circle',       step: 3 },
  rmb_sent:         { label: 'RMB Sent',                 color: GREEN,  icon: 'send',                   step: 4 },
  completed:        { label: 'Order Completed',          color: GREEN,  icon: 'checkmark-done-circle',  step: 5 },
  rejected:         { label: 'Order Rejected',           color: RED,    icon: 'close-circle',           step: -1 },
};

const TIMELINE_STEPS = [
  { key: 'pending_payment',  label: 'Order Created',         icon: 'receipt-outline'       },
  { key: 'receipt_uploaded', label: 'Receipt Uploaded',      icon: 'cloud-upload-outline'  },
  { key: 'waiting_admin',    label: 'Admin Reviewing',       icon: 'eye-outline'           },
  { key: 'approved',         label: 'Payment Confirmed',     icon: 'shield-checkmark-outline' },
  { key: 'rmb_sent',         label: 'RMB Sent',              icon: 'send-outline'          },
  { key: 'completed',        label: 'Completed',             icon: 'checkmark-done-circle' },
];

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

const fmtNum = (n) => {
  const v = Number(n ?? 0);
  return v >= 1_000 ? v.toLocaleString() : String(v);
};

const fmtDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr.replace(' ', 'T')).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return dateStr; }
};

const StatusMessage = ({ status }) => {
  const messages = {
    pending_payment:  'Please make your payment to the provided bank account and upload your receipt.',
    receipt_uploaded: 'Your receipt has been received. Please also upload your Alipay / WeChat QR code.',
    waiting_admin:    'Our team is reviewing your payment. This usually takes 1–4 hours during business hours.',
    approved:         'Your payment has been confirmed! We are now sending your RMB.',
    rmb_sent:         'Your RMB has been sent to your Alipay / WeChat. Please check your account.',
    completed:        'Exchange completed successfully. Thank you for using HafrikX!',
    rejected:         'There was an issue with your order. Please contact support with your order ID.',
  };
  return (
    <Text style={styles.statusMsg}>{messages[status] ?? 'Order is being processed.'}</Text>
  );
};

export default function ExchangeOrderStatus() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();
  const route      = useRoute();
  const { order_id } = route.params ?? {};

  const [order,      setOrder]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [account,    setAccount]    = useState(null);
  const [acctLoading, setAcctLoading] = useState(false);
  const timerRef = useRef(null);

  const fetchAccount = useCallback(async (orderId) => {
    setAcctLoading(true);
    try {
      const res = await apiClient.get(`/hafrikx/exchange/get-account.php?order_id=${orderId}`);
      if (res.data?.status === 'success') {
        setAccount(res.data.data ?? res.data);
      }
    } catch { /* silent */ } finally {
      setAcctLoading(false);
    }
  }, []);

  const fetchOrder = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiClient.get(
        `/hafrikx/exchange/order-details.php?order_id=${order_id}`
      );
      if (res.data?.status === 'success') {
        const orderData = res.data.data ?? res.data;
        setOrder(orderData);
        if (orderData.status === 'pending_payment' && !account) {
          fetchAccount(order_id);
        }
      }
    } catch { /* silent */ } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, [order_id]);

  useEffect(() => {
    fetchOrder();
    timerRef.current = setInterval(() => fetchOrder(true), REFRESH_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [fetchOrder]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrder();
  }, [fetchOrder]);

  const status     = order?.status ?? 'pending_payment';
  const statusConf = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending_payment;
  const activeStep = statusConf.step;
  const isRejected = status === 'rejected';

  // Determine which action button to show
  const canUploadReceipt = status === 'pending_payment';
  const canUploadQR      = status === 'receipt_uploaded';

  if (loading && !order) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar barStyle="light-content" backgroundColor={BG} />
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={styles.loadingTxt}>Loading order details…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Status</Text>
        <TouchableOpacity onPress={() => fetchOrder()} style={styles.refreshIconBtn} activeOpacity={0.7}>
          <Ionicons name="refresh" size={19} color={WHITE} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={GOLD} />
        }
      >
        {/* Status hero */}
        <View style={[styles.statusHero, { borderColor: statusConf.color + '44' }]}>
          <LinearGradient
            colors={[statusConf.color + '18', BG]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={[styles.statusIconCircle, { backgroundColor: statusConf.color + '22' }]}>
            <Ionicons name={statusConf.icon} size={32} color={statusConf.color} />
          </View>
          <Text style={[styles.statusLabel, { color: statusConf.color }]}>{statusConf.label}</Text>
          <Text style={styles.statusOrderId}>{order_id}</Text>
          <StatusMessage status={status} />

          {/* Bank account inline — only when pending payment */}
          {canUploadReceipt && (
            <View style={styles.heroAccountBox}>
              {acctLoading ? (
                <ActivityIndicator size="small" color={GOLD} />
              ) : account ? (
                <>
                  <Text style={styles.heroAccountTitle}>Pay to this account</Text>
                  <CopyRow label="Bank Name"      value={account.bank_name}      />
                  <CopyRow label="Account Name"   value={account.account_name}   />
                  <CopyRow label="Account Number" value={account.account_number} />
                  {account.bank_code  && <CopyRow label="Sort Code / IFSC" value={account.bank_code}  />}
                  {account.swift_code && <CopyRow label="SWIFT Code"       value={account.swift_code} />}
                  {account.routing    && <CopyRow label="Routing Number"   value={account.routing}    />}
                  <View style={styles.heroNoticeRow}>
                    <Ionicons name="warning" size={13} color={GOLD} />
                    <Text style={styles.heroNoticeTxt}>
                      Use <Text style={{ color: GOLD, fontFamily: 'WorkSans_700Bold' }}>{order_id}</Text> as payment reference
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={styles.acctError}>Could not load bank details. Pull down to refresh.</Text>
              )}
            </View>
          )}

          {/* Auto-refresh note */}
          {!isRejected && status !== 'completed' && (
            <View style={styles.autoRefreshRow}>
              <ActivityIndicator size="small" color={MUTED} style={{ marginRight: 6 }} />
              <Text style={styles.autoRefreshTxt}>Auto-refreshes every 25 seconds</Text>
            </View>
          )}
        </View>

        {/* Order summary */}
        {order && (
          <View style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryCellLabel}>You Paid</Text>
                <Text style={styles.summaryCellVal}>{fmtNum(order.amount)} {order.from}</Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryCellLabel}>You Receive</Text>
                <Text style={[styles.summaryCellVal, { color: GOLD }]}>¥{fmtNum(order.converted_amount)}</Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryCellLabel}>Rate</Text>
                <Text style={styles.summaryCellVal}>{Number(order.rate).toFixed(6)}</Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryCellLabel}>Created</Text>
                <Text style={styles.summaryCellVal}>{fmtDate(order.created_at)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Checklist */}
        {order && (
          <View style={styles.checklistCard}>
            <Text style={styles.sectionTitle}>Upload Status</Text>
            <View style={styles.checkRow}>
              <Ionicons
                name={order.receipt_uploaded ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={order.receipt_uploaded ? GREEN : MUTED}
              />
              <Text style={[styles.checkTxt, order.receipt_uploaded && { color: WHITE }]}>
                Payment Receipt
              </Text>
              {order.receipt_uploaded && <Text style={styles.checkDone}>Uploaded ✓</Text>}
            </View>
            <View style={styles.checkRow}>
              <Ionicons
                name={order.qr_uploaded ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={order.qr_uploaded ? GREEN : MUTED}
              />
              <Text style={[styles.checkTxt, order.qr_uploaded && { color: WHITE }]}>
                Alipay / WeChat QR Code
              </Text>
              {order.qr_uploaded && <Text style={styles.checkDone}>Uploaded ✓</Text>}
            </View>
          </View>
        )}

        {/* Timeline */}
        {!isRejected && (
          <View style={styles.timelineCard}>
            <Text style={styles.sectionTitle}>Progress</Text>
            {TIMELINE_STEPS.map((step, i) => {
              const done   = i < activeStep;
              const active = i === activeStep;
              const stepColor = done || active ? GOLD : BORDER;
              return (
                <View key={step.key} style={styles.tlRow}>
                  <View style={styles.tlLeft}>
                    <View style={[
                      styles.tlDot,
                      done   && styles.tlDotDone,
                      active && styles.tlDotActive,
                    ]}>
                      {done
                        ? <Ionicons name="checkmark" size={11} color={BG} />
                        : active
                          ? <View style={styles.tlDotInner} />
                          : null
                      }
                    </View>
                    {i < TIMELINE_STEPS.length - 1 && (
                      <View style={[styles.tlLine, done && styles.tlLineDone]} />
                    )}
                  </View>
                  <View style={styles.tlContent}>
                    <View style={styles.tlLabelRow}>
                      <Ionicons name={step.icon} size={14} color={stepColor} style={{ marginRight: 6 }} />
                      <Text style={[styles.tlLabel, (done || active) && styles.tlLabelActive]}>
                        {step.label}
                      </Text>
                    </View>
                    {active && <Text style={styles.tlActiveNote}>Current step</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Action buttons */}
        {canUploadReceipt && (
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ExchangeUploadReceipt', {
              order_id,
              from: order?.from,
              amount: order?.amount,
              converted_amount: order?.converted_amount,
            })}
          >
            <LinearGradient colors={[GOLD, '#e8c87a']} style={styles.actionBtnGrad}>
              <Ionicons name="cloud-upload-outline" size={18} color={BG} />
              <Text style={styles.actionBtnTxt}>Upload Payment Receipt</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {canUploadQR && (
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ExchangeUploadQR', {
              order_id,
              from: order?.from,
              amount: order?.amount,
              converted_amount: order?.converted_amount,
            })}
          >
            <LinearGradient colors={[BLUE, '#1d4ed8']} style={styles.actionBtnGrad}>
              <Ionicons name="qr-code-outline" size={18} color={WHITE} />
              <Text style={[styles.actionBtnTxt, { color: WHITE }]}>Upload Alipay / WeChat QR</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {isRejected && (
          <View style={styles.rejectedCard}>
            <Ionicons name="alert-circle" size={24} color={RED} />
            <Text style={styles.rejectedTitle}>Order Rejected</Text>
            <Text style={styles.rejectedMsg}>
              {order?.rejection_reason ?? 'There was an issue with your payment. Please contact support.'}
            </Text>
            <Text style={styles.rejectedContact}>Contact: support@hafrik.com</Text>
            <Text style={styles.rejectedRef}>Reference: {order_id}</Text>
          </View>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: BG },
  loadingTxt:    { color: MUTED, fontFamily: 'WorkSans_400Regular', fontSize: 13, marginTop: 14 },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER },
  headerTitle:   { flex: 1, textAlign: 'center', color: WHITE, fontSize: 17, fontFamily: 'ReadexPro_600SemiBold' },
  refreshIconBtn:{ width: 40, height: 40, borderRadius: 20, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER },

  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  statusHero:       { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: 'center', marginBottom: 16, overflow: 'hidden' },
  statusIconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  statusLabel:      { fontSize: 18, fontFamily: 'ReadexPro_600SemiBold', marginBottom: 6 },
  statusOrderId:    { color: MUTED, fontSize: 12, fontFamily: 'WorkSans_500Medium', marginBottom: 10 },
  statusMsg:        { color: WHITE, fontSize: 13, fontFamily: 'WorkSans_400Regular', textAlign: 'center', lineHeight: 19, paddingHorizontal: 8 },
  autoRefreshRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  autoRefreshTxt:   { color: MUTED, fontSize: 11, fontFamily: 'WorkSans_400Regular' },

  sectionTitle:  { color: MUTED, fontSize: 11, fontFamily: 'WorkSans_700Bold', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14 },

  summaryCard:   { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 18, marginBottom: 12 },
  summaryGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  summaryCell:   { minWidth: '42%', flex: 1 },
  summaryCellLabel:{ color: MUTED, fontSize: 11, fontFamily: 'WorkSans_400Regular', marginBottom: 4 },
  summaryCellVal:  { color: WHITE, fontSize: 14, fontFamily: 'WorkSans_600SemiBold' },

  checklistCard: { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 18, marginBottom: 12 },
  checkRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER + '66' },
  checkTxt:      { flex: 1, color: MUTED, fontSize: 13, fontFamily: 'WorkSans_500Medium' },
  checkDone:     { color: GREEN, fontSize: 11, fontFamily: 'WorkSans_600SemiBold' },

  timelineCard:  { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 18, marginBottom: 16 },
  tlRow:         { flexDirection: 'row', minHeight: 52 },
  tlLeft:        { width: 28, alignItems: 'center' },
  tlDot:         { width: 20, height: 20, borderRadius: 10, backgroundColor: BORDER, borderWidth: 2, borderColor: MUTED, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  tlDotDone:     { backgroundColor: GOLD, borderColor: GOLD },
  tlDotActive:   { backgroundColor: CARD, borderColor: GOLD, borderWidth: 2.5 },
  tlDotInner:    { width: 8, height: 8, borderRadius: 4, backgroundColor: GOLD },
  tlLine:        { flex: 1, width: 2, backgroundColor: BORDER, marginVertical: 3 },
  tlLineDone:    { backgroundColor: GOLD },
  tlContent:     { flex: 1, paddingLeft: 12, paddingBottom: 10 },
  tlLabelRow:    { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  tlLabel:       { color: MUTED, fontSize: 13, fontFamily: 'WorkSans_500Medium' },
  tlLabelActive: { color: WHITE, fontFamily: 'WorkSans_600SemiBold' },
  tlActiveNote:  { color: GOLD, fontSize: 11, fontFamily: 'WorkSans_500Medium', marginTop: 3 },

  actionBtn:     { marginBottom: 12 },
  actionBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 16, gap: 10 },
  actionBtnTxt:  { fontFamily: 'WorkSans_700Bold', fontSize: 15, color: BG },

  rejectedCard:    { backgroundColor: RED + '10', borderRadius: 16, borderWidth: 1, borderColor: RED + '30', padding: 20, alignItems: 'center', gap: 8, marginBottom: 10 },
  rejectedTitle:   { color: RED, fontSize: 16, fontFamily: 'ReadexPro_600SemiBold' },
  rejectedMsg:     { color: WHITE, fontSize: 13, fontFamily: 'WorkSans_400Regular', textAlign: 'center', lineHeight: 19 },
  rejectedContact: { color: MUTED, fontSize: 12, fontFamily: 'WorkSans_500Medium' },
  rejectedRef:     { color: MUTED, fontSize: 11.5, fontFamily: 'WorkSans_400Regular' },

  // Hero account section
  heroAccountBox:   { width: '100%', marginTop: 18, borderTopWidth: 1, borderTopColor: BORDER + '66', paddingTop: 16 },
  heroAccountTitle: { color: MUTED, fontSize: 11, fontFamily: 'WorkSans_700Bold', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 },
  heroNoticeRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 7, backgroundColor: GOLD + '10', borderRadius: 10, padding: 10, marginTop: 10 },
  heroNoticeTxt:    { flex: 1, color: WHITE, fontSize: 12, fontFamily: 'WorkSans_400Regular', lineHeight: 17 },

  // CopyRow
  copyRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER + '55', gap: 10, width: '100%' },
  copyLeft:  { flex: 1 },
  copyLabel: { color: MUTED, fontSize: 11, fontFamily: 'WorkSans_500Medium', marginBottom: 2 },
  copyValue: { color: WHITE, fontSize: 14, fontFamily: 'WorkSans_600SemiBold' },
  copyBtn:   { width: 32, height: 32, borderRadius: 8, backgroundColor: GOLD + '14', alignItems: 'center', justifyContent: 'center' },

  acctError: { color: MUTED, fontSize: 12, fontFamily: 'WorkSans_400Regular', textAlign: 'center', paddingVertical: 10 },
});
