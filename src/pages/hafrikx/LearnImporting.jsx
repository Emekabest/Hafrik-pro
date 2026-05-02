import React, { useState, memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const { width: W } = Dimensions.get('window');

// ─── Palette ──────────────────────────────────────────────────────────────────
const BRAND  = '#0c3f44';
const TEAL   = '#1f8e93';
const GOLD   = '#d4a017';
const WHITE  = '#ffffff';
const MUTED  = '#6b7a7c';
const DARK   = '#0d1f22';
const BG     = '#f4f9fa';
const BORDER = '#ddeaec';
const CARD   = '#ffffff';

const a = (hex, op) => {
  const n = (hex || '').replace('#', '');
  const alpha = Math.round(Math.max(0, Math.min(1, op)) * 255).toString(16).padStart(2, '0');
  return `#${n}${alpha}`;
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'All',          icon: 'apps-outline' },
  { key: 'Beginner',     icon: 'school-outline' },
  { key: 'Shipping',     icon: 'boat-outline' },
  { key: 'Business',     icon: 'briefcase-outline' },
  { key: 'China Travel', icon: 'airplane-outline' },
];

const COURSES = [
  { id: '1',  title: "Beginner's Guide to China Import",  tag: 'Beginner',     lessons: 8,  premium: false, icon: 'school-outline',           color: TEAL   },
  { id: '2',  title: 'How to Buy from 1688.com',          tag: 'Beginner',     lessons: 6,  premium: false, icon: 'cart-outline',             color: '#3b82f6' },
  { id: '3',  title: 'How to Use Alibaba Safely',         tag: 'Beginner',     lessons: 5,  premium: false, icon: 'shield-checkmark-outline', color: '#10b981' },
  { id: '4',  title: 'How Shipping Works',                tag: 'Shipping',     lessons: 7,  premium: false, icon: 'boat-outline',             color: '#6366f1' },
  { id: '5',  title: 'Avoid Scams When Importing',        tag: 'Beginner',     lessons: 4,  premium: false, icon: 'warning-outline',          color: '#ef4444' },
  { id: '6',  title: 'Canton Fair Guide',                 tag: 'Business',     lessons: 6,  premium: true,  icon: 'storefront-outline',       color: GOLD    },
  { id: '7',  title: 'Factory Negotiation Skills',        tag: 'Business',     lessons: 8,  premium: true,  icon: 'briefcase-outline',        color: '#8b5cf6' },
  { id: '8',  title: 'Import Duties & Customs',           tag: 'Shipping',     lessons: 5,  premium: false, icon: 'document-text-outline',   color: '#f59e0b' },
  { id: '9',  title: 'How to Visit China as a Business',  tag: 'China Travel', lessons: 7,  premium: false, icon: 'airplane-outline',         color: '#e0523a' },
  { id: '10', title: 'Warehouse & Consolidation Guide',   tag: 'Shipping',     lessons: 4,  premium: false, icon: 'cube-outline',             color: TEAL    },
  { id: '11', title: 'Payment Methods: TT, Alipay, WeChat', tag: 'Business',  lessons: 5,  premium: false, icon: 'card-outline',             color: '#10b981' },
  { id: '12', title: 'Product Inspection Guide',          tag: 'Business',     lessons: 6,  premium: false, icon: 'search-outline',           color: '#3b82f6' },
];

