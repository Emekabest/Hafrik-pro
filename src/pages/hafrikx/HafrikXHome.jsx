import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, Dimensions, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../theme/colors';

const { width: W } = Dimensions.get('window');

// ── Hafrik brand colors ────────────────────────────────────────────────────────
const BG     = Colors.background;       // #f7fff7
const BRAND  = Colors.primaryDark;      // #0c3f44
const TEAL   = Colors.primary;          // #1f8e93
const CARD   = Colors.white;
const BORDER = Colors.borderSoft;       // #e4eeef
const MUTED  = Colors.mutedText;        // #5f6b6d
const WHITE  = Colors.white;

// ── Slider features ────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: 'arrival',
    screen: 'ArrivalConcierge',
    title: 'Arrival Concierge',
    desc: 'Airport pickup, hotel, SIM card & market guide — all sorted before you land.',
    icon: 'airplane',
    grad: ['#c9a84c', '#8a6820'],
    tag: 'PREMIUM',
  },
  {
    id: 'exchange',
    screen: 'HafrikXCurrency',
    title: 'Exchange to RMB',
    desc: 'Send money to China. Manual order system with live rates and bank transfer.',
    icon: 'swap-horizontal',
    grad: [TEAL, BRAND],
    tag: 'LIVE RATES',
  },
  {
    id: 'suppliers',
    screen: 'HafrikXSuppliers',
    title: 'Find Suppliers',
    desc: 'Browse verified manufacturers and wholesalers across Guangzhou & Yiwu.',
    icon: 'business',
    grad: ['#3b82f6', '#1d4ed8'],
    tag: 'VERIFIED',
  },
  {
    id: 'request',
    screen: 'HafrikXRequest',
    title: 'Request Product',
    desc: 'Tell us what you need and we source it from the best supplier for you.',
    icon: 'cube',
    grad: ['#10b981', '#047857'],
    tag: 'FREE',
  },
  {
    id: 'track',
    screen: 'HafrikXTrack',
    title: 'Track Shipment',
    desc: 'Real-time tracking of your goods from China to your doorstep.',
    icon: 'navigate',
    grad: ['#f59e0b', '#d97706'],
    tag: 'LIVE',
  },
  {
    id: 'warehouse',
    screen: 'HafrikXWarehouses',
    title: 'Warehouses',
    desc: 'Store your goods at our Guangzhou and Yiwu warehouse hubs before shipping.',
    icon: 'storefront',
    grad: ['#8b5cf6', '#6d28d9'],
    tag: 'GZ · YW',
  },
  {
    id: 'learn',
    screen: 'HafrikXLearn',
    title: 'Learn Importing',
    desc: 'Free and premium courses from Hafrik Academy — from beginner to expert.',
    icon: 'school',
    grad: ['#ef4444', '#dc2626'],
    tag: 'FREE COURSES',
  },
  {
    id: 'visa',
    screen: 'HafrikXVisa',
    title: 'Visa & Services',
    desc: 'China travel visa, business visa, school admissions and document services.',
    icon: 'document-text',
    grad: ['#06b6d4', '#0e7490'],
    tag: 'FAST',
  },
];

// ── Quick links (5 per row) ────────────────────────────────────────────────────
const QUICK_ROW_1 = [
  { id: 'arrive',   screen: 'ArrivalConcierge', label: 'Arrive',    icon: 'airplane',        color: '#c9a84c' },
  { id: 'exchange', screen: 'HafrikXCurrency',  label: 'Exchange',  icon: 'swap-horizontal', color: TEAL      },
  { id: 'supplier', screen: 'HafrikXSuppliers', label: 'Suppliers', icon: 'business',        color: '#3b82f6' },
  { id: 'request',  screen: 'HafrikXRequest',   label: 'Request',   icon: 'cube',            color: '#10b981' },
  { id: 'track',    screen: 'HafrikXTrack',     label: 'Track',     icon: 'navigate',        color: '#f59e0b' },
];
const QUICK_ROW_2 = [
  { id: 'warehouse', screen: 'HafrikXWarehouses', label: 'Warehouse', icon: 'storefront',    color: '#8b5cf6' },
  { id: 'learn',     screen: 'HafrikXLearn',      label: 'Learn',     icon: 'school',        color: '#ef4444' },
  { id: 'visa',      screen: 'HafrikXVisa',        label: 'Services',  icon: 'document-text', color: '#06b6d4' },
  { id: 'cityguide', screen: 'CityGuide',           label: 'City Guide',icon: 'map',           color: TEAL      },
  { id: 'orders',    screen: 'HafrikXMyOrders',    label: 'My Orders', icon: 'receipt',       color: BRAND     },
];

