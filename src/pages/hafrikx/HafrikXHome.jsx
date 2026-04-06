import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const { width: W } = Dimensions.get('window');

// ─── HafrikX colour palette ───────────────────────────────────────────────────
const BG      = '#070d1a';
const CARD    = '#0f1a2e';
const BORDER  = '#1e2d45';
const GOLD    = '#c9a84c';
const GOLD_LT = '#e8c87a';
const MUTED   = '#6b7f95';
const WHITE   = '#f5f6fa';

// ─── Feature cards data ───────────────────────────────────────────────────────
const PRIMARY_FEATURES = [
  {
    id: 'currency',
    screen: 'HafrikXCurrency',
    title: 'Exchange to RMB',
    desc: 'Convert your currency to Chinese Yuan',
    icon: 'swap-horizontal',
    grad: ['#c9a84c', '#a07830'],
  },
  {
    id: 'suppliers',
    screen: 'HafrikXSuppliers',
    title: 'Get Suppliers',
    desc: 'Verified manufacturers & wholesalers',
    icon: 'business',
    grad: ['#3b82f6', '#1d4ed8'],
  },
  {
    id: 'request',
    screen: 'HafrikXRequest',
    title: 'Request Product',
    desc: 'Tell us what you need, we source it',
    icon: 'cube',
    grad: ['#10b981', '#047857'],
  },
  {
    id: 'track',
    screen: 'HafrikXTrack',
    title: 'Track Shipping',
    desc: 'Real-time shipment tracking',
    icon: 'navigate',
    grad: ['#f59e0b', '#d97706'],
  },
  {
    id: 'warehouses',
    screen: 'HafrikXWarehouses',
    title: 'Warehouses',
    desc: 'Guangzhou & Yiwu storage hubs',
    icon: 'storefront',
    grad: ['#8b5cf6', '#6d28d9'],
  },
  {
    id: 'learn',
    screen: 'HafrikXLearn',
    title: 'Learn Importing',
    desc: 'Free courses — Hafrik Academy',
    icon: 'school',
    grad: ['#ef4444', '#dc2626'],
  },
  {
    id: 'visa',
    screen: 'HafrikXVisa',
    title: 'Visa & Admission',
    desc: 'Travel, school & business processing',
    icon: 'airplane',
    grad: ['#06b6d4', '#0e7490'],
  },
  {
    id: 'orders',
    screen: 'HafrikXMyOrders',
    title: 'My Orders',
    desc: 'Track and manage your orders',
    icon: 'receipt',
    grad: ['#c9a84c', '#a07830'],
  },
];

const ACTIVITY_ITEMS = [
  { id: 'shipments', screen: 'HafrikXMyShipments', title: 'My Shipments', icon: 'cube-outline', count: '2 active' },
  { id: 'requests',  screen: 'HafrikXMyRequests',  title: 'My Requests',  icon: 'clipboard-outline', count: '1 pending' },
];

// ─── Feature Card (2-col grid) ────────────────────────────────────────────────
const FeatureCard = ({ item, onPress }) => (
  <TouchableOpacity
    style={styles.featureCard}
    activeOpacity={0.82}
    onPress={() => onPress(item.screen)}
  >
    <LinearGradient
      colors={item.grad}
      style={styles.featureIcon}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Ionicons name={item.icon} size={22} color={WHITE} />
    </LinearGradient>
    <Text style={styles.featureTitle}>{item.title}</Text>
    <Text style={styles.featureDesc} numberOfLines={2}>{item.desc}</Text>
    <View style={styles.featureArrow}>
      <Ionicons name="arrow-forward" size={13} color={GOLD} />
    </View>
  </TouchableOpacity>
);

