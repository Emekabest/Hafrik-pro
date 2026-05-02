import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator,
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

// ─── Sub-components ───────────────────────────────────────────────────────────
function SummaryRow({ icon, label, value, color = TEAL, last }) {
  return (
    <View style={[s.sumRow, last && { borderBottomWidth: 0 }]}>
      <View style={[s.sumIcon, { backgroundColor: a(color, 0.1) }]}>
        <Ionicons name={icon} size={15} color={color} />
      </View>
      <Text style={s.sumLabel}>{label}</Text>
      <Text style={s.sumValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function ServiceBadge({ icon, label, color }) {
  return (
    <View style={[s.svcBadge, { backgroundColor: a(color, 0.1), borderColor: a(color, 0.25) }]}>
      <Ionicons name={icon} size={13} color={color} />
      <Text style={[s.svcBadgeTxt, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ReviewBookingScreen() {
  const navigation             = useNavigation();
  const route                  = useRoute();
  const insets                 = useSafeAreaInsets();
  const { services, vehicle, hotel, trip } = route.params ?? {};

  const [submitting, setSubmitting] = useState(false);

  // ── Build service badges ──
  const SERVICE_META = {
    transfer:   { label: 'Airport Transfer',   icon: 'car-outline',    color: TEAL  },
    hotel:      { label: 'Hotel Booking',       icon: 'bed-outline',    color: GOLD  },
    inspection: { label: 'Factory Inspection',  icon: 'search-outline', color: GREEN },
  };

  const activeServices = (services ?? ['transfer']).map(id => SERVICE_META[id]).filter(Boolean);

  // ── Price breakdown ──
  const transferPrice = vehicle ? parseInt(vehicle.transfer.replace('$', '')) : 0;
  const inspectionDayPrice = vehicle ? parseInt(vehicle.inspection.replace('$', '')) : 0;
  const wantsInspection = (services ?? []).includes('inspection');
  const wantsHotel      = (services ?? []).includes('hotel');

  const lineItems = [
    {
      label: `Airport Transfer — ${vehicle?.label ?? 'Standard'}`,
      desc:  'Round trip (pick-up + drop-off)',
      price: vehicle?.transfer ?? '—',
      color: TEAL,
      icon:  'car-outline',
    },
    ...(wantsInspection ? [{
      label: `Factory Inspection — ${vehicle?.label ?? 'Standard'}`,
      desc:  '9 hrs · Guangzhou only',
      price: vehicle?.inspection ?? '—',
      color: GREEN,
      icon:  'search-outline',
    }] : []),
    ...(wantsHotel && hotel ? [{
      label: hotel.label,
      desc:  hotel.price,
      price: 'Quoted',
      color: GOLD,
      icon:  'bed-outline',
    }] : []),
  ];

  const fixedTotal = transferPrice + (wantsInspection ? inspectionDayPrice : 0);

  const handleConfirm = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      navigation.navigate('ArrivalSuccess', {
        services,
        vehicle,
        hotel,
        trip,
        bookingId: `HXAP-${String(Math.floor(100000 + Math.random() * 900000)).slice(0, 6)}`,
      });
    }, 1500);
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} translucent={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
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
          <Text style={s.headerTitle}>Review Booking</Text>
          <Text style={s.headerSub}>Confirm your details before we proceed</Text>
          <View style={s.stepPill}>
            <Text style={s.stepTxt}>Step 2 of 2</Text>
          </View>
        </LinearGradient>

        <View style={s.body}>

          {/* ── Services selected ── */}
          <View style={s.svcRow}>
            {activeServices.map((svc, i) => (
              <ServiceBadge key={i} icon={svc.icon} label={svc.label} color={svc.color} />
            ))}
          </View>

          <View style={s.reviewCard}>
            <LinearGradient
              colors={[a(TEAL, 0.12), a(GOLD, 0.1)]}
              style={s.reviewGlow}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={s.reviewTop}>
                <View style={s.reviewIcon}>
                  <Ionicons name="shield-checkmark-outline" size={21} color={TEAL} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.reviewTitle}>Ready for agent review</Text>
                  <Text style={s.reviewSub}>Confirm once and HafrikX will coordinate your arrival support.</Text>
                </View>
              </View>
              <View style={s.reviewMetaRow}>
                <View style={s.reviewMeta}>
                  <Text style={s.reviewMetaLabel}>Contact time</Text>
                  <Text style={s.reviewMetaValue}>Within 2 hrs</Text>
                </View>
                <View style={s.reviewMeta}>
                  <Text style={s.reviewMetaLabel}>Payment</Text>
                  <Text style={s.reviewMetaValue}>At service</Text>
                </View>
                <View style={s.reviewMeta}>
                  <Text style={s.reviewMetaLabel}>Status</Text>
                  <Text style={s.reviewMetaValue}>Pending</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* ── Price breakdown ── */}
          <Text style={s.secLabel}>PRICE BREAKDOWN</Text>
          <View style={s.card}>
            {lineItems.map((item, i) => (
              <View key={i} style={[s.lineItem, i === lineItems.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={[s.lineIconBox, { backgroundColor: a(item.color, 0.1) }]}>
                  <Ionicons name={item.icon} size={15} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.lineName}>{item.label}</Text>
                  <Text style={s.lineDesc}>{item.desc}</Text>
                </View>
                <Text style={[s.linePrice, { color: item.color }]}>{item.price}</Text>
              </View>
            ))}

            {/* Total */}
            <LinearGradient
              colors={[BRAND, TEAL]}
              style={s.totalRow}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Text style={s.totalLabel}>
                {wantsHotel ? 'Subtotal (excl. hotel)' : 'Estimated Total'}
              </Text>
              <Text style={s.totalPrice}>${fixedTotal}</Text>
            </LinearGradient>
          </View>

          {wantsHotel && (
            <View style={s.hotelNote}>
              <Ionicons name="information-circle-outline" size={14} color={GOLD} />
              <Text style={s.hotelNoteTxt}>
                Hotel price follows real-time quotation and will be confirmed by your agent.
              </Text>
            </View>
          )}

          {/* ── Trip summary ── */}
          <Text style={[s.secLabel, { marginTop: 20 }]}>TRIP DETAILS</Text>
          <View style={s.card}>
            <SummaryRow icon="location"      label="City"          value={trip?.city        ?? '—'} color={TEAL}  />
            <SummaryRow icon="airplane"      label="Airport"       value={trip?.airport     ?? '—'} color={TEAL}  />
            <SummaryRow icon="document-text" label="Flight"        value={trip?.flight      ?? '—'} color={BRAND} />
            <SummaryRow icon="calendar"      label="Date"          value={trip?.date        ?? '—'} color={BRAND} />
            <SummaryRow icon="time"          label="Arrival Time"  value={trip?.time        ?? '—'} color={BRAND} />
            <SummaryRow icon="navigate"      label="Drop-off"      value={trip?.dropoff     ?? '—'} color={TEAL}  />
            <SummaryRow icon="people"        label="Passengers"    value={trip?.passengers  ?? '1'} color={TEAL}  />
            {!!trip?.notes && (
              <SummaryRow icon="chatbox-ellipses" label="Notes"   value={trip.notes}               color={MUTED} last />
            )}
          </View>

          {/* ── Factory Inspection note ── */}
          {wantsInspection && (
            <View style={s.inspNote}>
              <Ionicons name="checkmark-circle" size={15} color={GREEN} />
              <View style={{ flex: 1 }}>
                <Text style={s.inspNoteTitle}>Factory Inspection Included</Text>
                <Text style={s.inspNoteBody}>
                  9 hrs/day · 2–3 factories arranged · 100% genuine, no middlemen · Guangzhou only
                </Text>
              </View>
            </View>
          )}

          {/* ── Terms ── */}
          <View style={s.termsBox}>
            <Ionicons name="shield-checkmark-outline" size={14} color={MUTED} style={{ marginTop: 1 }} />
            <Text style={s.termsTxt}>
              By confirming you agree to HafrikX service terms. A Hafrik agent will contact you within 2 hours to finalise arrangements. Payment is settled at the time of service.
            </Text>
          </View>

        </View>
      </ScrollView>

      {/* ── Sticky CTA ── */}
      <View style={[s.ctaBar, { paddingBottom: insets.bottom + 14 }]}>
        <TouchableOpacity
          onPress={handleConfirm}
          disabled={submitting}
          activeOpacity={0.88}
          style={{ flex: 1 }}
        >
          <LinearGradient
            colors={submitting ? [MUTED, MUTED] : [BRAND, TEAL]}
            style={s.ctaBtn}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            {submitting ? (
              <>
                <ActivityIndicator color={WHITE} size="small" />
                <Text style={s.ctaTxt}>Confirming...</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={WHITE} />
                <Text style={s.ctaTxt}>Confirm Booking</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Header
  header:      { paddingHorizontal: 20, paddingBottom: 28, overflow: 'hidden' },
  blob:        { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)', right: -50, top: -50 },
  backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  headerTitle: { color: WHITE, fontSize: 22, fontWeight: '800', marginBottom: 4 },
  headerSub:   { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 16 },
  stepPill:    { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  stepTxt:     { color: WHITE, fontSize: 11, fontWeight: '700' },

  body:     { paddingHorizontal: 16, paddingTop: 18 },
  secLabel: { color: MUTED, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 },
  card:     { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', marginBottom: 8 },

  // Services row
  svcRow:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 20 },
  svcBadge:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  svcBadgeTxt: { fontSize: 12, fontWeight: '700' },

  // Review state card
  reviewCard: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: BORDER, marginBottom: 20, backgroundColor: CARD },
  reviewGlow: { padding: 16 },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  reviewIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: a(TEAL, 0.11), alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: a(TEAL, 0.18) },
  reviewTitle: { color: DARK, fontSize: 15, fontWeight: '800', marginBottom: 3 },
  reviewSub: { color: MUTED, fontSize: 12.5, lineHeight: 18 },
  reviewMetaRow: { flexDirection: 'row', gap: 8 },
  reviewMeta: { flex: 1, backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 13, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  reviewMetaLabel: { color: MUTED, fontSize: 9.5, fontWeight: '700', marginBottom: 4 },
  reviewMetaValue: { color: DARK, fontSize: 11.5, fontWeight: '800' },

  // Price breakdown
  lineItem:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  lineIconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  lineName:    { fontSize: 13, fontWeight: '700', color: DARK },
  lineDesc:    { fontSize: 11.5, color: MUTED, marginTop: 2 },
  linePrice:   { fontSize: 16, fontWeight: '800' },
  totalRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  totalLabel:  { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  totalPrice:  { color: WHITE, fontSize: 22, fontWeight: '800' },

  // Hotel note
  hotelNote:    { flexDirection: 'row', alignItems: 'flex-start', gap: 7, backgroundColor: a(GOLD, 0.07), borderRadius: 12, borderWidth: 1, borderColor: a(GOLD, 0.2), padding: 11, marginBottom: 4 },
  hotelNoteTxt: { flex: 1, fontSize: 12, color: '#7a5800', lineHeight: 17 },

  // Summary rows
  sumRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 12 },
  sumIcon:  { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  sumLabel: { color: MUTED, fontSize: 12, width: 92 },
  sumValue: { flex: 1, color: DARK, fontSize: 13, fontWeight: '700', textAlign: 'right' },

  // Inspection note
  inspNote:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: a(GREEN, 0.07), borderRadius: 14, borderWidth: 1, borderColor: a(GREEN, 0.2), borderLeftWidth: 4, borderLeftColor: GREEN, padding: 14, marginBottom: 14 },
  inspNoteTitle:{ fontSize: 13, fontWeight: '800', color: DARK, marginBottom: 3 },
  inspNoteBody: { fontSize: 12, color: MUTED, lineHeight: 17 },

  // Terms
  termsBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 8 },
  termsTxt: { flex: 1, color: MUTED, fontSize: 12, lineHeight: 18 },

  // CTA
  ctaBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: BG, borderTopWidth: 1, borderTopColor: BORDER },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 17 },
  ctaTxt: { color: WHITE, fontSize: 16, fontWeight: '800' },
});
