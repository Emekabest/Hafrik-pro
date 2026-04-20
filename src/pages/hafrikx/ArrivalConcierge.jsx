import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, StatusBar, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const { width: W } = Dimensions.get('window');

const BG    = '#f7fff7';
const CARD  = '#ffffff';
const BORDER= '#e4eeef';
const MUTED = '#5f6b6d';
const WHITE = '#ffffff';
const BRAND = '#0c3f44';
const TEAL  = '#1f8e93';

const STEPS = [
  { num: '01', icon: 'create-outline',     title: 'Fill the Form',       desc: 'Tell us your flight date, arrival city and what services you need.' },
  { num: '02', icon: 'chatbubble-outline', title: 'Agent Confirms',      desc: 'A HafrikX agent contacts you within 2 hours to confirm details.' },
  { num: '03', icon: 'card-outline',       title: 'Make Payment',        desc: 'Pay securely through the app. No hidden charges.' },
  { num: '04', icon: 'airplane-outline',   title: 'Land & Be Received',  desc: 'Your driver and guide are already at the airport waiting for you.' },
];

const SERVICES = [
  { icon: 'car-sport',      label: 'Airport Pickup',    desc: 'Driver meets you at the arrival hall with a name sign.' },
  { icon: 'bed',            label: 'Hotel Booking',     desc: 'Recommended hotels near trade markets, sorted for you.' },
  { icon: 'phone-portrait', label: 'SIM Card',          desc: 'Chinese SIM with data, ready the moment you land.' },
  { icon: 'language',       label: 'Translator',        desc: 'English-Chinese interpreter available daily.' },
  { icon: 'map',            label: 'Market Guide',      desc: 'Expert local guide around Guangzhou & Yiwu markets.' },
  { icon: 'wallet',         label: 'Payment Support',   desc: 'WeChat Pay & Alipay setup and top-up assistance.' },
];

const SLIDE_W = W - 64;

