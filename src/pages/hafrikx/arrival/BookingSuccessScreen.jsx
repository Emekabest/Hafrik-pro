/**
 * Arrival Concierge — Screen 4: Booking Success
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
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
const GOLD_LT= '#e8c87a';
const MUTED  = '#5f6b6d';
const WHITE   = '#ffffff';
const BRAND   = '#0c3f44';
const TEAL    = '#1f8e93';
const GREEN  = '#10b981';

export default function BookingSuccessScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const insets     = useSafeAreaInsets();
  const { experience, trip, bookingId = 'HXAP-000001' } = route.params ?? {};

  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const cardAnim    = useRef(new Animated.Value(40)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const pulse       = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Icon spring in
    Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }).start();

    // Fade in
    Animated.timing(opacityAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    // Card slide up
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(cardAnim,    { toValue: 0, tension: 90, friction: 10, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]).start();
    }, 300);

    // Gentle pulse on success icon
    const loopPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    );
    setTimeout(() => loopPulse.start(), 600);
    return () => loopPulse.stop();
  }, []);

  const handleWhatsApp = () => {
    Linking.openURL('https://wa.me/message/hafrikx').catch(() => {});
  };
  const handleWeChat = () => {
    Linking.openURL('weixin://').catch(() => {});
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0c3f44" translucent={false} />

      {/* Decorative gradient top */}
      <LinearGradient
        colors={['#001a0d', BG]}
        style={styles.topGrad}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <Animated.View style={[styles.content, { opacity: opacityAnim, paddingTop: insets.top + 14 }]}>

        {/* Success orb */}
        <Animated.View style={{ transform: [{ scale: Animated.multiply(scaleAnim, pulse) }], marginBottom: 24 }}>
          <LinearGradient
            colors={[GREEN, '#047857']}
            style={styles.successOrb}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="checkmark" size={44} color={WHITE} />
          </LinearGradient>
        </Animated.View>

        <Text style={styles.confirmedLabel}>BOOKING CONFIRMED</Text>
        <Text style={styles.confirmedTitle}>You're all set! 🎉</Text>
        <Text style={styles.confirmedSub}>
          Your driver will contact you before your arrival.
        </Text>

        {/* Booking ID card */}
        <Animated.View style={[styles.bookingCard, { opacity: cardOpacity, transform: [{ translateY: cardAnim }] }]}>
          <LinearGradient colors={['#0f1f10', '#0a1808']} style={styles.bookingCardInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.bookingIdLabel}>BOOKING ID</Text>
            <Text style={styles.bookingId}>{bookingId}</Text>
            <View style={styles.bookingDivider} />
            {experience && (
              <View style={styles.bookingMeta}>
                <Ionicons name={experience.icon ?? 'airplane'} size={14} color={GOLD} />
                <Text style={styles.bookingMetaTxt}>{experience.title}</Text>
              </View>
            )}
            {trip?.city && (
              <View style={styles.bookingMeta}>
                <Ionicons name="location" size={14} color={GOLD} />
                <Text style={styles.bookingMetaTxt}>{trip.city} · {trip.date} at {trip.time}</Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Driver note */}
        <Animated.View style={[styles.driverNote, { opacity: cardOpacity }]}>
          <Ionicons name="person-circle-outline" size={20} color={MUTED} />
          <Text style={styles.driverNoteTxt}>
            Driver details will be shared via WhatsApp & WeChat 24 hrs before your arrival.
          </Text>
        </Animated.View>

        {/* Support buttons */}
        <Animated.View style={[styles.supportRow, { opacity: cardOpacity }]}>
          <TouchableOpacity style={[styles.supportBtn, { backgroundColor: '#25d36620' }]} onPress={handleWhatsApp} activeOpacity={0.8}>
            <Ionicons name="logo-whatsapp" size={20} color="#25d366" />
            <Text style={[styles.supportBtnTxt, { color: '#25d366' }]}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.supportBtn, { backgroundColor: '#07c16020' }]} onPress={handleWeChat} activeOpacity={0.8}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#07c160" />
            <Text style={[styles.supportBtnTxt, { color: '#07c160' }]}>WeChat</Text>
          </TouchableOpacity>
        </Animated.View>

      </Animated.View>

      {/* CTA */}
      <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          onPress={() => navigation.navigate('ArrivalBookingDetails', { bookingId, experience, trip })}
          activeOpacity={0.85}
          style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 10 }}
        >
          <LinearGradient colors={[GOLD, '#a07830']} style={styles.ctaBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="receipt-outline" size={20} color="#000" />
            <Text style={styles.ctaTxt}>View Booking</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('ArrivalMyBookings')}
          style={styles.ctaSecondary}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaSecondaryTxt}>My Bookings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  topGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 280 },

  content: {
    flex: 1, alignItems: 'center',
    paddingHorizontal: 24,
  },

  successOrb: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#10b981', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 24, elevation: 16,
  },

  confirmedLabel: {
    color: '#10b981', fontSize: 10, fontFamily: 'WorkSans_700Bold',
    letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 8,
  },
  confirmedTitle: {
    color: BRAND, fontSize: 28, fontFamily: 'ReadexPro_700Bold',
    letterSpacing: -0.5, textAlign: 'center', marginBottom: 8,
  },
  confirmedSub: {
    color: MUTED, fontSize: 14, fontFamily: 'WorkSans_400Regular',
    textAlign: 'center', lineHeight: 20, marginBottom: 28,
    paddingHorizontal: 10,
  },

  bookingCard: { width: '100%', borderRadius: 20, overflow: 'hidden', marginBottom: 16 },
  bookingCardInner: {
    padding: 22,
    borderWidth: 1, borderColor: '#10b98130', borderRadius: 20,
  },
  bookingIdLabel: {
    color: MUTED, fontSize: 10, fontFamily: 'WorkSans_700Bold',
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6,
  },
  bookingId: {
    color: GOLD, fontSize: 28, fontFamily: 'ReadexPro_700Bold',
    letterSpacing: 1, marginBottom: 14,
  },
  bookingDivider: { height: 1, backgroundColor: BORDER, marginBottom: 14 },
  bookingMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  bookingMetaTxt: { color: WHITE + 'cc', fontSize: 13, fontFamily: 'WorkSans_400Regular' },

  driverNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: CARD, borderRadius: 14, padding: 14,
    width: '100%', marginBottom: 16, borderWidth: 1, borderColor: BORDER,
  },
  driverNoteTxt: { flex: 1, color: MUTED, fontSize: 12, fontFamily: 'WorkSans_400Regular', lineHeight: 17 },

  supportRow: { flexDirection: 'row', gap: 12, width: '100%' },
  supportBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 48, borderRadius: 14,
  },
  supportBtnTxt: { fontSize: 13, fontFamily: 'WorkSans_700Bold' },

  ctaWrap: {
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: BG, borderTopWidth: 1, borderTopColor: BORDER,
  },
  ctaBtn: {
    height: 56, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, borderRadius: 16,
  },
  ctaTxt: { fontSize: 16, fontFamily: 'ReadexPro_600SemiBold', color: '#000' },
  ctaSecondary: { height: 44, alignItems: 'center', justifyContent: 'center' },
  ctaSecondaryTxt: { color: MUTED, fontSize: 13, fontFamily: 'WorkSans_600SemiBold' },
});
