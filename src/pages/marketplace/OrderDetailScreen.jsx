// src/pages/marketplace/OrderDetailScreen.jsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth }    from '../../AuthContext';
import { Colors }     from '../../theme';
import AppDetails     from '../../helpers/appdetails';
import apiClient      from '../../api/apiClient';

// ─── Design tokens ────────────────────────────────────────────────────────────
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

const fmtMoney = (amount) =>
  `NGN ${Number(amount ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (raw) => {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// ─── Status meta ──────────────────────────────────────────────────────────────
const STATUS_META = {
  placed:     { color: GOLD,   icon: 'time-outline',                  label: 'Placed',      desc: 'Order received, awaiting confirmation' },
  pending:    { color: GOLD,   icon: 'time-outline',                  label: 'Pending',     desc: 'Waiting for confirmation' },
  processing: { color: ACCENT, icon: 'reload-circle-outline',         label: 'Processing',  desc: 'Your order is being prepared' },
  shipped:    { color: PURPLE, icon: 'car-outline',                   label: 'Shipped',     desc: 'Your order is on its way' },
  delivered:  { color: GREEN,  icon: 'checkmark-circle-outline',      label: 'Delivered',   desc: 'Order delivered successfully' },
  completed:  { color: GREEN,  icon: 'checkmark-done-circle-outline', label: 'Completed',   desc: 'Order completed' },
  cancelled:  { color: DANGER, icon: 'close-circle-outline',          label: 'Cancelled',   desc: 'This order was cancelled' },
};
const getMeta = (s = '') =>
  STATUS_META[s.toLowerCase()] ?? { color: MUTED, icon: 'receipt-outline', label: s || 'Unknown', desc: '' };

// ─── Section card ─────────────────────────────────────────────────────────────
function SectionCard({ title, icon, children }) {
  return (
    <View style={od.card}>
      <View style={od.cardHeader}>
        <View style={od.cardIconBox}>
          <Ionicons name={icon} size={13} color={WHITE} />
        </View>
        <Text style={od.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function OrderDetailScreen({ navigation, route }) {
  const { token } = useAuth();
  const insets    = useSafeAreaInsets();

  // Always use order_id — the single source of truth
  const order_id = Number(route.params?.order_id ?? 0);

  const [order,   setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(async () => {
    if (!order_id) {
      setError('Invalid order ID.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/marketplace/get_order_detail.php', {
        params: { order_id },
      });

      if (res.data?.status !== 'success' || !res.data?.data) {
        throw new Error(res.data?.message ?? 'Could not load order details');
      }

      const d = res.data.data;

      // Map response to app shape
      setOrder({
        id:         Number(d.order_id   ?? 0),
        ref:        String(d.order_hash ?? ''),
        total:      Number(d.total      ?? 0),
        status:     String(d.status     ?? 'placed'),
        created_at: String(d.created_at ?? ''),
        items:      Array.isArray(d.items) ? d.items : [],
      });
    } catch (e) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Could not load order details');
    } finally {
      setLoading(false);
    }
  }, [order_id]);

  useEffect(() => { load(); }, [load]);

  const meta  = order ? getMeta(order.status) : null;
  const items = order?.items ?? [];

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={od.root}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND} />
        <SafeAreaView edges={['top']} style={{ backgroundColor: BRAND }}>
          <View style={od.headerRow}>
            <TouchableOpacity style={od.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={20} color={WHITE} />
            </TouchableOpacity>
            <Text style={od.headerTitle}>Order #{order_id}</Text>
            <View style={{ width: 34 }} />
          </View>
          <View style={od.headerLine} />
        </SafeAreaView>
        <View style={od.centered}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={od.centeredTxt}>Loading order…</Text>
        </View>
      </View>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error || !order) {
    return (
      <View style={od.root}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND} />
        <SafeAreaView edges={['top']} style={{ backgroundColor: BRAND }}>
          <View style={od.headerRow}>
            <TouchableOpacity style={od.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={20} color={WHITE} />
            </TouchableOpacity>
            <Text style={od.headerTitle}>Order #{order_id}</Text>
            <View style={{ width: 34 }} />
          </View>
          <View style={od.headerLine} />
        </SafeAreaView>
        <View style={od.centered}>
          <View style={od.emptyIcon}>
            <Ionicons name="alert-circle-outline" size={38} color={a(DANGER, 0.6)} />
          </View>
          <Text style={od.emptyTitle}>Order not found</Text>
          <Text style={od.emptySub}>{error || 'Could not load order details'}</Text>
          <TouchableOpacity style={od.retryBtn} onPress={load} activeOpacity={0.85}>
            <Text style={od.retryBtnTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Content ─────────────────────────────────────────────────────────────────
  return (
    <View style={od.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: BRAND }}>
        <View style={od.headerRow}>
          <TouchableOpacity style={od.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={WHITE} />
          </TouchableOpacity>
          <Text style={od.headerTitle}>Order #{order.id}</Text>
          <TouchableOpacity style={od.iconBtn} onPress={load} activeOpacity={0.8}>
            <Ionicons name="refresh-outline" size={20} color={WHITE} />
          </TouchableOpacity>
        </View>
        <View style={od.headerLine} />
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[od.body, { paddingBottom: insets.bottom + 32 }]}
      >
        {/* ── Status hero ── */}
        <View style={[od.statusHero, { borderColor: a(meta.color, 0.25) }]}>
          <View style={[od.statusHeroIcon, { backgroundColor: a(meta.color, 0.12) }]}>
            <Ionicons name={meta.icon} size={34} color={meta.color} />
          </View>
          <Text style={[od.statusHeroLabel, { color: meta.color }]}>{meta.label}</Text>
          <Text style={od.statusHeroDesc}>{meta.desc}</Text>

          {/* Order meta row */}
          <View style={od.heroDivider} />
          <View style={od.heroMetaGrid}>
            <View style={od.heroMetaItem}>
              <Text style={od.heroMetaKey}>Order ID</Text>
              <Text style={od.heroMetaVal}>#{order.id}</Text>
            </View>
            <View style={od.heroMetaDivider} />
            <View style={od.heroMetaItem}>
              <Text style={od.heroMetaKey}>Date</Text>
              <Text style={od.heroMetaVal}>{fmtDate(order.created_at)}</Text>
            </View>
            <View style={od.heroMetaDivider} />
            <View style={od.heroMetaItem}>
              <Text style={od.heroMetaKey}>Items</Text>
              <Text style={od.heroMetaVal}>{items.length}</Text>
            </View>
          </View>
        </View>

        {/* ── Order Items ── */}
        <SectionCard title={`Items (${items.length})`} icon="cube-outline">
          {items.length === 0 ? (
            <Text style={od.emptyItems}>No items found for this order.</Text>
          ) : (
            items.map((item, idx) => {
              const unitPrice = Number(item.price ?? 0);
              const qty       = Number(item.quantity ?? 1);
              const lineTotal = unitPrice * qty;
              const vars      = Array.isArray(item.variations) ? item.variations : [];

              return (
                <View key={String(item.item_id ?? idx)} style={[od.itemRow, idx > 0 && od.itemRowBorder]}>
                  {/* Product icon placeholder */}
                  <View style={od.itemThumb}>
                    <Ionicons name="cube-outline" size={22} color={a(BRAND, 0.4)} />
                  </View>

                  <View style={{ flex: 1, gap: 4 }}>
                    {/* Title */}
                    <Text style={od.itemTitle}>Product #{item.product_id}</Text>

                    {/* Variations */}
                    {vars.length > 0 && (
                      <View style={od.varRow}>
                        {vars.map((v, vi) => {
                          const label = v.variation_name
                            ? `${v.variation_name}: ${v.option_value}`
                            : String(v.option_value ?? v);
                          return (
                            <View key={vi} style={od.varChip}>
                              <Text style={od.varTxt}>{label}</Text>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {/* Qty + price row */}
                    <View style={od.itemFooter}>
                      <Text style={od.itemQty}>
                        {fmtMoney(unitPrice)} × {qty}
                      </Text>
                      <Text style={od.itemLineTotal}>{fmtMoney(lineTotal)}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </SectionCard>

        {/* ── Order Summary ── */}
        <SectionCard title="Order Summary" icon="receipt-outline">
          <View style={od.summaryRow}>
            <Text style={od.summaryKey}>Order ID</Text>
            <Text style={od.summaryVal}>#{order.id}</Text>
          </View>
          <View style={od.summaryRow}>
            <Text style={od.summaryKey}>Status</Text>
            <View style={[od.statusPill, { backgroundColor: a(meta.color, 0.1) }]}>
              <Text style={[od.statusPillTxt, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>
          <View style={od.summaryRow}>
            <Text style={od.summaryKey}>Date</Text>
            <Text style={od.summaryVal}>{fmtDate(order.created_at)}</Text>
          </View>
          <View style={od.summaryDivider} />
          <View style={od.summaryRow}>
            <Text style={od.summaryKeyBold}>Total</Text>
            <Text style={od.summaryValBold}>{fmtMoney(order.total)}</Text>
          </View>
        </SectionCard>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const od = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Header
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

  // Centered states
  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  centeredTxt: { fontSize: 13, color: MUTED, fontFamily: FONT_R, marginTop: 6 },
  emptyIcon:   {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: a(DANGER, 0.07),
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle:  { fontSize: 18, fontWeight: '900', color: DARK, fontFamily: FONT_B },
  emptySub:    { fontSize: 13, color: MUTED, fontFamily: FONT_R, textAlign: 'center' },
  retryBtn:    { backgroundColor: BRAND, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 13, marginTop: 4 },
  retryBtnTxt: { fontSize: 14, fontWeight: '800', color: WHITE, fontFamily: FONT_B },

  body: { padding: 14, gap: 12 },

  // Status hero
  statusHero: {
    backgroundColor: WHITE, borderRadius: 20, padding: 22,
    alignItems: 'center', gap: 6,
    borderWidth: 1.5,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  statusHeroIcon:  { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statusHeroLabel: { fontSize: 22, fontWeight: '900', fontFamily: FONT_B },
  statusHeroDesc:  { fontSize: 13, color: MUTED, fontFamily: FONT_R, textAlign: 'center' },
  heroDivider:     { height: 1, backgroundColor: BORDER, width: '100%', marginVertical: 10 },
  heroMetaGrid:    { flexDirection: 'row', width: '100%', justifyContent: 'space-around' },
  heroMetaItem:    { alignItems: 'center', flex: 1, gap: 3 },
  heroMetaDivider: { width: 1, backgroundColor: BORDER },
  heroMetaKey:     { fontSize: 10.5, color: MUTED, fontFamily: FONT_R, textTransform: 'uppercase', letterSpacing: 0.4 },
  heroMetaVal:     { fontSize: 13, fontWeight: '800', color: DARK, fontFamily: FONT_B },

  // Section card
  card: {
    backgroundColor: WHITE, borderRadius: 18, padding: 16, gap: 14,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIconBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' },
  cardTitle:   { fontSize: 14, fontWeight: '900', color: DARK, fontFamily: FONT_B },

  // Items
  emptyItems:    { fontSize: 13, color: MUTED, fontFamily: FONT_R, textAlign: 'center', paddingVertical: 12 },
  itemRow:       { flexDirection: 'row', gap: 12, paddingVertical: 8, alignItems: 'flex-start' },
  itemRowBorder: { borderTopWidth: 1, borderTopColor: BORDER },
  itemThumb: {
    width: 52, height: 52, borderRadius: 12,
    backgroundColor: a(BRAND, 0.06),
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  itemTitle:    { fontSize: 13.5, fontWeight: '700', color: DARK, fontFamily: FONT_M, lineHeight: 19 },
  varRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  varChip:      { backgroundColor: a(BRAND, 0.07), borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  varTxt:       { fontSize: 10.5, color: BRAND, fontWeight: '600', fontFamily: FONT_M },
  itemFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  itemQty:      { fontSize: 12, color: MUTED, fontFamily: FONT_R },
  itemLineTotal:{ fontSize: 14, fontWeight: '900', color: ACCENT, fontFamily: FONT_B },

  // Summary
  summaryRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  summaryKey:     { fontSize: 13, color: MUTED, fontFamily: FONT_R },
  summaryVal:     { fontSize: 13, fontWeight: '700', color: DARK, fontFamily: FONT_M },
  summaryDivider: { height: 1, backgroundColor: BORDER, marginVertical: 8 },
  summaryKeyBold: { fontSize: 15, fontWeight: '900', color: DARK, fontFamily: FONT_B },
  summaryValBold: { fontSize: 20, fontWeight: '900', color: ACCENT, fontFamily: FONT_B },

  // Status pill (in summary)
  statusPill:    { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 3 },
  statusPillTxt: { fontSize: 12, fontWeight: '700', fontFamily: FONT_M },
});
