// ExchangeAdminScreen — admin order management (user_group === 1).
// Filters: All / Pending / Approved / Completed / Cancelled.
// Actions: approve, complete, cancel with confirmation Alert.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  StatusBar, RefreshControl, ActivityIndicator,
  Alert, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import { getAdminOrders, orderAction } from './exchangeApi';

const PRIMARY = '#0C3F44';
const ACCENT  = '#13C296';
const DARK    = '#0D1B1E';
const BG      = '#F4F6F8';

const STATUS_COLORS = {
  pending:    { bg: '#FFF4E5', text: '#E07B39', icon: 'time-outline'                    },
  approved:   { bg: '#E8F4FF', text: '#0066CC', icon: 'checkmark-circle-outline'        },
  processing: { bg: '#E8F4FF', text: '#0066CC', icon: 'sync-outline'                    },
  completed:  { bg: '#EDFCF5', text: '#13C296', icon: 'checkmark-done-circle-outline'   },
  cancelled:  { bg: '#FFEDED', text: '#E03B3B', icon: 'close-circle-outline'            },
};

const FILTERS = [
  { key: '',           label: 'All'       },
  { key: 'pending',    label: 'Pending'   },
  { key: 'approved',   label: 'Approved'  },
  { key: 'completed',  label: 'Completed' },
  { key: 'cancelled',  label: 'Cancelled' },
];

const CUR_SYMBOLS = { NGN: '₦', GHS: 'GH₵', RMB: '¥' };
const CUR_FLAGS   = { NGN: '🇳🇬', GHS: '🇬🇭', RMB: '🇨🇳' };

const fmtNum = (n, d = 2) =>
  Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

const fmtDate = (str) => {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, visible }) => {
  const slideY = useRef(new Animated.Value(-80)).current;
  useEffect(() => {
    Animated.spring(slideY, { toValue: visible ? 0 : -80, useNativeDriver: true, tension: 80 }).start();
  }, [visible]);
  const bg = type === 'error' ? '#E03B3B' : type === 'info' ? '#0066CC' : ACCENT;
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

// ── StatusBadge ───────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = STATUS_COLORS[status?.toLowerCase()] || STATUS_COLORS.pending;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon} size={11} color={cfg.text} style={{ marginRight: 3 }} />
      <Text style={[styles.badgeText, { color: cfg.text }]}>
        {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Pending'}
      </Text>
    </View>
  );
};

// ── Action button ─────────────────────────────────────────────────────────────
const ActionBtn = ({ label, icon, color, onPress, loading }) => (
  <TouchableOpacity
    style={[styles.actionBtn, { backgroundColor: color + '18', borderColor: color + '44' }]}
    onPress={onPress}
    activeOpacity={0.8}
    disabled={loading}
  >
    {loading
      ? <ActivityIndicator size="small" color={color} />
      : <Ionicons name={icon} size={13} color={color} style={{ marginRight: 4 }} />
    }
    <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
  </TouchableOpacity>
);

