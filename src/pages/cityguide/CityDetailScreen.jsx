// src/pages/cityguide/CityDetailScreen.jsx
import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CITIES } from './citydata';

const { width: W, height: SCREEN_H } = Dimensions.get('window');
const HERO_H = Math.round(SCREEN_H * 0.52);

// ── Palette ───────────────────────────────────────────────────────────────────
const BG      = '#f5f7fa';
const WHITE   = '#ffffff';
const DARK    = '#111827';
const MUTED   = '#6b7280';
const ACCENT  = '#1f8e93';
const BRAND   = '#0c3f44';
const BORDER  = '#e5e7eb';
const GOLD    = '#f59e0b';
const GREEN   = '#10b981';

// ── Star rating ───────────────────────────────────────────────────────────────
const Stars = ({ value, max = 5, color = GOLD }) => (
  <View style={{ flexDirection: 'row', gap: 3 }}>
    {Array.from({ length: max }).map((_, i) => (
      <Ionicons
        key={i}
        name={i < value ? 'star' : 'star-outline'}
        size={14}
        color={i < value ? color : MUTED + '55'}
      />
    ))}
  </View>
);

// ── Section ───────────────────────────────────────────────────────────────────
const Section = ({ icon, title, color = ACCENT, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconWrap, { backgroundColor: color + '1a' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

// ── Table row ─────────────────────────────────────────────────────────────────
const TableRow = ({ label, value, zebra }) => (
  <View style={[styles.tableRow, zebra && { backgroundColor: BG }]}>
    <Text style={styles.tableLabel}>{label}</Text>
    <Text style={styles.tableValue}>{value}</Text>
  </View>
);

// ── Bullet list ───────────────────────────────────────────────────────────────
const BulletList = ({ items, color = ACCENT }) => (
  <View style={styles.bulletList}>
    {items.map((item, i) => (
      <View key={i} style={styles.bulletRow}>
        <View style={[styles.bullet, { backgroundColor: color }]} />
        <Text style={styles.bulletText}>{item}</Text>
      </View>
    ))}
  </View>
);

// ── Rating row ────────────────────────────────────────────────────────────────
const RatingRow = ({ label, value, color, last }) => (
  <>
    <View style={styles.ratingRow}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <Stars value={value} color={color} />
    </View>
    {!last && <View style={styles.ratingDivider} />}
  </>
);

// ─────────────────────────────────────────────────────────────────────────────
export default function CityDetailScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const insets     = useSafeAreaInsets();
  const { cityId } = route.params || {};

  const city = useMemo(() => CITIES.find(c => c.id === cityId), [cityId]);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  // Navigate to search with pre-filled query and tab
  const openSearch = useCallback((query, tab) => {
    navigation.navigate('SearchScreen', { initialQuery: query, initialTab: tab });
  }, [navigation]);

  if (!city) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: MUTED, fontSize: 16 }}>City not found.</Text>
        <TouchableOpacity onPress={handleBack} style={{ marginTop: 16 }}>
          <Text style={{ color: ACCENT, fontSize: 14, fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* ── 1. Full-Screen City Hero ── */}
        {city.image ? (
          <ImageBackground
            source={{ uri: city.image }}
            style={[styles.hero, { height: HERO_H }]}
            resizeMode="cover"
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.0)', 'rgba(0,0,0,0.75)']}
              style={[styles.heroGrad, { paddingTop: insets.top + 12 }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <HeroContent city={city} insets={insets} onBack={handleBack} />
            </LinearGradient>
          </ImageBackground>
        ) : (
          <LinearGradient
            colors={city.headerGrad}
            style={[styles.hero, styles.heroGrad, { height: HERO_H, paddingTop: insets.top + 12 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <HeroContent city={city} insets={insets} onBack={handleBack} />
          </LinearGradient>
        )}

        {/* ── Quick stats bar ── */}
        <View style={styles.statsBar}>
          {[
            { icon: 'people',      value: city.population, label: 'Population' },
            { icon: 'star',        value: `${city.foreignerRating.overall}/5`, label: 'Expat Score' },
            { icon: 'cash',        value: city.salary[0]?.range.split('–')[0].trim() + '+', label: 'Avg Salary' },
            { icon: 'home',        value: city.rent[0]?.range.split('–')[0].trim(), label: 'Min Rent' },
          ].map(({ icon, value, label }) => (
            <View key={label} style={styles.statItem}>
              <Ionicons name={icon} size={16} color={ACCENT} />
              <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ── Card body ── */}
        <View style={styles.body}>

          {/* ── 2. About ── */}
          <Section icon="information-circle" title="About The City">
            {[
              { icon: 'time-outline',          label: 'History',           text: city.about.history },
              { icon: 'trending-up-outline',   label: 'Economy',           text: city.about.economy },
              { icon: 'partly-sunny-outline',  label: 'Weather',           text: city.about.weather },
              { icon: 'cafe-outline',          label: 'Lifestyle',         text: city.about.lifestyle },
              { icon: 'train-outline',         label: 'Transport',         text: city.about.transport },
              { icon: 'globe-outline',         label: 'Intl. Community',   text: city.about.internationalCommunity },
            ].map(({ icon, label, text }, i) => (
              <View key={label} style={[styles.aboutRow, i === 0 && { borderTopWidth: 0 }]}>
                <View style={styles.aboutIconWrap}>
                  <Ionicons name={icon} size={14} color={ACCENT} />
                </View>
                <View style={styles.aboutContent}>
                  <Text style={styles.aboutLabel}>{label}</Text>
                  <Text style={styles.aboutText}>{text}</Text>
                </View>
              </View>
            ))}
          </Section>

          {/* ── 3. Foreigner Ratings ── */}
          <Section icon="star" title="Is It Good For Foreigners?" color={GOLD}>
            <View style={styles.ratingCard}>
              <RatingRow label="Overall Rating"         value={city.foreignerRating.overall}       color={GOLD} />
              <RatingRow label="English Level"          value={city.foreignerRating.english}       color={ACCENT} />
              <RatingRow label="Cost of Living"         value={city.foreignerRating.costOfLiving}  color={GREEN} />
              <RatingRow label="Job Opportunities"      value={city.foreignerRating.jobs}          color={ACCENT} />
              <RatingRow label="Business Opportunities" value={city.foreignerRating.business}      color={BRAND} />
              <RatingRow label="Nightlife"              value={city.foreignerRating.nightlife}     color="#a855f7" />
              <RatingRow label="Safety"                 value={city.foreignerRating.safety}        color={GREEN} last />
            </View>
          </Section>

          {/* ── 4. Jobs ── */}
          <Section icon="briefcase" title="Jobs For Foreigners" color="#7c3aed">
            <View style={styles.jobGrid}>
              {city.jobs.map((job, i) => (
                <View key={i} style={styles.jobChip}>
                  <Ionicons name="checkmark-circle" size={12} color="#7c3aed" />
                  <Text style={styles.jobChipText}>{job}</Text>
                </View>
              ))}
            </View>
          </Section>

          {/* ── 5. Salary ── */}
          <Section icon="cash" title="Average Salary (RMB/month)" color={GREEN}>
            <View style={styles.tableCard}>
              {city.salary.map((row, i) => (
                <TableRow key={row.role} label={row.role} value={row.range} zebra={i % 2 === 1} />
              ))}
            </View>
          </Section>

          {/* ── 6. Rent ── */}
          <Section icon="home" title="Rent / Accommodation" color="#f97316">
            <View style={styles.tableCard}>
              {city.rent.map((row, i) => (
                <TableRow key={row.type} label={row.type} value={row.range} zebra={i % 2 === 1} />
              ))}
            </View>
          </Section>

          {/* ── 7. Cost of Living ── */}
          <Section icon="wallet" title="Cost of Living" color="#3b82f6">
            <View style={styles.tableCard}>
              {city.costOfLiving.map((row, i) => (
                <TableRow key={row.item} label={row.item} value={row.range} zebra={i % 2 === 1} />
              ))}
            </View>
          </Section>

          {/* ── 8. Food ── */}
          <Section icon="restaurant" title="Food" color="#ef4444">
            {[
              { label: 'Cuisine Style',       value: city.food.style,   query: `${city.name} food restaurants` },
              { label: 'Spice Level',         value: city.food.spice,   query: null },
              { label: 'Halal Food',          value: city.food.halal,   query: `halal food ${city.name}` },
              { label: 'African Restaurants', value: city.food.african, query: `African restaurant ${city.name}` },
              { label: 'Western Food',        value: city.food.western, query: `western restaurant ${city.name}` },
            ].map(({ label, value, query }, i) => (
              query ? (
                <TouchableOpacity
                  key={label}
                  activeOpacity={0.75}
                  onPress={() => openSearch(query, 'pages')}
                  style={[styles.foodRow, styles.foodRowTappable, i % 2 === 1 && { backgroundColor: BG }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.foodLabel}>{label}</Text>
                    <Text style={styles.foodValue}>{value}</Text>
                  </View>
                  <Ionicons name="search-outline" size={15} color={ACCENT} />
                </TouchableOpacity>
              ) : (
                <View key={label} style={[styles.foodRow, i % 2 === 1 && { backgroundColor: BG }]}>
                  <Text style={styles.foodLabel}>{label}</Text>
                  <Text style={styles.foodValue}>{value}</Text>
                </View>
              )
            ))}
          </Section>

          {/* ── 9. Transport ── */}
          <Section icon="bus" title="Transport" color={BRAND}>
            <BulletList items={city.transport} color={ACCENT} />
          </Section>

          {/* ── 10. Schools ── */}
          <Section icon="school" title="International Schools" color="#7c3aed">
            <BulletList items={city.schools} color="#7c3aed" />
          </Section>

          {/* ── 11. Universities ── */}
          <Section icon="library" title="Universities" color="#0891b2">
            <View style={styles.bulletList}>
              {city.universities.map((uni, i) => (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.75}
                  onPress={() => openSearch(uni, 'all')}
                  style={styles.bulletRowTappable}
                >
                  <View style={[styles.bullet, { backgroundColor: '#0891b2' }]} />
                  <Text style={[styles.bulletText, { flex: 1 }]}>{uni}</Text>
                  <Ionicons name="search-outline" size={14} color={ACCENT} />
                </TouchableOpacity>
              ))}
            </View>
          </Section>

          {/* ── 12. Known For ── */}
          <Section icon="ribbon" title={`What ${city.name} Is Known For`} color={GOLD}>
            <View style={styles.knownForWrap}>
              {city.knownFor.map((item, i) => (
                <View key={i} style={styles.knownChip}>
                  <Text style={styles.knownChipText}>{item}</Text>
                </View>
              ))}
            </View>
          </Section>

          {/* ── 13. Hafrik Community ── */}
          <Section icon="people" title={`Hafrik Community in ${city.name}`} color={ACCENT}>
            <LinearGradient
              colors={[BRAND, '#0f5060']}
              style={styles.communityBanner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.communityBannerEmoji}>🌍</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.communityBannerTitle}>
                  Hafrik is in {city.name}!
                </Text>
                <Text style={styles.communityBannerSub}>
                  Connect with Hafrik members, find jobs, rent, services and events in {city.name}.
                </Text>
              </View>
            </LinearGradient>

            {[
              {
                icon: 'person-outline',
                label: `People in ${city.name}`,
                sub: 'Connect with Hafrik members',
                action: () => openSearch(city.name, 'people'),
              },
              {
                icon: 'people-outline',
                label: `Groups in ${city.name}`,
                sub: 'Join local communities',
                action: () => openSearch(city.name, 'groups'),
              },
              {
                icon: 'calendar-outline',
                label: `Events in ${city.name}`,
                sub: 'Upcoming events near you',
                action: () => openSearch(city.name, 'all'),
              },
              {
                icon: 'briefcase-outline',
                label: `Jobs in ${city.name}`,
                sub: 'Find work opportunities',
                action: () => openSearch(`${city.name} jobs`, 'posts'),
              },
              {
                icon: 'home-outline',
                label: `Houses for Rent in ${city.name}`,
                sub: 'Find accommodation',
                action: () => openSearch(`${city.name} rent`, 'posts'),
              },
              {
                icon: 'build-outline',
                label: `Services in ${city.name}`,
                sub: 'Local service providers',
                action: () => openSearch(`${city.name} services`, 'pages'),
              },
              {
                icon: 'map-outline',
                label: `Tour Guides for ${city.name}`,
                sub: 'Get help from locals',
                action: () => openSearch(`${city.name} tour guide`, 'people'),
              },
            ].map(({ icon, label, sub, action }, i) => (
              <TouchableOpacity
                key={label}
                activeOpacity={0.8}
                onPress={action}
                style={styles.communityItem}
              >
                <View style={styles.communityItemIcon}>
                  <Ionicons name={icon} size={16} color={ACCENT} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.communityItemLabel}>{label}</Text>
                  <Text style={styles.communityItemSub}>{sub}</Text>
                </View>
                <Ionicons name="arrow-forward-circle-outline" size={20} color={ACCENT} />
              </TouchableOpacity>
            ))}
          </Section>

          {/* ── Future tabs teaser ── */}
          <View style={styles.tabsTeaser}>
            <Text style={styles.tabsTeaserTitle}>Coming Soon — Full City Tabs</Text>
            <Text style={styles.tabsTeaserSub}>
              Dedicated tabs for Jobs, Houses, Groups, Events, People, and Services inside each city.
            </Text>
            <View style={styles.tabsTeaserChips}>
              {['Jobs', 'Houses', 'Groups', 'Events', 'People', 'Services'].map(t => (
                <View key={t} style={styles.tabsTeaserChip}>
                  <Text style={styles.tabsTeaserChipText}>{t}</Text>
                </View>
              ))}
            </View>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

// ── Hero content (shared for image + gradient variants) ───────────────────────
function HeroContent({ city, onBack }) {
  return (
    <View style={styles.heroInner}>
      <TouchableOpacity onPress={onBack} style={styles.heroBack} activeOpacity={0.8}>
        <Ionicons name="arrow-back" size={20} color={WHITE} />
      </TouchableOpacity>
      <View style={styles.heroBottom}>
        <Text style={styles.heroEmoji}>{city.emoji}</Text>
        <Text style={styles.heroName}>{city.name}</Text>
        <Text style={styles.heroProvince}>{city.province} Province</Text>
        <View style={styles.heroPills}>
          <View style={styles.heroPill}>
            <Ionicons name="people" size={11} color={WHITE} />
            <Text style={styles.heroPillText}>{city.population}</Text>
          </View>
          {city.tags.map(tag => (
            <View key={tag} style={[styles.heroPill, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
              <Text style={styles.heroPillText}>{tag}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.heroDesc} numberOfLines={3}>{city.description}</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // ── Hero ──
  hero: {
    width: W,
  },
  heroGrad: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heroInner: {
    flex: 1,
    justifyContent: 'space-between',
  },
  heroBack: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBottom: {
    gap: 4,
  },
  heroEmoji: {
    fontSize: 44,
    marginBottom: 4,
  },
  heroName: {
    color: WHITE,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.8,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroProvince: {
    color: WHITE + 'cc',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroPillText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: '700',
  },
  heroDesc: {
    color: WHITE + 'dd',
    fontSize: 13,
    lineHeight: 19,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // ── Stats bar ──
  statsBar: {
    flexDirection: 'row',
    backgroundColor: WHITE,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    paddingVertical: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 4,
  },
  statValue: {
    fontSize: 12.5,
    fontWeight: '900',
    color: DARK,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 9.5,
    color: MUTED,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  // ── Body ──
  body: {
    paddingHorizontal: 14,
    paddingTop: 14,
  },

  // ── Section ──
  section: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  sectionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: DARK,
  },

  // ── About ──
  aboutRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  aboutIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: ACCENT + '14',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  aboutContent: { flex: 1 },
  aboutLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  aboutText: {
    fontSize: 13,
    color: DARK,
    lineHeight: 19,
  },

  // ── Ratings ──
  ratingCard: {
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
  },
  ratingLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: DARK,
  },
  ratingDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
  },

  // ── Jobs ──
  jobGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 14,
  },
  jobChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#7c3aed' + '12',
    borderWidth: 1,
    borderColor: '#7c3aed' + '25',
  },
  jobChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7c3aed',
  },

  // ── Table ──
  tableCard: {
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  tableLabel: {
    fontSize: 13,
    color: DARK,
    flex: 1,
  },
  tableValue: {
    fontSize: 13,
    fontWeight: '700',
    color: ACCENT,
    textAlign: 'right',
    flexShrink: 0,
    marginLeft: 8,
  },

  // ── Food ──
  foodRowTappable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodRow: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    gap: 3,
  },
  foodLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  foodValue: {
    fontSize: 13,
    color: DARK,
    lineHeight: 18,
  },

  // ── Bullet ──
  bulletList: {
    padding: 14,
    gap: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletRowTappable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bullet: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 6,
    flexShrink: 0,
  },
  bulletText: {
    fontSize: 13,
    color: DARK,
    flex: 1,
    lineHeight: 19,
  },

  // ── Known for ──
  knownForWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 14,
  },
  knownChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: GOLD + '18',
    borderWidth: 1,
    borderColor: GOLD + '33',
  },
  knownChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
  },

  // ── Community ──
  communityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    margin: 12,
    borderRadius: 14,
  },
  communityBannerEmoji: { fontSize: 30, flexShrink: 0 },
  communityBannerTitle: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 3,
  },
  communityBannerSub: {
    color: WHITE + 'bb',
    fontSize: 11.5,
    lineHeight: 16,
  },
  communityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  communityItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: ACCENT + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityItemLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: DARK,
  },
  communityItemSub: {
    fontSize: 11,
    color: MUTED,
    marginTop: 1,
  },

  // ── Teaser ──
  tabsTeaser: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ACCENT + '28',
    backgroundColor: ACCENT + '08',
    marginBottom: 8,
  },
  tabsTeaserTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: BRAND,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  tabsTeaserSub: {
    fontSize: 12.5,
    color: MUTED,
    lineHeight: 18,
    marginBottom: 12,
  },
  tabsTeaserChips: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  tabsTeaserChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: ACCENT + '20',
    borderWidth: 1,
    borderColor: ACCENT + '40',
  },
  tabsTeaserChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: ACCENT,
  },
});