const ServiceSlide = ({ item }) => (
  <View style={styles.svcCard}>
    <LinearGradient colors={[BRAND, TEAL]} style={styles.svcIconBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <Ionicons name={item.icon} size={22} color={WHITE} />
    </LinearGradient>
    <Text style={styles.svcLabel}>{item.label}</Text>
    <Text style={styles.svcDesc}>{item.desc}</Text>
  </View>
);

export default function ArrivalConcierge() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();
  const flatRef    = useRef(null);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0c3f44" translucent={false} />

      {/* ── Header ── */}
      <LinearGradient colors={["#0c3f44", "#1a5a60"]} style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={21} color={WHITE} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Arrival Concierge</Text>
          <Text style={styles.headerSub}>HafrikX Premium Service</Text>
        </View>
        <View style={{ width: 38 }} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Hero Card ── */}
        <LinearGradient
          colors={[BRAND, TEAL]}
          style={styles.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroCircle} />

          <View style={styles.heroLeft}>
            <Text style={styles.heroTag}>PREMIUM ARRIVAL</Text>
            <Text style={styles.heroTitle}>Arrive in China{'\n'}like a Pro</Text>
            <Text style={styles.heroSub}>
              Airport pickup · Hotel · SIM · Guide{'\n'}all handled before you land.
            </Text>
            <View style={styles.heroBadgeRow}>
              <View style={styles.heroBadge}>
                <Ionicons name="shield-checkmark" size={11} color={WHITE} />
                <Text style={styles.heroBadgeTxt}>Verified Service</Text>
              </View>
              <View style={styles.heroBadge}>
                <Ionicons name="people" size={11} color={WHITE} />
                <Text style={styles.heroBadgeTxt}>500+ Served</Text>
              </View>
            </View>
          </View>

          <View style={styles.heroRight}>
            <View style={styles.heroIconRing}>
              <Ionicons name="airplane" size={36} color={WHITE} />
            </View>
            <Text style={styles.heroCities}>GZ · YW · SH</Text>
          </View>
        </LinearGradient>

        {/* ── How It Works ── */}
        <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
        <View style={styles.stepsCard}>
          {STEPS.map((step, i) => (
            <View key={step.num}>
              <View style={styles.stepRow}>
                <View style={styles.stepLeftCol}>
                  <LinearGradient colors={[BRAND, TEAL]} style={styles.stepNumCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Text style={styles.stepNumTxt}>{step.num}</Text>
                  </LinearGradient>
                  {i < STEPS.length - 1 && <View style={styles.stepLine} />}
                </View>
                <View style={styles.stepBody}>
                  <View style={styles.stepTitleRow}>
                    <Ionicons name={step.icon} size={15} color={TEAL} style={{ marginRight: 6 }} />
                    <Text style={styles.stepTitle}>{step.title}</Text>
                  </View>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* ── Services Slider ── */}
        <Text style={styles.sectionLabel}>WHAT'S INCLUDED</Text>
        <FlatList
          ref={flatRef}
          data={SERVICES}
          keyExtractor={s => s.label}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={SLIDE_W + 12}
          decelerationRate="fast"
          contentContainerStyle={styles.svcList}
          renderItem={({ item }) => <ServiceSlide item={item} />}
        />

        {/* ── Cities ── */}
        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>CITIES COVERED</Text>
        <View style={styles.citiesRow}>
          {['Guangzhou', 'Yiwu', 'Shanghai', 'Shenzhen'].map(city => (
            <View key={city} style={styles.cityPill}>
              <Ionicons name="location" size={12} color={TEAL} />
              <Text style={styles.cityPillTxt}>{city}</Text>
            </View>
          ))}
        </View>

        {/* ── Notice ── */}
        <View style={styles.noticeBox}>
          <Ionicons name="time-outline" size={16} color={TEAL} />
          <Text style={styles.noticeTxt}>
            Book at least <Text style={{ color: TEAL, fontFamily: 'WorkSans_700Bold' }}>48 hours</Text> before your flight for guaranteed availability.
          </Text>
        </View>

        {/* ── CTA ── */}
        <TouchableOpacity activeOpacity={0.88} style={styles.ctaBtn} onPress={() => navigation.navigate('ArrivalTripDetails')}>
          <LinearGradient colors={[BRAND, TEAL]} style={styles.ctaGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="airplane" size={19} color={WHITE} />
            <Text style={styles.ctaTxt}>Book Arrival Package</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.ctaSecondary} activeOpacity={0.75} onPress={() => navigation.navigate('ArrivalMyBookings')}>
          <Ionicons name="receipt-outline" size={15} color={TEAL} />
          <Text style={styles.ctaSecondaryTxt}>View My Bookings</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },

  // Header
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerCenter:{ flex: 1, alignItems: 'center' },
  headerTitle: { color: '#ffffff', fontSize: 17, fontFamily: 'ReadexPro_600SemiBold' },
  headerSub:   { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: 'WorkSans_400Regular', marginTop: 2 },

  // Hero
  hero:        { borderRadius: 20, padding: 22, flexDirection: 'row', alignItems: 'center', marginBottom: 26, overflow: 'hidden' },
  heroCircle:  { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)', right: -50, top: -50 },
  heroLeft:    { flex: 1 },
  heroTag:     { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontFamily: 'WorkSans_700Bold', letterSpacing: 1.8, marginBottom: 8 },
  heroTitle:   { color: WHITE, fontSize: 22, fontFamily: 'ReadexPro_600SemiBold', lineHeight: 30, marginBottom: 8 },
  heroSub:     { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: 'WorkSans_400Regular', lineHeight: 18, marginBottom: 14 },
  heroBadgeRow:{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  heroBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  heroBadgeTxt:{ color: WHITE, fontSize: 10, fontFamily: 'WorkSans_600SemiBold' },
  heroRight:   { alignItems: 'center', marginLeft: 14, gap: 10 },
  heroIconRing:{ width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  heroCities:  { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontFamily: 'WorkSans_600SemiBold', letterSpacing: 1 },

  // Section label
  sectionLabel: { color: MUTED, fontSize: 10, fontFamily: 'WorkSans_700Bold', letterSpacing: 1.6, marginBottom: 12 },

  // Steps
  stepsCard:     { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 20, marginBottom: 24 },
  stepRow:       { flexDirection: 'row' },
  stepLeftCol:   { width: 36, alignItems: 'center' },
  stepNumCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  stepNumTxt:    { color: WHITE, fontSize: 11, fontFamily: 'WorkSans_700Bold' },
  stepLine:      { flex: 1, width: 2, backgroundColor: BORDER, marginVertical: 6, minHeight: 28 },
  stepBody:      { flex: 1, paddingLeft: 12, paddingBottom: 20 },
  stepTitleRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  stepTitle:     { color: BRAND, fontSize: 14, fontFamily: 'WorkSans_600SemiBold' },
  stepDesc:      { color: MUTED, fontSize: 12.5, fontFamily: 'WorkSans_400Regular', lineHeight: 18 },

  // Services slider
  svcList: { paddingLeft: 0, paddingRight: 16, gap: 12 },
  svcCard: {
    width: SLIDE_W,
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    gap: 10,
  },
  svcIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  svcLabel:   { color: BRAND, fontSize: 15, fontFamily: 'WorkSans_600SemiBold' },
  svcDesc:    { color: MUTED, fontSize: 13, fontFamily: 'WorkSans_400Regular', lineHeight: 19 },

  // Cities
  citiesRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  cityPill:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 7 },
  cityPillTxt:{ color: BRAND, fontSize: 12.5, fontFamily: 'WorkSans_500Medium' },

  // Notice
  noticeBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: TEAL + '0d', borderRadius: 12, borderWidth: 1, borderColor: TEAL + '2a', padding: 14, marginBottom: 20 },
  noticeTxt: { flex: 1, color: BRAND, fontSize: 12.5, fontFamily: 'WorkSans_400Regular', lineHeight: 18 },

  // CTA
  ctaBtn:         { marginBottom: 12 },
  ctaGrad:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 15, paddingVertical: 17 },
  ctaTxt:         { color: WHITE, fontSize: 16, fontFamily: 'WorkSans_700Bold' },
  ctaSecondary:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 13, paddingVertical: 14, borderWidth: 1, borderColor: TEAL + '44', backgroundColor: TEAL + '0a' },
  ctaSecondaryTxt:{ color: TEAL, fontSize: 14, fontFamily: 'WorkSans_600SemiBold' },
});
