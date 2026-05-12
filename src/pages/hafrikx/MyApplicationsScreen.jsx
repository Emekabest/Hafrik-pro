import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, StatusBar, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../../api/apiClient';

const BG     = '#f7fff7';
const CARD   = '#ffffff';
const BORDER = '#e4eeef';
const BRAND  = '#0c3f44';
const TEAL   = '#1f8e93';
const MUTED  = '#5f6b6d';
const WHITE  = '#ffffff';

const STATUS_COLORS = {
  pending:   '#f59e0b',
  reviewing: '#3b82f6',
  approved:  '#10b981',
  rejected:  '#ef4444',
  completed: '#10b981',
};

const statusColor = (status) =>
  STATUS_COLORS[(status ?? '').toLowerCase()] ?? MUTED;

const statusIcon = (status) => {
  const s = String(status ?? '').toLowerCase();
  if (s === 'approved' || s === 'completed') return 'checkmark-circle';
  if (s === 'rejected') return 'close-circle';
  if (s === 'reviewing') return 'sync-circle';
  return 'time';
};

const formatDate = (raw) => {
  if (!raw) return 'Recently submitted';
  const date = new Date(String(raw).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return String(raw);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const ApplicationCard = ({ item, onPress }) => {
  const color = statusColor(item.status);
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => onPress(item)}>
      <View style={[styles.cardIcon, { backgroundColor: color + '16' }]}>
        <Ionicons name={statusIcon(item.status)} size={22} color={color} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.service_name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: color + '18', borderColor: color + '44' }]}>
            <Text style={[styles.statusTxt, { color }]}>{item.status || 'Pending'}</Text>
          </View>
        </View>
        <View style={styles.cardMetaRow}>
          <View style={styles.cardMeta}>
            <Ionicons name="calendar-outline" size={12} color={MUTED} />
            <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
          </View>
          {!!item.id && (
            <View style={styles.cardMeta}>
              <Ionicons name="ticket-outline" size={12} color={MUTED} />
              <Text style={styles.cardDate}>#{item.id}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.cardArrow}>
        <Ionicons name="chevron-forward" size={15} color={BRAND} />
      </View>
    </TouchableOpacity>
  );
};