const TAG_COLORS = {
  Beginner:       { bg: a('#10b981', 0.12), text: '#0d8a5e', border: a('#10b981', 0.22) },
  Shipping:       { bg: a('#6366f1', 0.12), text: '#4338ca', border: a('#6366f1', 0.22) },
  Business:       { bg: a(GOLD,      0.12), text: '#a07810', border: a(GOLD,      0.22) },
  'China Travel': { bg: a('#e0523a', 0.12), text: '#c0422a', border: a('#e0523a', 0.22) },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const CategoryPill = memo(({ item, active, onPress }) => (
  <TouchableOpacity
    style={[s.pill, active && s.pillActive]}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <Ionicons
      name={item.icon}
      size={13}
      color={active ? WHITE : MUTED}
      style={{ marginRight: 5 }}
    />
    <Text style={[s.pillTxt, active && s.pillTxtActive]}>{item.key}</Text>
  </TouchableOpacity>
));

const CourseCard = memo(({ item }) => {
  const tag = TAG_COLORS[item.tag] ?? TAG_COLORS.Beginner;

  const handlePress = useCallback(() => {
    Alert.alert('Coming Soon', 'This course will be available shortly.', [{ text: 'OK' }]);
  }, []);

  return (
    <TouchableOpacity style={s.card} onPress={handlePress} activeOpacity={0.86}>
      {/* icon */}
      <View style={[s.cardIcon, { backgroundColor: a(item.color, 0.12) }]}>
        <Ionicons name={item.icon} size={22} color={item.color} />
      </View>

      {/* content */}
      <View style={s.cardBody}>
        <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
        <View style={s.cardMeta}>
          <View style={[s.tagBadge, { backgroundColor: tag.bg, borderColor: tag.border }]}>
            <Text style={[s.tagTxt, { color: tag.text }]}>{item.tag}</Text>
          </View>
          <Text style={s.lessonsTxt}>{item.lessons} lessons</Text>
          {item.premium ? (
            <View style={s.premiumBadge}>
              <Ionicons name="lock-closed" size={9} color={WHITE} style={{ marginRight: 3 }} />
              <Text style={s.premiumTxt}>Premium</Text>
            </View>
          ) : (
            <View style={s.freeBadge}>
              <Text style={s.freeTxt}>Free</Text>
            </View>
          )}
        </View>
      </View>

      {/* action */}
      <View style={[s.playBtn, { backgroundColor: item.premium ? a(GOLD, 0.15) : a(TEAL, 0.12) }]}>
        <Ionicons
          name={item.premium ? 'lock-closed' : 'play'}
          size={14}
          color={item.premium ? GOLD : TEAL}
        />
      </View>
    </TouchableOpacity>
  );
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LearnImporting() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = activeCategory === 'All'
    ? COURSES
    : COURSES.filter(c => c.tag === activeCategory);

  const renderItem   = useCallback(({ item }) => <CourseCard item={item} />, []);
  const keyExtractor = useCallback(item => item.id, []);

  const total    = COURSES.length;
  const free     = COURSES.filter(c => !c.premium).length;
  const premium  = COURSES.filter(c => c.premium).length;

  const ListHeader = (
    <>
      {/* ── Category pills ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.pillsRow}
        style={s.pillsWrap}
      >
        {CATEGORIES.map(cat => (
          <CategoryPill
            key={cat.key}
            item={cat}
            active={activeCategory === cat.key}
            onPress={() => setActiveCategory(cat.key)}
          />
        ))}
      </ScrollView>

      {/* ── Stats strip ── */}
      <View style={s.statsStrip}>
        {[
          { val: total,   label: 'Courses' },
          { val: free,    label: 'Free' },
          { val: premium, label: 'Premium' },
        ].map((st, i, arr) => (
          <React.Fragment key={st.label}>
            <View style={s.stat}>
              <Text style={s.statVal}>{st.val}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
            {i < arr.length - 1 && <View style={s.statDiv} />}
          </React.Fragment>
        ))}
      </View>

      {/* ── Progress banner ── */}
      <View style={s.progressCard}>
        <View style={s.progressLeft}>
          <View style={s.progressIconBox}>
            <Ionicons name="trophy" size={18} color={GOLD} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.progressTitle}>Your Progress</Text>
            <Text style={s.progressSub}>2 of 14 lessons completed</Text>
            <View style={s.barBg}>
              <View style={[s.barFill, { width: `${(2 / 14) * 100}%` }]} />
            </View>
          </View>
        </View>
        <Text style={s.progressPct}>14%</Text>
      </View>

      <Text style={s.sectionLbl}>
        {activeCategory === 'All' ? 'ALL COURSES' : activeCategory.toUpperCase()}
      </Text>
    </>
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Header ── */}
      <LinearGradient
        colors={[BRAND, '#144f55', TEAL]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 12 }]}
      >
        {/* blobs */}
        <View style={s.blobTR} />
        <View style={s.blobBL} />

        {/* nav row */}
        <View style={s.navRow}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={WHITE} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <View style={s.headerBadge}>
            <Text style={s.headerBadgeTxt}>Academy</Text>
          </View>
        </View>

        {/* icon + title */}
        <View style={s.headerBody}>
          <View style={s.headerIconBox}>
            <Ionicons name="school" size={28} color={WHITE} />
          </View>
          <Text style={s.headerTitle}>Learn Importing</Text>
          <Text style={s.headerSub}>
            From beginner to pro — master China trade.
          </Text>
        </View>
      </LinearGradient>

      {/* ── List ── */}
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Ionicons name="book-outline" size={44} color={MUTED} />
            <Text style={s.emptyTxt}>No courses in this category yet.</Text>
          </View>
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  blobTR: {
    position: 'absolute', top: -28, right: -28,
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  blobBL: {
    position: 'absolute', bottom: -18, left: -18,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  navRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerBadgeTxt: { color: WHITE, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  headerBody: { alignItems: 'center', paddingBottom: 4 },
  headerIconBox: {
    width: 58, height: 58, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    fontSize: 22, fontWeight: '800', color: WHITE,
    letterSpacing: -0.4, textAlign: 'center',
  },
  headerSub: {
    fontSize: 13, color: 'rgba(255,255,255,0.75)',
    textAlign: 'center', marginTop: 5, lineHeight: 18,
  },

  // Pills
  pillsWrap: { backgroundColor: BG },
  pillsRow: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 4,
    gap: 8,
  },
  pill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 13, paddingVertical: 8,
    borderRadius: 24, borderWidth: 1,
    borderColor: BORDER, backgroundColor: CARD,
  },
  pillActive: { backgroundColor: TEAL, borderColor: TEAL },
  pillTxt: { fontSize: 13, fontWeight: '600', color: MUTED },
  pillTxtActive: { color: WHITE },

  // Stats strip
  statsStrip: {
    flexDirection: 'row',
    marginHorizontal: 18,
    marginTop: 16,
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 14,
  },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '800', color: BRAND },
  statLabel: { fontSize: 11, color: MUTED, marginTop: 2, fontWeight: '500' },
  statDiv: { width: 1, backgroundColor: BORDER, marginVertical: 4 },

  // Progress card
  progressCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 18, marginTop: 14,
    backgroundColor: CARD,
    borderRadius: 16, borderWidth: 1,
    borderColor: BORDER, padding: 14,
  },
  progressLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  progressIconBox: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: a(GOLD, 0.12),
    alignItems: 'center', justifyContent: 'center',
  },
  progressTitle: { fontSize: 13, fontWeight: '700', color: DARK },
  progressSub: { fontSize: 11, color: MUTED, marginTop: 1, marginBottom: 6 },
  barBg: {
    height: 5, backgroundColor: BORDER,
    borderRadius: 3, overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: TEAL, borderRadius: 3 },
  progressPct: {
    fontSize: 18, fontWeight: '800', color: TEAL,
    marginLeft: 12,
  },

  // Section label
  sectionLbl: {
    fontSize: 11, fontWeight: '700',
    color: TEAL, letterSpacing: 1.2,
    marginHorizontal: 18, marginTop: 22, marginBottom: 12,
  },

  // Course cards
  listContent: { paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 18, marginBottom: 11,
    backgroundColor: CARD,
    borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 14, gap: 13,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIcon: {
    width: 50, height: 50, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: {
    fontSize: 14, fontWeight: '700', color: DARK,
    lineHeight: 19, marginBottom: 7,
  },
  cardMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap',
  },
  tagBadge: {
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1,
  },
  tagTxt: { fontSize: 10, fontWeight: '700' },
  lessonsTxt: { fontSize: 11, color: MUTED, fontWeight: '500' },
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: a(GOLD, 0.85), paddingHorizontal: 7,
    paddingVertical: 3, borderRadius: 8,
  },
  premiumTxt: { fontSize: 10, fontWeight: '700', color: WHITE },
  freeBadge: {
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: a(TEAL, 0.1),
    borderWidth: 1, borderColor: a(TEAL, 0.25),
  },
  freeTxt: { fontSize: 10, fontWeight: '700', color: TEAL },
  playBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },

  // Empty
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTxt: { fontSize: 14, color: MUTED },
});
