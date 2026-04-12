import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const BG      = '#f7fff7';
const CARD    = '#ffffff';
const BORDER  = '#e4eeef';
const GOLD    = '#c9a84c';
const GOLD_LT = '#e8c87a';
const MUTED   = '#5f6b6d';
const WHITE   = '#ffffff';
const BRAND   = '#0c3f44';
const TEAL    = '#1f8e93';
const ACCENT  = '#3b82f6';

const { width: W } = Dimensions.get('window');

const SERVICES = [
  {
    id: '1',
    icon: 'id-card-outline',
    title: 'China Visa Processing',
    description: 'We handle your full visa application',
    processing: '5–7 days',
    price: 'From $150',
    action: 'Apply',
  },
  {
    id: '2',
    icon: 'school-outline',
    title: 'School Admission in China',
    description: 'University & college admissions',
    processing: '2–4 weeks',
    price: 'Varies',
    action: 'Apply',
  },
  {
    id: '3',
    icon: 'mail-outline',
    title: 'Business Invitation Letter',
    description: 'Official invite for business visa',
    processing: '3–5 days',
    price: 'From $80',
    action: 'Apply',
  },
  {
    id: '4',
    icon: 'ribbon-outline',
    title: 'Canton Fair Invitation',
    description: 'Official Canton Fair registration badge',
    processing: '2–3 days',
    price: 'From $60',
    action: 'Apply',
  },
  {
    id: '5',
    icon: 'car-outline',
    title: 'Airport Pickup',
    description: 'Driver meets you on arrival',
    processing: 'Instant booking',
    price: 'From $30',
    action: 'Book',
  },
  {
    id: '6',
    icon: 'language-outline',
    title: 'Translator / Interpreter',
    description: 'English-Chinese translator',
    processing: 'Per day rate',
    price: 'From $50/day',
    action: 'Book',
  },
  {
    id: '7',
    icon: 'business-outline',
    title: 'Factory Visit Arrangement',
    description: 'We organize your factory trips',
    processing: 'Varies',
    price: 'From $100',
    action: 'Book',
  },
  {
    id: '8',
    icon: 'bed-outline',
    title: 'Hotel Booking',
    description: 'Recommended hotels near markets',
    processing: 'Instant',
    price: 'Varies',
    action: 'Book',
  },
  {
    id: '9',
    icon: 'globe-outline',
    title: 'Company Registration Help',
    description: 'Register a business in China',
    processing: '2–3 weeks',
    price: 'From $500',
    action: 'Apply',
  },
  {
    id: '10',
    icon: 'map-outline',
    title: 'Tour Guide Booking',
    description: 'Experienced Hafrik city guides',
    processing: 'Per day',
    price: 'From $40/day',
    action: 'Book',
  },
];

const ServiceCard = memo(({ service }) => {
  const handlePress = useCallback(() => {
    Alert.alert(
      service.title,
      'Our team will contact you within 24 hours to discuss this service.',
      [{ text: 'OK' }],
    );
  }, [service.title]);

  return (
    <View style={styles.serviceCard}>
      {/* Icon */}
      <View style={styles.cardIconWrap}>
        <LinearGradient colors={['#e8f5f5', '#ffffff']} style={styles.cardIconGrad}>
          <Ionicons name={service.icon} size={22} color={TEAL} />
        </LinearGradient>
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        <Text style={styles.serviceTitle}>{service.title}</Text>
        <Text style={styles.serviceDesc}>{service.description}</Text>

        <View style={styles.cardMetaRow}>
          <View style={styles.cardMetaItem}>
            <Ionicons name="time-outline" size={12} color={MUTED} />
            <Text style={styles.cardMetaText}>{service.processing}</Text>
          </View>
          <View style={styles.cardMetaItem}>
            <Ionicons name="pricetag-outline" size={12} color={MUTED} />
            <Text style={styles.cardMetaText}>{service.price}</Text>
          </View>
        </View>
      </View>

      {/* Action button */}
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Text style={styles.actionBtnText}>{service.action}</Text>
      </TouchableOpacity>
    </View>
  );
});

export default function VisaServices() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0c3f44" translucent={false} />

      {/* Header */}
      <LinearGradient colors={["#0c3f44", "#1a5a60"]} style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={WHITE} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Travel & Services</Text>
          <Text style={styles.headerSub}>China Visit & Processing</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero banner */}
        <LinearGradient colors={['#e8f5f5', '#ffffff']} style={styles.heroBanner}>
          <Ionicons name="airplane" size={28} color={GOLD} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.heroTitle}>Plan Your China Trip</Text>
            <Text style={styles.heroSubtitle}>
              From visa to factory visits — we handle it all for you.
            </Text>
          </View>
        </LinearGradient>

        {/* Section label */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionBar} />
          <Text style={styles.sectionTitle}>Available Services</Text>
        </View>

        {/* Service cards */}
        {SERVICES.map(service => (
          <ServiceCard key={service.id} service={service} />
        ))}

        {/* Contact footer */}
        <View style={styles.contactCard}>
          <Ionicons name="chatbubbles-outline" size={20} color={TEAL} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.contactTitle}>Need custom assistance?</Text>
            <Text style={styles.contactSub}>
              Chat with our China team directly on WhatsApp or via the app.
            </Text>
          </View>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTextWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: { color: '#ffffff', fontSize: 17, fontFamily: 'ReadexPro_600SemiBold' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: 'WorkSans_400Regular', marginTop: 2 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: BORDER,
  },
  heroTitle: {
    fontFamily: 'WorkSans_700Bold',
    fontSize: 15,
    color: BRAND,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    color: MUTED,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: TEAL,
  },
  sectionTitle: {
    fontFamily: 'ReadexPro_600SemiBold',
    fontSize: 16,
    color: BRAND,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  cardIconWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardIconGrad: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TEAL + '40',
    borderRadius: 12,
  },
  cardBody: {
    flex: 1,
  },
  serviceTitle: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 13,
    color: BRAND,
    marginBottom: 3,
    lineHeight: 18,
  },
  serviceDesc: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    color: MUTED,
    marginBottom: 8,
  },
  cardMetaRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  cardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMetaText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 11,
    color: MUTED,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TEAL,
    alignItems: 'center',
    minWidth: 56,
    backgroundColor: TEAL + '12',
  },
  actionBtnText: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 13,
    color: TEAL,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  contactTitle: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 14,
    color: BRAND,
    marginBottom: 4,
  },
  contactSub: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    color: MUTED,
    lineHeight: 18,
  },
});
