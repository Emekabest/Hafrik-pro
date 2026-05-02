import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: SW } = Dimensions.get('window');

const BRAND   = '#1a6b72';
const TEAL    = '#0d9da6';
const GOLD    = '#d4a017';
const WHITE   = '#ffffff';
const DARK    = '#0f1f22';
const MUTED   = '#6b8a8d';
const SURFACE = '#f4f9fa';
const BORDER  = '#ddeaec';

// ─────────────────────────────────────────────
const ORDER_STEPS = [
  {
    icon: 'search-outline',
    title: 'Browse & Pick',
    body: 'Scroll through thousands of products sourced directly from verified Chinese suppliers. Filter by category, price, or popularity.',
    color: '#1a6b72',
  },
  {
    icon: 'cart-outline',
    title: 'Add to Cart',
    body: 'Select your items, choose quantity, and add them to your cart. Review your order before moving forward.',
    color: '#0d9da6',
  },
  {
    icon: 'card-outline',
    title: 'Pay Securely',
    body: 'Pay in your local currency. We handle the conversion and international payment to the supplier on your behalf.',
    color: '#d4a017',
  },
  {
    icon: 'cube-outline',
    title: 'We Source & Pack',
    body: 'Our team in China confirms stock, inspects quality, and packs your items for export — no middlemen, no confusion.',
    color: '#6c47d4',
  },
  {
    icon: 'airplane-outline',
    title: 'Shipped to Africa',
    body: 'Your package travels from our China warehouse to the Hafrik hub in your country, fully tracked.',
    color: '#e0523a',
  },
  {
    icon: 'home-outline',
    title: 'You Receive It',
    body: 'Pick up at a Hafrik point or get doorstep delivery, depending on your city. You\'ll be notified at every step.',
    color: '#2eaa6e',
  },
];

const FAQS = [
  {
    q: 'How long does delivery take?',
    a: '10–21 business days depending on the item and your location. Express options are available for select products.',
  },
  {
    q: 'What if my item arrives damaged?',
    a: 'We inspect every order before shipping. If your item is damaged in transit, contact support within 48 hours for a replacement or refund.',
  },
  {
    q: 'Can I order in bulk?',
    a: 'Yes. We support bulk and wholesale orders. Contact our team for volume pricing and dedicated handling.',
  },
  {
    q: 'Which countries do you deliver to?',
    a: 'Currently Nigeria, Ghana, and Kenya, with more countries rolling out soon.',
  },
  {
    q: 'Is my payment safe?',
    a: 'All payments are processed through our secure gateway. We never share your card details with suppliers.',
  },
];

// ─────────────────────────────────────────────

function StepCard({ step, index }) {
  const isLast = index === ORDER_STEPS.length - 1;
  return (
    <View style={s.stepRow}>
      {/* connector line */}
      <View style={s.stepLeft}>
        <View style={[s.stepBubble, { backgroundColor: step.color }]}>
          <Ionicons name={step.icon} size={18} color={WHITE} />
        </View>
        {!isLast && <View style={s.stepLine} />}
      </View>
      {/* content */}
      <View style={[s.stepCard, isLast && { marginBottom: 0 }]}>
        <View style={s.stepNumRow}>
          <Text style={[s.stepNum, { color: step.color }]}>Step {index + 1}</Text>
        </View>
        <Text style={s.stepTitle}>{step.title}</Text>
        <Text style={s.stepBody}>{step.body}</Text>
      </View>
    </View>
  );
}

