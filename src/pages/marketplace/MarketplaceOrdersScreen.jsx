// src/pages/marketplace/MarketplaceOrdersScreen.jsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../../AuthContext';
import { Colors } from '../../theme';
import AppDetails from '../../helpers/appdetails';
import { getOrders } from './marketplaceApi';

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
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const STATUS_META = {
  pending:    { color: GOLD,   icon: 'time-outline',                  label: 'Pending'    },
  processing: { color: ACCENT, icon: 'reload-circle-outline',         label: 'Processing' },
  shipped:    { color: PURPLE, icon: 'car-outline',                   label: 'Shipped'    },
  delivered:  { color: GREEN,  icon: 'checkmark-circle-outline',      label: 'Delivered'  },
  completed:  { color: GREEN,  icon: 'checkmark-done-circle-outline', label: 'Completed'  },
  cancelled:  { color: DANGER, icon: 'close-circle-outline',          label: 'Cancelled'  },
};

const getMeta = (status = '') => STATUS_META[status.toLowerCase()] ?? { color: MUTED, icon: 'receipt-outline', label: status };

// ─── Order card ───────────────────────────────────────────────────────────────
function OrderCard({ order, onPress }) {
  const meta  = getMeta(order.status);
  const date  = fmtDate(order.created_at);
  const count = order.items_count ?? (order.items?.length ?? 0);

  return (
    <TouchableOpacity style={or.card} onPress={onPress} activeOpacity={0.85}>
      {/* Top row: icon + id + status pill */}
      <View style={or.cardTop}>
        <View style={[or.statusIcon, { backgroundColor: a(meta.color, 0.12) }]}>
          <Ionicons name={meta.icon} size={22} color={meta.color} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={or.orderId} numberOfLines={1}>
            Order #{order.order_ref ?? order.id}
          </Text>
          <Text style={or.dateText}>{date}</Text>
        </View>
        <View style={[or.statusPill, { backgroundColor: a(meta.color, 0.12) }]}>
          <View style={[or.statusDot, { backgroundColor: meta.color }]} />
          <Text style={[or.statusTxt, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      <View style={or.divider} />

      {/* Bottom row: item count + payment method + total */}
      <View style={or.cardBottom}>
        <View style={or.metaRow}>
          {count > 0 && (
            <View style={or.chip}>
              <Ionicons name="cube-outline" size={11} color={MUTED} />
              <Text style={or.chipTxt}>{count} item{count !== 1 ? 's' : ''}</Text>
            </View>
          )}
          {!!order.payment_method && (
            <View style={[or.chip, { backgroundColor: a(order.payment_method === 'wallet' ? GREEN : ACCENT, 0.09) }]}>
              <Ionicons
                name={order.payment_method === 'wallet' ? 'wallet-outline' : 'card-outline'}
                size={11}
                color={order.payment_method === 'wallet' ? GREEN : ACCENT}
              />
              <Text style={[or.chipTxt, { color: order.payment_method === 'wallet' ? GREEN : ACCENT }]}>
                {order.payment_method === 'wallet' ? 'Wallet' : 'Paystack'}
              </Text>
            </View>
          )}
        </View>
        <Text style={or.total}>{fmtMoney(order.currency, order.total)}</Text>
      </View>

      {/* Arrow */}
      <View style={or.arrowWrap}>
        <Ionicons name="chevron-forward" size={14} color={a(MUTED, 0.6)} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function MarketplaceOrdersScreen({ navigation }) {
  const { token }  = useAuth();
  const insets     = useSafeAreaInsets();

  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const data = await getOrders(token);
      setOrders(data);
    } catch (e) {
      setError(e.message ?? 'Could not load orders.');
    }
    setLoading(false);
    setRefreshing(false);
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={or.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: BRAND }}>
        <View style={or.headerRow}>
          <TouchableOpacity style={or.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={WHITE} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={or.headerTitle}>My Orders</Text>
            {orders.length > 0 && (
              <View style={or.badge}><Text style={or.badgeTxt}>{orders.length}</Text></View>
            )}
          </View>
          <TouchableOpacity style={or.iconBtn} onPress={() => load(true)} activeOpacity={0.8}>
            <Ionicons name="refresh-outline" size={20} color={WHITE} />
          </TouchableOpacity>
        </View>
        <View style={or.headerLine} />
      </SafeAreaView>

      {loading ? (
        <View style={or.centered}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={or.centeredTxt}>Loading your orders…</Text>
        </View>
      ) : error ? (
        <View style={or.centered}>
          <View style={or.emptyIcon}><Ionicons name="cloud-offline-outline" size={38} color={a(MUTED, 0.5)} /></View>
          <Text style={or.emptyTitle}>Something went wrong</Text>
          <Text style={or.emptySub}>{error}</Text>
          <TouchableOpacity style={or.ctaBtn} onPress={() => load()}>
            <Ionicons name="refresh" size={14} color={WHITE} />
            <Text style={or.ctaBtnTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => String(item.order_ref ?? item.id)}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => navigation.navigate('OrderDetailScreen', { order_ref: item.order_ref ?? String(item.id) })}
            />
          )}
          contentContainerStyle={[or.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={BRAND}
              colors={[BRAND]}
            />
          }
          ListEmptyComponent={
            <View style={or.empty}>
              <Text style={or.emptyEmoji}>📦</Text>
              <Text style={or.emptyTitle}>No orders yet</Text>
              <Text style={or.emptySub}>Your marketplace orders will appear here once you place one.</Text>
              <TouchableOpacity
                style={or.ctaBtn}
                onPress={() => navigation.navigate('MarketplaceScreen')}
              >
                <Ionicons name="bag-outline" size={16} color={WHITE} />
                <Text style={or.ctaBtnTxt}>Start Shopping</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const or = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  headerRow: {
    height: 44, flexDirection: 'row',
    alignItems: 'center', paddingHorizontal: 14,
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: `${WHITE}1A`, borderWidth: 1, borderColor: `${WHITE}24`,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '900', color: WHITE, fontFamily: FONT_B },
  headerLine:  { height: 1, backgroundColor: `${ACCENT}33` },
  badge:    { backgroundColor: `${WHITE}22`, borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 },
  badgeTxt: { fontSize: 11, fontWeight: '800', color: WHITE, fontFamily: FONT_B },

  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  centeredTxt: { fontSize: 13, color: MUTED, fontFamily: FONT_R, marginTop: 6 },

  list: { paddingHorizontal: 14, paddingTop: 14, gap: 10 },

  card: {
    backgroundColor: WHITE, borderRadius: 18, padding: 14,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    position: 'relative',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  statusIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  orderId: { fontSize: 14, fontWeight: '800', color: DARK, fontFamily: FONT_B },
  dateText: { fontSize: 11.5, color: MUTED, fontFamily: FONT_R },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 100, paddingHorizontal: 10, paddingVertical: 5,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontSize: 11, fontWeight: '800', fontFamily: FONT_B },

  divider: { height: 1, backgroundColor: a(BRAND, 0.06), marginBottom: 12 },

  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: a(MUTED, 0.1), borderRadius: 100,
    paddingHorizontal: 9, paddingVertical: 4,
  },
  chipTxt: { fontSize: 11, color: MUTED, fontFamily: FONT_R },
  total: { fontSize: 17, fontWeight: '900', color: ACCENT, fontFamily: FONT_B },
  arrowWrap: { position: 'absolute', right: 14, top: '50%' },

  // Empty / error states
  emptyIcon: {
    width: 88, height: 88, borderRadius: 26,
    backgroundColor: a(BRAND, 0.07),
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 10 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: DARK, fontFamily: FONT_B, textAlign: 'center' },
  emptySub:   { fontSize: 14, color: MUTED, fontFamily: FONT_R, textAlign: 'center', lineHeight: 21 },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: BRAND, borderRadius: 14,
    paddingHorizontal: 26, paddingVertical: 14, marginTop: 8,
  },
  ctaBtnTxt: { fontSize: 14, fontWeight: '800', color: WHITE, fontFamily: FONT_B },
});
