// src/pages/settings/AboutUsScreen.jsx
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const { width: W, height: H } = Dimensions.get('window');

// ── Palette ───────────────────────────────────────────────────────────────────
const BRAND   = '#0c3f44';
const BRAND2  = '#0a3338';
const ACCENT  = '#1f8e93';
const ACCENT2 = '#17767a';
const BG      = '#080f10';
const WHITE   = '#ffffff';
const OFF     = '#f0f4f5';
const DARK    = '#111827';
const MUTED   = '#8b9fa3';
const BORDER  = 'rgba(255,255,255,0.08)';
const GOLD    = '#f0b429';
const GREEN   = '#10b981';
const CORAL   = '#f97316';
const PURPLE  = '#8b5cf6';

// ─────────────────────────────────────────────────────────────────────────────
// Entrance animation wrapper
// ─────────────────────────────────────────────────────────────────────────────
const Reveal = ({ children, delay = 0, from = 'bottom' }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const tx      = useRef(new Animated.Value(from === 'left' ? -30 : from === 'right' ? 30 : 0)).current;
  const ty      = useRef(new Animated.Value(from === 'bottom' ? 32 : from === 'top' ? -32 : 0)).current;
  const scale   = useRef(new Animated.Value(0.97)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, delay, useNativeDriver: true }),
      Animated.spring(tx,      { toValue: 0, tension: 80, friction: 12, delay, useNativeDriver: true }),
      Animated.spring(ty,      { toValue: 0, tension: 80, friction: 12, delay, useNativeDriver: true }),
      Animated.spring(scale,   { toValue: 1, tension: 80, friction: 12, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateX: tx }, { translateY: ty }, { scale }] }}>
      {children}
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Decorative circle (background orb)
// ─────────────────────────────────────────────────────────────────────────────
const Orb = ({ size, color, top, left, right, bottom, opacity = 0.25 }) => (
  <View
    pointerEvents="none"
    style={{
      position: 'absolute',
      width: size, height: size,
      borderRadius: size / 2,
      backgroundColor: color,
      opacity,
      top, left, right, bottom,
    }}
  />
);

