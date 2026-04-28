// src/pages/marketplace/OrderDetailScreen.jsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth }         from '../../AuthContext';
import { Colors }          from '../../theme';
import AppDetails          from '../../helpers/appdetails';
import { getOrderDetail }  from './marketplaceApi';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const WHITE  = '#ffffff';
const BG     = '#F4F6F9';
const DARK   = '#0F1923';
const MUTED  = '#8A96A3';
const GREEN  = '#22c55e';
const GOLD   = '#f59e0b';
const DANGER = '#ef4444';
const PURPLE = '#8b5cf6';
const BORDER = '#EAECF0';

const FONT_B = AppDetails?.fontFamily?.redex?.bold    ?? 'System';
const FONT_M = AppDetails?.fontFamily?.inter?.medium  ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';

const a = (hex, op) => {
  const h = (hex || '').replace('#', '');
  return `#${h}${Math.round(op * 255).toString(16).padStart(2, '0')}`;
};

const fmtMoney = (currency, amount) =>
  `${currency ?? ''} ${Number(amount ?? 0).toLocaleString()}`.trim();

const fmtDate = (raw) => {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d)) return raw;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const STATUS_META = {
  pending:    { color: GOLD,   icon: 'time-outline',                  label: 'Pending',     desc: 'Waiting for confirmation' },
  processing: { color: ACCENT, icon: 'reload-circle-outline',         label: 'Processing',  desc: 'Your order is being prepared' },
  shipped:    { color: PURPLE, icon: 'car-outline',                   label: 'Shipped',     desc: 'Your order is on its way' },
  delivered:  { color: GREEN,  icon: 'checkmark-circle-outline',      label: 'Delivered',   desc: 'Order delivered successfully' },
  completed:  { color: GREEN,  icon: 'checkmark-done-circle-outline', label: 'Completed',   desc: 'Order completed' },
  cancelled:  { color: DANGER, icon: 'close-circle-outline',          label: 'Cancelled',   desc: 'This order was cancelled' },
};
const getMeta = (s = '') => STATUS_META[s.toLowerCase()] ?? { color: MUTED, icon: 'receipt-outline', label: s, desc: '' };

const TIMELINE_ORDER = ['pending', 'processing', 'shipped', 'delivered'];

