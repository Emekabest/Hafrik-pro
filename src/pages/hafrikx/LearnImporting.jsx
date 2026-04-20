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

const CATEGORIES = ['All', 'Beginner', 'Shipping', 'Business', 'China Travel'];

const COURSES = [
  {
    id: '1',
    title: "Beginner's Guide to China Import",
    tag: 'Beginner',
    lessons: 8,
    premium: false,
    icon: 'school-outline',
  },
  {
    id: '2',
    title: 'How to Buy from 1688.com',
    tag: 'Beginner',
    lessons: 6,
    premium: false,
    icon: 'cart-outline',
  },
  {
    id: '3',
    title: 'How to Use Alibaba Safely',
    tag: 'Beginner',
    lessons: 5,
    premium: false,
    icon: 'shield-checkmark-outline',
  },
  {
    id: '4',
    title: 'How Shipping Works',
    tag: 'Shipping',
    lessons: 7,
    premium: false,
    icon: 'boat-outline',
  },
  {
    id: '5',
    title: 'Avoid Scams When Importing',
    tag: 'Beginner',
    lessons: 4,
    premium: false,
    icon: 'warning-outline',
  },
  {
    id: '6',
    title: 'Canton Fair Guide',
    tag: 'Business',
    lessons: 6,
    premium: true,
    icon: 'storefront-outline',
  },
  {
    id: '7',
    title: 'Factory Negotiation Skills',
    tag: 'Business',
    lessons: 8,
    premium: true,
    icon: 'briefcase-outline',
  },
  {
    id: '8',
    title: 'Import Duties & Customs',
    tag: 'Shipping',
    lessons: 5,
    premium: false,
    icon: 'document-text-outline',
  },
  {
    id: '9',
    title: 'How to Visit China as a Business',
    tag: 'China Travel',
    lessons: 7,
    premium: false,
    icon: 'airplane-outline',
  },
  {
    id: '10',
    title: 'Warehouse & Consolidation Guide',
    tag: 'Shipping',
    lessons: 4,
    premium: false,
    icon: 'cube-outline',
  },
  {
    id: '11',
    title: 'Payment Methods: TT, Alipay, WeChat',
    tag: 'Business',
    lessons: 5,
    premium: false,
    icon: 'card-outline',
  },
  {
    id: '12',
    title: 'Product Inspection Guide',
    tag: 'Business',
    lessons: 6,
    premium: false,
    icon: 'search-outline',
  },
];

const TAG_COLORS = {
  Beginner:       { bg: '#e8f5ee', text: '#1a7a44',  border: '#c8e6d4' },
  Shipping:       { bg: '#e8f0f8', text: '#2563eb',  border: '#c8d8ee' },
  Business:       { bg: '#fef3d8', text: '#92680a',  border: '#f0dfa0' },
  'China Travel': { bg: '#fde8f3', text: '#c0456a',  border: '#f0c8dc' },
};

const CategoryPill = memo(({ label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.categoryPill, active && styles.categoryPillActive]}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <Text style={[styles.categoryPillText, active && styles.categoryPillTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
));

const CourseCard = memo(({ item }) => {
  const tagStyle = TAG_COLORS[item.tag] || TAG_COLORS.Beginner;

  const handlePress = useCallback(() => {
    Alert.alert(
      'Coming Soon',
      'This course will be available shortly.',
      [{ text: 'OK' }],
    );
  }, []);

  return (
    <TouchableOpacity
      style={styles.courseCard}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      {/* Icon circle */}
      <View style={styles.courseIconWrap}>
        <LinearGradient colors={['#e8f5f5', '#ffffff']} style={styles.courseIconGrad}>
          <Ionicons name={item.icon} size={22} color={item.premium ? TEAL : ACCENT} />
        </LinearGradient>
      </View>

      {/* Content */}
      <View style={styles.courseContent}>
        <Text style={styles.courseTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.courseLessons}>{item.lessons} lessons</Text>

        <View style={styles.courseBottomRow}>
          {/* Tag */}
          <View style={[styles.courseTag, { backgroundColor: tagStyle.bg, borderColor: tagStyle.border }]}>
            <Text style={[styles.courseTagText, { color: tagStyle.text }]}>{item.tag}</Text>
          </View>

          {/* Free/Premium badge */}
          {item.premium ? (
            <View style={styles.premiumBadge}>
              <Ionicons name="lock-closed" size={10} color={BG} />
              <Text style={styles.premiumBadgeText}>Premium</Text>
            </View>
          ) : (
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>Free</Text>
            </View>
          )}
        </View>
      </View>

      {/* Start / Lock button */}
      <TouchableOpacity style={styles.startBtn} onPress={handlePress} activeOpacity={0.8}>
        {item.premium
          ? <Ionicons name="lock-closed" size={16} color={GOLD} />
          : <Ionicons name="play" size={16} color={WHITE} />
        }
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

export default function LearnImporting() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();

  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = activeCategory === 'All'
    ? COURSES
    : COURSES.filter(c => c.tag === activeCategory);

  const renderItem  = useCallback(({ item }) => <CourseCard item={item} />, []);
  const keyExtractor = useCallback(item => item.id, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0c3f44" translucent={false} />

      {/* Header */}
      <LinearGradient colors={["#0c3f44", "#1a5a60"]} style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={WHITE} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Learn Importing</Text>
          <Text style={styles.headerSub}>Hafrik Academy</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Progress banner */}
      <LinearGradient colors={['#e8f5f5', '#f0fafa']} style={styles.progressBanner}>
        <Ionicons name="trophy-outline" size={18} color={GOLD} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.progressText}>2 of 14 lessons completed</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${(2 / 14) * 100}%` }]} />
          </View>
        </View>
        <Text style={styles.progressPercent}>14%</Text>
      </LinearGradient>

      {/* Category filter */}
      <View style={styles.categoryWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map(cat => (
            <CategoryPill
              key={cat}
              label={cat}
              active={activeCategory === cat}
              onPress={() => setActiveCategory(cat)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Courses list */}
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="book-outline" size={44} color={MUTED} />
            <Text style={styles.emptyText}>No courses in this category yet.</Text>
          </View>
        }
      />
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
  progressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  progressText: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 13,
    color: BRAND,
    marginBottom: 6,
  },
  progressBarBg: {
    height: 5,
    backgroundColor: BORDER,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: TEAL,
    borderRadius: 3,
  },
  progressPercent: {
    fontFamily: 'WorkSans_700Bold',
    fontSize: 14,
    color: TEAL,
    marginLeft: 10,
  },
  categoryWrap: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  categoryScroll: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  categoryPillActive: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  categoryPillText: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 13,
    color: MUTED,
  },
  categoryPillTextActive: {
    color: WHITE,
    fontFamily: 'WorkSans_600SemiBold',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
    gap: 12,
  },
  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    gap: 12,
  },
  courseIconWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  courseIconGrad: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
  },
  courseContent: {
    flex: 1,
  },
  courseTitle: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 14,
    color: BRAND,
    marginBottom: 3,
    lineHeight: 19,
  },
  courseLessons: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    color: MUTED,
    marginBottom: 8,
  },
  courseBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  courseTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  courseTagText: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 10,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: TEAL,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  premiumBadgeText: {
    fontFamily: 'WorkSans_700Bold',
    fontSize: 10,
    color: WHITE,
  },
  freeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: TEAL + '18',
    borderWidth: 1,
    borderColor: TEAL + '44',
  },
  freeBadgeText: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 10,
    color: TEAL,
  },
  startBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e8f5f5',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 14,
    color: MUTED,
  },
});
