import React, { useEffect, useRef } from 'react';
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

const SERVICE_META = {
  transfer:   { label: 'Airport Transfer',  icon: 'car-outline',    color: TEAL  },
  hotel:      { label: 'Hotel Booking',      icon: 'bed-outline',    color: GOLD  },
  inspection: { label: 'Factory Inspection', icon: 'search-outline', color: GREEN },
};

export default function BookingSuccessScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const insets     = useSafeAreaInsets();

  const { bookingId = 'HXAP-000001', services, vehicle, hotel, trip } = route.params ?? {};

  // ── Animations ──
  const checkScale  = useRef(new Animated.Value(0)).current;
  const ringScale   = useRef(new Animated.Value(0)).current;
  const cardSlide   = useRef(new Animated.Value(30)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const pulse       = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Ring expands first
    Animated.spring(ringScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }).start();
    // Then checkmark pops in
    setTimeout(() => {
      Animated.spring(checkScale, { toValue: 1, tension: 80, friction: 5, useNativeDriver: true }).start();
    }, 180);
    // Card slides up
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(cardSlide,   { toValue: 0, tension: 90, friction: 10, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    }, 350);
    // Gentle pulse loop
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.07, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 1000, useNativeDriver: true }),
      ])
    );
    setTimeout(() => loop.start(), 700);
    return () => loop.stop();
  }, []);

  const activeServices = (services ?? ['transfer']).map(id => SERVICE_META[id]).filter(Boolean);
  const wantsInspection = (services ?? []).includes('inspection');
  const wantsHotel      = (services ?? []).includes('hotel');

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} translucent={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 120 }]}
      >
        {/* ── Success orb ── */}
        <View style={s.orbWrap}>
          <Animated.View style={[s.ring, { transform: [{ scale: ringScale }] }]} />
          <Animated.View style={{ transform: [{ scale: Animated.multiply(checkScale, pulse) }] }}>
            <LinearGradient colors={[GREEN, '#0e7a45']} style={s.orb} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="checkmark" size={42} color={WHITE} />
            </LinearGradient>
          </Animated.View>
        </View>

        <Text style={s.confirmedTag}>BOOKING CONFIRMED</Text>
        <Text style={s.confirmedTitle}>You're all set!</Text>
        <Text style={s.confirmedSub}>
          A HafrikX agent will contact you within 2 hours{'\n'}to finalise your arrangements.
        </Text>

        {/* ── Booking ID card ── */}
        <Animated.View style={[s.idCard, { opacity: cardOpacity, transform: [{ translateY: cardSlide }] }]}>
          <LinearGradient
            colors={[BRAND, '#144f55', TEAL]}
            style={s.idCardInner}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <View style={s.blob} />

            <View style={s.idTop}>
              <View>
                <Text style={s.idTagTxt}>BOOKING ID</Text>
                <Text style={s.idCode}>{bookingId}</Text>
              </View>
              <View style={s.idIconRing}>
                <Ionicons name="receipt" size={22} color={WHITE} />
              </View>
            </View>

            <View style={s.idDivider} />

            {/* Services */}
            <View style={s.idServicesRow}>
              {activeServices.map((svc, i) => (
                <View key={i} style={s.idSvcPill}>
                  <Ionicons name={svc.icon} size={11} color={WHITE} />
                  <Text style={s.idSvcTxt}>{svc.label}</Text>
                </View>
              ))}
            </View>

            {/* Trip info */}
            {trip?.city && (
              <View style={s.idMetaRow}>
                <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.65)" />
                <Text style={s.idMetaTxt}>{trip.city}</Text>
                <Text style={s.idMetaDot}>·</Text>
                <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.65)" />
                <Text style={s.idMetaTxt}>{trip.date}</Text>
                <Text style={s.idMetaDot}>·</Text>
                <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.65)" />
                <Text style={s.idMetaTxt}>{trip.time}</Text>
              </View>
            )}
            {vehicle && (
              <View style={s.idMetaRow}>
                <Ionicons name="car-outline" size={13} color="rgba(255,255,255,0.65)" />
                <Text style={s.idMetaTxt}>{vehicle.label}</Text>
                <Text style={s.idMetaDot}>·</Text>
                <Text style={s.idMetaTxt}>{vehicle.transfer} round trip</Text>
              </View>
            )}
            {wantsHotel && hotel && (
              <View style={s.idMetaRow}>
                <Ionicons name="bed-outline" size={13} color="rgba(255,255,255,0.65)" />
                <Text style={s.idMetaTxt}>{hotel.label}</Text>
              </View>
            )}

            <View style={s.idStatusRow}>
              <View style={s.idStatusDot} />
              <Text style={s.idStatusTxt}>Pending HafrikX agent review</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── What happens next ── */}
        <Animated.View style={{ opacity: cardOpacity, transform: [{ translateY: cardSlide }] }}>
          <Text style={s.secLabel}>WHAT HAPPENS NEXT</Text>
          <View style={s.nextCard}>
            {[
              { icon: 'chatbubble-outline',          color: TEAL,  title: 'Agent contacts you',    desc: 'Within 2 hours via WhatsApp or in-app.' },
              { icon: 'person-outline',              color: '#8b5cf6', title: 'Driver assigned',   desc: 'You\'ll receive driver name, car, and plate.' },
              { icon: 'car-outline',                 color: GREEN, title: 'Meet at arrivals',       desc: 'Driver holds a sign with your name.' },
              ...(wantsInspection ? [{ icon: 'search-outline', color: GREEN, title: 'Factory visits arranged', desc: 'Route + 2–3 factories scheduled for your day.' }] : []),
              ...(wantsHotel ? [{ icon: 'bed-outline', color: GOLD, title: 'Hotel confirmed', desc: 'Booking details sent to your contact.' }] : []),
            ].map((step, i, arr) => (
              <View key={i} style={[s.nextRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={[s.nextIconBox, { backgroundColor: a(step.color, 0.1) }]}>
                  <Ionicons name={step.icon} size={16} color={step.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.nextTitle}>{step.title}</Text>
                  <Text style={s.nextDesc}>{step.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── Driver note ── */}
          <View style={s.driverNote}>
            <Ionicons name="information-circle-outline" size={15} color={TEAL} style={{ marginTop: 1 }} />
            <Text style={s.driverNoteTxt}>
              Driver details will be shared 24 hrs before your arrival via WhatsApp and WeChat.
            </Text>
          </View>

          {/* ── Support ── */}
          <Text style={s.secLabel}>CONTACT SUPPORT</Text>
          <View style={s.supportRow}>
            <TouchableOpacity
              style={[s.supportBtn, { backgroundColor: a('#25d366', 0.1), borderColor: a('#25d366', 0.25) }]}
              onPress={() => Linking.openURL('https://wa.me/message/hafrikx').catch(() => {})}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={20} color="#25d366" />
              <Text style={[s.supportTxt, { color: '#25d366' }]}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.supportBtn, { backgroundColor: a('#07c160', 0.1), borderColor: a('#07c160', 0.25) }]}
              onPress={() => Linking.openURL('weixin://').catch(() => {})}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={20} color="#07c160" />
              <Text style={[s.supportTxt, { color: '#07c160' }]}>WeChat</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {/* ── CTAs ── */}
      <View style={[s.ctaBar, { paddingBottom: insets.bottom + 14 }]}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => navigation.navigate('ArrivalBookingDetails', {
            bookingId,
            services,
            vehicle,
            hotel,
            trip,
            status: 'pending',
            serviceTitle: wantsInspection ? 'Trade Arrival Package' : 'Arrival Concierge',
          })}
          style={{ flex: 1 }}
        >
          <LinearGradient
            colors={[BRAND, TEAL]}
            style={s.ctaPrimary}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Ionicons name="receipt-outline" size={18} color={WHITE} />
            <Text style={s.ctaPrimaryTxt}>View Booking</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.ctaSecondary}
          activeOpacity={0.75}
          onPress={() => navigation.navigate('ArrivalMyBookings')}
        >
          <Ionicons name="list-outline" size={16} color={TEAL} />
          <Text style={s.ctaSecondaryTxt}>My Bookings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: 20, alignItems: 'center' },

  // Orb
  orbWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  ring: {
    position: 'absolute',
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: a(GREEN, 0.1), borderWidth: 1, borderColor: a(GREEN, 0.2),
  },
  orb: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: GREEN, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
  },

  confirmedTag:   { color: GREEN, fontSize: 10, fontWeight: '800', letterSpacing: 2.5, marginBottom: 8 },
  confirmedTitle: { color: DARK, fontSize: 28, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  confirmedSub:   { color: MUTED, fontSize: 13.5, lineHeight: 20, textAlign: 'center', marginBottom: 28 },

  // ID card
  idCard:      { width: '100%', borderRadius: 22, overflow: 'hidden', marginBottom: 28 },
  idCardInner: { padding: 22, borderRadius: 22 },
  blob:        { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.05)', right: -40, top: -40 },
  idTop:       { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 },
  idTagTxt:    { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700', letterSpacing: 1.8, marginBottom: 6 },
  idCode:      { color: WHITE, fontSize: 26, fontWeight: '800', letterSpacing: 1 },
  idIconRing:  { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  idDivider:   { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 14 },
  idServicesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  idSvcPill:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  idSvcTxt:    { color: WHITE, fontSize: 11, fontWeight: '600' },
  idMetaRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  idMetaTxt:   { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  idMetaDot:   { color: 'rgba(255,255,255,0.35)', fontSize: 12 },
  idStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  idStatusDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: GOLD },
  idStatusTxt: { color: 'rgba(255,255,255,0.82)', fontSize: 11.5, fontWeight: '700' },

  secLabel: { color: MUTED, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10, alignSelf: 'flex-start', width: '100%' },

  // What's next
  nextCard:    { width: '100%', backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', marginBottom: 14 },
  nextRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  nextIconBox: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  nextTitle:   { fontSize: 13, fontWeight: '700', color: DARK, marginBottom: 3 },
  nextDesc:    { fontSize: 12, color: MUTED, lineHeight: 17 },

  // Driver note
  driverNote:    { width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: a(TEAL, 0.07), borderRadius: 13, borderWidth: 1, borderColor: a(TEAL, 0.2), padding: 13, marginBottom: 22 },
  driverNoteTxt: { flex: 1, color: '#1a5f63', fontSize: 12.5, lineHeight: 18 },

  // Support
  supportRow: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 8 },
  supportBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 14, borderWidth: 1 },
  supportTxt: { fontSize: 13, fontWeight: '700' },

  // CTAs
  ctaBar:          { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: BG, borderTopWidth: 1, borderTopColor: BORDER, gap: 10 },
  ctaPrimary:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 17 },
  ctaPrimaryTxt:   { color: WHITE, fontSize: 16, fontWeight: '800' },
  ctaSecondary:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 13, paddingVertical: 13, borderWidth: 1, borderColor: a(TEAL, 0.3), backgroundColor: a(TEAL, 0.07) },
  ctaSecondaryTxt: { color: TEAL, fontSize: 14, fontWeight: '700' },
});