// ─── Section card wrapper ─────────────────────────────────────────────────────
function SectionCard({ title, icon, children, style }) {
  return (
    <View style={[od.card, style]}>
      <View style={od.cardHeader}>
        <View style={od.cardIconBox}>
          <Ionicons name={icon} size={14} color={WHITE} />
        </View>
        <Text style={od.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ─── Status timeline ──────────────────────────────────────────────────────────
function StatusTimeline({ currentStatus, history = [] }) {
  const isCancelled = currentStatus === 'cancelled';
  const steps = isCancelled ? ['pending', 'cancelled'] : TIMELINE_ORDER;

  const doneSet = new Set(history.map(h => h.status?.toLowerCase()));
  const currentIdx = steps.indexOf(currentStatus?.toLowerCase());

  return (
    <View style={od.timeline}>
      {steps.map((step, idx) => {
        const meta  = getMeta(step);
        const done  = doneSet.has(step) || (currentIdx >= 0 && idx <= currentIdx && !isCancelled);
        const isCur = step === currentStatus?.toLowerCase();
        const histEntry = [...history].reverse().find(h => h.status?.toLowerCase() === step);

        return (
          <View key={step} style={od.timelineRow}>
            {/* Left connector */}
            <View style={od.timelineLeft}>
              <View style={[
                od.timelineDot,
                done  && { backgroundColor: meta.color, borderColor: meta.color },
                isCur && { width: 18, height: 18, borderRadius: 9 },
              ]}>
                {done && <Ionicons name={isCur ? meta.icon : 'checkmark'} size={isCur ? 9 : 10} color={WHITE} />}
              </View>
              {idx < steps.length - 1 && (
                <View style={[od.timelineLine, done && idx < currentIdx && { backgroundColor: meta.color }]} />
              )}
            </View>

            {/* Right label */}
            <View style={od.timelineContent}>
              <Text style={[od.timelineLabel, done && { color: DARK, fontFamily: FONT_B }]}>
                {meta.label}
              </Text>
              {!!histEntry?.created_at && (
                <Text style={od.timelineDate}>{fmtDate(histEntry.created_at)}</Text>
              )}
              {!!histEntry?.note && (
                <Text style={od.timelineNote}>{histEntry.note}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function OrderDetailScreen({ navigation, route }) {
  const { token }  = useAuth();
  const insets     = useSafeAreaInsets();
  const order_ref  = route.params?.order_ref ?? '';

  const [order,   setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const data = await getOrderDetail(token, order_ref);
    if (data) setOrder(data);
    else      setError('Could not load order details.');
    setLoading(false);
  }, [token, order_ref]);

  useEffect(() => { load(); }, [load]);

  const meta    = order ? getMeta(order.status) : null;
  const items   = order?.items   ?? [];
  const history = order?.history ?? [];
  const address = (() => {
    try { return JSON.parse(order?.shipping_json ?? '{}'); } catch { return {}; }
  })();

  return (
    <View style={od.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      <SafeAreaView edges={['top']} style={{ backgroundColor: BRAND }}>
        <View style={od.headerRow}>
          <TouchableOpacity style={od.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={WHITE} />
          </TouchableOpacity>
          <Text style={od.headerTitle} numberOfLines={1}>
            {order_ref ? `#${order_ref}` : 'Order Details'}
          </Text>
          <TouchableOpacity style={od.iconBtn} onPress={load} activeOpacity={0.8}>
            <Ionicons name="refresh-outline" size={20} color={WHITE} />
          </TouchableOpacity>
        </View>
        <View style={od.headerLine} />
      </SafeAreaView>

      {loading ? (
        <View style={od.centered}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={od.centeredTxt}>Loading order…</Text>
        </View>
      ) : error ? (
        <View style={od.centered}>
          <View style={od.emptyIcon}><Ionicons name="alert-circle-outline" size={38} color={a(DANGER, 0.6)} /></View>
          <Text style={od.emptyTitle}>Not found</Text>
          <Text style={od.emptySub}>{error}</Text>
          <TouchableOpacity style={od.retryBtn} onPress={load}>
            <Text style={od.retryBtnTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[od.body, { paddingBottom: insets.bottom + 30 }]}
        >
          {/* ── Status hero card ── */}
          <View style={[od.statusHero, { borderColor: a(meta.color, 0.25) }]}>
            <View style={[od.statusHeroIcon, { backgroundColor: a(meta.color, 0.13) }]}>
              <Ionicons name={meta.icon} size={32} color={meta.color} />
            </View>
            <Text style={[od.statusHeroLabel, { color: meta.color }]}>{meta.label}</Text>
            <Text style={od.statusHeroDesc}>{meta.desc}</Text>
            <View style={od.statusHeroMeta}>
              <Text style={od.statusHeroRef}>Ref: {order.order_ref}</Text>
              <Text style={od.statusHeroDot}>·</Text>
              <Text style={od.statusHeroDate}>{fmtDate(order.created_at)}</Text>
            </View>
            <View style={[od.paymentBadge, { backgroundColor: a(order.payment_method === 'wallet' ? GREEN : ACCENT, 0.1) }]}>
              <Ionicons
                name={order.payment_method === 'wallet' ? 'wallet-outline' : 'card-outline'}
                size={12}
                color={order.payment_method === 'wallet' ? GREEN : ACCENT}
              />
              <Text style={[od.paymentBadgeTxt, { color: order.payment_method === 'wallet' ? GREEN : ACCENT }]}>
                {order.payment_method === 'wallet' ? 'Paid from Wallet' : 'Paid via Paystack'}
              </Text>
            </View>
          </View>

          {/* ── Tracking timeline ── */}
          <SectionCard title="Order Tracking" icon="navigate-outline">
            <StatusTimeline currentStatus={order.status} history={history} />
          </SectionCard>

          {/* ── Items ── */}
          {items.length > 0 && (
            <SectionCard title={`Items (${items.length})`} icon="cube-outline">
              {items.map((item, idx) => (
                <View key={String(item.id ?? idx)} style={[od.itemRow, idx > 0 && od.itemRowBorder]}>
                  <View style={od.itemThumb}>
                    {item.thumbnail ? (
                      <Image source={{ uri: item.thumbnail }} style={od.itemThumbImg} resizeMode="cover" />
                    ) : (
                      <View style={od.itemThumbFallback}>
                        <Ionicons name="image-outline" size={18} color={a(MUTED, 0.4)} />
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={od.itemTitle} numberOfLines={2}>{item.title}</Text>
                    {Array.isArray(item.variations) && item.variations.length > 0 && (
                      <View style={od.varRow}>
                        {item.variations.map((v, vi) => (
                          <View key={vi} style={od.varChip}>
                            <Text style={od.varTxt}>{v.variation_name}: {v.option_value}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                      <Text style={od.itemQty}>Qty: {item.quantity}</Text>
                      <Text style={od.itemPrice}>{fmtMoney(order.currency, item.price * item.quantity)}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </SectionCard>
          )}

          {/* ── Order summary ── */}
          <SectionCard title="Order Summary" icon="receipt-outline">
            <View style={od.summaryRow}>
              <Text style={od.summaryKey}>Subtotal</Text>
              <Text style={od.summaryVal}>{fmtMoney(order.currency, order.total)}</Text>
            </View>
            <View style={od.summaryRow}>
              <Text style={od.summaryKey}>Payment</Text>
              <Text style={[od.summaryVal, { color: ACCENT }]}>
                {order.payment_method === 'wallet' ? 'Hafrik Wallet' : 'Paystack'}
              </Text>
            </View>
            <View style={od.summaryDivider} />
            <View style={od.summaryRow}>
              <Text style={od.summaryKeyBold}>Total</Text>
              <Text style={od.summaryValBold}>{fmtMoney(order.currency, order.total)}</Text>
            </View>
          </SectionCard>

          {/* ── Shipping address ── */}
          {(address.street || address.city) && (
            <SectionCard title="Delivery Address" icon="location-outline">
              <View style={od.addressBlock}>
                {!!(address.first_name || address.last_name) && (
                  <Text style={od.addressLine}>{[address.first_name, address.last_name].filter(Boolean).join(' ')}</Text>
                )}
                {!!address.street   && <Text style={od.addressLine}>{address.street}</Text>}
                {!!address.city     && <Text style={od.addressLine}>{[address.city, address.state, address.postcode].filter(Boolean).join(', ')}</Text>}
                {!!address.country  && <Text style={od.addressLine}>{address.country}</Text>}
                {!!address.phone    && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <Ionicons name="call-outline" size={13} color={MUTED} />
                    <Text style={od.addressLine}>{address.phone}</Text>
                  </View>
                )}
              </View>
            </SectionCard>
          )}

          {/* ── Notes ── */}
          {!!order.notes && (
            <SectionCard title="Order Note" icon="chatbubble-ellipses-outline">
              <Text style={od.noteText}>{order.notes}</Text>
            </SectionCard>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const od = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  headerRow: {
    height: 44, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14,
  },
  iconBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: `${WHITE}1A`, borderWidth: 1, borderColor: `${WHITE}24`,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: '900', color: WHITE, fontFamily: FONT_B, flex: 1, textAlign: 'center' },
  headerLine:  { height: 1, backgroundColor: `${ACCENT}33` },

  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  centeredTxt: { fontSize: 13, color: MUTED, fontFamily: FONT_R, marginTop: 6 },
  emptyIcon:   { width: 80, height: 80, borderRadius: 24, backgroundColor: a(DANGER, 0.07), alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle:  { fontSize: 18, fontWeight: '900', color: DARK, fontFamily: FONT_B },
  emptySub:    { fontSize: 13, color: MUTED, fontFamily: FONT_R, textAlign: 'center' },
  retryBtn:    { backgroundColor: BRAND, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 13, marginTop: 4 },
  retryBtnTxt: { fontSize: 14, fontWeight: '800', color: WHITE, fontFamily: FONT_B },

  body: { padding: 14, gap: 12 },

  // ── Status hero ─────────────────────────────────────────────────────────────
  statusHero: {
    backgroundColor: WHITE, borderRadius: 20, padding: 22,
    alignItems: 'center', gap: 6,
    borderWidth: 1.5,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  statusHeroIcon:  { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statusHeroLabel: { fontSize: 22, fontWeight: '900', fontFamily: FONT_B },
  statusHeroDesc:  { fontSize: 13, color: MUTED, fontFamily: FONT_R, textAlign: 'center' },
  statusHeroMeta:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusHeroRef:   { fontSize: 11.5, color: MUTED, fontFamily: FONT_R },
  statusHeroDot:   { color: MUTED },
  statusHeroDate:  { fontSize: 11.5, color: MUTED, fontFamily: FONT_R },
  paymentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5, marginTop: 4,
  },
  paymentBadgeTxt: { fontSize: 12, fontWeight: '700', fontFamily: FONT_M },

  // ── Section card ────────────────────────────────────────────────────────────
  card: {
    backgroundColor: WHITE, borderRadius: 18, padding: 16, gap: 14,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIconBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '900', color: DARK, fontFamily: FONT_B },

  // ── Timeline ────────────────────────────────────────────────────────────────
  timeline: { gap: 0 },
  timelineRow: { flexDirection: 'row', gap: 14 },
  timelineLeft: { alignItems: 'center', width: 18 },
  timelineDot: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: a(MUTED, 0.3),
    backgroundColor: WHITE,
    alignItems: 'center', justifyContent: 'center',
  },
  timelineLine: { flex: 1, width: 2, backgroundColor: a(MUTED, 0.18), marginVertical: 4, minHeight: 20 },
  timelineContent: { flex: 1, paddingBottom: 18, gap: 2 },
  timelineLabel: { fontSize: 13.5, fontWeight: '600', color: MUTED, fontFamily: FONT_M },
  timelineDate:  { fontSize: 11, color: MUTED, fontFamily: FONT_R },
  timelineNote:  { fontSize: 11.5, color: MUTED, fontFamily: FONT_R, fontStyle: 'italic' },

  // ── Items ────────────────────────────────────────────────────────────────────
  itemRow: { flexDirection: 'row', gap: 12, paddingVertical: 6 },
  itemRowBorder: { borderTopWidth: 1, borderTopColor: BORDER },
  itemThumb: { borderRadius: 12, overflow: 'hidden' },
  itemThumbImg: { width: 68, height: 68, borderRadius: 12, backgroundColor: BG },
  itemThumbFallback: { width: 68, height: 68, borderRadius: 12, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 13, fontWeight: '700', color: DARK, lineHeight: 18, fontFamily: FONT_M },
  varRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  varChip:   { backgroundColor: a(BRAND, 0.07), borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  varTxt:    { fontSize: 10, color: BRAND, fontWeight: '600', fontFamily: FONT_M },
  itemQty:   { fontSize: 12, color: MUTED, fontFamily: FONT_R },
  itemPrice: { fontSize: 14, fontWeight: '900', color: ACCENT, fontFamily: FONT_B },

  // ── Summary ──────────────────────────────────────────────────────────────────
  summaryRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  summaryKey:    { fontSize: 13, color: MUTED, fontFamily: FONT_R },
  summaryVal:    { fontSize: 13, fontWeight: '700', color: DARK, fontFamily: FONT_M },
  summaryDivider:{ height: 1, backgroundColor: BORDER, marginVertical: 8 },
  summaryKeyBold:{ fontSize: 15, fontWeight: '900', color: DARK, fontFamily: FONT_B },
  summaryValBold:{ fontSize: 18, fontWeight: '900', color: ACCENT, fontFamily: FONT_B },

  // ── Address ──────────────────────────────────────────────────────────────────
  addressBlock: { gap: 4 },
  addressLine: { fontSize: 13.5, color: DARK, fontFamily: FONT_R, lineHeight: 20 },

  // ── Notes ─────────────────────────────────────────────────────────────────────
  noteText: { fontSize: 13.5, color: DARK, fontFamily: FONT_R, lineHeight: 21, fontStyle: 'italic' },
});