const ACTIVITY_ITEMS = [
  { id: 'arrivals',  screen: 'ArrivalMyBookings',  title: 'My Arrivals',  icon: 'airplane-outline',  count: '1 active'  },
  { id: 'shipments', screen: 'HafrikXMyShipments', title: 'My Shipments', icon: 'cube-outline',      count: '2 active'  },
  { id: 'requests',  screen: 'HafrikXMyRequests',  title: 'My Requests',  icon: 'clipboard-outline', count: '1 pending' },
];

const SLIDE_W = W - 32;

// ── Feature Slide ──────────────────────────────────────────────────────────────
const FeatureSlide = ({ item, onPress }) => (
  <View style={styles.slide}>
    <LinearGradient colors={[BRAND, TEAL]} style={styles.slideCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      {/* decorative circle */}
      <View style={styles.slideCircle} />

      <View style={styles.slideTop}>
        <LinearGradient colors={item.grad} style={styles.slideIconBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Ionicons name={item.icon} size={26} color={WHITE} />
        </LinearGradient>
        <View style={styles.slideTag}>
          <Text style={styles.slideTagTxt}>{item.tag}</Text>
        </View>
      </View>

      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideDesc}>{item.desc}</Text>

      <TouchableOpacity style={styles.slideBtn} activeOpacity={0.85} onPress={() => onPress(item.screen)}>
        <Text style={styles.slideBtnTxt}>Open</Text>
        <Ionicons name="arrow-forward" size={14} color={BRAND} />
      </TouchableOpacity>
    </LinearGradient>
  </View>
);

// ── Quick Link Item ────────────────────────────────────────────────────────────
const QuickItem = ({ item, onPress }) => (
  <TouchableOpacity style={styles.qlItem} activeOpacity={0.75} onPress={() => onPress(item.screen)}>
    <View style={[styles.qlIcon, { backgroundColor: item.color + '18', borderColor: item.color + '30' }]}>
      <Ionicons name={item.icon} size={20} color={item.color} />
    </View>
    <Text style={styles.qlLabel} numberOfLines={1}>{item.label}</Text>
  </TouchableOpacity>
);

// ── Activity Row ──────────────────────────────────────────────────────────────
const ActivityRow = ({ item, onPress }) => (
  <TouchableOpacity style={styles.actRow} activeOpacity={0.8} onPress={() => onPress(item.screen)}>
    <View style={styles.actIcon}>
      <Ionicons name={item.icon} size={18} color={TEAL} />
    </View>
    <Text style={styles.actTitle}>{item.title}</Text>
    <View style={styles.actBadge}>
      <Text style={styles.actBadgeTxt}>{item.count}</Text>
    </View>
    <Ionicons name="chevron-forward" size={15} color={MUTED} />
  </TouchableOpacity>
);

// ── Main ──────────────────────────────────────────────────────────────────────
const HafrikXHome = () => {
  const navigation = useNavigation();
  const { top }    = useSafeAreaInsets();
  const flatRef    = useRef(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const go = useCallback((screen) => navigation.navigate(screen), [navigation]);

  const onScroll = useCallback((e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / (SLIDE_W + 16));
    setActiveSlide(Math.max(0, Math.min(idx, SLIDES.length - 1)));
  }, []);

  // Auto-advance slider every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide(prev => {
        const next = (prev + 1) % SLIDES.length;
        flatRef.current?.scrollToOffset({ offset: next * (SLIDE_W + 16), animated: true });
        return next;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      {/* ── Header ── */}
      <LinearGradient colors={[BRAND, TEAL]} style={[styles.header, { paddingTop: top + 10 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={21} color={WHITE} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.xBadge}>
            <Text style={styles.xBadgeTxt}>X</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>HafrikX</Text>
            <Text style={styles.headerSub}>Your China Import Hub</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.notifBtn} activeOpacity={0.8}>
          <Ionicons name="notifications-outline" size={21} color={WHITE} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Feature Slider ── */}
        <Text style={styles.sectionLabel}>EXPLORE SERVICES</Text>
        <FlatList
          ref={flatRef}
          data={SLIDES}
          keyExtractor={i => i.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          renderItem={({ item }) => <FeatureSlide item={item} onPress={go} />}
          snapToInterval={SLIDE_W + 16}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
        />

        {/* Pagination dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeSlide && styles.dotActive]} />
          ))}
        </View>

        {/* ── Quick Links ── */}
        <Text style={styles.sectionLabel}>QUICK ACCESS</Text>
        <View style={styles.qlCard}>
          <View style={styles.qlRow}>
            {QUICK_ROW_1.map(item => <QuickItem key={item.id} item={item} onPress={go} />)}
          </View>
          <View style={styles.qlDivider} />
          <View style={styles.qlRow}>
            {QUICK_ROW_2.map(item => <QuickItem key={item.id} item={item} onPress={go} />)}
          </View>
        </View>

        {/* ── My Activity ── */}
        <Text style={styles.sectionLabel}>MY ACTIVITY</Text>
        <View style={styles.actCard}>
          {ACTIVITY_ITEMS.map((item, i) => (
            <View key={item.id}>
              {i > 0 && <View style={styles.actDivider} />}
              <ActivityRow item={item} onPress={go} />
            </View>
          ))}
        </View>

        {/* ── Support ── */}
        <TouchableOpacity activeOpacity={0.85}>
          <LinearGradient colors={[BRAND, TEAL]} style={styles.supportCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="chatbubbles-outline" size={24} color={WHITE} />
            <View style={{ flex: 1 }}>
              <Text style={styles.supportTitle}>Need help importing?</Text>
              <Text style={styles.supportSub}>Chat with our agents 24/7</Text>
            </View>
            <View style={styles.supportBtn}>
              <Text style={styles.supportBtnTxt}>Chat</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 36 }} />
      </ScrollView>
    </View>
  );
};

