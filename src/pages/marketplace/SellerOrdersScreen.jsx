// src/pages/marketplace/SellerOrdersScreen.jsx
// Seller dashboard — view and manage incoming orders
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth }    from '../../AuthContext';
import { Colors }     from '../../theme';
import AppDetails     from '../../helpers/appdetails';
import useStore       from '../../repository/store';
import { getSellerOrders, updateOrderStatus } from './marketplaceApi';

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
  const diff = Date.now() - d;
  if (diff < 60_000)      return 'Just now';
  if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)  return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 172_800_000) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const STATUS_META = {
  pending:    { color: GOLD,   icon: 'time-outline',           label: 'Pending'    },
  processing: { color: ACCENT, icon: 'reload-circle-outline',  label: 'Processing' },
  shipped:    { color: PURPLE, icon: 'car-outline',            label: 'Shipped'    },
  delivered:  { color: GREEN,  icon: 'checkmark-circle-outline', label: 'Delivered' },
  completed:  { color: GREEN,  icon: 'checkmark-done-circle-outline', label: 'Completed' },
  cancelled:  { color: DANGER, icon: 'close-circle-outline',   label: 'Cancelled'  },
};
const getMeta = (s = '') => STATUS_META[s.toLowerCase()] ?? { color: MUTED, icon: 'receipt-outline', label: s };

const STATUS_TABS = [
  { key: 'all',        label: 'All'        },
  { key: 'pending',    label: 'Pending'    },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped',    label: 'Shipped'    },
  { key: 'delivered',  label: 'Delivered'  },
  { key: 'cancelled',  label: 'Cancelled'  },
];

// Actions a seller can take per status
const NEXT_ACTIONS = {
  pending:    [{ status: 'processing', label: 'Accept & Process', icon: 'checkmark-circle-outline', color: ACCENT },
               { status: 'cancelled',  label: 'Cancel Order',      icon: 'close-circle-outline',     color: DANGER }],
  processing: [{ status: 'shipped',    label: 'Mark as Shipped',   icon: 'car-outline',              color: PURPLE }],
  shipped:    [{ status: 'delivered',  label: 'Mark Delivered',    icon: 'checkmark-done-circle-outline', color: GREEN }],
};