function FaqItem({ item }) {
  const [open, setOpen] = React.useState(false);
  return (
    <TouchableOpacity
      style={s.faqItem}
      activeOpacity={0.8}
      onPress={() => setOpen(v => !v)}
    >
      <View style={s.faqHeader}>
        <Text style={s.faqQ}>{item.q}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={MUTED}
        />
      </View>
      {open && <Text style={s.faqA}>{item.a}</Text>}
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────

export default function HafrikShopGuide({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={s.root}>
      {/* ── HEADER ── */}
      <LinearGradient
        colors={[BRAND, '#144f55', TEAL]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 12 }]}
      >
        {/* back */}
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={WHITE} />
        </TouchableOpacity>

        {/* title block */}
        <View style={s.headerBody}>
          <View style={s.headerIconBox}>
            <Ionicons name="storefront-outline" size={28} color={WHITE} />
          </View>
          <Text style={s.headerTitle}>How Hafrik Shop Works</Text>
          <Text style={s.headerSub}>
            Shop directly from China — we handle everything else.
          </Text>
        </View>

        {/* decorative blob */}
        <View style={s.blobTR} />
        <View style={s.blobBL} />
      </LinearGradient>

      {/* ── BODY ── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── WHAT IS HAFRIK SHOP ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>WHAT IS HAFRIK SHOP?</Text>
          <View style={s.infoCard}>
            <Text style={s.infoText}>
              Hafrik Shop connects African buyers directly to manufacturers and suppliers in China — without agents, hidden fees, or guesswork.{'\n\n'}
              You browse, you pay, we do everything else: sourcing, quality checks, international shipping, and last-mile delivery to your doorstep.
            </Text>
            <View style={s.infoPillRow}>
              {['No agents', 'Direct pricing', 'Quality checked', 'Tracked'].map(pill => (
                <View key={pill} style={s.infoPill}>
                  <Ionicons name="checkmark-circle" size={13} color={TEAL} style={{ marginRight: 4 }} />
                  <Text style={s.infoPillTxt}>{pill}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── ORDER STEPS ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>HOW TO ORDER</Text>
          {ORDER_STEPS.map((step, i) => (
            <StepCard key={i} step={step} index={i} />
          ))}
        </View>

        {/* ── DELIVERY EXPLAINED ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>HOW YOUR GOODS ARRIVE</Text>
          <View style={s.deliveryCard}>
            <View style={s.deliveryRow}>
              <View style={[s.deliveryDot, { backgroundColor: TEAL }]} />
              <View style={s.deliveryContent}>
                <Text style={s.deliveryTitle}>China Warehouse</Text>
                <Text style={s.deliveryBody}>Items are picked, inspected, and consolidated at our Guangzhou hub.</Text>
              </View>
            </View>
            <View style={s.deliveryConnector} />
            <View style={s.deliveryRow}>
              <View style={[s.deliveryDot, { backgroundColor: GOLD }]} />
              <View style={s.deliveryContent}>
                <Text style={s.deliveryTitle}>International Freight</Text>
                <Text style={s.deliveryBody}>Shipped by air or sea freight depending on size and urgency. Fully tracked with your Hafrik order number.</Text>
              </View>
            </View>
            <View style={s.deliveryConnector} />
            <View style={s.deliveryRow}>
              <View style={[s.deliveryDot, { backgroundColor: BRAND }]} />
              <View style={s.deliveryContent}>
                <Text style={s.deliveryTitle}>Hafrik Local Hub</Text>
                <Text style={s.deliveryBody}>Cleared through customs at the Hafrik hub in your country. You receive an SMS when it lands.</Text>
              </View>
            </View>
            <View style={s.deliveryConnector} />
            <View style={s.deliveryRow}>
              <View style={[s.deliveryDot, { backgroundColor: '#2eaa6e' }]} />
              <View style={s.deliveryContent}>
                <Text style={s.deliveryTitle}>Your Door</Text>
                <Text style={s.deliveryBody}>Choose pickup from a Hafrik agent point or opt for doorstep delivery.</Text>
              </View>
            </View>
          </View>

          {/* timeline badges */}
          <View style={s.timeRow}>
            {[
              { label: '1–2 days', sub: 'Processing' },
              { label: '7–14 days', sub: 'In Transit' },
              { label: '1–3 days', sub: 'Clearance' },
              { label: 'Same day', sub: 'Delivery' },
            ].map((t, i) => (
              <View key={i} style={s.timeBadge}>
                <Text style={s.timeBadgeVal}>{t.label}</Text>
                <Text style={s.timeBadgeSub}>{t.sub}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── FAQ ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>FREQUENTLY ASKED</Text>
          {FAQS.map((f, i) => (
            <FaqItem key={i} item={f} />
          ))}
        </View>

        {/* ── CTA ── */}
        <View style={s.ctaWrap}>
          <LinearGradient
            colors={[BRAND, TEAL]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.ctaCard}
          >
            <Ionicons name="rocket-outline" size={28} color={WHITE} style={{ marginBottom: 10 }} />
            <Text style={s.ctaTitle}>Ready to shop?</Text>
            <Text style={s.ctaSub}>Browse thousands of products and place your first order in minutes.</Text>
            <TouchableOpacity
              style={s.ctaBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <Text style={s.ctaBtnTxt}>Start Shopping</Text>
              <Ionicons name="arrow-forward" size={16} color={BRAND} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </LinearGradient>
        </View>

      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: SURFACE },

  // ── Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerBody: { alignItems: 'center', paddingBottom: 4 },
  headerIconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: WHITE,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  blobTR: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  blobBL: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  // ── Scroll
  scroll: { flex: 1 },
  section: { paddingHorizontal: 18, paddingTop: 28 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: TEAL,
    letterSpacing: 1.2,
    marginBottom: 14,
  },

  // ── What is card
  infoCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },
  infoText: { fontSize: 14, color: DARK, lineHeight: 22, fontWeight: '400' },
  infoPillRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, gap: 8 },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f7f8',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  infoPillTxt: { fontSize: 12, color: TEAL, fontWeight: '600' },

  // ── Steps
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
  stepLeft: { alignItems: 'center', marginRight: 14, width: 40 },
  stepBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepLine: { width: 2, flex: 1, backgroundColor: BORDER, minHeight: 24, marginTop: 4 },
  stepCard: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  stepNumRow: { marginBottom: 2 },
  stepNum: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  stepTitle: { fontSize: 15, fontWeight: '700', color: DARK, marginBottom: 5 },
  stepBody: { fontSize: 13, color: MUTED, lineHeight: 19 },

  // ── Delivery
  deliveryCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },
  deliveryRow: { flexDirection: 'row', alignItems: 'flex-start' },
  deliveryDot: { width: 14, height: 14, borderRadius: 7, marginTop: 3, marginRight: 14 },
  deliveryContent: { flex: 1, paddingBottom: 4 },
  deliveryTitle: { fontSize: 14, fontWeight: '700', color: DARK, marginBottom: 3 },
  deliveryBody: { fontSize: 13, color: MUTED, lineHeight: 18 },
  deliveryConnector: {
    width: 2,
    height: 16,
    backgroundColor: BORDER,
    marginLeft: 6,
    marginVertical: 4,
  },

  // ── Time badges
  timeRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 8,
  },
  timeBadge: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  timeBadgeVal: { fontSize: 12, fontWeight: '800', color: BRAND },
  timeBadgeSub: { fontSize: 10, color: MUTED, marginTop: 2, textAlign: 'center' },

  // ── FAQ
  faqItem: {
    backgroundColor: WHITE,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQ: { fontSize: 14, fontWeight: '600', color: DARK, flex: 1, marginRight: 8 },
  faqA: { fontSize: 13, color: MUTED, lineHeight: 19, marginTop: 10 },

  // ── CTA
  ctaWrap: { paddingHorizontal: 18, paddingTop: 28 },
  ctaCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: WHITE,
    marginBottom: 8,
  },
  ctaSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: 30,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  ctaBtnTxt: { fontSize: 14, fontWeight: '700', color: BRAND },
});
