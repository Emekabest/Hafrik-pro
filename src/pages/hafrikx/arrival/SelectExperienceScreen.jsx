/**
 * Arrival Concierge — Screen 1: Select Experience
 */
import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, StatusBar, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const { width: W } = Dimensions.get('window');

const BG     = '#f7fff7';
const CARD   = '#ffffff';
const BORDER = '#e4eeef';
const GOLD   = '#c9a84c';
const GOLD_LT= '#e8c87a';
const MUTED  = '#5f6b6d';
const WHITE   = '#ffffff';
const BRAND   = '#0c3f44';
const TEAL    = '#1f8e93';
const VIP_BORDER = '#c9a84c';

const EXPERIENCES = [
  {
    id: 'basic',
    icon: 'car-outline',
    label: 'Standard',
    title: 'Basic Pickup',
    desc: 'No-fuss airport pickup, clean car, direct to your hotel.',
    price: '$15',
    priceNote: 'Starting from',
    benefits: ['Meet & greet at arrivals', 'Clean sedan', 'Drop-off to hotel', 'Driver speaks basic English'],
    grad: ['#1e3a5f', '#0f2040'],
    accent: '#4a9eff',
    vip: false,
  },
  {
    id: 'business',
    icon: 'briefcase-outline',
    label: 'Business',
    title: 'Business Pickup',
    desc: 'Professional ride with name board, bottled water & Wi-Fi.',
    price: '$35',
    priceNote: 'Starting from',
    benefits: ['Name board at arrivals', 'Business-class sedan', 'Complimentary water & Wi-Fi', 'Bilingual driver'],
    grad: ['#1a2840', '#0f1e35'],
    accent: '#3b82f6',
    vip: false,
  },
  {
    id: 'vip',
    icon: 'diamond-outline',
    label: 'VIP',
    title: 'VIP Concierge',
    desc: 'Full white-glove arrival experience. You step off the plane — we handle everything else.',
    price: '$80',
    priceNote: 'Starting from',
    benefits: ['Priority meet at gate', 'Luxury Toyota Alphard', 'Luggage handling', 'Bilingual personal assistant', 'Hotel check-in support'],
    grad: ['#2a1a00', '#1a1000'],
    accent: GOLD,
    vip: true,
  },
  {
    id: 'trade',
    icon: 'storefront-outline',
    label: 'Trade',
    title: 'Trade Arrival Package',
    desc: 'Designed for buyers heading to markets. Includes trade orientation & translator.',
    price: '$120',
    priceNote: 'Starting from',
    benefits: ['Airport pickup & hotel drop-off', 'Market orientation session', 'Interpreter for 4 hrs', 'SIM card & pocket Wi-Fi', 'Supplier intro meeting'],
    grad: ['#1a2e20', '#0f1e14'],
    accent: '#10b981',
    vip: false,
  },
];

