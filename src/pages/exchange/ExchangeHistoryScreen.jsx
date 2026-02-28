// ExchangeHistoryScreen — paginated order history with status badges + pull-to-refresh.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  StatusBar, RefreshControl, ActivityIndicator, Modal,
  ScrollView, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import { getMyOrders } from './exchangeApi';

const PRIMARY = '#0C3F44';
const ACCENT  = '#13C296';
const DARK    = '#0D1B1E';
const BG      = '#F4F6F8';

const STATUS_COLORS = {
  pending:    { bg: '#FFF4E5', text: '#E07B39', icon: 'time-outline' },
  approved:   { bg: '#E8F4FF', text: '#0066CC', icon: 'checkmark-circle-outline' },
  processing: { bg: '#E8F4FF', text: '#0066CC', icon: 'sync-outline' },
  completed:  { bg: '#EDFCF5', text: '#13C296', icon: 'checkmark-done-circle-outline' },
  cancelled:  { bg: '#FFEDED', text: '#E03B3B', icon: 'close-circle-outline' },
  rejected:   { bg: '#FFEDED', text: '#E03B3B', icon: 'close-circle-outline' },
};

const CUR_FLAGS   = { NGN: '🇳🇬', GHS: '🇬🇭', RMB: '🇨🇳' };
const CUR_SYMBOLS = { NGN: '₦', GHS: 'GH₵', RMB: '¥' };

const fmtNum = (n, d = 2) =>
  Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

const fmtDate = (str) => {
  if (!str) return '';
  const d = new Date(str);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ── StatusBadge ───────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = STATUS_COLORS[status?.toLowerCase()] || STATUS_COLORS.pending;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon} size={11} color={cfg.text} style={{ marginRight: 4 }} />
      <Text style={[styles.badgeText, { color: cfg.text }]}>
        {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Pending'}
      </Text>
    </View>
  );
};

// ── SkeletonCard ──────────────────────────────────────────────────────────────
const SkeletonCard = () => {
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
    <Animated.View style={[styles.skCard, { opacity: pulse }]}>
      <View style={styles.skLine1} />
      <View style={styles.skLine2} />
      <View style={styles.skBadge} />
    </Animated.View>
  );
};

