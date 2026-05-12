import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, StatusBar, Image, Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import { fetchCityHome } from './exploreApi';

const { width: W } = Dimensions.get('window');

// ─── Palette ──────────────────────────────────────────────────────────────────
const BRAND  = '#0c3f44';
const TEAL   = '#1f8e93';
const GOLD   = '#d4a017';
const GREEN  = '#1a9e5c';
const BG     = '#f4f9fa';
const CARD   = '#ffffff';
const BORDER = '#ddeaec';
const DARK   = '#0d2b2e';
const MUTED  = '#5f7275';
const WHITE  = '#ffffff';

const a = (hex, alpha) => {
  const n = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${hex}${n}`;
};

// ─── Tabs config ──────────────────────────────────────────────────────────────
const TABS = [
  { key: 'all',          label: 'All',          icon: 'apps-outline'         },
  { key: 'attractions',  label: 'Attractions',  icon: 'camera-outline'       },
  { key: 'restaurants',  label: 'Food',         icon: 'restaurant-outline'   },
  { key: 'african_food', label: 'African Food', icon: 'leaf-outline'         },
  { key: 'markets',      label: 'Markets',      icon: 'storefront-outline'   },
  { key: 'hotels',       label: 'Hotels',       icon: 'bed-outline'          },
  { key: 'nightlife',    label: 'Nightlife',    icon: 'moon-outline'         },
  { key: 'services',     label: 'Services',     icon: 'briefcase-outline'    },
];

const TYPE_COLORS = {
  attractions:  TEAL,
  restaurants:  '#e67e22',
  african_food: GREEN,
  markets:      GOLD,
  hotels:       '#8b5cf6',
  nightlife:    '#e91e8c',
  services:     BRAND,
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Sk({ w, h, r = 8, style }) {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4,  duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[{ width: w, height: h, borderRadius: r, backgroundColor: '#d4e3e5', opacity: anim }, style]} />;
}

function HeroSkeleton() {
  return (
    <View>
      <Sk w="100%" h={260} r={0} />
      <View style={{ padding: 16, gap: 10 }}>
        <Sk w="50%" h={18} />
        <Sk w="85%" h={13} />
        <Sk w="70%" h={13} />
      </View>
    </View>
  );
}

function PlaceCardSkeleton() {
  return (
    <View style={[pc.card, { marginRight: 12 }]}>
      <Sk w={160} h={120} r={14} />
      <View style={{ padding: 10, gap: 7 }}>
        <Sk w={100} h={12} />
        <Sk w={70}  h={10} />
        <Sk w={80}  h={10} />
      </View>
    </View>
  );
}

function ServiceCardSkeleton() {
  return (
    <View style={[sc.card, { marginRight: 12 }]}>
      <View style={{ flexDirection: 'row', gap: 10, padding: 12 }}>
        <Sk w={44} h={44} r={22} />
        <View style={{ gap: 7, flex: 1 }}>
          <Sk w="70%" h={13} />
          <Sk w="50%" h={10} />
        </View>
      </View>
    </View>
  );
}

// ─── Place card (compact, horizontal scroll) ──────────────────────────────────
function PlaceCard({ item, onPress, accentColor }) {
  const img    = item.images?.[0];
  const color  = accentColor ?? TEAL;
  const rating = item.rating ? parseFloat(item.rating).toFixed(1) : null;

  return (
    <TouchableOpacity style={[pc.card, { marginRight: 12 }]} onPress={onPress} activeOpacity={0.88}>
      <View style={pc.imgWrap}>
        {img ? (
          <Image source={{ uri: img }} style={pc.img} resizeMode="cover" />
        ) : (
          <LinearGradient colors={[color, BRAND]} style={pc.imgFallback}>
            <Ionicons name="image-outline" size={28} color={WHITE} />
          </LinearGradient>
        )}
        {item.is_featured == 1 && (
          <View style={pc.featuredBadge}>
            <Ionicons name="star" size={9} color={GOLD} />
            <Text style={pc.featuredTxt}>Featured</Text>
          </View>
        )}
        {item.type && (
          <View style={[pc.typeBadge, { backgroundColor: a(color, 0.85) }]}>
            <Text style={pc.typeTxt}>{item.type}</Text>
          </View>
        )}
      </View>
      <View style={pc.body}>
        <Text style={pc.name} numberOfLines={1}>{item.name}</Text>
        {!!item.city_area && (
          <View style={pc.areaRow}>
            <Ionicons name="location-outline" size={11} color={MUTED} />
            <Text style={pc.areaText} numberOfLines={1}>{item.city_area}</Text>
          </View>
        )}
        <View style={pc.metaRow}>
          {rating && (
            <View style={pc.ratingPill}>
              <Ionicons name="star" size={10} color={GOLD} />
              <Text style={pc.ratingTxt}>{rating}</Text>
            </View>
          )}
          {(item.price_range || item.ticket_price) && (
            <Text style={pc.price} numberOfLines={1}>{item.price_range ?? item.ticket_price}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const pc = StyleSheet.create({
  card:      { width: 160, backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  imgWrap:   { height: 120, position: 'relative' },
  img:       { width: '100%', height: '100%' },
  imgFallback:{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  featuredBadge: { position: 'absolute', top: 7, left: 7, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3 },
  featuredTxt:   { color: GOLD, fontSize: 9, fontWeight: '700' },
  typeBadge: { position: 'absolute', bottom: 7, right: 7, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  typeTxt:   { color: WHITE, fontSize: 9, fontWeight: '700', textTransform: 'capitalize' },
  body:      { padding: 10, gap: 5 },
  name:      { color: DARK, fontSize: 13, fontWeight: '700' },
  areaRow:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
  areaText:  { color: MUTED, fontSize: 11 },
  metaRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  ratingPill:{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: a(GOLD, 0.1), borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  ratingTxt: { color: GOLD, fontSize: 11, fontWeight: '700' },
  price:     { color: MUTED, fontSize: 11, flex: 1 },
});

// ─── Service card (compact) ───────────────────────────────────────────────────
function ServiceCard({ item, onPress }) {
  const img  = item.display_image ?? item.profile_picture;
  const name = item.display_name  ?? item.provider_name ?? item.business_name ?? 'Provider';
  const rating = item.rating ? parseFloat(item.rating).toFixed(1) : null;
  const langs  = Array.isArray(item.languages) ? item.languages : (item.languages ? [item.languages] : []);

  return (
    <TouchableOpacity style={[sc.card, { marginRight: 12 }]} onPress={onPress} activeOpacity={0.88}>
      <View style={sc.top}>
        {img ? (
          <Image source={{ uri: img }} style={sc.avatar} />
        ) : (
          <LinearGradient colors={[BRAND, TEAL]} style={sc.avatarFallback}>
            <Text style={sc.avatarInitial}>{name[0]?.toUpperCase() ?? '?'}</Text>
          </LinearGradient>
        )}
        <View style={{ flex: 1 }}>
          <Text style={sc.name} numberOfLines={1}>{name}</Text>
          <View style={sc.typeRow}>
            <Text style={sc.typeTxt}>{item.type?.replace(/_/g, ' ')}</Text>
            {item.verification_status === 'verified' && (
              <Ionicons name="checkmark-circle" size={13} color={TEAL} />
            )}
          </View>
          {rating && (
            <View style={sc.ratingRow}>
              <Ionicons name="star" size={10} color={GOLD} />
              <Text style={sc.ratingTxt}>{rating}</Text>
            </View>
          )}
        </View>
      </View>
      {langs.length > 0 && (
        <View style={sc.langRow}>
          <Ionicons name="language-outline" size={11} color={MUTED} />
          <Text style={sc.langTxt} numberOfLines={1}>{langs.slice(0, 2).join(' · ')}</Text>
        </View>
      )}
      {!!item.price_range && (
        <Text style={sc.price} numberOfLines={1}>{item.price_range}</Text>
      )}
    </TouchableOpacity>
  );
}

const sc = StyleSheet.create({
  card:         { width: 180, backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 12 },
  top:          { flexDirection: 'row', gap: 10, marginBottom: 8 },
  avatar:       { width: 44, height: 44, borderRadius: 22 },
  avatarFallback:{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarInitial:{ color: WHITE, fontSize: 18, fontWeight: '800' },
  name:         { color: DARK, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  typeRow:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  typeTxt:      { color: MUTED, fontSize: 11, textTransform: 'capitalize' },
  ratingRow:    { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  ratingTxt:    { color: GOLD, fontSize: 11, fontWeight: '700' },
  langRow:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  langTxt:      { color: MUTED, fontSize: 11, flex: 1 },
  price:        { color: TEAL, fontSize: 12, fontWeight: '600' },
});

// ─── Section row (title + horizontal scroll) ──────────────────────────────────
function Section({ title, icon, color, data, renderCard, skeletonCount = 3, loading }) {
  if (!loading && (!data || data.length === 0)) return null;
  return (
    <View style={sx.wrap}>
      <View style={sx.head}>
        <View style={[sx.iconBox, { backgroundColor: a(color, 0.1) }]}>
          <Ionicons name={icon} size={15} color={color} />
        </View>
        <Text style={sx.title}>{title}</Text>
      </View>
      <FlatList
        data={loading ? Array(skeletonCount).fill(null) : data}
        keyExtractor={(item, i) => item ? (item.id ?? String(i)) : String(i)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 0 }}
        renderItem={({ item }) => renderCard(item)}
      />
    </View>
  );
}

const sx = StyleSheet.create({
  wrap:   { marginBottom: 28 },
  head:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  iconBox:{ width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  title:  { color: DARK, fontSize: 15, fontWeight: '800' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function CityDetailScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const insets     = useSafeAreaInsets();
  const { user }   = useAuth();

  const { slug, cityName, cityImage, description } = route.params ?? {};

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const tabScrollRef = useRef(null);

  useEffect(() => {
    if (!user) { navigation.replace('Login'); return; }
    (async () => {
      try {
        setLoading(true);
        const res = await fetchCityHome(slug);
        setData(res.data?.data ?? null);
      } catch (err) {
        if (err?.response?.status === 401) {
          navigation.replace('Login');
        } else {
          setError('Could not load city data.');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const places   = data?.places   ?? {};
  const services = data?.services ?? {};

  const allServices = [
    ...(services.translators          ?? []),
    ...(services.shipping_agents      ?? []),
    ...(services.sourcing_agents      ?? []),
    ...(services.airport_pickup       ?? []),
    ...(services.tour_guides          ?? []),
    ...(services.business_assistants  ?? []),
  ];

  const goPlace   = useCallback((place)   => navigation.navigate('ExplorePlaceDetail',   { place }),   []);
  const goService = useCallback((service) => navigation.navigate('ExploreServiceDetail', { service }), []);

  const renderPlaceCard = (color) => (item) =>
    item == null
      ? <PlaceCardSkeleton />
      : <PlaceCard item={item} accentColor={color} onPress={() => goPlace(item)} />;

  const renderServiceCard = (item) =>
    item == null
      ? <ServiceCardSkeleton />
      : <ServiceCard item={item} onPress={() => goService(item)} />;

  // Which sections to show for current tab
  const tabSections = {
    all: [
      { key: 'attractions',  title: 'Top Attractions', icon: 'camera-outline',     color: TEAL,      data: places.attractions },
      { key: 'markets',      title: 'Markets',         icon: 'storefront-outline', color: GOLD,      data: places.markets     },
      { key: 'african_food', title: 'African Food',    icon: 'leaf-outline',       color: GREEN,     data: places.african_food},
      { key: 'restaurants',  title: 'Restaurants',     icon: 'restaurant-outline', color: '#e67e22', data: places.restaurants },
      { key: 'hotels',       title: 'Hotels',          icon: 'bed-outline',        color: '#8b5cf6', data: places.hotels      },
      { key: 'nightlife',    title: 'Nightlife',       icon: 'moon-outline',       color: '#e91e8c', data: places.nightlife   },
      { key: 'services',     title: 'Verified Services',icon:'briefcase-outline',  color: BRAND,     data: allServices, isService: true },
    ],
    attractions:  [{ key: 'attractions',  title: 'Attractions',    icon: 'camera-outline',     color: TEAL,      data: places.attractions }],
    restaurants:  [{ key: 'restaurants',  title: 'Restaurants',    icon: 'restaurant-outline', color: '#e67e22', data: places.restaurants }],
    african_food: [{ key: 'african_food', title: 'African Food',   icon: 'leaf-outline',       color: GREEN,     data: places.african_food}],
    markets:      [{ key: 'markets',      title: 'Markets',        icon: 'storefront-outline', color: GOLD,      data: places.markets     }],
    hotels:       [{ key: 'hotels',       title: 'Hotels',         icon: 'bed-outline',        color: '#8b5cf6', data: places.hotels      }],
    nightlife:    [{ key: 'nightlife',    title: 'Nightlife',      icon: 'moon-outline',       color: '#e91e8c', data: places.nightlife   }],
    services:     [{ key: 'services',     title: 'Verified Services',icon:'briefcase-outline', color: BRAND,     data: allServices, isService: true }],
  };

  const currentSections = tabSections[activeTab] ?? tabSections.all;
  const hasAnyContent   = currentSections.some(sec => (sec.data?.length ?? 0) > 0);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} translucent={false} />

      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>

        {/* ── Hero (scrolls away) ── */}
        {loading ? <HeroSkeleton /> : (
          <View style={s.heroWrap}>
            {cityImage ? (
              <Image source={{ uri: cityImage }} style={s.heroImg} resizeMode="cover" />
            ) : (
              <LinearGradient colors={[BRAND, TEAL]} style={s.heroImg}>
                <Ionicons name="location" size={60} color={WHITE} />
              </LinearGradient>
            )}
            <LinearGradient
              colors={['rgba(0,0,0,0.18)', 'rgba(0,0,0,0.7)']}
              style={s.heroOverlay}
            />
            <View style={[s.heroContent, { paddingTop: insets.top + 12 }]}>
              <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
                <Ionicons name="arrow-back" size={20} color={WHITE} />
              </TouchableOpacity>
              <View style={s.heroBottom}>
                <Text style={s.heroCountry}>{data?.city?.country ?? ''}</Text>
                <Text style={s.heroName}>{cityName ?? data?.city?.name}</Text>
                {!!description && (
                  <Text style={s.heroDesc} numberOfLines={2}>{description}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* ── Sticky tab bar ── */}
        <View style={s.tabBarWrap}>
          <ScrollView
            ref={tabScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.tabBar}
          >
            {TABS.map(tab => {
              const active = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[s.tab, active && { backgroundColor: TEAL, borderColor: TEAL }]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={tab.icon} size={13} color={active ? WHITE : MUTED} />
                  <Text style={[s.tabTxt, active && { color: WHITE }]}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Content ── */}
        <View style={s.body}>
          {error ? (
            <View style={s.errorWrap}>
              <Ionicons name="cloud-offline-outline" size={44} color={a(MUTED, 0.5)} />
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          ) : (
            <>
              {currentSections.map(sec => (
                <Section
                  key={sec.key}
                  title={sec.title}
                  icon={sec.icon}
                  color={sec.color}
                  loading={loading}
                  data={sec.data}
                  renderCard={sec.isService ? renderServiceCard : renderPlaceCard(sec.color)}
                />
              ))}
              {!loading && !hasAnyContent && (
                <View style={s.emptyWrap}>
                  <Ionicons name="search-outline" size={44} color={a(MUTED, 0.5)} />
                  <Text style={s.emptyTxt}>Nothing here yet</Text>
                  <Text style={s.emptySubTxt}>No {TABS.find(t => t.key === activeTab)?.label?.toLowerCase()} listed for this city yet.</Text>
                </View>
              )}
            </>
          )}
        </View>

        <View style={{ height: insets.bottom + 30 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Hero
  heroWrap:    { height: 280, position: 'relative' },
  heroImg:     { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroContent: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, paddingHorizontal: 16, justifyContent: 'space-between', paddingBottom: 20 },
  backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  heroBottom:  {},
  heroCountry: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  heroName:    { color: WHITE, fontSize: 28, fontWeight: '800', marginBottom: 6 },
  heroDesc:    { color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 18 },

  // Tab bar (sticky)
  tabBarWrap: { backgroundColor: BG, borderBottomWidth: 1, borderBottomColor: BORDER },
  tabBar:     { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tab:        { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: CARD, borderRadius: 20, borderWidth: 1.5, borderColor: BORDER, paddingHorizontal: 12, paddingVertical: 7 },
  tabTxt:     { color: MUTED, fontSize: 12, fontWeight: '700' },

  // Body
  body:       { paddingTop: 22 },

  // Error / Empty
  errorWrap:  { alignItems: 'center', paddingTop: 60, gap: 10 },
  errorTxt:   { color: MUTED, fontSize: 14, fontWeight: '600' },
  emptyWrap:  { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32, gap: 8 },
  emptyTxt:   { color: DARK, fontSize: 16, fontWeight: '800' },
  emptySubTxt:{ color: MUTED, fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