const ExperienceCard = ({ item, selected, onSelect, delay }) => {
  const scale   = useRef(new Animated.Value(0.95)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;
  const isSelected = selected === item.id;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, delay, tension: 90, friction: 9, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, delay, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePressIn  = () => Animated.spring(pressAnim, { toValue: 0.97, useNativeDriver: true, tension: 300, friction: 10 }).start();
  const handlePressOut = () => Animated.spring(pressAnim, { toValue: 1,    useNativeDriver: true, tension: 300, friction: 10 }).start();

  return (
    <Animated.View style={{ opacity, transform: [{ scale: Animated.multiply(scale, pressAnim) }], marginBottom: 14 }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => onSelect(item.id)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <LinearGradient
          colors={item.grad}
          style={[
            styles.expCard,
            isSelected && { borderColor: item.accent, borderWidth: 1.5 },
            item.vip && styles.vipCard,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* VIP badge */}
          {item.vip && (
            <LinearGradient colors={[GOLD, '#a07830']} style={styles.vipBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="star" size={10} color="#000" />
              <Text style={styles.vipBadgeTxt}>RECOMMENDED</Text>
            </LinearGradient>
          )}

          <View style={styles.expCardTop}>
            {/* Icon */}
            <View style={[styles.expIconWrap, { backgroundColor: item.accent + '22', borderColor: item.accent + '44' }]}>
              <Ionicons name={item.icon} size={22} color={item.accent} />
            </View>

            {/* Label + Title */}
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.expLabel, { color: item.accent }]}>{item.label}</Text>
              <Text style={styles.expTitle}>{item.title}</Text>
            </View>

            {/* Price */}
            <View style={styles.priceBlock}>
              <Text style={styles.priceNote}>{item.priceNote}</Text>
              <Text style={[styles.price, { color: item.accent }]}>{item.price}</Text>
            </View>
          </View>

          <Text style={styles.expDesc}>{item.desc}</Text>

          <View style={styles.divider} />

          {/* Benefits */}
          {item.benefits.map((b, i) => (
            <View key={i} style={styles.benefit}>
              <Ionicons name="checkmark-circle" size={15} color={item.accent} />
              <Text style={styles.benefitTxt}>{b}</Text>
            </View>
          ))}

          {/* Select indicator */}
          <View style={styles.selectRow}>
            <View style={[styles.radioOuter, { borderColor: item.accent }]}>
              {isSelected && <View style={[styles.radioInner, { backgroundColor: item.accent }]} />}
            </View>
            <Text style={[styles.selectTxt, { color: isSelected ? item.accent : MUTED }]}>
              {isSelected ? 'Selected' : 'Select this experience'}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function SelectExperienceScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState(null);

  const headerY = useRef(new Animated.Value(-20)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerY,       { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleContinue = () => {
    if (!selected) return;
    const exp = EXPERIENCES.find(e => e.id === selected);
    navigation.navigate('ArrivalTripDetails', { experience: exp });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0c3f44" translucent={false} />

      {/* Header */}
      <LinearGradient
        colors={["#0c3f44", "#1a5a60"]}
        style={[styles.header, { paddingTop: insets.top + 14 }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <View style={styles.conciergeTag}>
          <Ionicons name="airplane" size={12} color={GOLD} />
          <Text style={styles.conciergeTagTxt}>Arrival Concierge</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>

        {/* Hero text */}
        <Animated.View style={[styles.heroSection, { opacity: headerOpacity, transform: [{ translateY: headerY }] }]}>
          <Text style={styles.heroEmoji}>🇨🇳</Text>
          <Text style={styles.heroTitle}>Welcome to China</Text>
          <Text style={styles.heroSub}>Your arrival, handled professionally.</Text>
          <View style={styles.heroLine} />
        </Animated.View>

        <Text style={styles.sectionLabel}>SELECT YOUR EXPERIENCE</Text>

        {EXPERIENCES.map((item, i) => (
          <ExperienceCard
            key={item.id}
            item={item}
            selected={selected}
            onSelect={setSelected}
            delay={i * 80}
          />
        ))}
      </ScrollView>

      {/* CTA */}
      <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          onPress={handleContinue}
          activeOpacity={selected ? 0.85 : 1}
          disabled={!selected}
          style={{ borderRadius: 16, overflow: 'hidden' }}
        >
          <LinearGradient
            colors={selected ? [GOLD, '#a07830'] : ['#e4eeef', '#e4eeef']}
            style={styles.ctaBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="arrow-forward-circle" size={20} color={selected ? '#000' : MUTED} />
            <Text style={[styles.ctaTxt, { color: selected ? '#000' : MUTED }]}>Select Experience</Text>
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
  conciergeTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: GOLD + '18',
    borderWidth: 1, borderColor: GOLD + '30',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  conciergeTagTxt: { color: GOLD, fontSize: 11, fontFamily: 'WorkSans_700Bold', letterSpacing: 0.5 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 14, paddingTop: 4 },

  heroSection: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  heroEmoji: { fontSize: 40, marginBottom: 4 },
  heroTitle: { color: BRAND, fontSize: 24, fontFamily: 'ReadexPro_700Bold', letterSpacing: -0.5, textAlign: 'center' },
  heroSub: { color: MUTED, fontSize: 14, fontFamily: 'WorkSans_400Regular', textAlign: 'center' },
  heroLine: { width: 48, height: 2, backgroundColor: GOLD + '60', borderRadius: 2, marginTop: 12 },

  sectionLabel: {
    color: MUTED, fontSize: 10, fontFamily: 'WorkSans_700Bold',
    letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 16, marginTop: 4,
  },

  // Experience card
  expCard: {
    borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden',
  },
  vipCard: {
    borderColor: VIP_BORDER + '60',
  },
  vipBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 14,
  },
  vipBadgeTxt: { color: '#000', fontSize: 9, fontFamily: 'WorkSans_700Bold', letterSpacing: 1.2 },

  expCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  expIconWrap: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  expLabel: { fontSize: 10, fontFamily: 'WorkSans_700Bold', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 },
  expTitle: { color: BRAND, fontSize: 16, fontFamily: 'ReadexPro_600SemiBold' },

  priceBlock: { alignItems: 'flex-end' },
  priceNote: { color: MUTED, fontSize: 9, fontFamily: 'WorkSans_400Regular', marginBottom: 1 },
  price: { fontSize: 22, fontFamily: 'ReadexPro_700Bold', letterSpacing: -0.5 },

  expDesc: { color: MUTED, fontSize: 12.5, fontFamily: 'WorkSans_400Regular', lineHeight: 18, marginBottom: 14 },

  divider: { height: 1, backgroundColor: BORDER, marginBottom: 12 },

  benefit: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  benefitTxt: { color: WHITE + 'cc', fontSize: 12.5, fontFamily: 'WorkSans_400Regular', flex: 1 },

  selectRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  radioOuter: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 9, height: 9, borderRadius: 4.5 },
  selectTxt: { fontSize: 12, fontFamily: 'WorkSans_600SemiBold' },

  // CTA
  ctaWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: BG,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  ctaBtn: {
    height: 56, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, borderRadius: 16,
  },
  ctaTxt: { fontSize: 16, fontFamily: 'ReadexPro_600SemiBold' },
});