// ─── Activity Row ─────────────────────────────────────────────────────────────
const ActivityRow = ({ item, onPress }) => (
  <TouchableOpacity
    style={styles.actRow}
    activeOpacity={0.8}
    onPress={() => onPress(item.screen)}
  >
    <View style={styles.actIcon}>
      <Ionicons name={item.icon} size={18} color={GOLD} />
    </View>
    <Text style={styles.actTitle}>{item.title}</Text>
    <View style={styles.actBadge}>
      <Text style={styles.actBadgeTxt}>{item.count}</Text>
    </View>
    <Ionicons name="chevron-forward" size={15} color={MUTED} />
  </TouchableOpacity>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const HafrikXHome = () => {
  const navigation = useNavigation();
  const { top } = useSafeAreaInsets();

  const go = useCallback((screen) => {
    navigation.navigate(screen);
  }, [navigation]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <LinearGradient
        colors={['#0a1428', BG]}
        style={[styles.header, { paddingTop: top + 12 }]}
      >
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero banner ── */}
        <LinearGradient
          colors={['#0f1f3d', '#1a2e4a']}
          style={styles.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroLeft}>
            <Text style={styles.heroTag}>HAFRIK IMPORT HUB</Text>
            <Text style={styles.heroTitle}>Source from{'\n'}China with ease</Text>
            <Text style={styles.heroSub}>Suppliers · Shipping · Support</Text>
          </View>
          <View style={styles.heroIcon}>
            <Ionicons name="globe" size={54} color={GOLD + '40'} />
          </View>
        </LinearGradient>

        {/* ── Feature grid ── */}
        <Text style={styles.sectionTitle}>Services</Text>
        <View style={styles.grid}>
          {PRIMARY_FEATURES.map((item) => (
            <FeatureCard key={item.id} item={item} onPress={go} />
          ))}
        </View>

        {/* ── My Activity ── */}
        <Text style={styles.sectionTitle}>My Activity</Text>
        <View style={styles.actCard}>
          {ACTIVITY_ITEMS.map((item, i) => (
            <View key={item.id}>
              {i > 0 && <View style={styles.actDivider} />}
              <ActivityRow item={item} onPress={go} />
            </View>
          ))}
        </View>

        {/* ── Support strip ── */}
        <LinearGradient colors={['#1a2030', '#0f1424']} style={styles.supportStrip}>
          <Ionicons name="chatbubbles-outline" size={22} color={GOLD} />
          <View style={styles.supportText}>
            <Text style={styles.supportTitle}>Need help importing?</Text>
            <Text style={styles.supportSub}>Chat with our agents 24/7</Text>
          </View>
          <TouchableOpacity style={styles.supportBtn} activeOpacity={0.8}>
            <Text style={styles.supportBtnTxt}>Chat</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
};

const CARD_W = (W - 14 * 2 - 10) / 2;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: WHITE + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  xBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xBadgeTxt: {
    color: '#000',
    fontSize: 18,
    fontFamily: 'WorkSans_700Bold',
    letterSpacing: -1,
  },
  headerTitle: {
    color: WHITE,
    fontSize: 18,
    fontFamily: 'ReadexPro_600SemiBold',
    letterSpacing: -0.3,
  },
  headerSub: {
    color: MUTED,
    fontSize: 11,
    fontFamily: 'WorkSans_400Regular',
    marginTop: 1,
  },
  notifBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: WHITE + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // ── Hero ──
  hero: {
    margin: 14,
    borderRadius: 20,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  heroLeft: { flex: 1 },
  heroTag: {
    color: GOLD,
    fontSize: 10,
    fontFamily: 'WorkSans_700Bold',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  heroTitle: {
    color: WHITE,
    fontSize: 22,
    fontFamily: 'ReadexPro_600SemiBold',
    lineHeight: 30,
    marginBottom: 8,
  },
  heroSub: {
    color: MUTED,
    fontSize: 12,
    fontFamily: 'WorkSans_400Regular',
  },
  heroIcon: {
    marginLeft: 10,
  },

  // ── Section title ──
  sectionTitle: {
    color: MUTED,
    fontSize: 11,
    fontFamily: 'WorkSans_700Bold',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 4,
  },

  // ── Feature grid ──
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 20,
  },
  featureCard: {
    width: CARD_W,
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    minHeight: 140,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    color: WHITE,
    fontSize: 13.5,
    fontFamily: 'ReadexPro_600SemiBold',
    marginBottom: 4,
    lineHeight: 18,
  },
  featureDesc: {
    color: MUTED,
    fontSize: 11,
    fontFamily: 'WorkSans_400Regular',
    lineHeight: 15,
    flex: 1,
  },
  featureArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: GOLD + '18',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginTop: 10,
  },

  // ── Activity ──
  actCard: {
    backgroundColor: CARD,
    marginHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    marginBottom: 20,
  },
  actRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    gap: 12,
  },
  actIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: GOLD + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actTitle: {
    flex: 1,
    color: WHITE,
    fontSize: 13.5,
    fontFamily: 'WorkSans_600SemiBold',
  },
  actBadge: {
    backgroundColor: GOLD + '18',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  actBadgeTxt: {
    color: GOLD,
    fontSize: 11,
    fontFamily: 'WorkSans_600SemiBold',
  },
  actDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginHorizontal: 16,
  },

  // ── Support strip ──
  supportStrip: {
    marginHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  supportText: { flex: 1 },
  supportTitle: {
    color: WHITE,
    fontSize: 13.5,
    fontFamily: 'WorkSans_600SemiBold',
  },
  supportSub: {
    color: MUTED,
    fontSize: 11.5,
    fontFamily: 'WorkSans_400Regular',
    marginTop: 2,
  },
  supportBtn: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  supportBtnTxt: {
    color: '#000',
    fontSize: 13,
    fontFamily: 'WorkSans_700Bold',
  },
});

export default HafrikXHome;
