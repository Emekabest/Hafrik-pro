import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

// ─── Palette ──────────────────────────────────────────────────────────────────
const BRAND  = '#0c3f44';
const TEAL   = '#1f8e93';
const GOLD   = '#d4a017';
const BG     = '#f4f9fa';
const CARD   = '#ffffff';
const BORDER = '#ddeaec';
const DARK   = '#0d2b2e';
const MUTED  = '#5f7275';
const WHITE  = '#ffffff';
const GREEN  = '#1a9e5c';

const a = (hex, alpha) => {
  const n = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${hex}${n}`;
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const TRANSFER_VEHICLES = [
  { icon: 'car-outline',       label: '5-Seat Standard Car',      price: '$150',  tag: 'Round Trip' },
  { icon: 'car-sport-outline', label: '5-Seat Mid & Large SUV',   price: '$180',  tag: 'Round Trip' },
  { icon: 'bus-outline',       label: '7-Seat Business Vehicle',  price: '$220',  tag: 'Round Trip' },
  { icon: 'star-outline',      label: 'Luxury / Large Vehicle',   price: '$300',  tag: 'Round Trip' },
];

const INSPECTION_VEHICLES = [
  { icon: 'car-outline',       label: '5-Seat Standard Car',      price: '$180',  tag: 'Per Day' },
  { icon: 'car-sport-outline', label: '5-Seat Mid & Large SUV',   price: '$210',  tag: 'Per Day' },
  { icon: 'bus-outline',       label: '7-Seat Business Vehicle',  price: '$270',  tag: 'Per Day' },
  { icon: 'star-outline',      label: 'Luxury / Large Vehicle',   price: '$380',  tag: 'Per Day' },
];

const HOTELS = [
  {
    icon:  'bed-outline',
    tier:  'Budget Business Hotel',
    start: 'From $30',
    unit:  'per room / night',
    color: TEAL,
  },
  {
    icon:  'business-outline',
    tier:  'Mid-Range Chain Boutique Hotel',
    start: 'From $50',
    unit:  'per room / night',
    color: GOLD,
  },
  {
    icon:  'diamond-outline',
    tier:  'High-End 4–5 Star Hotel',
    start: 'From $200',
    unit:  'per room / night',
    color: '#9b59b6',
  },
];

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHead({ num, title, icon, color = TEAL }) {
  return (
    <View style={s.secHead}>
      <LinearGradient colors={[BRAND, color]} style={s.secNum} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={s.secNumTxt}>{num}</Text>
      </LinearGradient>
      <View style={[s.secIconBox, { backgroundColor: a(color, 0.1) }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={s.secTitle}>{title}</Text>
    </View>
  );
}

// ─── Vehicle row ──────────────────────────────────────────────────────────────
function VehicleRow({ item, isLast, accentColor = TEAL }) {
  return (
    <View style={[s.vRow, isLast && { borderBottomWidth: 0 }]}>
      <View style={[s.vIconBox, { backgroundColor: a(accentColor, 0.09) }]}>
        <Ionicons name={item.icon} size={17} color={accentColor} />
      </View>
      <Text style={s.vLabel}>{item.label}</Text>
      <View style={s.vPriceWrap}>
        <Text style={[s.vPrice, { color: accentColor }]}>{item.price}</Text>
        <Text style={s.vTag}>{item.tag}</Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ArrivalConcierge() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} translucent={false} />

      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[]} bounces>

        {/* ── Hero header (scrolls away) ── */}
        <LinearGradient
          colors={[BRAND, '#144f55', TEAL]}
          style={[s.hero, { paddingTop: insets.top + 18 }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          {/* blobs */}
          <View style={s.blob1} />
          <View style={s.blob2} />

          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={WHITE} />
          </TouchableOpacity>

          <View style={s.heroBadge}>
            <Ionicons name="shield-checkmark" size={11} color={WHITE} />
            <Text style={s.heroBadgeTxt}>HAFRIKX VERIFIED</Text>
          </View>

          <View style={s.heroIconRing}>
            <Ionicons name="airplane" size={34} color={WHITE} />
          </View>

          <Text style={s.heroTitle}>Foreign Merchant{'\n'}Reception Service</Text>
          <Text style={s.heroSub}>
            Airport transfer · Factory inspection · Hotel booking{'\n'}for international business travellers to China.
          </Text>

          <View style={s.heroTagRow}>
            {['Airport Transfer', 'Hotel Booking', 'Factory Tour'].map(t => (
              <View key={t} style={s.heroTag}>
                <Text style={s.heroTagTxt}>{t}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={s.body}>

          {/* ════════════════════════════════════════
              SECTION 1 — Airport Transfer
          ════════════════════════════════════════ */}
          <SectionHead num="1" title="Round-Trip Airport Transfer" icon="car-outline" color={TEAL} />

          <View style={s.card}>
            {TRANSFER_VEHICLES.map((v, i) => (
              <VehicleRow key={i} item={v} isLast={i === TRANSFER_VEHICLES.length - 1} accentColor={TEAL} />
            ))}
          </View>

          <View style={s.infoStrip}>
            <Ionicons name="information-circle-outline" size={15} color={TEAL} />
            <Text style={s.infoStripTxt}>Prices are per round trip (airport pick-up + drop-off).</Text>
          </View>

          {/* ════════════════════════════════════════
              SECTION 2 — Daily Inspection
          ════════════════════════════════════════ */}
          <SectionHead num="2" title="Daily Inspection & Accompaniment" icon="search-outline" color={GREEN} />

          {/* Guangzhou-only badge */}
          <View style={s.restrictionBanner}>
            <Ionicons name="location" size={14} color={GREEN} />
            <Text style={s.restrictionTxt}>
              <Text style={{ fontWeight: '800', color: GREEN }}>Guangzhou only</Text>
              {'  '}·{'  '}Excludes Shenzhen, Dongguan & Foshan
            </Text>
          </View>

          {/* Service highlights */}
          <View style={s.highlightRow}>
            {[
              { icon: 'time-outline',         label: '9 hrs / day' },
              { icon: 'navigate-outline',     label: 'Route planning' },
              { icon: 'business-outline',     label: '2–3 factories' },
            ].map((h, i) => (
              <View key={i} style={s.highlightPill}>
                <Ionicons name={h.icon} size={14} color={GREEN} />
                <Text style={s.highlightTxt}>{h.label}</Text>
              </View>
            ))}
          </View>

          <View style={s.card}>
            {INSPECTION_VEHICLES.map((v, i) => (
              <VehicleRow key={i} item={v} isLast={i === INSPECTION_VEHICLES.length - 1} accentColor={GREEN} />
            ))}
          </View>

          {/* Remark */}
          <View style={[s.remarkCard, { borderLeftColor: GREEN }]}>
            <Ionicons name="checkmark-circle" size={15} color={GREEN} style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.remarkTitle}>100% Genuine Factories — No Middlemen</Text>
              <Text style={s.remarkBody}>
                We recommend 3 suitable factories for selection based on your product type and sourcing needs.
              </Text>
            </View>
          </View>

          {/* ════════════════════════════════════════
              SECTION 3 — Hotel Reservation
          ════════════════════════════════════════ */}
          <SectionHead num="3" title="Hotel Reservation Service" icon="bed-outline" color={GOLD} />

          <View style={s.card}>
            {HOTELS.map((h, i) => (
              <View key={i} style={[s.hotelRow, i === HOTELS.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={[s.hotelIconBox, { backgroundColor: a(h.color, 0.1) }]}>
                  <Ionicons name={h.icon} size={17} color={h.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.hotelTier}>{h.tier}</Text>
                  <Text style={s.hotelUnit}>{h.unit}</Text>
                </View>
                <Text style={[s.hotelPrice, { color: h.color }]}>{h.start}</Text>
              </View>
            ))}
          </View>

          <View style={s.infoStrip}>
            <Ionicons name="information-circle-outline" size={15} color={GOLD} />
            <Text style={[s.infoStripTxt, { color: '#8a6800' }]}>
              Hotel prices follow real-time quotations. You may also book directly.
            </Text>
          </View>

          {/* ════════════════════════════════════════
              SECTION 4 — Supplementary Terms
          ════════════════════════════════════════ */}
          <SectionHead num="4" title="Supplementary Terms" icon="document-text-outline" color={MUTED} />

          <View style={[s.card, s.termsCard]}>
            {[
              { icon: 'moon-outline',        text: 'Night service charges may apply for late or early flights.' },
              { icon: 'time-outline',        text: 'Overtime charges apply beyond the standard service window.' },
              { icon: 'map-outline',         text: 'Road tolls and bridge charges billed at cost.' },
              { icon: 'alert-circle-outline',text: 'Additional terms may be supplemented as required.' },
            ].map((t, i, arr) => (
              <View key={i} style={[s.termRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={[s.termIconBox, { backgroundColor: a(MUTED, 0.08) }]}>
                  <Ionicons name={t.icon} size={15} color={MUTED} />
                </View>
                <Text style={s.termTxt}>{t.text}</Text>
              </View>
            ))}
          </View>

          {/* ── CTA ── */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => navigation.navigate('ArrivalTripDetails')}
          >
            <LinearGradient
              colors={[BRAND, TEAL]}
              style={s.ctaBtn}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Ionicons name="airplane" size={19} color={WHITE} />
              <Text style={s.ctaTxt}>Book This Service</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.ctaSecondary}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('ArrivalMyBookings')}
          >
            <Ionicons name="receipt-outline" size={15} color={TEAL} />
            <Text style={s.ctaSecondaryTxt}>View My Bookings</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Hero
  hero: { paddingHorizontal: 20, paddingBottom: 28, overflow: 'hidden' },
  blob1: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.05)', right: -60, top: -60 },
  blob2: { position: 'absolute', width: 140, height: 140, borderRadius: 70,  backgroundColor: 'rgba(255,255,255,0.05)', left: -40,  bottom: -40 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', marginBottom: 18 },
  heroBadgeTxt: { color: WHITE, fontSize: 9.5, fontWeight: '800', letterSpacing: 1.2 },
  heroIconRing: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', marginBottom: 16 },
  heroTitle: { color: WHITE, fontSize: 24, fontWeight: '800', lineHeight: 32, marginBottom: 10 },
  heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12.5, lineHeight: 19, marginBottom: 20 },
  heroTagRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  heroTag: { backgroundColor: 'rgba(255,255,255,0.13)', borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  heroTagTxt: { color: WHITE, fontSize: 11, fontWeight: '600' },

  // Body
  body: { paddingHorizontal: 16, paddingTop: 24 },

  // Section head
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  secNum: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  secNumTxt: { color: WHITE, fontSize: 12, fontWeight: '800' },
  secIconBox: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  secTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: DARK },

  // Card
  card: { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, marginBottom: 12, overflow: 'hidden' },

  // Vehicle row
  vRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: a(BORDER, 0.8) },
  vIconBox: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  vLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: DARK },
  vPriceWrap: { alignItems: 'flex-end' },
  vPrice: { fontSize: 16, fontWeight: '800' },
  vTag: { fontSize: 10, color: MUTED, fontWeight: '500', marginTop: 1 },

  // Info strip
  infoStrip: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: a(TEAL, 0.07), borderRadius: 12, borderWidth: 1, borderColor: a(TEAL, 0.18), padding: 11, marginBottom: 24 },
  infoStripTxt: { flex: 1, fontSize: 12, color: '#1a5f63', fontWeight: '500', lineHeight: 17 },

  // Restriction banner
  restrictionBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: a(GREEN, 0.08), borderRadius: 12, borderWidth: 1, borderColor: a(GREEN, 0.2), paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  restrictionTxt: { flex: 1, fontSize: 12.5, color: '#145a38', lineHeight: 18 },

  // Highlights
  highlightRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  highlightPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: a(GREEN, 0.08), borderRadius: 20, borderWidth: 1, borderColor: a(GREEN, 0.2), paddingHorizontal: 12, paddingVertical: 6 },
  highlightTxt: { fontSize: 12, fontWeight: '600', color: GREEN },

  // Remark card
  remarkCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: a(GREEN, 0.06), borderRadius: 14, borderWidth: 1, borderColor: a(GREEN, 0.2), borderLeftWidth: 4, padding: 14, marginBottom: 26 },
  remarkTitle: { fontSize: 13, fontWeight: '800', color: DARK, marginBottom: 4 },
  remarkBody: { fontSize: 12, color: MUTED, lineHeight: 17 },

  // Hotel row
  hotelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: a(BORDER, 0.8) },
  hotelIconBox: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  hotelTier: { fontSize: 13, fontWeight: '700', color: DARK, marginBottom: 2 },
  hotelUnit: { fontSize: 10.5, color: MUTED },
  hotelPrice: { fontSize: 15, fontWeight: '800' },

  // Terms
  termsCard: { marginBottom: 24 },
  termRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: a(BORDER, 0.8) },
  termIconBox: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  termTxt: { flex: 1, fontSize: 13, color: MUTED, lineHeight: 19 },

  // CTA
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 15, paddingVertical: 17, marginBottom: 12 },
  ctaTxt: { color: WHITE, fontSize: 16, fontWeight: '800' },
  ctaSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 13, paddingVertical: 14, borderWidth: 1, borderColor: a(TEAL, 0.3), backgroundColor: a(TEAL, 0.07) },
  ctaSecondaryTxt: { color: TEAL, fontSize: 14, fontWeight: '700' },
});
