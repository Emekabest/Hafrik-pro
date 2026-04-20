/**
 * Arrival Concierge — Screen 5: Booking Details / Status
 */
import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, StatusBar, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

const BG     = '#f7fff7';
const CARD   = '#ffffff';
const BORDER = '#e4eeef';
const GOLD   = '#c9a84c';
const MUTED  = '#5f6b6d';
const WHITE   = '#ffffff';
const BRAND   = '#0c3f44';
const TEAL    = '#1f8e93';

const STATUS_CONFIG = {
  pending:         { label: 'Pending',         color: '#f59e0b', icon: 'time-outline',            bg: '#f59e0b18' },
  confirmed:       { label: 'Confirmed',        color: '#3b82f6', icon: 'checkmark-circle-outline', bg: '#3b82f618' },
  driver_assigned: { label: 'Driver Assigned',  color: '#8b5cf6', icon: 'person-outline',          bg: '#8b5cf618' },
  driver_arrived:  { label: 'Driver Arrived',   color: '#10b981', icon: 'car-sport-outline',       bg: '#10b98118' },
  completed:       { label: 'Completed',        color: '#22c55e', icon: 'checkmark-done-outline',  bg: '#22c55e18' },
};

const TIMELINE_STEPS = [
  { key: 'pending',         label: 'Booking Received',  desc: 'We\'ve received your booking' },
  { key: 'confirmed',       label: 'Booking Confirmed', desc: 'Your booking has been confirmed' },
  { key: 'driver_assigned', label: 'Driver Assigned',   desc: 'A driver has been assigned' },
  { key: 'driver_arrived',  label: 'Driver Arrived',    desc: 'Your driver is at the airport' },
  { key: 'completed',       label: 'Trip Completed',    desc: 'Your trip is complete' },
];

// Mock booking data
const MOCK_BOOKING = {
  bookingId:    'HXAP-000001',
  status:       'driver_assigned',
  driver: {
    name:  'Mr. Zhang Wei',
    phone: '+86 138 0000 0000',
    car:   'Toyota Alphard (White)',
    plate: '粤A 88888',
  },
  pickup:  'Guangzhou Baiyun International Airport',
  dropoff: 'Grand Hyatt Guangzhou, Tianhe District',
  date:    '15 Apr 2026',
  time:    '14:30',
};

const InfoRow = ({ icon, label, value, accent, onPress }) => (
  <TouchableOpacity
    style={styles.infoRow}
    activeOpacity={onPress ? 0.75 : 1}
    onPress={onPress}
    disabled={!onPress}
  >
    <View style={[styles.infoIcon, { backgroundColor: (accent ?? GOLD) + '1a' }]}>
      <Ionicons name={icon} size={16} color={accent ?? GOLD} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, onPress && { color: accent ?? GOLD, textDecorationLine: 'underline' }]}>{value}</Text>
    </View>
    {onPress && <Ionicons name="chevron-forward" size={15} color={MUTED} />}
  </TouchableOpacity>
);

