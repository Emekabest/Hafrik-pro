// src/pages/EventsScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchEvents, fetchEventCategories } from './events/eventsApi';

const { width: SCREEN_W } = Dimensions.get('window');

const BRAND  = '#0C3F44';
const ACCENT = '#13C296';
const WARM   = '#F4A535';
const MUTED  = '#7A9198';
const DARK   = '#0D1B1E';
const CREAM  = '#F5F0E8';
const BORDER = 'rgba(12,63,68,0.09)';

const FILTERS = [
  { key: 'upcoming', label: 'Upcoming', icon: 'calendar-outline' },
  { key: 'popular',  label: 'Popular',  icon: 'trending-up-outline' },
  { key: 'latest',   label: 'Latest',   icon: 'time-outline' },
  { key: 'past',     label: 'Past',     icon: 'checkmark-done-outline' },
];

const STATUS_COLORS = {
  upcoming: { bg: 'rgba(12,63,68,0.88)',  text: '#fff' },
  ongoing:  { bg: 'rgba(19,194,150,0.92)', text: '#fff' },
  past:     { bg: 'rgba(122,145,152,0.85)', text: '#fff' },
};

const formatNum = (n) => {
  const num = Number(n || 0);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return String(num);
};

const formatDate = (start, end) => {
  if (!start) return '';
  const s = new Date(start);
  const sStr = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
  if (!end) return sStr;
  const e = new Date(end);
  if (s.toDateString() === e.toDateString()) {
    return `${sStr} · ${s.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }
  return `${sStr} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

// ─── Event Card ───────────────────────────────────────────────────────────────
const EventCard = ({ item, onPress }) => {
  const statusColor = STATUS_COLORS[item.status] ?? STATUS_COLORS.upcoming;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {/* Cover */}
      <View style={styles.coverWrap}>
        {item.cover ? (
          <Image source={{ uri: item.cover }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={[styles.cover, styles.coverFallback]}>
            <Ionicons name="calendar-outline" size={36} color="rgba(255,255,255,0.5)" />
          </View>
        )}

        <LinearGradient
          colors={['transparent', 'rgba(13,27,30,0.72)']}
          style={styles.coverGradient}
        />

        {/* Badges row */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.badgeTxt, { color: statusColor.text }]}>
              {item.status?.toUpperCase() ?? 'UPCOMING'}
            </Text>
          </View>
          {item.is_online && (
            <View style={styles.onlineBadge}>
              <Ionicons name="globe-outline" size={10} color={ACCENT} />
              <Text style={styles.onlineTxt}>Online</Text>
            </View>
          )}
          {item.is_sponsored && (
            <View style={styles.sponsoredBadge}>
              <Text style={styles.sponsoredTxt}>Sponsored</Text>
            </View>
          )}
        </View>
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        {/* Category + date */}
        <View style={styles.metaTop}>
          {!!item.category_name && (
            <View style={styles.catPill}>
              <Text style={styles.catPillTxt}>{item.category_name}</Text>
            </View>
          )}
          <Text style={styles.dateStr} numberOfLines={1}>
            {formatDate(item.start_date, item.end_date)}
          </Text>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

        {/* Location */}
        {(!!item.location || !!item.country) && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={MUTED} />
            <Text style={styles.locationTxt} numberOfLines={1}>
              {[item.location, item.country].filter(Boolean).join(', ')}
            </Text>
          </View>
        )}

        {/* Engagement */}
        <View style={styles.engRow}>
          <View style={styles.engItem}>
            <Ionicons name="people-outline" size={13} color={BRAND} />
            <Text style={styles.engTxt}>
              <Text style={styles.engNum}>{formatNum(item.going)}</Text> going
            </Text>
          </View>
          <View style={styles.engDot} />
          <View style={styles.engItem}>
            <Ionicons name="heart-outline" size={13} color={WARM} />
            <Text style={styles.engTxt}>
              <Text style={styles.engNum}>{formatNum(item.interested)}</Text> interested
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function EventsScreen({ navigation }) {
  const { top } = useSafeAreaInsets();

  const [filter,      setFilter]      = useState('upcoming');
  const [selectedCat, setSelectedCat] = useState(0);
  const [categories,  setCategories]  = useState([]);
  const [events,      setEvents]      = useState([]);
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(true);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState(null);

  const abortRef = useRef(null);

  // Load categories once
  useEffect(() => {
    fetchEventCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, []);

  const loadEvents = useCallback(async (pageNum, currentFilter, currentCat, replace) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const data = await fetchEvents(
        { page: pageNum, limit: 15, filter: currentFilter, category: currentCat },
        ctrl.signal,
      );
      setEvents(prev => replace ? data : [...prev, ...data]);
      setHasMore(data.length >= 15);
      setPage(pageNum);
      setError(null);
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadEvents(1, filter, selectedCat, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilter = (newFilter) => {
    if (newFilter === filter) return;
    setFilter(newFilter);
    setLoading(true);
    setEvents([]);
    loadEvents(1, newFilter, selectedCat, true);
  };

  const applyCategory = (catId) => {
    if (catId === selectedCat) return;
    setSelectedCat(catId);
    setLoading(true);
    setEvents([]);
    loadEvents(1, filter, catId, true);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEvents(1, filter, selectedCat, true);
  }, [filter, selectedCat, loadEvents]);

  const onEndReached = useCallback(() => {
    if (!hasMore || loadingMore || loading || refreshing) return;
    setLoadingMore(true);
    loadEvents(page + 1, filter, selectedCat, false);
  }, [hasMore, loadingMore, loading, refreshing, page, filter, selectedCat, loadEvents]);

  // ─── Render helpers ─────────────────────────────────────────────────────────

  const ListHeader = (
    <View>
      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterPill, filter === f.key && styles.filterPillActive]}
            onPress={() => applyFilter(f.key)}
            activeOpacity={0.82}
          >
            <Ionicons
              name={f.icon}
              size={13}
              color={filter === f.key ? '#fff' : MUTED}
            />
            <Text style={[styles.filterTxt, filter === f.key && styles.filterTxtActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Category pills */}
      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
        >
          <TouchableOpacity
            style={[styles.catChip, selectedCat === 0 && styles.catChipActive]}
            onPress={() => applyCategory(0)}
            activeOpacity={0.82}
          >
            <Text style={[styles.catChipTxt, selectedCat === 0 && styles.catChipTxtActive]}>
              All
            </Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catChip, selectedCat === cat.id && styles.catChipActive]}
              onPress={() => applyCategory(cat.id)}
              activeOpacity={0.82}
            >
              <Text style={[styles.catChipTxt, selectedCat === cat.id && styles.catChipTxtActive]}>
                {cat.name}
              </Text>
              {cat.event_count > 0 && (
                <View style={styles.catCount}>
                  <Text style={styles.catCountTxt}>{cat.event_count}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const ListFooter = () =>
    loadingMore ? (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={BRAND} />
      </View>
    ) : null;

  const ListEmpty = () => (
    <View style={styles.emptyWrap}>
      {loading ? (
        <ActivityIndicator size="large" color={BRAND} />
      ) : (
        <>
          <Ionicons name="calendar-outline" size={56} color={MUTED} />
          <Text style={styles.emptyTitle}>No events found</Text>
          <Text style={styles.emptySub}>
            {error ?? 'Try a different filter or category.'}
          </Text>
        </>
      )}
    </View>
  );

  // ─── UI ─────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      {/* Header */}
      <LinearGradient
        colors={[BRAND, '#155960']}
        style={[styles.header, { paddingTop: top + 4 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Events</Text>
            <Text style={styles.headerSub}>Discover what's happening</Text>
          </View>

          <TouchableOpacity style={styles.backBtn}>
            <Ionicons name="search-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* List */}
      {loading && !refreshing ? (
        <>
          {ListHeader}
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={BRAND} />
            <Text style={{ marginTop: 10, color: MUTED, fontSize: 13 }}>Loading events…</Text>
          </View>
        </>
      ) : (
        <FlatList
          data={events}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <EventCard item={item} onPress={() => navigation.navigate('EventDetail', { event: item })} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={ListEmpty}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F6F8' },

  // Header
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerSub:   { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 1 },

  // Filters
  filterRow: { paddingHorizontal: 14, paddingVertical: 14, gap: 8 },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER,
  },
  filterPillActive: { backgroundColor: BRAND, borderColor: BRAND },
  filterTxt: { fontSize: 12.5, fontWeight: '700', color: MUTED },
  filterTxtActive: { color: '#fff' },

  // Category chips
  catRow: { paddingHorizontal: 14, paddingBottom: 10, gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(12,63,68,0.07)',
    borderWidth: 1, borderColor: 'rgba(12,63,68,0.10)',
  },
  catChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  catChipTxt: { fontSize: 11.5, fontWeight: '700', color: DARK },
  catChipTxtActive: { color: '#fff' },
  catCount: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 999, paddingHorizontal: 5, paddingVertical: 1,
  },
  catCountTxt: { fontSize: 9, fontWeight: '800', color: '#fff' },

  // Event card
  card: {
    marginHorizontal: 14, marginBottom: 14,
    backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  coverWrap: { position: 'relative' },
  cover: { width: '100%', height: 180, backgroundColor: `${BRAND}30` },
  coverFallback: {
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: `${BRAND}22`,
  },
  coverGradient: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 90,
  },
  badgeRow: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', gap: 6, alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 999,
  },
  badgeTxt: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.4 },
  onlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(245,240,232,0.95)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
  },
  onlineTxt: { fontSize: 9.5, fontWeight: '700', color: ACCENT },
  sponsoredBadge: {
    backgroundColor: 'rgba(244,165,53,0.90)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
  },
  sponsoredTxt: { fontSize: 9.5, fontWeight: '800', color: '#fff' },

  cardBody: { padding: 14 },
  metaTop: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 8, flexWrap: 'wrap',
  },
  catPill: {
    backgroundColor: `${ACCENT}18`, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  catPillTxt: { fontSize: 10, fontWeight: '800', color: '#0a7a5a' },
  dateStr: { fontSize: 11.5, color: MUTED, fontWeight: '600', flex: 1 },

  cardTitle: { fontSize: 17, fontWeight: '900', color: DARK, lineHeight: 23, marginBottom: 8 },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  locationTxt: { fontSize: 12, color: MUTED, flex: 1 },

  engRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  engItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  engTxt: { fontSize: 11.5, color: MUTED },
  engNum: { fontWeight: '800', color: DARK },
  engDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: MUTED },

  // States
  list: { paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: DARK },
  emptySub: { fontSize: 13, color: MUTED, textAlign: 'center' },
});