const SummaryHeader = ({ items, navigation }) => {
  const pending = items.filter(i => ['pending', 'reviewing'].includes(String(i.status ?? '').toLowerCase())).length;
  const done = items.filter(i => ['approved', 'completed'].includes(String(i.status ?? '').toLowerCase())).length;
  return (
    <View style={styles.summaryWrap}>
      <LinearGradient colors={[BRAND, TEAL]} style={styles.summaryHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.summaryOrb} />
        <Text style={styles.summaryKicker}>SERVICE TRACKER</Text>
        <Text style={styles.summaryTitle}>Your requests, all in one place</Text>
        <Text style={styles.summarySub}>Follow updates from submission to approval without digging through messages.</Text>
        <TouchableOpacity style={styles.summaryCta} activeOpacity={0.85} onPress={() => navigation.navigate('HafrikXVisa')}>
          <Text style={styles.summaryCtaText}>Request a service</Text>
          <Ionicons name="arrow-forward" size={13} color={BRAND} />
        </TouchableOpacity>
      </LinearGradient>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{items.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{pending}</Text>
          <Text style={styles.statLabel}>In review</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{done}</Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
      </View>
      <Text style={styles.listLabel}>RECENT APPLICATIONS</Text>
    </View>
  );
};

export default function MyApplicationsScreen() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();

  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);

  const fetchApplications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);
    setError(null);
    try {
      const res  = await apiClient.get('/services/my_applications.php');
      const data = res.data?.data ?? res.data ?? [];
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load applications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      {/* Header */}
      <LinearGradient
        colors={[BRAND, TEAL]}
        style={[styles.header, { paddingTop: insets.top + 14 }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={21} color={WHITE} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Applications</Text>
          <Text style={styles.headerSub}>Track your service requests</Text>
        </View>
        <View style={{ width: 38 }} />
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={TEAL} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={MUTED} />
          <Text style={styles.centerTxt}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchApplications()}>
            <Text style={styles.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <ApplicationCard
              item={item}
              onPress={(a) => navigation.navigate('ApplicationDetail', { id: a.id })}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={items.length > 0 ? <SummaryHeader items={items} navigation={navigation} /> : null}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchApplications(true)}
              tintColor={TEAL}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <LinearGradient colors={[BRAND, TEAL]} style={styles.emptyIcon}>
                <Ionicons name="document-text-outline" size={34} color={WHITE} />
              </LinearGradient>
              <Text style={styles.centerTxt}>No applications yet</Text>
              <Text style={styles.centerSub}>Your submitted service requests will appear here</Text>
              <TouchableOpacity style={styles.emptyCta} activeOpacity={0.85} onPress={() => navigation.navigate('HafrikXVisa')}>
                <Text style={styles.emptyCtaText}>Browse services</Text>
                <Ionicons name="arrow-forward" size={14} color={WHITE} />
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { color: WHITE, fontSize: 17, fontFamily: 'ReadexPro_600SemiBold' },
  headerSub:    { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: 'WorkSans_400Regular', marginTop: 2 },

  listContent: { padding: 16, paddingBottom: 40, flexGrow: 1 },

  summaryWrap: { marginBottom: 16 },
  summaryHero: {
    borderRadius: 24,
    padding: 18,
    overflow: 'hidden',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
  },
  summaryOrb: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: WHITE,
    opacity: 0.06,
    right: -48,
    top: -70,
  },
  summaryKicker: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 9,
    fontFamily: 'WorkSans_700Bold',
    letterSpacing: 1.5,
  },
  summaryTitle: {
    color: WHITE,
    fontSize: 21,
    fontFamily: 'ReadexPro_600SemiBold',
    marginTop: 5,
    lineHeight: 27,
  },
  summarySub: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12.5,
    fontFamily: 'WorkSans_400Regular',
    lineHeight: 18,
    marginTop: 8,
  },
  summaryCta: {
    marginTop: 16,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e8c87a',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  summaryCtaText: {
    color: BRAND,
    fontSize: 12,
    fontFamily: 'WorkSans_700Bold',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    alignItems: 'center',
  },
  statValue: { color: BRAND, fontSize: 20, fontFamily: 'ReadexPro_600SemiBold' },
  statLabel: { color: MUTED, fontSize: 11, fontFamily: 'WorkSans_500Medium', marginTop: 2 },
  listLabel: {
    color: MUTED,
    fontSize: 10,
    fontFamily: 'WorkSans_700Bold',
    letterSpacing: 1.4,
    marginTop: 18,
    marginBottom: 2,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
    overflow: 'hidden',
    padding: 13,
    gap: 12,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody:   { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  cardTitle:  { color: BRAND, fontSize: 14, fontFamily: 'WorkSans_700Bold', flex: 1 },
  cardMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardDate:   { color: MUTED, fontSize: 11.5, fontFamily: 'WorkSans_400Regular' },
  cardArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: TEAL + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusBadge: {
    borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  statusTxt: {
    fontSize: 10,
    fontFamily: 'WorkSans_700Bold',
    textTransform: 'capitalize',
  },

  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  centerTxt: {
    color: MUTED,
    fontSize: 14,
    fontFamily: 'WorkSans_500Medium',
    marginTop: 12,
    textAlign: 'center',
  },
  centerSub: {
    color: MUTED + 'aa',
    fontSize: 12,
    fontFamily: 'WorkSans_400Regular',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: TEAL,
  },
  retryTxt: { color: WHITE, fontSize: 13, fontFamily: 'WorkSans_600SemiBold' },
  emptyIcon: {
    width: 74,
    height: 74,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCta: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: BRAND,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  emptyCtaText: {
    color: WHITE,
    fontSize: 13,
    fontFamily: 'WorkSans_700Bold',
  },
});