// ─────────────────────────────────────────────────────────────────────────────
// Stat bubble
// ─────────────────────────────────────────────────────────────────────────────
const StatBubble = ({ value, label, color, delay }) => (
  <Reveal delay={delay} from="bottom">
    <View style={[stat.wrap, { borderColor: color + '30' }]}>
      <LinearGradient colors={[color + '22', color + '08']} style={stat.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={[stat.value, { color }]}>{value}</Text>
        <Text style={stat.label}>{label}</Text>
      </LinearGradient>
    </View>
  </Reveal>
);

const stat = StyleSheet.create({
  wrap: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    flex: 1,
  },
  grad: {
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 10,
    color: MUTED,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Feature card
// ─────────────────────────────────────────────────────────────────────────────
const FeatureCard = ({ icon, title, text, gradient, delay }) => (
  <Reveal delay={delay} from="bottom">
    <View style={feat.card}>
      <LinearGradient colors={gradient} style={feat.iconCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Ionicons name={icon} size={20} color={WHITE} />
      </LinearGradient>
      <Text style={feat.title}>{title}</Text>
      <Text style={feat.text}>{text}</Text>
    </View>
  </Reveal>
);

const feat = StyleSheet.create({
  card: {
    backgroundColor: '#131e20',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: WHITE,
    letterSpacing: -0.2,
  },
  text: {
    fontSize: 12,
    color: MUTED,
    lineHeight: 18,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Pill tag
// ─────────────────────────────────────────────────────────────────────────────
const Pill = ({ icon, label, color }) => (
  <View style={[pill.wrap, { backgroundColor: color + '18', borderColor: color + '35' }]}>
    <Ionicons name={icon} size={12} color={color} />
    <Text style={[pill.text, { color }]}>{label}</Text>
  </View>
);

const pill = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  text: {
    fontSize: 11.5,
    fontWeight: '700',
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function AboutUsScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();
  const scrollY    = useRef(new Animated.Value(0)).current;

  const heroBgScale = scrollY.interpolate({
    inputRange: [-80, 0, 200],
    outputRange: [1.12, 1, 0.94],
    extrapolate: 'clamp',
  });
  const heroOpacity = scrollY.interpolate({
    inputRange: [0, 220],
    outputRange: [1, 0.3],
    extrapolate: 'clamp',
  });

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
      >
        {/* ━━━━━━━━━━━━ HERO ━━━━━━━━━━━━ */}
        <Animated.View style={[s.heroWrap, { opacity: heroOpacity }]}>
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: heroBgScale }] }]}>
            <LinearGradient
              colors={['#040b0c', BRAND2, '#0d5560', ACCENT2]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
            />
          </Animated.View>

          {/* Background orbs */}
          <Orb size={300} color={ACCENT}  top={-80}  left={-80}  opacity={0.18} />
          <Orb size={200} color={ACCENT}  top={100}  right={-60} opacity={0.12} />
          <Orb size={160} color={GOLD}    bottom={60} left={W/2 - 80} opacity={0.08} />

          {/* Back button */}
          <View style={[s.heroNav, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.8}>
              <BlurView intensity={40} tint="dark" style={s.backBlur}>
                <Ionicons name="arrow-back" size={18} color={WHITE} />
              </BlurView>
            </TouchableOpacity>
          </View>

          {/* Logo + heading */}
          <Reveal delay={60} from="bottom">
            <View style={s.heroContent}>
              <View style={s.logoRing}>
                <LinearGradient colors={[ACCENT, BRAND]} style={s.logoGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={s.logoEmoji}>🌍</Text>
                </LinearGradient>
              </View>

              <Text style={s.heroLabel}>EST. IN CHINA • GLOBAL COMMUNITY</Text>
              <Text style={s.heroTitle}>Hafrik</Text>
              <Text style={s.heroSub}>
                Community. Business.{'\n'}Opportunity.
              </Text>

              <View style={s.heroPills}>
                {[
                  { icon: 'people',   label: 'Community',    color: ACCENT },
                  { icon: 'business', label: 'Business',     color: CORAL  },
                  { icon: 'globe',    label: 'International',color: GOLD   },
                ].map(p => (
                  <Pill key={p.label} icon={p.icon} label={p.label} color={p.color} />
                ))}
              </View>
            </View>
          </Reveal>

          {/* Stats row */}
          <View style={s.statsRow}>
            <StatBubble value="🌍"     label="Global Network" color={ACCENT} delay={180} />
            <StatBubble value="50+"    label="Cities"         color={GOLD}   delay={220} />
            <StatBubble value="∞"      label="Opportunities"  color={CORAL}  delay={260} />
          </View>

          {/* Bottom fade */}
          <LinearGradient colors={['transparent', BG]} style={s.heroFade} pointerEvents="none" />
        </Animated.View>

        {/* ━━━━━━━━━━━━ BODY ━━━━━━━━━━━━ */}
        <View style={s.body}>

          {/* ── Pull quote ── */}
          <Reveal delay={120} from="bottom">
            <View style={s.quoteBlock}>
              <View style={s.quoteAccent} />
              <Text style={s.quoteText}>
                "Life in a new country should be easier, more connected, and full of opportunities."
              </Text>
            </View>
          </Reveal>

          {/* ── About section ── */}
          <Reveal delay={160} from="bottom">
            <View style={s.darkCard}>
              <View style={s.sectionTagRow}>
                <LinearGradient colors={[ACCENT, BRAND]} style={s.sectionTagDot} />
                <Text style={s.sectionTag}>ABOUT HAFRIK</Text>
              </View>
              <Text style={s.darkCardHeading}>
                One platform.{'\n'}Every community.
              </Text>
              <Text style={s.darkCardBody}>
                Hafrik is a community-driven platform built to connect people, businesses, and opportunities — especially for Africans and international communities living, studying, and doing business abroad.
              </Text>
              <Text style={s.darkCardBody}>
                Finding friends, jobs, housing, services, events, and reliable information is often difficult when everything is scattered. Hafrik brings everything into one place — community, business, lifestyle, and opportunity.
              </Text>
            </View>
          </Reveal>


          {/* ── Mission ── */}
          <Reveal delay={180} from="bottom">
            <LinearGradient
              colors={[ACCENT + '20', BRAND + '40', '#040b0c']}
              style={s.missionCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Orb size={180} color={ACCENT} top={-40} right={-40} opacity={0.2} />
              <View style={s.sectionTagRow}>
                <LinearGradient colors={[GOLD, CORAL]} style={s.sectionTagDot} />
                <Text style={s.sectionTag}>OUR MISSION</Text>
              </View>
              <Text style={s.missionHeading}>
                Connect. Grow.{'\n'}Succeed.
              </Text>
              <Text style={s.darkCardBody}>
                Build a platform that helps people connect, find opportunities, grow businesses, and build strong communities — wherever they are in the world.
              </Text>
              <View style={s.missionPills}>
                {[
                  { icon: 'people-outline',    label: 'Connect',         color: ACCENT },
                  { icon: 'briefcase-outline', label: 'Find Jobs',       color: GREEN  },
                  { icon: 'storefront-outline',label: 'Grow Business',   color: CORAL  },
                  { icon: 'home-outline',      label: 'Find Housing',    color: PURPLE },
                  { icon: 'calendar-outline',  label: 'Discover Events', color: GOLD   },
                  { icon: 'map-outline',       label: 'Explore Cities',  color: '#06b6d4' },
                  { icon: 'megaphone-outline', label: 'Share & Promote', color: '#ec4899' },
                  { icon: 'globe-outline',     label: 'Build Networks',  color: GREEN  },
                ].map((item, i) => (
                  <Pill key={i} icon={item.icon} label={item.label} color={item.color} />
                ))}
              </View>
            </LinearGradient>
          </Reveal>

          {/* ── Features grid ── */}
          <Reveal delay={200} from="bottom">
            <View style={s.sectionTagRow}>
              <LinearGradient colors={[CORAL, GOLD]} style={s.sectionTagDot} />
              <Text style={s.sectionTag}>PLATFORM FEATURES</Text>
            </View>
          </Reveal>

          <View style={s.featureGrid}>
            {[
              {
                icon: 'people',
                title: 'Community',
                text: 'Connect with people in the same city, join groups, communities, and build your network.',
                gradient: [ACCENT, BRAND],
                delay: 220,
              },
              {
                icon: 'business',
                title: 'Business',
                text: 'Create pages, promote products, run ads, and grow your brand to the right audience.',
                gradient: [CORAL, '#c2410c'],
                delay: 260,
              },
              {
                icon: 'briefcase',
                title: 'Jobs',
                text: 'Find work opportunities, post jobs, and recruit people in your city or globally.',
                gradient: [GREEN, '#047857'],
                delay: 300,
              },
              {
                icon: 'storefront',
                title: 'Marketplace',
                text: 'Buy, sell, and promote services — a local and global marketplace in one place.',
                gradient: [PURPLE, '#5b21b6'],
                delay: 340,
              },
              {
                icon: 'map',
                title: 'City Guide',
                text: 'Explore detailed guides for cities across China — markets, jobs, rent, transport.',
                gradient: [GOLD, '#d97706'],
                delay: 380,
              },
              {
                icon: 'play-circle',
                title: 'Media & Reels',
                text: 'Share posts, photos, videos, and reels. Consume and create content that matters.',
                gradient: ['#ec4899', '#9d174d'],
                delay: 420,
              },
            ].map((item, i) => (
              <View key={i} style={s.featureCol}>
                <FeatureCard {...item} />
              </View>
            ))}
          </View>

          {/* ── For Businesses ── */}
          <Reveal delay={320} from="bottom">
            <View style={s.bizCard}>
              <LinearGradient
                colors={['#0a2e31', '#0c3f44', '#0f5060']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Orb size={200} color={ACCENT} top={-60} right={-40} opacity={0.22} />
              <Orb size={120} color={GREEN}  bottom={-30} left={-30} opacity={0.15} />

              <View style={s.sectionTagRow}>
                <LinearGradient colors={[GREEN, '#047857']} style={s.sectionTagDot} />
                <Text style={[s.sectionTag, { color: GREEN + 'cc' }]}>FOR BUSINESSES</Text>
              </View>

              <Text style={s.bizHeading}>
                Grow faster.{'\n'}Reach further.
              </Text>
              <Text style={[s.darkCardBody, { marginBottom: 20 }]}>
                Hafrik helps small and medium businesses in international communities grow and be discovered. Create pages, promote products, advertise events, recruit, and connect directly with your audience.
              </Text>

              <View style={s.bizList}>
                {[
                  { icon: 'checkmark-circle', text: 'Create business pages',    color: GREEN },
                  { icon: 'checkmark-circle', text: 'Run targeted ads',          color: GREEN },
                  { icon: 'checkmark-circle', text: 'Advertise events',          color: ACCENT },
                  { icon: 'checkmark-circle', text: 'Recruit employees',         color: ACCENT },
                  { icon: 'checkmark-circle', text: 'Connect with customers',    color: GREEN },
                  { icon: 'checkmark-circle', text: 'Build brand presence',      color: ACCENT },
                ].map((item, i) => (
                  <View key={i} style={s.bizListItem}>
                    <Ionicons name={item.icon} size={16} color={item.color} />
                    <Text style={s.bizListText}>{item.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Reveal>

          {/* ── Vision ── */}
          <Reveal delay={340} from="bottom">
            <View style={s.darkCard}>
              <View style={s.sectionTagRow}>
                <LinearGradient colors={[PURPLE, '#5b21b6']} style={s.sectionTagDot} />
                <Text style={s.sectionTag}>OUR VISION</Text>
              </View>
              <Text style={s.darkCardHeading}>
                The digital home{'\n'}for global communities.
              </Text>
              <Text style={s.darkCardBody}>
                Starting from China and expanding worldwide — Hafrik will become the ecosystem where people can live, work, do business, and grow using one platform.
              </Text>
              <View style={s.visionRow}>
                {[
                  { icon: 'globe',    label: 'Global',     color: ACCENT  },
                  { icon: 'layers',   label: 'All-in-one', color: PURPLE  },
                  { icon: 'infinite', label: 'Expanding',  color: GOLD    },
                ].map(v => (
                  <View key={v.label} style={s.visionItem}>
                    <LinearGradient colors={[v.color + '25', v.color + '08']} style={s.visionIconWrap}>
                      <Ionicons name={v.icon} size={22} color={v.color} />
                    </LinearGradient>
                    <Text style={[s.visionLabel, { color: v.color }]}>{v.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Reveal>

          {/* ── Journey timeline ── */}
          <Reveal delay={360} from="bottom">
            <View style={s.timelineCard}>
              <View style={s.sectionTagRow}>
                <LinearGradient colors={[GOLD, CORAL]} style={s.sectionTagDot} />
                <Text style={s.sectionTag}>OUR JOURNEY</Text>
              </View>

              {[
                {
                  dot: GOLD,
                  step: '01',
                  title: 'The Idea',
                  body: 'A simple idea: connect Africans and international communities abroad through one platform.',
                },
                {
                  dot: ACCENT,
                  step: '02',
                  title: 'Growing Vision',
                  body: 'The idea expanded into a full ecosystem — social, business, jobs, services, events, and city guides.',
                },
                {
                  dot: GREEN,
                  step: '03',
                  title: 'Continuously Building',
                  body: 'We are actively building, improving, and expanding to serve more cities and communities worldwide.',
                },
              ].map((item, i) => (
                <View key={i} style={s.tlRow}>
                  <View style={s.tlLeft}>
                    <View style={[s.tlDot, { backgroundColor: item.dot }]}>
                      <Text style={s.tlStep}>{item.step}</Text>
                    </View>
                    {i < 2 && <View style={[s.tlLine, { backgroundColor: item.dot + '40' }]} />}
                  </View>
                  <View style={s.tlContent}>
                    <Text style={s.tlTitle}>{item.title}</Text>
                    <Text style={s.tlBody}>{item.body}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Reveal>

          {/* ── Goal ── */}
          <Reveal delay={380} from="bottom">
            <LinearGradient
              colors={[ACCENT, BRAND, BG]}
              style={s.goalCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Orb size={200} color={WHITE} top={-60} right={-60} opacity={0.05} />
              <Ionicons name="rocket" size={36} color={WHITE} style={{ marginBottom: 14 }} />
              <Text style={s.goalLabel}>OUR GOAL</Text>
              <Text style={s.goalHeading}>
                Help people connect,{'\n'}grow, and succeed—{'\n'}anywhere in the world.
              </Text>
            </LinearGradient>
          </Reveal>

          {/* ── Footer ── */}
          <Reveal delay={420} from="bottom">
            <View style={s.footer}>
              <View style={s.footerDivider} />
              <Text style={s.footerEmoji}>🌍</Text>
              <Text style={s.footerBrand}>Hafrik</Text>
              <Text style={s.footerTagline}>Community · Business · Opportunity</Text>
              <Text style={s.footerSub}>Made with ❤️ for international communities</Text>
            </View>
          </Reveal>

        </View>
      </Animated.ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  // ── Hero ──
  heroWrap: {
    height: H * 0.72,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  backBlur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  logoRing: {
    width: 90,
    height: 90,
    borderRadius: 28,
    padding: 3,
    marginBottom: 20,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 16,
  },
  logoGrad: {
    flex: 1,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 42,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: ACCENT + '99',
    letterSpacing: 2.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 72,
    fontWeight: '900',
    color: WHITE,
    letterSpacing: -3,
    lineHeight: 72,
    marginBottom: 12,
  },
  heroSub: {
    fontSize: 18,
    color: WHITE + 'bb',
    fontWeight: '300',
    textAlign: 'center',
    lineHeight: 27,
    letterSpacing: 0.3,
    marginBottom: 22,
  },
  heroPills: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  heroFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },

  // ── Body ──
  body: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 16,
  },

  // ── Section tag ──
  sectionTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTagDot: {
    width: 16,
    height: 16,
    borderRadius: 5,
  },
  sectionTag: {
    fontSize: 10,
    fontWeight: '800',
    color: MUTED,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // ── Pull quote ──
  quoteBlock: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  quoteAccent: {
    width: 3,
    borderRadius: 2,
    backgroundColor: ACCENT,
    alignSelf: 'stretch',
    minHeight: 40,
  },
  quoteText: {
    flex: 1,
    fontSize: 17,
    color: WHITE + 'cc',
    fontStyle: 'italic',
    fontWeight: '400',
    lineHeight: 27,
    letterSpacing: 0.1,
  },

  // ── Dark card ──
  darkCard: {
    backgroundColor: '#0f1c1e',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  darkCardHeading: {
    fontSize: 26,
    fontWeight: '900',
    color: WHITE,
    letterSpacing: -0.8,
    lineHeight: 32,
    marginBottom: 14,
  },
  darkCardBody: {
    fontSize: 13.5,
    color: MUTED,
    lineHeight: 22,
    marginBottom: 8,
  },

  // ── Mission card ──
  missionCard: {
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  missionHeading: {
    fontSize: 30,
    fontWeight: '900',
    color: WHITE,
    letterSpacing: -0.8,
    lineHeight: 36,
    marginBottom: 14,
  },
  missionPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },

  // ── Feature grid ──
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  featureCol: {
    width: (W - 32 - 12) / 2,
  },

  // ── Business card ──
  bizCard: {
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  bizHeading: {
    fontSize: 28,
    fontWeight: '900',
    color: WHITE,
    letterSpacing: -0.8,
    lineHeight: 34,
    marginBottom: 14,
  },
  bizList: {
    gap: 12,
  },
  bizListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bizListText: {
    fontSize: 13.5,
    color: WHITE + 'cc',
    fontWeight: '500',
  },

  // ── Vision ──
  visionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 8,
  },
  visionItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  visionIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visionLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Timeline ──
  timelineCard: {
    backgroundColor: '#0f1c1e',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: BORDER,
  },
  tlRow: {
    flexDirection: 'row',
    gap: 16,
  },
  tlLeft: {
    alignItems: 'center',
    width: 36,
  },
  tlDot: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tlStep: {
    fontSize: 11,
    fontWeight: '900',
    color: WHITE,
  },
  tlLine: {
    width: 2,
    flex: 1,
    marginVertical: 6,
    borderRadius: 1,
  },
  tlContent: {
    flex: 1,
    paddingBottom: 22,
  },
  tlTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: WHITE,
    marginBottom: 5,
  },
  tlBody: {
    fontSize: 13,
    color: MUTED,
    lineHeight: 20,
  },

  // ── Goal ──
  goalCard: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
  },
  goalLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: WHITE + '60',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  goalHeading: {
    fontSize: 26,
    fontWeight: '900',
    color: WHITE,
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 36,
  },

  // ── Footer ──
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 5,
  },
  footerDivider: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: ACCENT + '50',
    marginBottom: 16,
  },
  footerEmoji: { fontSize: 34, marginBottom: 4 },
  footerBrand: {
    fontSize: 24,
    fontWeight: '900',
    color: WHITE,
    letterSpacing: -1,
  },
  footerTagline: {
    fontSize: 11.5,
    color: ACCENT,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  footerSub: {
    fontSize: 11,
    color: MUTED,
    marginTop: 4,
  },
});
