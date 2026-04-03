import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const BG      = '#070d1a';
const CARD    = '#0f1a2e';
const BORDER  = '#1e2d45';
const GOLD    = '#c9a84c';
const GOLD_LT = '#e8c87a';
const MUTED   = '#6b7f95';
const WHITE   = '#f5f6fa';
const ACCENT  = '#3b82f6';

const { width: W } = Dimensions.get('window');

const WAREHOUSES = [
  {
    id: 'gz',
    name: 'Guangzhou Main Hub',
    city: 'Guangzhou',
    address: 'Building 7, Haizhu District, Guangzhou',
    contact: 'David Chen',
    phone: '+86 138 0000 1234',
    wechat: 'hafrik_gzw',
    hours: 'Mon–Sat  9am – 6pm',
    handling: '¥8 / kg',
    storage: '¥15 / day',
  },
  {
    id: 'yw',
    name: 'Yiwu Branch',
    city: 'Yiwu City',
    address: 'Futian Market Area, Yiwu City',
    contact: 'Sarah Li',
    phone: '+86 152 0000 5678',
    wechat: 'hafrik_yw',
    hours: 'Mon–Sat  8am – 7pm',
    handling: '¥9 / kg',
    storage: null,
  },
];

const STEPS = [
  { n: 1, title: 'Contact our agents',          desc: 'Reach us on WhatsApp or the app to notify us of incoming goods.' },
  { n: 2, title: 'Label your packages',         desc: 'Your supplier must label boxes with your Hafrik client code.' },
  { n: 3, title: 'Supplier ships to warehouse', desc: 'Supplier delivers directly to the warehouse address.' },
  { n: 4, title: 'We receive & inspect',        desc: 'Our team logs the goods and sends you a photo confirmation.' },
  { n: 5, title: 'Consolidation & packing',     desc: 'Multiple orders are combined into one shipment to save costs.' },
  { n: 6, title: 'Shipping to your country',    desc: 'Choose sea or air freight. Goods are dispatched within 2–5 days.' },
];

const PRICING_ROWS = [
  { label: 'Consolidation fee',  value: '¥5 per consignment' },
  { label: 'Repacking',          value: '¥10 per box'       },
  { label: 'Storage per day',    value: '¥15 (Guangzhou)'   },
  { label: 'Photo inspection',   value: 'Free'              },
  { label: 'Labelling service',  value: '¥3 per box'       },
];

const InfoRow = memo(({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={14} color={GOLD} style={{ width: 20 }} />
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
));

const WarehouseCard = memo(({ wh }) => (
  <View style={styles.warehouseCard}>
    <LinearGradient colors={['#162440', '#0f1a2e']} style={styles.warehouseCardHeader}>
      <View>
        <Text style={styles.whName}>{wh.name}</Text>
        <View style={styles.whCityRow}>
          <Ionicons name="location" size={12} color={MUTED} />
          <Text style={styles.whCity}>{wh.city}, China</Text>
        </View>
      </View>
      <View style={styles.whBadge}>
        <Ionicons name="business" size={18} color={GOLD} />
      </View>
    </LinearGradient>

    <View style={styles.warehouseCardBody}>
      <InfoRow icon="navigate-outline"          label="Address"  value={wh.address} />
      <InfoRow icon="person-outline"            label="Contact"  value={wh.contact} />
      <InfoRow icon="call-outline"              label="Phone"    value={wh.phone} />
      <InfoRow icon="logo-wechat"               label="WeChat"   value={wh.wechat} />
      <InfoRow icon="time-outline"              label="Hours"    value={wh.hours} />
      <InfoRow icon="scale-outline"             label="Handling" value={wh.handling} />
      {wh.storage && (
        <InfoRow icon="archive-outline"         label="Storage"  value={wh.storage} />
      )}
    </View>
  </View>
));

const StepRow = memo(({ step }) => (
  <View style={styles.stepRow}>
    <View style={styles.stepNumWrap}>
      <LinearGradient colors={[GOLD, GOLD_LT]} style={styles.stepNum}>
        <Text style={styles.stepNumText}>{step.n}</Text>
      </LinearGradient>
      {step.n < 6 && <View style={styles.stepLine} />}
    </View>
    <View style={styles.stepBody}>
      <Text style={styles.stepTitle}>{step.title}</Text>
      <Text style={styles.stepDesc}>{step.desc}</Text>
    </View>
  </View>
));

export default function WarehouseInfo() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Our Warehouses</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Warehouse cards */}
        {WAREHOUSES.map(wh => <WarehouseCard key={wh.id} wh={wh} />)}

        {/* How To Send Goods */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionBar} />
          <Text style={styles.sectionTitle}>How To Send Goods</Text>
        </View>

        <View style={styles.stepsCard}>
          {STEPS.map(step => <StepRow key={step.n} step={step} />)}
        </View>

        {/* Pricing table */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionBar} />
          <Text style={styles.sectionTitle}>Pricing Table</Text>
        </View>

        <View style={styles.pricingCard}>
          {PRICING_ROWS.map((row, i) => (
            <View
              key={row.label}
              style={[
                styles.pricingRow,
                i < PRICING_ROWS.length - 1 && styles.pricingRowBorder,
              ]}
            >
              <Text style={styles.pricingLabel}>{row.label}</Text>
              <Text style={styles.pricingValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'ReadexPro_600SemiBold',
    fontSize: 17,
    color: WHITE,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  // Warehouse card
  warehouseCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    marginBottom: 16,
  },
  warehouseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  whName: {
    fontFamily: 'ReadexPro_600SemiBold',
    fontSize: 15,
    color: GOLD_LT,
    marginBottom: 4,
  },
  whCityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  whCity: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    color: MUTED,
  },
  whBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#162440',
    borderWidth: 1,
    borderColor: GOLD + '60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warehouseCardBody: {
    padding: 16,
    gap: 11,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoLabel: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    color: MUTED,
    width: 68,
  },
  infoValue: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 13,
    color: WHITE,
    flex: 1,
  },
  // Sections
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    marginTop: 6,
  },
  sectionBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: GOLD,
  },
  sectionTitle: {
    fontFamily: 'ReadexPro_600SemiBold',
    fontSize: 16,
    color: WHITE,
  },
  // Steps
  stepsCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 20,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 14,
    minHeight: 70,
  },
  stepNumWrap: {
    alignItems: 'center',
    width: 28,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  stepNumText: {
    fontFamily: 'WorkSans_700Bold',
    fontSize: 13,
    color: BG,
  },
  stepLine: {
    width: 2,
    flex: 1,
    backgroundColor: BORDER,
    marginTop: 4,
    marginBottom: -4,
  },
  stepBody: {
    flex: 1,
    paddingBottom: 16,
  },
  stepTitle: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 14,
    color: WHITE,
    marginBottom: 4,
    marginTop: 4,
  },
  stepDesc: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    color: MUTED,
    lineHeight: 19,
  },
  // Pricing
  pricingCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    marginBottom: 20,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pricingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  pricingLabel: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    color: MUTED,
  },
  pricingValue: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 13,
    color: GOLD_LT,
  },
});
