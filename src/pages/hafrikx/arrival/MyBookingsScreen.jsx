/**
 * Arrival Concierge — My Bookings
 */
import React, { useMemo, useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Animated, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const BRAND  = '#0c3f44';
const TEAL   = '#1f8e93';
const GOLD   = '#d4a017';
const GREEN  = '#1a9e5c';
const BG     = '#f4f9fa';
const CARD   = '#ffffff';
const BORDER = '#ddeaec';
const DARK   = '#0d2b2e';
const MUTED  = '#5f7275';
const WHITE  = '#ffffff';

const a = (hex, alpha) => {
  const n = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${hex}${n}`;
};

const STATUS_CONFIG = {
  pending:         { label: 'Pending Review',  color: '#f59e0b', icon: 'time-outline' },
  confirmed:       { label: 'Confirmed',       color: '#3b82f6', icon: 'checkmark-circle-outline' },
  driver_assigned: { label: 'Driver Assigned', color: '#8b5cf6', icon: 'person-outline' },
  driver_arrived:  { label: 'Driver Arrived',  color: GREEN,     icon: 'car-sport-outline' },
  completed:       { label: 'Completed',       color: '#22c55e', icon: 'checkmark-done-outline' },
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
];

const MOCK_BOOKINGS = [
  {
    id: 'HXAP-000001',
    service: 'VIP Concierge',
    icon: 'diamond-outline',
    status: 'driver_assigned',
    services: ['transfer', 'hotel'],
    vehicle: { id: 'business', icon: 'bus-outline', label: '7-Seat Business', transfer: '$220', inspection: '$270' },
    hotel: { id: 'midrange', icon: 'business-outline', label: 'Mid-Range Boutique', price: 'From $50 / night', color: GOLD },
    trip: {
      city: 'Guangzhou',
      airport: 'Baiyun International (CAN)',
      flight: 'EK384',
      date: '15 Apr 2026',
      time: '14:30',
      dropoff: 'Tianhe District Hotel',
      passengers: '2',
      notes: 'Name board at arrivals.',
    },
  },
  {
    id: 'HXAP-000002',
    service: 'Business Pickup',
    icon: 'briefcase-outline',
    status: 'completed',
    services: ['transfer'],
    vehicle: { id: 'suv', icon: 'car-sport-outline', label: '5-Seat SUV', transfer: '$180', inspection: '$210' },
    hotel: null,
    trip: {
      city: 'Shanghai',
      airport: 'Pudong International (PVG)',
      flight: 'QR870',
      date: '02 Mar 2026',
      time: '09:15',
      dropoff: 'People Square',
      passengers: '1',
    },
  },
  {
    id: 'HXAP-000003',
    service: 'Trade Arrival Package',
    icon: 'storefront-outline',
    status: 'pending',
    services: ['transfer', 'inspection'],
    vehicle: { id: 'standard', icon: 'car-outline', label: '5-Seat Standard', transfer: '$150', inspection: '$180' },
    hotel: null,
    trip: {
      city: 'Guangzhou',
      airport: 'Baiyun International (CAN)',
      flight: 'ET606',
      date: '24 May 2026',
      time: '11:45',
      dropoff: 'Yuexiu Market Area',
      passengers: '2',
      notes: 'Need factory visit planning.',
      inspection: true,
    },
  },
];

function StatPill({ icon, label, value, color }) {
  return (
    <View style={styles.statPill}>
      <View style={[styles.statIcon, { backgroundColor: a(color, 0.1) }]}>
        <Ionicons name={icon} size={15} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function BookingItem({ item, index, onPress }) {
  const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
  const slideAnim = useRef(new Animated.Value(22)).current;
  const opacity   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, delay: index * 65, tension: 90, friction: 10, useNativeDriver: true }),
      Animated.timing(opacity,   { toValue: 1, delay: index * 65, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [index, opacity, slideAnim]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY: slideAnim }], marginBottom: 14 }}>
      <TouchableOpacity style={styles.bookingCard} onPress={() => onPress(item)} activeOpacity={0.84}>
        <View style={styles.cardTop}>
          <LinearGradient colors={[BRAND, TEAL]} style={styles.cardIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name={item.icon} size={20} color={WHITE} />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.bookingId}>{item.id}</Text>
            <Text style={styles.serviceLabel}>{item.service}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: a(statusCfg.color, 0.1), borderColor: a(statusCfg.color, 0.24) }]}>
            <Ionicons name={statusCfg.icon} size={11} color={statusCfg.color} />
            <Text style={[styles.statusTxt, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
        </View>

        <View style={styles.routeBox}>
          <View style={styles.routeIcon}>
            <Ionicons name="airplane-outline" size={15} color={TEAL} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.routeTitle}>{item.trip.city} arrival</Text>
            <Text style={styles.routeSub} numberOfLines={1}>{item.trip.airport}</Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={MUTED} />
        </View>

        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={12} color={MUTED} />
            <Text style={styles.metaTxt}>{item.trip.date}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color={MUTED} />
            <Text style={styles.metaTxt}>{item.trip.time}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={12} color={MUTED} />
            <Text style={styles.metaTxt}>{item.trip.passengers} pax</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function EmptyState({ onNew }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIcon}>
        <Ionicons name="airplane-outline" size={34} color={TEAL} />
      </View>
      <Text style={styles.emptyTitle}>No bookings yet</Text>
      <Text style={styles.emptySub}>Book an arrival concierge and your airport transfer, hotel, and inspection support will appear here.</Text>
      <TouchableOpacity onPress={onNew} activeOpacity={0.88}>
        <LinearGradient colors={[BRAND, TEAL]} style={styles.emptyBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Ionicons name="add-circle-outline" size={17} color={WHITE} />
          <Text style={styles.emptyBtnTxt}>Create Booking</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

export default function MyBookingsScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();
  const [filter, setFilter] = useState('all');

  const activeCount = MOCK_BOOKINGS.filter(b => b.status !== 'completed').length;
  const completedCount = MOCK_BOOKINGS.filter(b => b.status === 'completed').length;
  const filteredBookings = useMemo(() => {
    if (filter === 'active') return MOCK_BOOKINGS.filter(b => b.status !== 'completed');
    if (filter === 'completed') return MOCK_BOOKINGS.filter(b => b.status === 'completed');
    return MOCK_BOOKINGS;
  }, [filter]);

  const handlePress = (item) => {
    navigation.navigate('ArrivalBookingDetails', {
      bookingId: item.id,
      services: item.services,
      vehicle: item.vehicle,
      hotel: item.hotel,
      trip: item.trip,
      status: item.status,
      serviceTitle: item.service,
    });
  };

  const handleNew = () => {
    navigation.navigate('ArrivalConcierge');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} translucent={false} />

      <FlatList
        data={filteredBookings}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => (
          <BookingItem item={item} index={index} onPress={handlePress} />
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState onNew={handleNew} />}
        ListHeaderComponent={
          <>
            <LinearGradient
              colors={[BRAND, '#144f55', TEAL]}
              style={[styles.header, { paddingTop: insets.top + 16 }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.blob} />
              <View style={styles.headerTop}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
                  <Ionicons name="arrow-back" size={20} color={WHITE} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleNew} style={styles.headerAction} activeOpacity={0.8}>
                  <Ionicons name="add" size={18} color={WHITE} />
                </TouchableOpacity>
              </View>

              <View style={styles.headerBadge}>
                <Ionicons name="shield-checkmark" size={11} color={WHITE} />
                <Text style={styles.headerBadgeTxt}>ARRIVAL CONCIERGE</Text>
              </View>
              <Text style={styles.headerTitle}>My Bookings</Text>
              <Text style={styles.headerSub}>Track airport pickup, hotel support, factory visits, and driver updates.</Text>

              <View style={styles.statsRow}>
                <StatPill icon="receipt-outline" label="Total" value={MOCK_BOOKINGS.length} color={TEAL} />
                <StatPill icon="time-outline" label="Active" value={activeCount} color={GOLD} />
                <StatPill icon="checkmark-done-outline" label="Done" value={completedCount} color={GREEN} />
              </View>
            </LinearGradient>

            <View style={styles.bodyHead}>
              <View style={styles.filterRow}>
                {FILTERS.map(item => {
                  const active = filter === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => setFilter(item.key)}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                      activeOpacity={0.78}
                    >
                      <Text style={[styles.filterTxt, active && styles.filterTxtActive]}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.sectionRow}>
                <Text style={styles.sectionLabel}>{filteredBookings.length} BOOKING{filteredBookings.length !== 1 ? 'S' : ''}</Text>
                <Text style={styles.sectionHint}>Tap a booking for full details</Text>
              </View>
            </View>
          </>
        }
      />

      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + 14 }]}>
        <TouchableOpacity onPress={handleNew} activeOpacity={0.88} style={{ flex: 1 }}>
          <LinearGradient colors={[BRAND, TEAL]} style={styles.ctaBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="airplane" size={18} color={WHITE} />
            <Text style={styles.ctaTxt}>New Arrival Booking</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: { paddingHorizontal: 20, paddingBottom: 24, overflow: 'hidden' },
  blob: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.05)', right: -60, top: -60 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerAction: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', marginBottom: 14 },
  headerBadgeTxt: { color: WHITE, fontSize: 9.5, fontWeight: '800', letterSpacing: 1.2 },
  headerTitle: { color: WHITE, fontSize: 25, fontWeight: '800', marginBottom: 8 },
  headerSub: { color: 'rgba(255,255,255,0.74)', fontSize: 12.5, lineHeight: 19, maxWidth: 320, marginBottom: 18 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statPill: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 16, padding: 11 },
  statIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { color: WHITE, fontSize: 18, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.68)', fontSize: 10.5, fontWeight: '700', marginTop: 1 },

  bodyHead: { paddingHorizontal: 16, paddingTop: 18 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  filterChipActive: { backgroundColor: a(TEAL, 0.1), borderColor: a(TEAL, 0.35) },
  filterTxt: { color: MUTED, fontSize: 12, fontWeight: '700' },
  filterTxtActive: { color: TEAL },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionLabel: { color: MUTED, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  sectionHint: { color: MUTED, fontSize: 11 },

  bookingCard: { marginHorizontal: 16, backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 15 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  cardIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bookingId: { color: DARK, fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
  serviceLabel: { color: MUTED, fontSize: 12, fontWeight: '600', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5 },
  statusTxt: { fontSize: 10, fontWeight: '800' },
  routeBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: a(TEAL, 0.06), borderRadius: 15, padding: 12, borderWidth: 1, borderColor: a(TEAL, 0.13), marginBottom: 12 },
  routeIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: a(TEAL, 0.1) },
  routeTitle: { color: DARK, fontSize: 13.5, fontWeight: '800' },
  routeSub: { color: MUTED, fontSize: 11.5, marginTop: 2 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt: { color: MUTED, fontSize: 11.5, fontWeight: '600' },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, paddingTop: 60 },
  emptyIcon: { width: 74, height: 74, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: a(TEAL, 0.09), borderWidth: 1, borderColor: a(TEAL, 0.18), marginBottom: 16 },
  emptyTitle: { color: DARK, fontSize: 19, fontWeight: '800', marginBottom: 7 },
  emptySub: { color: MUTED, fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 18 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 14 },
  emptyBtnTxt: { color: WHITE, fontSize: 13, fontWeight: '800' },

  ctaBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: BG, borderTopWidth: 1, borderTopColor: BORDER },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 16 },
  ctaTxt: { color: WHITE, fontSize: 15, fontWeight: '800' },
});
