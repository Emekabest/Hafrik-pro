/**
 * Arrival Concierge — Screen 6: My Bookings (History)
 */
import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Animated, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const BG     = '#f7fff7';
const CARD   = '#ffffff';
const BORDER = '#e4eeef';
const GOLD   = '#c9a84c';
const MUTED  = '#5f6b6d';
const WHITE   = '#ffffff';
const BRAND   = '#0c3f44';
const TEAL    = '#1f8e93';

const STATUS_CONFIG = {
  pending:         { label: 'Pending',        color: '#f59e0b', icon: 'time-outline',           bg: '#f59e0b18' },
  confirmed:       { label: 'Confirmed',       color: '#3b82f6', icon: 'checkmark-circle-outline', bg: '#3b82f618' },
  driver_assigned: { label: 'Driver Assigned', color: '#8b5cf6', icon: 'person-outline',         bg: '#8b5cf618' },
  driver_arrived:  { label: 'Driver Arrived',  color: '#10b981', icon: 'car-sport-outline',      bg: '#10b98118' },
  completed:       { label: 'Completed',       color: '#22c55e', icon: 'checkmark-done-outline', bg: '#22c55e18' },
};

const MOCK_BOOKINGS = [
  {
    id: 'HXAP-000001',
    service: 'VIP Concierge',
    icon: 'diamond-outline',
    city: 'Guangzhou',
    date: '15 Apr 2026',
    time: '14:30',
    status: 'driver_assigned',
    passengers: '2',
  },
  {
    id: 'HXAP-000002',
    service: 'Business Pickup',
    icon: 'briefcase-outline',
    city: 'Shanghai',
    date: '02 Mar 2026',
    time: '09:15',
    status: 'completed',
    passengers: '1',
  },
  {
    id: 'HXAP-000003',
    service: 'Basic Pickup',
    icon: 'car-outline',
    city: 'Yiwu',
    date: '18 Jan 2026',
    time: '17:00',
    status: 'completed',
    passengers: '3',
  },
  {
    id: 'HXAP-000004',
    service: 'Trade Arrival Package',
    icon: 'storefront-outline',
    city: 'Guangzhou',
    date: '24 Dec 2025',
    time: '11:45',
    status: 'completed',
    passengers: '2',
  },
];

const BookingItem = ({ item, index, onPress }) => {
  const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacity   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, delay: index * 70, tension: 90, friction: 10, useNativeDriver: true }),
      Animated.timing(opacity,   { toValue: 1, delay: index * 70, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY: slideAnim }], marginBottom: 12 }}>
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => onPress(item)}
        activeOpacity={0.82}
      >
        {/* Icon + main info */}
        <View style={styles.cardTop}>
          <View style={[styles.cardIcon, { backgroundColor: GOLD + '18' }]}>
            <Ionicons name={item.icon} size={20} color={GOLD} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.bookingId}>{item.id}</Text>
            <Text style={styles.serviceLabel}>{item.service}</Text>
          </View>
          {/* Status badge */}
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Ionicons name={statusCfg.icon} size={11} color={statusCfg.color} />
            <Text style={[styles.statusTxt, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {/* Meta row */}
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={12} color={MUTED} />
            <Text style={styles.metaTxt}>{item.city}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={12} color={MUTED} />
            <Text style={styles.metaTxt}>{item.date}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color={MUTED} />
            <Text style={styles.metaTxt}>{item.time}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={12} color={MUTED} />
            <Text style={styles.metaTxt}>{item.passengers} pax</Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={15} color={MUTED} style={styles.chevron} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const EmptyState = () => (
  <View style={styles.emptyWrap}>
    <Ionicons name="airplane-outline" size={56} color={MUTED + '60'} />
    <Text style={styles.emptyTitle}>No bookings yet</Text>
    <Text style={styles.emptySub}>Your arrival bookings will appear here.</Text>
  </View>
);

export default function MyBookingsScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();

  const handlePress = (item) => {
    navigation.navigate('ArrivalBookingDetails', { bookingId: item.id });
  };

  const handleNew = () => {
    navigation.navigate('ArrivalConcierge');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0c3f44" translucent={false} />

      {/* Header */}
      <LinearGradient colors={["#0c3f44", "#1a5a60"]} style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </TouchableOpacity>
        <View style={{ flex: 1, paddingLeft: 12 }}>
          <Text style={styles.headerTitle}>My Bookings</Text>
          <Text style={styles.headerSub}>Arrival Concierge</Text>
        </View>
        <TouchableOpacity onPress={handleNew} style={styles.newBtn} activeOpacity={0.8}>
          <Ionicons name="add" size={20} color={GOLD} />
        </TouchableOpacity>
      </LinearGradient>

      <FlatList
        data={MOCK_BOOKINGS}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => (
          <BookingItem item={item} index={index} onPress={handlePress} />
        )}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState />}
        ListHeaderComponent={
          <Text style={styles.sectionLabel}>{MOCK_BOOKINGS.length} BOOKING{MOCK_BOOKINGS.length !== 1 ? 'S' : ''}</Text>
        }
      />

      {/* FAB — new booking */}
      <View style={[styles.fabWrap, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity onPress={handleNew} activeOpacity={0.88} style={{ borderRadius: 28, overflow: 'hidden' }}>
          <LinearGradient colors={[GOLD, '#a07830']} style={styles.fab} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="airplane" size={18} color="#000" />
            <Text style={styles.fabTxt}>New Booking</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#ffffff', fontSize: 17, fontFamily: 'ReadexPro_600SemiBold' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: 'WorkSans_400Regular', marginTop: 2 },
  newBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: GOLD + '18', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: GOLD + '30',
  },

  listContent: { paddingHorizontal: 14, paddingTop: 12 },

  sectionLabel: {
    color: MUTED, fontSize: 10, fontFamily: 'WorkSans_700Bold',
    letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 14,
  },

  bookingCard: {
    backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER,
    padding: 16, position: 'relative',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  bookingId: { color: GOLD, fontSize: 13.5, fontFamily: 'ReadexPro_600SemiBold', letterSpacing: 0.3 },
  serviceLabel: { color: MUTED, fontSize: 11.5, fontFamily: 'WorkSans_400Regular', marginTop: 2 },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  statusTxt: { fontSize: 10, fontFamily: 'WorkSans_700Bold' },

  cardDivider: { height: 1, backgroundColor: BORDER, marginVertical: 12 },

  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt: { color: MUTED, fontSize: 11.5, fontFamily: 'WorkSans_400Regular' },

  chevron: { position: 'absolute', top: 18, right: 16 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { color: BRAND, fontSize: 18, fontFamily: 'ReadexPro_600SemiBold' },
  emptySub: { color: MUTED, fontSize: 13, fontFamily: 'WorkSans_400Regular' },

  fabWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' },
  fab: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 28,
    shadowColor: GOLD, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10,
  },
  fabTxt: { color: '#000', fontSize: 14, fontFamily: 'ReadexPro_600SemiBold' },
});
