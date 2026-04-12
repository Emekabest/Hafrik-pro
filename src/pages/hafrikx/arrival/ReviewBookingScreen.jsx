/**
 * Arrival Concierge — Screen 3: Review Booking
 */
import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, StatusBar,
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

const SummaryRow = ({ icon, label, value, accent }) => (
  <View style={styles.summaryRow}>
    <View style={[styles.summaryIcon, { backgroundColor: (accent ?? GOLD) + '1a' }]}>
      <Ionicons name={icon} size={15} color={accent ?? GOLD} />
    </View>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue} numberOfLines={2}>{value}</Text>
  </View>
);

export default function ReviewBookingScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const insets     = useSafeAreaInsets();
  const { experience, trip } = route.params ?? {};
  const [submitting, setSubmitting] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleBook = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      navigation.navigate('ArrivalSuccess', {
        experience,
        trip,
        bookingId: `HXAP-${String(Math.floor(100000 + Math.random() * 900000)).slice(0, 6)}`,
      });
    }, 1400);
  };

  const included = experience?.benefits ?? [];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0c3f44" translucent={false} />

      {/* Header */}
      <LinearGradient colors={["#0c3f44", "#1a5a60"]} style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </TouchableOpacity>
        <View style={{ flex: 1, paddingLeft: 12 }}>
          <Text style={styles.headerTitle}>Review Booking</Text>
          <Text style={styles.headerSub}>Confirm your details</Text>
        </View>
        <View style={styles.stepBadge}>
          <Text style={styles.stepTxt}>3 / 3</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Service header card */}
          <LinearGradient
            colors={experience?.vip ? ['#2a1a00', '#1a1200'] : ['#ffffff', '#0c3f44']}
            style={styles.serviceCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={[styles.serviceIconWrap, { backgroundColor: (experience?.accent ?? GOLD) + '22' }]}>
              <Ionicons name={experience?.icon ?? 'airplane'} size={28} color={experience?.accent ?? GOLD} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.serviceLabel, { color: experience?.accent ?? GOLD }]}>{experience?.label ?? 'Service'}</Text>
              <Text style={styles.serviceTitle}>{experience?.title ?? 'Arrival Concierge'}</Text>
            </View>
            <View style={styles.priceTag}>
              <Text style={styles.priceTagNote}>From</Text>
              <Text style={[styles.priceTagValue, { color: experience?.accent ?? GOLD }]}>{experience?.price ?? ''}</Text>
            </View>
          </LinearGradient>

          {/* Trip summary */}
          <Text style={styles.sectionLabel}>BOOKING SUMMARY</Text>
          <View style={styles.summaryCard}>
            <SummaryRow icon="location"            label="City"          value={trip?.city        ?? '—'} />
            <View style={styles.rowDivider} />
            <SummaryRow icon="airplane"            label="Airport"       value={trip?.airport     ?? '—'} />
            <View style={styles.rowDivider} />
            <SummaryRow icon="document-text"       label="Flight"        value={trip?.flight      ?? '—'} />
            <View style={styles.rowDivider} />
            <SummaryRow icon="calendar"            label="Date"          value={trip?.date        ?? '—'} />
            <View style={styles.rowDivider} />
            <SummaryRow icon="time"                label="Arrival Time"  value={trip?.time        ?? '—'} />
            <View style={styles.rowDivider} />
            <SummaryRow icon="navigate"            label="Drop-off"      value={trip?.dropoff     ?? '—'} />
            <View style={styles.rowDivider} />
            <SummaryRow icon="people"              label="Passengers"    value={trip?.passengers  ?? '1'} />
            {!!trip?.notes && (
              <>
                <View style={styles.rowDivider} />
                <SummaryRow icon="chatbox-ellipses" label="Notes"        value={trip.notes} />
              </>
            )}
          </View>

          {/* What's included */}
          {included.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>WHAT'S INCLUDED</Text>
              <View style={styles.includedCard}>
                {included.map((b, i) => (
                  <View key={i} style={[styles.includedRow, i < included.length - 1 && { borderBottomWidth: 1, borderBottomColor: BORDER }]}>
                    <Ionicons name="checkmark-circle" size={17} color={experience?.accent ?? GOLD} />
                    <Text style={styles.includedTxt}>{b}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Terms note */}
          <View style={styles.termsNote}>
            <Ionicons name="shield-checkmark-outline" size={14} color={MUTED} />
            <Text style={styles.termsTxt}>
              By booking you agree to HafrikX service terms. Payment is collected at the time of service unless pre-paid.
            </Text>
          </View>

        </Animated.View>
      </ScrollView>

      {/* CTA */}
      <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          onPress={handleBook}
          disabled={submitting}
          activeOpacity={0.85}
          style={{ borderRadius: 16, overflow: 'hidden' }}
        >
          <LinearGradient colors={[GOLD, '#a07830']} style={styles.ctaBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {submitting ? (
              <Text style={styles.ctaTxt}>Confirming...</Text>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color="#000" />
                <Text style={styles.ctaTxt}>Book Arrival Service</Text>
              </>
            )}
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
  stepBadge: {
    backgroundColor: GOLD + '18', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: GOLD + '30',
  },
  stepTxt: { color: GOLD, fontSize: 11, fontFamily: 'WorkSans_700Bold' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 14, paddingTop: 12 },

  // Service card
  serviceCard: {
    borderRadius: 20, padding: 20, marginBottom: 24,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: BORDER,
  },
  serviceIconWrap: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  serviceLabel: { fontSize: 10, fontFamily: 'WorkSans_700Bold', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 },
  serviceTitle: { color: BRAND, fontSize: 16, fontFamily: 'ReadexPro_600SemiBold' },
  priceTag: { alignItems: 'flex-end' },
  priceTagNote: { color: MUTED, fontSize: 9, fontFamily: 'WorkSans_400Regular' },
  priceTagValue: { fontSize: 22, fontFamily: 'ReadexPro_700Bold' },

  sectionLabel: {
    color: MUTED, fontSize: 10, fontFamily: 'WorkSans_700Bold',
    letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 10, marginTop: 4,
  },

  // Summary card
  summaryCard: {
    backgroundColor: CARD, borderRadius: 18,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden', marginBottom: 22,
  },
  summaryRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12,
  },
  summaryIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { color: MUTED, fontSize: 12, fontFamily: 'WorkSans_400Regular', width: 90 },
  summaryValue: { flex: 1, color: BRAND, fontSize: 13, fontFamily: 'WorkSans_600SemiBold', textAlign: 'right' },
  rowDivider: { height: 1, backgroundColor: BORDER, marginHorizontal: 16 },

  // Included
  includedCard: {
    backgroundColor: CARD, borderRadius: 18,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden', marginBottom: 16,
  },
  includedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 13,
  },
  includedTxt: { flex: 1, color: WHITE + 'cc', fontSize: 13, fontFamily: 'WorkSans_400Regular' },

  termsNote: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: CARD, borderRadius: 12, padding: 14, marginBottom: 8,
  },
  termsTxt: { flex: 1, color: MUTED, fontSize: 11.5, fontFamily: 'WorkSans_400Regular', lineHeight: 17 },

  ctaWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: BG, borderTopWidth: 1, borderTopColor: BORDER,
  },
  ctaBtn: {
    height: 56, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, borderRadius: 16,
  },
  ctaTxt: { fontSize: 16, fontFamily: 'ReadexPro_600SemiBold', color: '#000' },
});