// ── OrderCard ─────────────────────────────────────────────────────────────────
const OrderCard = ({ order, onPress }) => {
  const from   = order.from_currency || 'NGN';
  const sym    = CUR_SYMBOLS[from] ?? '';
  const flag   = CUR_FLAGS[from]   ?? '';
  const amount = parseFloat(order.amount)     || 0;
  const rmb    = parseFloat(order.rmb_amount) || parseFloat(order.to_amount) || 0;

  return (
    <TouchableOpacity style={styles.orderCard} activeOpacity={0.8} onPress={() => onPress(order)}>
      <View style={styles.orderLeft}>
        <View style={styles.orderIconBg}>
          <Text style={{ fontSize: 20 }}>{flag}</Text>
        </View>
      </View>
      <View style={styles.orderBody}>
        <View style={styles.orderTopRow}>
          <Text style={styles.orderTitle}>{from} → RMB</Text>
          <StatusBadge status={order.status} />
        </View>
        <View style={styles.orderAmounts}>
          <Text style={styles.orderFrom}>{sym}{fmtNum(amount)}</Text>
          <Ionicons name="arrow-forward" size={13} color="#ccc" style={{ marginHorizontal: 6 }} />
          <Text style={styles.orderTo}>¥{fmtNum(rmb)}</Text>
        </View>
        <Text style={styles.orderDate}>{fmtDate(order.created_at || order.date)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#ccc" />
    </TouchableOpacity>
  );
};

// ── Detail Modal ──────────────────────────────────────────────────────────────
const DetailModal = ({ order, visible, onClose }) => {
  if (!order) return null;
  const from   = order.from_currency || 'NGN';
  const sym    = CUR_SYMBOLS[from] ?? '';
  const amount = parseFloat(order.amount) || 0;
  const rmb    = parseFloat(order.rmb_amount) || parseFloat(order.to_amount) || 0;
  const fee    = parseFloat(order.fee) || 0;
  const net    = parseFloat(order.net_amount) || amount - fee;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Order Detail</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} activeOpacity={0.8}>
              <Ionicons name="close" size={18} color={DARK} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Status */}
            <View style={styles.modalStatusRow}>
              <StatusBadge status={order.status} />
              <Text style={styles.modalOrderId}>
                #{order.id || order.order_id}
              </Text>
            </View>

            {/* Amounts */}
            <View style={styles.modalAmounts}>
              <View style={styles.modalCurBox}>
                <Text style={{ fontSize: 28 }}>{CUR_FLAGS[from]}</Text>
                <Text style={styles.modalCurCode}>{from}</Text>
                <Text style={styles.modalCurAmt}>{sym}{fmtNum(amount)}</Text>
              </View>
              <View style={styles.modalArrow}>
                <Ionicons name="swap-horizontal" size={22} color={ACCENT} />
              </View>
              <View style={styles.modalCurBox}>
                <Text style={{ fontSize: 28 }}>🇨🇳</Text>
                <Text style={styles.modalCurCode}>RMB</Text>
                <Text style={[styles.modalCurAmt, { color: ACCENT }]}>¥{fmtNum(rmb)}</Text>
              </View>
            </View>

            <View style={styles.detailDivider} />

            {[
              { label: 'Amount Sent',      value: `${sym}${fmtNum(amount)}` },
              { label: 'Fee',              value: `${sym}${fmtNum(fee)}` },
              { label: 'Net Amount',       value: `${sym}${fmtNum(net)}` },
              { label: 'Rate',             value: order.rate ? `1 RMB = ${fmtNum(order.rate, 2)} ${from}` : '—' },
              { label: 'You Receive',      value: `¥${fmtNum(rmb)}` },
              { label: 'Payment Bank',     value: order.bank_name || '—' },
              { label: 'Recipient',        value: order.recipient_account || '—' },
              { label: 'Date',             value: fmtDate(order.created_at || order.date) },
            ].map(r => (
              <View key={r.label} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{r.label}</Text>
                <Text style={styles.detailValue}>{r.value}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ExchangeHistoryScreen() {
  const navigation = useNavigation();
  const { top }    = useSafeAreaInsets();
  const { token }  = useAuth();

  const [orders,       setOrders]       = useState([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page,         setPage]         = useState(1);
  const [hasMore,      setHasMore]      = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchOrders = useCallback(async (p = 1, reset = false) => {
    try {
      const res = await getMyOrders(token, p);
      const data = res.data?.orders || res.data?.data || [];
      const totalPages = res.data?.pagination?.total_pages || 1;
      setOrders(prev => reset ? data : [...prev, ...data]);
      setHasMore(p < totalPages);
      setPage(p);
    } catch {
      // silent
    }
    setIsLoading(false);
    setIsRefreshing(false);
    setIsLoadingMore(false);
  }, [token]);

  useEffect(() => { fetchOrders(1, true); }, []);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchOrders(1, true);
  }, [fetchOrders]);

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    fetchOrders(page + 1);
  }, [fetchOrders, isLoadingMore, hasMore, page]);

  const openDetail = (order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const renderItem = useCallback(({ item }) => (
    <OrderCard order={item} onPress={openDetail} />
  ), []);

  const keyExtractor = useCallback((item, i) =>
    String(item.id || item.order_id || i), []);

  const Footer = () =>
    isLoadingMore
      ? <ActivityIndicator color={ACCENT} style={{ marginVertical: 20 }} />
      : hasMore
        ? (
          <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} activeOpacity={0.8}>
            <Text style={styles.loadMoreText}>Load more</Text>
          </TouchableOpacity>
        )
        : orders.length > 0
          ? <Text style={styles.endText}>— No more orders —</Text>
          : null;

  const Empty = () => (
    <View style={styles.emptyWrap}>
      <Ionicons name="swap-horizontal" size={56} color="#ddd" />
      <Text style={styles.emptyTitle}>No orders yet</Text>
      <Text style={styles.emptySub}>Your exchange history will appear here</Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('ExchangeHome')} activeOpacity={0.85}>
        <Text style={styles.emptyBtnText}>Start Exchange</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

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
          <Text style={styles.headerTitle}>My Orders</Text>
          <TouchableOpacity
            style={styles.headerBtn} activeOpacity={0.8}
            onPress={() => fetchOrders(1, true)}
          >
            <Ionicons name="refresh-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.headerAccent} />
      </LinearGradient>

      {isLoading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListEmptyComponent={<Empty />}
          ListFooterComponent={<Footer />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={ACCENT} colors={[ACCENT]}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
        />
      )}

      <DetailModal
        order={selectedOrder}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  header: { paddingHorizontal: 16, paddingBottom: 16, overflow: 'hidden' },
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

  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },

  // Badge
  badge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // Order card
  orderCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  orderLeft: { marginRight: 12 },
  orderIconBg: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: BG, alignItems: 'center', justifyContent: 'center',
  },
  orderBody: { flex: 1 },
  orderTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  orderTitle: { fontSize: 14, fontWeight: '700', color: DARK },
  orderAmounts: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  orderFrom: { fontSize: 13, fontWeight: '600', color: '#555' },
  orderTo:   { fontSize: 13, fontWeight: '700', color: ACCENT },
  orderDate: { fontSize: 11, color: '#aaa' },

  // Load more
  loadMoreBtn: {
    alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1.5, borderColor: ACCENT, marginVertical: 12,
  },
  loadMoreText: { color: ACCENT, fontWeight: '700', fontSize: 13 },
  endText: { textAlign: 'center', color: '#ccc', fontSize: 12, marginVertical: 16 },

  // Empty
  emptyWrap: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginTop: 16, marginBottom: 8 },
  emptySub:   { fontSize: 14, color: '#aaa', textAlign: 'center', marginBottom: 24 },
  emptyBtn: {
    backgroundColor: PRIMARY, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Skeleton
  skCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 10,
    gap: 8,
  },
  skLine1: { height: 14, borderRadius: 7, backgroundColor: '#EAEAEA', width: '60%' },
  skLine2: { height: 12, borderRadius: 6, backgroundColor: '#EAEAEA', width: '40%' },
  skBadge: { height: 20, borderRadius: 8, backgroundColor: '#EAEAEA', width: 70 },

  // Detail modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingBottom: 36, maxHeight: '90%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0',
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: DARK },
  modalCloseBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: BG,
    alignItems: 'center', justifyContent: 'center',
  },
  modalStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalOrderId: { fontSize: 12, color: '#aaa' },
  modalAmounts: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: BG, borderRadius: 16, paddingVertical: 16, marginBottom: 8,
  },
  modalCurBox: { alignItems: 'center', gap: 4 },
  modalCurCode: { fontSize: 12, color: '#888', fontWeight: '600' },
  modalCurAmt: { fontSize: 20, fontWeight: '800', color: DARK },
  modalArrow: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(19,194,150,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  detailDivider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 14 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7,
    borderBottomWidth: 1, borderBottomColor: '#F8F8F8',
  },
  detailLabel: { fontSize: 13, color: '#888' },
  detailValue: { fontSize: 13, fontWeight: '600', color: DARK, flexShrink: 1, textAlign: 'right', marginLeft: 16 },
});
