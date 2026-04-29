import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const BG     = '#f7fff7';
const CARD   = '#ffffff';
const BORDER = '#e4eeef';
const BRAND  = '#0c3f44';
const TEAL   = '#1f8e93';
const MUTED  = '#5f6b6d';
const WHITE  = '#ffffff';

const FEATURES = [
  { icon: 'map-outline',        title: 'Market Tours',     desc: 'Guided tours of Guangzhou Canton Fair, Yiwu & Shenzhen wholesale markets.' },
  { icon: 'language-outline',   title: 'Translation',      desc: 'Our bilingual guides handle supplier negotiations in Mandarin for you.' },
  { icon: 'car-outline',        title: 'Transport',        desc: 'Private van with your guide for comfortable travel between markets.' },
  { icon: 'shield-checkmark-outline', title: 'Trusted Partners', desc: 'All tour guides are verified Hafrik partners with 5+ years of experience.' },
];

export default function TourGuideScreen() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      {/* Header */}
      <LinearGradient
        colors={[BRAND, TEAL]}
        style={[styles.header, { paddingTop: insets.top + 14 }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={21} color={WHITE} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Tour Guide</Text>
          <Text style={styles.headerSub}>China market expertise at your side</Text>
        </View>
        <View style={{ width: 38 }} />
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient
          colors={[TEAL + '22', CARD]}
          style={styles.heroBanner}
        >
          <View style={styles.heroIconWrap}>
            <Ionicons name="compass" size={36} color={TEAL} />
          </View>
          <Text style={styles.heroTitle}>Navigate China With Confidence</Text>
          <Text style={styles.heroDesc}>
            Our experienced guides take you through the right markets, handle language barriers, and help you find the best deals.
          </Text>
        </LinearGradient>

        {/* Features */}
        <Text style={styles.sectionLabel}>WHAT'S INCLUDED</Text>
        <View style={styles.featuresCard}>
          {FEATURES.map((f, i) => (
            <View key={f.title}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Ionicons name={f.icon} size={18} color={TEAL} />
                </View>
                <View style={styles.featureBody}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.ctaBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ServiceApplyScreen', {
            service_id:      'tour_guide',
            service_name:    'Tour Guide',
            description:     'Professional guided tours of China wholesale markets with translation and transport.',
            price:           'Contact us',
            processing_time: '24–48 hrs',
          })}
        >
          <Ionicons name="send-outline" size={18} color={WHITE} />
          <Text style={styles.ctaBtnTxt}>Book a Tour Guide</Text>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { color: WHITE, fontSize: 17, fontFamily: 'ReadexPro_600SemiBold' },
  headerSub:    { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: 'WorkSans_400Regular', marginTop: 2 },

  heroBanner: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TEAL + '30',
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  heroIconWrap: {
    width: 68, height: 68, borderRadius: 20,
    backgroundColor: TEAL + '18',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    color: BRAND, fontSize: 17, fontFamily: 'ReadexPro_600SemiBold',
    textAlign: 'center', marginBottom: 8,
  },
  heroDesc: {
    color: MUTED, fontSize: 13.5, fontFamily: 'WorkSans_400Regular',
    textAlign: 'center', lineHeight: 20,
  },

  sectionLabel: {
    color: MUTED, fontSize: 10,
    fontFamily: 'WorkSans_700Bold',
    letterSpacing: 1.5, marginBottom: 12,
  },

  featuresCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    gap: 14,
  },
  featureIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: TEAL + '14',
    alignItems: 'center', justifyContent: 'center',
  },
  featureBody: { flex: 1 },
  featureTitle: { color: BRAND, fontSize: 13.5, fontFamily: 'WorkSans_600SemiBold', marginBottom: 3 },
  featureDesc:  { color: MUTED, fontSize: 12.5, fontFamily: 'WorkSans_400Regular', lineHeight: 18 },
  divider:      { height: 1, backgroundColor: BORDER },

  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: BRAND,
    borderRadius: 14,
    paddingVertical: 16,
  },
  ctaBtnTxt: { color: WHITE, fontSize: 15, fontFamily: 'WorkSans_700Bold' },
});