export default function BookingDetailsScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const insets     = useSafeAreaInsets();

  // Use route params or fall back to mock
  const bookingId  = route.params?.bookingId ?? MOCK_BOOKING.bookingId;
  const experience = route.params?.experience;
  const trip       = route.params?.trip;

  // Build display data — merge mock with any passed params
  const booking = {
    ...MOCK_BOOKING,
    bookingId,
    pickup:  trip?.airport ?? MOCK_BOOKING.pickup,
    dropoff: trip?.dropoff ?? MOCK_BOOKING.dropoff,
    date:    trip?.date    ?? MOCK_BOOKING.date,
    time:    trip?.time    ?? MOCK_BOOKING.time,
  };

  const status   = booking.status;
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const currentStepIdx = TIMELINE_STEPS.findIndex(s => s.key === status);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, []);

  const callDriver = () => Linking.openURL(`tel:${booking.driver.phone.replace(/\s/g, '')}`);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0c3f44" translucent={false} />

      {/* Header */}
      <LinearGradient colors={["#0c3f44", "#1a5a60"]} style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </TouchableOpacity>
        <View style={{ flex: 1, paddingLeft: 12 }}>
          <Text style={styles.headerTitle}>Booking Details</Text>
          <Text style={styles.headerSub}>{booking.bookingId}</Text>
        </View>
        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
          <Ionicons name={statusCfg.icon} size={12} color={statusCfg.color} />
          <Text style={[styles.statusBadgeTxt, { color: statusCfg.color }]}>{statusCfg.label}</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Timeline */}
          <Text style={styles.sectionLabel}>JOURNEY STATUS</Text>
          <View style={styles.timelineCard}>
            {TIMELINE_STEPS.map((step, i) => {
              const isDone   = i <= currentStepIdx;
              const isActive = i === currentStepIdx;
              const stepCfg  = STATUS_CONFIG[step.key];
              return (
                <View key={step.key} style={styles.timelineStep}>
                  {/* Connector line */}
                  {i < TIMELINE_STEPS.length - 1 && (
                    <View style={[styles.timelineLine, isDone && i < currentStepIdx && { backgroundColor: stepCfg.color + '60' }]} />
                  )}
                  {/* Dot */}
                  <View style={[
                    styles.timelineDot,
                    isDone && { backgroundColor: stepCfg.color, borderColor: stepCfg.color },
                    isActive && { shadowColor: stepCfg.color, shadowOpacity: 0.6, shadowRadius: 8, elevation: 6 },
                  ]}>
                    {isDone && <Ionicons name="checkmark" size={10} color={isActive ? WHITE : WHITE} />}
                  </View>
                  {/* Text */}
                  <View style={styles.timelineText}>
                    <Text style={[styles.timelineLabel, isActive && { color: stepCfg.color }]}>{step.label}</Text>
                    {isActive && <Text style={styles.timelineDesc}>{step.desc}</Text>}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Driver info */}
          <Text style={styles.sectionLabel}>DRIVER DETAILS</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="person"        label="Driver Name"  value={booking.driver.name}  accent="#8b5cf6" />
            <View style={styles.divider} />
            <InfoRow icon="car-sport"     label="Vehicle"      value={booking.driver.car}   accent="#3b82f6" />
            <View style={styles.divider} />
            <InfoRow icon="keypad"        label="Plate"        value={booking.driver.plate} accent={GOLD} />
            <View style={styles.divider} />
            <InfoRow
              icon="call"
              label="Phone"
              value={booking.driver.phone}
              accent="#10b981"
              onPress={callDriver}
            />
          </View>

          {/* Trip info */}
          <Text style={styles.sectionLabel}>TRIP DETAILS</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="location"    label="Pickup"       value={booking.pickup}  accent={GOLD} />
            <View style={styles.divider} />
            <InfoRow icon="navigate"    label="Drop-off"     value={booking.dropoff} accent={GOLD} />
            <View style={styles.divider} />
            <InfoRow icon="calendar"    label="Date"         value={booking.date}    accent={MUTED} />
            <View style={styles.divider} />
            <InfoRow icon="time"        label="Arrival Time" value={booking.time}    accent={MUTED} />
            {experience && (
              <>
                <View style={styles.divider} />
                <InfoRow icon="diamond" label="Service" value={experience.title} accent={experience.accent ?? GOLD} />
              </>
            )}
          </View>

          {/* Support */}
          <Text style={styles.sectionLabel}>NEED HELP?</Text>
          <View style={styles.supportRow}>
            <TouchableOpacity
              style={[styles.supportBtn, { backgroundColor: '#25d36620' }]}
              onPress={() => Linking.openURL('https://wa.me/message/hafrikx')}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={20} color="#25d366" />
              <Text style={[styles.supportTxt, { color: '#25d366' }]}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.supportBtn, { backgroundColor: '#07c16020' }]}
              onPress={() => Linking.openURL('weixin://')}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={20} color="#07c160" />
              <Text style={[styles.supportTxt, { color: '#07c160' }]}>WeChat</Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#ffffff', fontSize: 17, fontFamily: 'ReadexPro_600SemiBold' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: 'WorkSans_400Regular', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
  },
  statusBadgeTxt: { fontSize: 11, fontFamily: 'WorkSans_700Bold' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 14, paddingTop: 12 },

  sectionLabel: {
    color: MUTED, fontSize: 10, fontFamily: 'WorkSans_700Bold',
    letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 10, marginTop: 4,
  },

  // Timeline
  timelineCard: {
    backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER,
    padding: 20, marginBottom: 22,
  },
  timelineStep: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4, gap: 14 },
  timelineLine: {
    position: 'absolute', left: 9, top: 22, width: 2, height: 34,
    backgroundColor: BORDER, zIndex: 0,
  },
  timelineDot: {
    width: 20, height: 20, borderRadius: 10, zIndex: 1,
    backgroundColor: BORDER, borderWidth: 2, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0,
  },
  timelineText: { flex: 1, paddingBottom: 24 },
  timelineLabel: { color: MUTED, fontSize: 13, fontFamily: 'WorkSans_600SemiBold' },
  timelineDesc: { color: MUTED, fontSize: 11, fontFamily: 'WorkSans_400Regular', marginTop: 2 },

  // Info card
  infoCard: {
    backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden', marginBottom: 22,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  infoIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { color: MUTED, fontSize: 11, fontFamily: 'WorkSans_400Regular', marginBottom: 2 },
  infoValue: { color: BRAND, fontSize: 13.5, fontFamily: 'WorkSans_600SemiBold' },
  divider: { height: 1, backgroundColor: BORDER, marginHorizontal: 16 },

  // Support
  supportRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  supportBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 50, borderRadius: 14,
  },
  supportTxt: { fontSize: 13, fontFamily: 'WorkSans_700Bold' },
});