// ── AdminOrderCard ────────────────────────────────────────────────────────────
const AdminOrderCard = ({ order, onAction }) => {
  const [loadingAction, setLoadingAction] = useState(null);
  const from   = order.from_currency || 'NGN';
  const sym    = CUR_SYMBOLS[from] ?? '';
  const flag   = CUR_FLAGS[from]   ?? '';
  const amount = parseFloat(order.amount)     || 0;
  const rmb    = parseFloat(order.rmb_amount) || parseFloat(order.to_amount) || 0;
  const status = (order.status || 'pending').toLowerCase();

  const doAction = async (action, label) => {
    Alert.alert(
      `${label} Order`,
      `Are you sure you want to ${action} this order?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: label,
          style: action === 'cancel' ? 'destructive' : 'default',
          onPress: async () => {
            setLoadingAction(action);
            await onAction(order.id || order.order_id, action);
            setLoadingAction(null);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.orderCard}>
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardFlag}>{flag}</Text>
          <View>
            <Text style={styles.cardTitle}>{from} → RMB</Text>
            <Text style={styles.cardDate}>{fmtDate(order.created_at || order.date)}</Text>
          </View>
        </View>
        <StatusBadge status={order.status} />
      </View>

      {/* Amounts */}
      <View style={styles.cardAmounts}>
        <Text style={styles.cardFrom}>{sym}{fmtNum(amount)}</Text>
        <Ionicons name="arrow-forward" size={14} color="#ccc" />
        <Text style={styles.cardTo}>¥{fmtNum(rmb)} RMB</Text>
      </View>

      {/* User info */}
      {order.user_name || order.recipient_account ? (
        <View style={styles.cardMeta}>
          {order.user_name ? (
            <View style={styles.cardMetaItem}>
              <Ionicons name="person-outline" size={12} color="#aaa" />
              <Text style={styles.cardMetaText}>{order.user_name}</Text>
            </View>
          ) : null}
          {order.recipient_account ? (
            <View style={styles.cardMetaItem}>
              <Ionicons name="logo-wechat" size={12} color="#aaa" />
              <Text style={styles.cardMetaText}>{order.recipient_account}</Text>
            </View>
          ) : null}
          {order.bank_name ? (
            <View style={styles.cardMetaItem}>
              <Ionicons name="card-outline" size={12} color="#aaa" />
              <Text style={styles.cardMetaText}>{order.bank_name}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Actions */}
      {(status === 'pending' || status === 'approved') ? (
        <View style={styles.cardActions}>
          {status === 'pending' ? (
            <ActionBtn
              label="Approve"
              icon="checkmark-circle-outline"
              color="#0066CC"
              loading={loadingAction === 'approve'}
              onPress={() => doAction('approve', 'Approve')}
            />
          ) : null}
          {status === 'approved' ? (
            <ActionBtn
              label="Complete"
              icon="checkmark-done-circle-outline"
              color={ACCENT}
              loading={loadingAction === 'complete'}
              onPress={() => doAction('complete', 'Complete')}
            />
          ) : null}
          <ActionBtn
            label="Cancel"
            icon="close-circle-outline"
            color="#E03B3B"
            loading={loadingAction === 'cancel'}
            onPress={() => doAction('cancel', 'Cancel')}
          />
        </View>
      ) : null}
    </View>
  );
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
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
      <View style={styles.skRow}>
        <View style={styles.skFlag} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[styles.skLine, { width: '50%' }]} />
          <View style={[styles.skLine, { width: '30%' }]} />
        </View>
        <View style={styles.skBadge} />
      </View>
      <View style={[styles.skLine, { width: '70%', marginTop: 10 }]} />
      <View style={[styles.skLine, { width: '45%', marginTop: 6 }]} />
    </Animated.View>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ExchangeAdminScreen() {
  const navigation = useNavigation();
  const { top }    = useSafeAreaInsets();
  const { token, user } = useAuth();

  const [orders,        setOrders]        = useState([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [isRefreshing,  setIsRefreshing]  = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeFilter,  setActiveFilter]  = useState('');
  const [page,          setPage]          = useState(1);
  const [hasMore,       setHasMore]       = useState(true);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showToast = useCallback((message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }, []);

  const fetchOrders = useCallback(async (p = 1, filter = activeFilter, reset = false) => {
    try {
      const res  = await getAdminOrders(token, filter, p);
      const data = res.data?.orders || res.data?.data || [];
      const totalPages = res.data?.pagination?.total_pages || 1;
      setOrders(prev => reset ? data : [...prev, ...data]);
      setHasMore(p < totalPages);
      setPage(p);
    } catch {
      if (!reset) showToast('Failed to load orders', 'error');
    }
    setIsLoading(false);
    setIsRefreshing(false);
    setIsLoadingMore(false);
  }, [token, activeFilter, showToast]);

  useEffect(() => {
    setIsLoading(true);
    fetchOrders(1, activeFilter, true);
  }, [activeFilter]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchOrders(1, activeFilter, true);
  }, [fetchOrders, activeFilter]);

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    fetchOrders(page + 1, activeFilter);
  }, [fetchOrders, isLoadingMore, hasMore, page, activeFilter]);

  const handleAction = useCallback(async (orderId, action) => {
    try {
      await orderAction(token, { order_id: orderId, action });
      showToast(`Order ${action}d successfully!`);
      fetchOrders(1, activeFilter, true);
    } catch (e) {
      showToast(e?.response?.data?.message || `Failed to ${action} order`, 'error');
    }
  }, [token, activeFilter, fetchOrders, showToast]);

  const renderItem = useCallback(({ item }) => (
    <AdminOrderCard order={item} onAction={handleAction} />
  ), [handleAction]);

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
          ? <Text style={styles.endText}>— End of orders —</Text>
          : null;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />

      {/* ── Header ───────────────────────────────────────────────────────── */}
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
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Admin — Orders</Text>
            <View style={styles.adminPill}>
              <Ionicons name="shield-checkmark" size={10} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.adminPillText}>Admin View</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.headerBtn} activeOpacity={0.8}
            onPress={() => fetchOrders(1, activeFilter, true)}
          >
            <Ionicons name="refresh-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Filter chips */}
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={f => f.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
          renderItem={({ item: f }) => {
            const active = activeFilter === f.key;
            return (
              <TouchableOpacity
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => { if (!active) { setActiveFilter(f.key); } }}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
        <View style={styles.headerAccent} />
      </LinearGradient>

      {/* ── Order list ───────────────────────────────────────────────────── */}
      {isLoading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="swap-horizontal" size={56} color="#ddd" />
              <Text style={styles.emptyTitle}>No orders found</Text>
              <Text style={styles.emptySub}>
                {activeFilter ? `No ${activeFilter} orders` : 'No exchange orders yet'}
              </Text>
            </View>
          }
          ListFooterComponent={<Footer />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing} onRefresh={onRefresh}
              tintColor={ACCENT} colors={[ACCENT]}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  toast: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },

  header: { paddingHorizontal: 16, paddingBottom: 0, overflow: 'hidden' },
  blob1: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(19,194,150,0.1)', top: -50, right: -30,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, color: '#fff', fontWeight: '800', letterSpacing: 0.3 },
  adminPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(19,194,150,0.2)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2, marginTop: 3,
  },
  adminPillText: { fontSize: 10, color: ACCENT, fontWeight: '700' },
  headerAccent: { height: 1, backgroundColor: 'rgba(19,194,150,0.25)', marginTop: 10 },

  // Filter chips
  filtersRow: { gap: 8, paddingVertical: 10, paddingRight: 4 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  filterChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  filterChipText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  filterChipTextActive: { color: '#0D1B1E', fontWeight: '800' },

  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },

  // Badge
  badge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // Order card
  orderCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cardLeft:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardFlag:   { fontSize: 22 },
  cardTitle:  { fontSize: 14, fontWeight: '700', color: DARK },
  cardDate:   { fontSize: 11, color: '#aaa', marginTop: 2 },
  cardAmounts: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardFrom:   { fontSize: 16, fontWeight: '700', color: '#555' },
  cardTo:     { fontSize: 16, fontWeight: '800', color: ACCENT },
  cardMeta:   { gap: 5, marginBottom: 10 },
  cardMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardMetaText: { fontSize: 12, color: '#888' },

  // Actions
  cardActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 6 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 12, borderWidth: 1,
  },
  actionBtnText: { fontSize: 12, fontWeight: '700' },

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
  emptySub:   { fontSize: 14, color: '#aaa', textAlign: 'center' },

  // Skeleton
  skCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 10,
  },
  skRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  skFlag: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EAEAEA' },
  skLine: { height: 12, borderRadius: 6, backgroundColor: '#EAEAEA' },
  skBadge: { width: 70, height: 22, borderRadius: 8, backgroundColor: '#EAEAEA' },
});