// ─── Order Card ───────────────────────────────────────────────────────────────
function SellerOrderCard({ order, onAction, onViewDetail }) {
  const meta   = getMeta(order.status);
  const count  = order.items_count ?? (order.items?.length ?? 0);
  const actions = NEXT_ACTIONS[order.status?.toLowerCase()] ?? [];

  return (
    <View style={so.card}>
      {/* Header */}
      <TouchableOpacity style={so.cardTop} onPress={onViewDetail} activeOpacity={0.85}>
        {/* Buyer avatar */}
        <View style={so.buyerAvaWrap}>
          {order.buyer_avatar ? (
            <Image source={{ uri: order.buyer_avatar }} style={so.buyerAva} />
          ) : (
            <View style={[so.buyerAva, so.buyerAvaFallback]}>
              <Ionicons name="person" size={20} color={BRAND} />
            </View>
          )}
        </View>

        <View style={{ flex: 1, gap: 3 }}>
          <Text style={so.orderId} numberOfLines={1}>#{order.order_ref ?? order.id}</Text>
          <Text style={so.buyerName} numberOfLines={1}>
            {order.buyer_username ?? 'Customer'}
          </Text>
          <Text style={so.dateText}>{fmtDate(order.created_at)}</Text>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 5 }}>
          <View style={[so.statusPill, { backgroundColor: a(meta.color, 0.12) }]}>
            <View style={[so.statusDot, { backgroundColor: meta.color }]} />
            <Text style={[so.statusTxt, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <Text style={so.total}>{fmtMoney(order.currency, order.total)}</Text>
        </View>
      </TouchableOpacity>

      {/* Meta chips */}
      <View style={so.chipRow}>
        {count > 0 && (
          <View style={so.chip}>
            <Ionicons name="cube-outline" size={11} color={MUTED} />
            <Text style={so.chipTxt}>{count} item{count !== 1 ? 's' : ''}</Text>
          </View>
        )}
        <View style={[so.chip, { backgroundColor: a(order.payment_method === 'wallet' ? GREEN : ACCENT, 0.09) }]}>
          <Ionicons
            name={order.payment_method === 'wallet' ? 'wallet-outline' : 'card-outline'}
            size={11}
            color={order.payment_method === 'wallet' ? GREEN : ACCENT}
          />
          <Text style={[so.chipTxt, { color: order.payment_method === 'wallet' ? GREEN : ACCENT }]}>
            {order.payment_method === 'wallet' ? 'Wallet' : 'Paystack'}
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      {actions.length > 0 && (
        <View style={so.actionRow}>
          {actions.map(act => (
            <TouchableOpacity
              key={act.status}
              style={[so.actionBtn, { backgroundColor: a(act.color, 0.1), borderColor: a(act.color, 0.25) }]}
              onPress={() => onAction(order, act)}
              activeOpacity={0.8}
            >
              <Ionicons name={act.icon} size={14} color={act.color} />
              <Text style={[so.actionBtnTxt, { color: act.color }]}>{act.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Update Status Modal ──────────────────────────────────────────────────────
function UpdateModal({ visible, order, action, onClose, onConfirm, busy }) {
  const [note, setNote] = useState('');
  if (!visible || !order || !action) return null;
  const meta = getMeta(action.status);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={so.modalOverlay}>
          <View style={so.modalSheet}>
            <View style={so.modalDragPill} />
            <View style={[so.modalIconBox, { backgroundColor: a(meta.color, 0.12) }]}>
              <Ionicons name={meta.icon} size={28} color={meta.color} />
            </View>
            <Text style={so.modalTitle}>{action.label}</Text>
            <Text style={so.modalSub}>
              Order <Text style={{ fontFamily: FONT_B }}>#{order.order_ref}</Text> will be updated to{' '}
              <Text style={{ color: meta.color, fontFamily: FONT_B }}>{meta.label}</Text>.
            </Text>

            <View style={so.noteField}>
              <Text style={so.noteLabel}>Note for customer (optional)</Text>
              <TextInput
                style={so.noteInput}
                placeholder="e.g. Your order has been shipped via DHL…"
                placeholderTextColor={MUTED}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={so.modalBtns}>
              <TouchableOpacity style={so.modalCancelBtn} onPress={onClose} activeOpacity={0.8}>
                <Text style={so.modalCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[so.modalConfirmBtn, { backgroundColor: action.color }, busy && { opacity: 0.6 }]}
                onPress={() => onConfirm(note)}
                disabled={busy}
                activeOpacity={0.86}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={WHITE} />
                ) : (
                  <>
                    <Ionicons name={action.icon} size={16} color={WHITE} />
                    <Text style={so.modalConfirmTxt}>Confirm</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SellerOrdersScreen({ navigation }) {
  const { token }  = useAuth();
  const insets     = useSafeAreaInsets();
  const showToast  = useStore(s => s.showToast);

  const [activeTab,  setActiveTab]  = useState('all');
  const [orders,     setOrders]     = useState([]);
  const [counts,     setCounts]     = useState({});
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  // Update modal state
  const [pendingAction, setPendingAction] = useState(null);  // { order, action }
  const [updating,      setUpdating]      = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const { orders: data, counts: cnts } = await getSellerOrders(token, activeTab);
      setOrders(data);
      setCounts(cnts);
    } catch (e) {
      setError(e.message ?? 'Could not load orders.');
    }
    setLoading(false);
    setRefreshing(false);
  }, [token, activeTab]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setOrders([]);
    setLoading(true);
  }, []);

  const handleAction = useCallback((order, action) => {
    setPendingAction({ order, action });
  }, []);

  const handleConfirm = useCallback(async (note) => {
    if (!pendingAction) return;
    setUpdating(true);
    try {
      await updateOrderStatus(token, pendingAction.order.order_ref, pendingAction.action.status, note);
      showToast(`Order updated to ${pendingAction.action.label}`, '✅');
      setPendingAction(null);
      load();
    } catch (e) {
      showToast(e.message ?? 'Update failed', '⚠️');
    }
    setUpdating(false);
  }, [token, pendingAction, showToast, load]);

  const totalCount = counts['all'] ?? orders.length;

  return (
    <View style={so.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: BRAND }}>
        <View style={so.headerRow}>
          <TouchableOpacity style={so.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={WHITE} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
            <Text style={so.headerTitle}>Seller Dashboard</Text>
            <Text style={so.headerSub}>{totalCount} order{totalCount !== 1 ? 's' : ''} received</Text>
          </View>
          <TouchableOpacity style={so.iconBtn} onPress={() => load(true)} activeOpacity={0.8}>
            <Ionicons name="refresh-outline" size={20} color={WHITE} />
          </TouchableOpacity>
        </View>
        <View style={so.headerLine} />
      </SafeAreaView>

      {/* Status tabs */}
      <View style={so.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={so.tabScroll}>
          {STATUS_TABS.map(tab => {
            const cnt = tab.key === 'all' ? totalCount : (counts[tab.key] ?? 0);
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[so.tabChip, active && so.tabChipActive]}
                onPress={() => handleTabChange(tab.key)}
                activeOpacity={0.8}
              >
                <Text style={[so.tabLabel, active && so.tabLabelActive]}>{tab.label}</Text>
                {cnt > 0 && (
                  <View style={[so.tabBadge, active && so.tabBadgeActive]}>
                    <Text style={[so.tabBadgeTxt, active && { color: WHITE }]}>{cnt}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={so.centered}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={so.centeredTxt}>Loading orders…</Text>
        </View>
      ) : error ? (
        <View style={so.centered}>
          <View style={so.emptyIcon}><Ionicons name="cloud-offline-outline" size={38} color={a(MUTED, 0.5)} /></View>
          <Text style={so.emptyTitle}>Something went wrong</Text>
          <Text style={so.emptySub}>{error}</Text>
          <TouchableOpacity style={so.retryBtn} onPress={() => load()}>
            <Ionicons name="refresh" size={14} color={WHITE} />
            <Text style={so.retryBtnTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => String(item.order_ref ?? item.id)}
          renderItem={({ item }) => (
            <SellerOrderCard
              order={item}
              onAction={handleAction}
              onViewDetail={() => navigation.navigate('OrderDetailScreen', { order_ref: item.order_ref ?? String(item.id) })}
            />
          )}
          contentContainerStyle={[so.list, { paddingBottom: insets.bottom + 24 }]}
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
            <View style={so.empty}>
              <Text style={so.emptyEmoji}>🛒</Text>
              <Text style={so.emptyTitle}>No orders yet</Text>
              <Text style={so.emptySub}>
                {activeTab === 'all'
                  ? "When buyers place orders for your products, they'll appear here."
                  : `No ${activeTab} orders.`}
              </Text>
            </View>
          }
        />
      )}

      {/* Update status modal */}
      <UpdateModal
        visible={!!pendingAction}
        order={pendingAction?.order}
        action={pendingAction?.action}
        onClose={() => setPendingAction(null)}
        onConfirm={handleConfirm}
        busy={updating}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const so = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  headerRow: {
    height: 50, flexDirection: 'row',
    alignItems: 'center', paddingHorizontal: 14, gap: 10,
  },
  iconBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: `${WHITE}1A`, borderWidth: 1, borderColor: `${WHITE}24`,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '900', color: WHITE, fontFamily: FONT_B },
  headerSub:   { fontSize: 11.5, color: `${WHITE}AA`, fontFamily: FONT_R },
  headerLine:  { height: 1, backgroundColor: `${ACCENT}33` },

  // Status tabs
  tabBar:    { backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER },
  tabScroll: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tabChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 13, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: a(BRAND, 0.15),
    backgroundColor: a(BRAND, 0.04),
  },
  tabChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  tabLabel:      { fontSize: 12.5, fontWeight: '600', color: a(BRAND, 0.7), fontFamily: FONT_M },
  tabLabelActive:{ color: WHITE, fontWeight: '800', fontFamily: FONT_B },
  tabBadge: {
    backgroundColor: a(BRAND, 0.12), borderRadius: 100,
    paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center',
  },
  tabBadgeActive: { backgroundColor: `${WHITE}33` },
  tabBadgeTxt:    { fontSize: 10.5, fontWeight: '800', color: a(BRAND, 0.7), fontFamily: FONT_B },

  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  centeredTxt: { fontSize: 13, color: MUTED, fontFamily: FONT_R, marginTop: 6 },

  list: { paddingHorizontal: 14, paddingTop: 14, gap: 10 },

  // Order card
  card: {
    backgroundColor: WHITE, borderRadius: 18, padding: 14, gap: 10,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardTop:         { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  buyerAvaWrap:    { position: 'relative' },
  buyerAva:        { width: 46, height: 46, borderRadius: 14, backgroundColor: a(BRAND, 0.07) },
  buyerAvaFallback:{ alignItems: 'center', justifyContent: 'center' },
  orderId:         { fontSize: 13.5, fontWeight: '800', color: DARK, fontFamily: FONT_B },
  buyerName:       { fontSize: 12, color: MUTED, fontFamily: FONT_R },
  dateText:        { fontSize: 11, color: a(MUTED, 0.7), fontFamily: FONT_R },
  statusPill:      { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 100, paddingHorizontal: 9, paddingVertical: 4 },
  statusDot:       { width: 6, height: 6, borderRadius: 3 },
  statusTxt:       { fontSize: 11, fontWeight: '800', fontFamily: FONT_B },
  total:           { fontSize: 15, fontWeight: '900', color: ACCENT, fontFamily: FONT_B },

  chipRow: { flexDirection: 'row', gap: 7 },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: a(MUTED, 0.1), borderRadius: 100, paddingHorizontal: 9, paddingVertical: 4 },
  chipTxt: { fontSize: 11, color: MUTED, fontFamily: FONT_R },

  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  actionBtnTxt: { fontSize: 12.5, fontWeight: '800', fontFamily: FONT_B },

  // Empty / error states
  emptyIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: a(BRAND, 0.07), alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  empty:     { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 10 },
  emptyEmoji:{ fontSize: 52 },
  emptyTitle:{ fontSize: 20, fontWeight: '900', color: DARK, fontFamily: FONT_B, textAlign: 'center' },
  emptySub:  { fontSize: 14, color: MUTED, fontFamily: FONT_R, textAlign: 'center', lineHeight: 21 },
  retryBtn:  { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: BRAND, borderRadius: 14, paddingHorizontal: 26, paddingVertical: 13, marginTop: 8 },
  retryBtnTxt: { fontSize: 14, fontWeight: '800', color: WHITE, fontFamily: FONT_B },

  // Update modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: WHITE, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 34, gap: 12, alignItems: 'center',
  },
  modalDragPill: { width: 38, height: 4, borderRadius: 2, backgroundColor: a(BRAND, 0.15), marginBottom: 8 },
  modalIconBox: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '900', color: DARK, fontFamily: FONT_B, textAlign: 'center' },
  modalSub:   { fontSize: 13.5, color: MUTED, fontFamily: FONT_R, textAlign: 'center', lineHeight: 20 },
  noteField:  { width: '100%', gap: 6 },
  noteLabel:  { fontSize: 12, fontWeight: '700', color: MUTED, fontFamily: FONT_M, textTransform: 'uppercase', letterSpacing: 0.4 },
  noteInput: {
    backgroundColor: BG, borderRadius: 12, padding: 12,
    fontSize: 14, color: DARK, fontFamily: FONT_R,
    borderWidth: 1.5, borderColor: a(BRAND, 0.2),
    height: 80, width: '100%',
  },
  modalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', borderWidth: 1.5, borderColor: a(BRAND, 0.2),
  },
  modalCancelTxt: { fontSize: 14, fontWeight: '700', color: DARK, fontFamily: FONT_M },
  modalConfirmBtn: {
    flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 15,
  },
  modalConfirmTxt: { fontSize: 14, fontWeight: '900', color: WHITE, fontFamily: FONT_B },
});