const QL_ITEM_W = (W - 32 - 16) / 5;

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // Header
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14 },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerCenter:{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  xBadge:      { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  xBadgeTxt:   { color: WHITE, fontSize: 16, fontFamily: 'WorkSans_700Bold', letterSpacing: -0.5 },
  headerTitle: { color: WHITE, fontSize: 17, fontFamily: 'ReadexPro_600SemiBold' },
  headerSub:   { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: 'WorkSans_400Regular', marginTop: 1 },
  notifBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  // Section label
  sectionLabel: { color: MUTED, fontSize: 10, fontFamily: 'WorkSans_700Bold', letterSpacing: 1.6, paddingHorizontal: 16, marginTop: 20, marginBottom: 10 },

  // Slider
  slide:        { width: SLIDE_W },
  slideCard:    { borderRadius: 20, padding: 22, overflow: 'hidden', minHeight: 200 },
  slideCircle:  { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)', right: -60, top: -60 },
  slideTop:     { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  slideIconBox: { width: 52, height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  slideTag:     { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  slideTagTxt:  { color: WHITE, fontSize: 9.5, fontFamily: 'WorkSans_700Bold', letterSpacing: 1 },
  slideTitle:   { color: WHITE, fontSize: 20, fontFamily: 'ReadexPro_600SemiBold', marginBottom: 8 },
  slideDesc:    { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontFamily: 'WorkSans_400Regular', lineHeight: 19, marginBottom: 18 },
  slideBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: WHITE, borderRadius: 20, alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8 },
  slideBtnTxt:  { color: BRAND, fontSize: 13, fontFamily: 'WorkSans_700Bold' },

  // Dots
  dots:     { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 12 },
  dot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: BORDER },
  dotActive:{ width: 18, height: 6, borderRadius: 3, backgroundColor: TEAL },

  // Quick links
  qlCard:    { backgroundColor: CARD, marginHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: BORDER, paddingVertical: 16, paddingHorizontal: 8 },
  qlRow:     { flexDirection: 'row', justifyContent: 'space-between' },
  qlDivider: { height: 1, backgroundColor: BORDER, marginVertical: 14, marginHorizontal: 4 },
  qlItem:    { width: QL_ITEM_W, alignItems: 'center', gap: 6 },
  qlIcon:    { width: 44, height: 44, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  qlLabel:   { color: BRAND, fontSize: 9.5, fontFamily: 'WorkSans_600SemiBold', textAlign: 'center' },

  // Activity
  actCard:    { backgroundColor: CARD, marginHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  actRow:     { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 12 },
  actIcon:    { width: 36, height: 36, borderRadius: 10, backgroundColor: TEAL + '14', alignItems: 'center', justifyContent: 'center' },
  actTitle:   { flex: 1, color: BRAND, fontSize: 13.5, fontFamily: 'WorkSans_600SemiBold' },
  actBadge:   { backgroundColor: TEAL + '14', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  actBadgeTxt:{ color: TEAL, fontSize: 11, fontFamily: 'WorkSans_600SemiBold' },
  actDivider: { height: 1, backgroundColor: BORDER, marginHorizontal: 16 },

  // Support
  supportCard:  { marginHorizontal: 16, marginTop: 20, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  supportTitle: { color: WHITE, fontSize: 14, fontFamily: 'WorkSans_600SemiBold' },
  supportSub:   { color: 'rgba(255,255,255,0.7)', fontSize: 11.5, fontFamily: 'WorkSans_400Regular', marginTop: 2 },
  supportBtn:   { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  supportBtnTxt:{ color: WHITE, fontSize: 13, fontFamily: 'WorkSans_700Bold' },
});

export default HafrikXHome;
