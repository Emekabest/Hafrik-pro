import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, StatusBar, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

// ─── Palette ──────────────────────────────────────────────────────────────────
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

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  pending:         { label: 'Pending Review',  color: '#f59e0b', icon: 'time-outline'              },
  confirmed:       { label: 'Confirmed',       color: '#3b82f6', icon: 'checkmark-circle-outline'  },
  driver_assigned: { label: 'Driver Assigned', color: '#8b5cf6', icon: 'person-outline'            },
  driver_arrived:  { label: 'Driver Arrived',  color: GREEN,     icon: 'car-sport-outline'         },
  completed:       { label: 'Completed',       color: '#22c55e', icon: 'checkmark-done-outline'    },
};

const TIMELINE = [
  { key: 'pending',         label: 'Booking Received',    desc: 'We\'ve received your request'              },
  { key: 'confirmed',       label: 'Agent Confirmed',     desc: 'Your booking has been confirmed'           },
  { key: 'driver_assigned', label: 'Driver Assigned',     desc: 'A driver has been assigned to you'        },
  { key: 'driver_arrived',  label: 'Driver at Airport',   desc: 'Your driver is waiting at the arrivals'   },
  { key: 'completed',       label: 'Trip Completed',      desc: 'Your trip is complete. Safe travels!'     },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, color = TEAL, last, onPress }) {
  return (
    <TouchableOpacity
      style={[s.infoRow, last && { borderBottomWidth: 0 }]}
      activeOpacity={onPress ? 0.75 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[s.infoIcon, { backgroundColor: a(color, 0.1) }]}>
        <Ionicons name={icon} size={15} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={[s.infoValue, onPress && { color, textDecorationLine: 'underline' }]}>{value}</Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={15} color={MUTED} />}
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function BookingDetailsScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const insets     = useSafeAreaInsets();

  const { bookingId, services, vehicle, hotel, trip, status, serviceTitle } = route.params ?? {};

  // Mock driver (in production would come from API)
  const driver = {
    name:  'Mr. Zhang Wei',
    phone: '+86 138 0000 0000',
    car:   vehicle?.label ?? 'Toyota Alphard (White)',
    plate: '粤A 88888',
  };

  const currentStatus = STATUS_CFG[status] ? status : 'pending';
  const statusCfg     = STATUS_CFG[currentStatus];
  const currentIdx    = TIMELINE.findIndex(t => t.key === currentStatus);
  const showDriver    = ['driver_assigned', 'driver_arrived', 'completed'].includes(currentStatus);

  const wantsInspection = (services ?? []).includes('inspection');
  const wantsHotel      = (services ?? []).includes('hotel');

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} translucent={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Header ── */}
          <LinearGradient
            colors={[BRAND, '#144f55', TEAL]}
            style={[s.header, { paddingTop: insets.top + 16 }]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <View style={s.blob} />
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={20} color={WHITE} />
            </TouchableOpacity>

            <View style={s.headerMid}>
              <View style={s.headerIconRing}>
                <Ionicons name="receipt" size={28} color={WHITE} />
              </View>
              <Text style={s.headerTitle}>Booking Details</Text>
              <Text style={s.headerRef}>{bookingId ?? 'HXAP-000000'}</Text>
              {!!serviceTitle && <Text style={s.headerService}>{serviceTitle}</Text>}

              {/* Status badge */}
              <View style={[s.statusBadge, { backgroundColor: a(statusCfg.color, 0.18), borderColor: a(statusCfg.color, 0.3) }]}>
                <Ionicons name={statusCfg.icon} size={12} color={statusCfg.color} />
                <Text style={[s.statusTxt, { color: statusCfg.color }]}>{statusCfg.label}</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={s.body}>

            {/* ── Booking snapshot ── */}
            <View style={s.snapshotCard}>
              <View style={s.snapshotTop}>
                <View style={s.snapshotIcon}>
                  <Ionicons name="airplane-outline" size={20} color={TEAL} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.snapshotTitle}>{trip?.city ? `${trip.city} arrival` : 'Arrival concierge booking'}</Text>
                  <Text style={s.snapshotSub} numberOfLines={1}>{trip?.airport ?? 'Airport transfer and arrival support'}</Text>
                </View>
              </View>
              <View style={s.snapshotGrid}>
                <View style={s.snapshotMetric}>
                  <Text style={s.snapshotMetricLabel}>Date</Text>
                  <Text style={s.snapshotMetricValue}>{trip?.date ?? '—'}</Text>
                </View>
                <View style={s.snapshotMetric}>
                  <Text style={s.snapshotMetricLabel}>Time</Text>
                  <Text style={s.snapshotMetricValue}>{trip?.time ?? '—'}</Text>
                </View>
                <View style={s.snapshotMetric}>
                  <Text style={s.snapshotMetricLabel}>Passengers</Text>
                  <Text style={s.snapshotMetricValue}>{trip?.passengers ?? '1'} pax</Text>
                </View>
              </View>
            </View>

            {/* ── Journey Timeline ── */}
            <Text style={s.secLabel}>JOURNEY STATUS</Text>
            <View style={s.card}>
              {TIMELINE.map((step, i) => {
                const isDone   = i <= currentIdx;
                const isActive = i === currentIdx;
                const cfg      = STATUS_CFG[step.key];
                return (
                  <View key={step.key} style={s.timelineStep}>
                    {/* vertical line */}
                    <View style={s.timelineLeft}>
                      <View style={[
                        s.dot,
                        isDone   && { backgroundColor: cfg.color, borderColor: cfg.color },
                        isActive && { shadowColor: cfg.color, shadowOpacity: 0.5, shadowRadius: 6, elevation: 5 },
                      ]}>
                        {isDone && <Ionicons name="checkmark" size={10} color={WHITE} />}
                      </View>
                      {i < TIMELINE.length - 1 && (
                        <View style={[s.connector, isDone && i < currentIdx && { backgroundColor: cfg.color }]} />
                      )}
                    </View>
                    {/* text */}
                    <View style={[s.timelineText, i === TIMELINE.length - 1 && { paddingBottom: 0 }]}>
                      <Text style={[s.stepLabel, isActive && { color: cfg.color, fontWeight: '800' }]}>{step.label}</Text>
                      {isActive && <Text style={s.stepDesc}>{step.desc}</Text>}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* ── Services booked ── */}
            <Text style={s.secLabel}>SERVICES BOOKED</Text>
            <View style={s.card}>
              <InfoRow icon="car-outline"    label="Airport Transfer"  value={`${vehicle?.label ?? 'Standard'} · ${vehicle?.transfer ?? '—'} round trip`}  color={TEAL}  />
              {wantsInspection && (
                <InfoRow icon="search-outline" label="Factory Inspection" value={`${vehicle?.label ?? 'Standard'} · ${vehicle?.inspection ?? '—'} per day · Guangzhou`} color={GREEN} />
              )}
              {wantsHotel && hotel && (
                <InfoRow icon="bed-outline" label="Hotel Booking" value={`${hotel.label} · ${hotel.price}`} color={GOLD} last />
              )}
              {!wantsInspection && !wantsHotel && (
                <View style={{ height: 0 }} />
              )}
            </View>

            {/* ── Trip details ── */}
            <Text style={s.secLabel}>TRIP DETAILS</Text>
            <View style={s.card}>
              <InfoRow icon="location"      label="City"          value={trip?.city      ?? '—'} color={TEAL}  />
              <InfoRow icon="airplane"      label="Airport"       value={trip?.airport   ?? '—'} color={TEAL}  />
              <InfoRow icon="document-text" label="Flight"        value={trip?.flight    ?? '—'} color={BRAND} />
              <InfoRow icon="calendar"      label="Date"          value={trip?.date      ?? '—'} color={BRAND} />
              <InfoRow icon="time"          label="Arrival Time"  value={trip?.time      ?? '—'} color={BRAND} />
              <InfoRow icon="navigate"      label="Drop-off"      value={trip?.dropoff   ?? '—'} color={TEAL}  />
              <InfoRow icon="people"        label="Passengers"    value={trip?.passengers ?? '1'} color={TEAL} last />
            </View>

            {/* ── Driver details ── */}
            <Text style={s.secLabel}>DRIVER DETAILS</Text>
            {showDriver ? (
              <View style={s.card}>
                <InfoRow icon="person"    label="Driver"   value={driver.name}  color="#8b5cf6" />
                <InfoRow icon="car-sport" label="Vehicle"  value={driver.car}   color="#3b82f6" />
                <InfoRow icon="keypad"    label="Plate"    value={driver.plate} color={GOLD}    />
                <InfoRow
                  icon="call"
                  label="Contact"
                  value={driver.phone}
                  color={GREEN}
                  last
                  onPress={() => Linking.openURL(`tel:${driver.phone.replace(/\s/g, '')}`)}
                />
              </View>
            ) : (
              <View style={s.lockedDriverCard}>
                <View style={s.lockedDriverIcon}>
                  <Ionicons name="lock-closed-outline" size={18} color={TEAL} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.lockedDriverTitle}>Driver assignment pending</Text>
                  <Text style={s.lockedDriverText}>Your agent will share driver name, vehicle and plate details once the booking is confirmed.</Text>
                </View>
              </View>
            )}
            <View style={s.driverNote}>
              <Ionicons name="information-circle-outline" size={14} color={MUTED} />
              <Text style={s.driverNoteTxt}>Driver details are shown once your booking is confirmed. Call if you can't locate your driver.</Text>
            </View>

            {/* ── Support ── */}
            <Text style={[s.secLabel, { marginTop: 8 }]}>NEED HELP?</Text>
            <View style={s.supportRow}>
              <TouchableOpacity
                style={[s.supportBtn, { backgroundColor: a('#25d366', 0.1), borderColor: a('#25d366', 0.25) }]}
                onPress={() => Linking.openURL('https://wa.me/message/hafrikx')}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#25d366" />
                <Text style={[s.supportTxt, { color: '#25d366' }]}>WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.supportBtn, { backgroundColor: a('#07c160', 0.1), borderColor: a('#07c160', 0.25) }]}
                onPress={() => Linking.openURL('weixin://')}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#07c160" />
                <Text style={[s.supportTxt, { color: '#07c160' }]}>WeChat</Text>
              </TouchableOpacity>
            </View>

            {/* ── Back to home ── */}
            <TouchableOpacity
              style={s.homeBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('ArrivalMyBookings')}
            >
              <Ionicons name="list-outline" size={16} color={TEAL} />
              <Text style={s.homeBtnTxt}>Back to My Bookings</Text>
            </TouchableOpacity>

          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Header
  header:      { paddingHorizontal: 20, paddingBottom: 32, overflow: 'hidden' },
  blob:        { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.05)', right: -60, top: -60 },
  backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  headerMid:   { alignItems: 'center' },
  headerIconRing: { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  headerTitle: { color: WHITE, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  headerRef:   { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '600', letterSpacing: 1, marginBottom: 14 },
  headerService: { color: 'rgba(255,255,255,0.82)', fontSize: 12.5, fontWeight: '700', marginTop: -8, marginBottom: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  statusTxt:   { fontSize: 12, fontWeight: '800' },

  body:     { paddingHorizontal: 16, paddingTop: 22 },
  secLabel: { color: MUTED, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 },
  card:     { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', marginBottom: 20 },

  // Snapshot
  snapshotCard: { backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 22 },
  snapshotTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  snapshotIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: a(TEAL, 0.1), alignItems: 'center', justifyContent: 'center' },
  snapshotTitle: { color: DARK, fontSize: 15, fontWeight: '800' },
  snapshotSub: { color: MUTED, fontSize: 12, marginTop: 3 },
  snapshotGrid: { flexDirection: 'row', gap: 8 },
  snapshotMetric: { flex: 1, backgroundColor: a(TEAL, 0.055), borderRadius: 13, padding: 11, borderWidth: 1, borderColor: a(TEAL, 0.12) },
  snapshotMetricLabel: { color: MUTED, fontSize: 10.5, fontWeight: '700', marginBottom: 4 },
  snapshotMetricValue: { color: DARK, fontSize: 12.5, fontWeight: '800' },

  // Timeline
  timelineStep: { flexDirection: 'row', paddingHorizontal: 16 },
  timelineLeft: { width: 28, alignItems: 'center' },
  dot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: BORDER, borderWidth: 2, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 1, marginTop: 14,
  },
  connector:     { flex: 1, width: 2, backgroundColor: BORDER, minHeight: 20, marginVertical: 3 },
  timelineText:  { flex: 1, paddingLeft: 12, paddingTop: 12, paddingBottom: 20 },
  stepLabel:     { fontSize: 13, fontWeight: '600', color: MUTED },
  stepDesc:      { fontSize: 11.5, color: MUTED, marginTop: 3, lineHeight: 16 },

  // Info rows
  infoRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 12 },
  infoIcon:  { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { color: MUTED, fontSize: 11, marginBottom: 2 },
  infoValue: { color: DARK, fontSize: 13, fontWeight: '700' },

  // Driver note
  lockedDriverCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 15, marginBottom: 8 },
  lockedDriverIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: a(TEAL, 0.1), alignItems: 'center', justifyContent: 'center' },
  lockedDriverTitle: { color: DARK, fontSize: 13.5, fontWeight: '800', marginBottom: 4 },
  lockedDriverText: { color: MUTED, fontSize: 12, lineHeight: 17 },
  driverNote:    { flexDirection: 'row', alignItems: 'flex-start', gap: 7, padding: 12, marginTop: -14, marginBottom: 20 },
  driverNoteTxt: { flex: 1, color: MUTED, fontSize: 11.5, lineHeight: 16 },

  // Support
  supportRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  supportBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 14, borderWidth: 1 },
  supportTxt: { fontSize: 13, fontWeight: '700' },

  // Home button
  homeBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 13, borderWidth: 1, borderColor: a(TEAL, 0.3), backgroundColor: a(TEAL, 0.07), marginBottom: 8 },
  homeBtnTxt: { color: TEAL, fontSize: 14, fontWeight: '700' },
});
