import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, Animated, Image, Dimensions, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import { fetchCities } from './exploreApi';

const { width: SCREEN_W } = Dimensions.get('window');
const H_PAD  = 14;
const GAP    = 10;
const CARD_W = (SCREEN_W - H_PAD * 2 - GAP) / 2;
const CARD_H = CARD_W * 1.32;

// ─── Palette ──────────────────────────────────────────────────────────────────
const BRAND = '#0c3f44';
const TEAL  = '#1f8e93';
const GOLD  = '#d4a017';
const BG    = '#f0f5f6';
const DARK  = '#0d2b2e';
const MUTED = '#5f7275';
const WHITE = '#ffffff';

const a = (hex, alpha) => {
  const n = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${hex}${n}`;
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ width, height, radius = 8 }) {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.85, duration: 750, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4,  duration: 750, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{ width, height, borderRadius: radius, backgroundColor: '#c8dbdd', opacity: anim }} />
  );
}

function SkeletonRow() {
  return (
    <View style={s.row}>
      <View style={{ gap: 7 }}>
        <Skeleton width={CARD_W} height={CARD_H} radius={18} />
        <Skeleton width={CARD_W * 0.55} height={11} radius={5} />
      </View>
      <View style={{ gap: 7 }}>
        <Skeleton width={CARD_W} height={CARD_H} radius={18} />
        <Skeleton width={CARD_W * 0.7} height={11} radius={5} />
      </View>
    </View>
  );
}

// ─── City card ────────────────────────────────────────────────────────────────
function CityCard({ item, onPress }) {
  return (
    <TouchableOpacity style={s.card} onPress={() => onPress(item)} activeOpacity={0.87}>
      <View style={s.cardImgWrap}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <LinearGradient colors={[BRAND, TEAL]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="location" size={30} color="rgba(255,255,255,0.4)" style={{ alignSelf: 'center', marginTop: CARD_H * 0.35 }} />
          </LinearGradient>
        )}
        {/* Gradient scrim */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.78)']}
          style={s.scrim}
        />
        {/* Featured badge */}
        {!!item.featured && (
          <View style={s.featuredBadge}>
            <Ionicons name="star" size={8} color={GOLD} />
            <Text style={s.featuredTxt}>Featured</Text>
          </View>
        )}
        {/* Live badge */}
        {item.status === 'active' && (
          <View style={s.liveBadge}>
            <View style={s.liveDot} />
            <Text style={s.liveTxt}>Live</Text>
          </View>
        )}
        {/* Name overlay */}
        <View style={s.cardOverlay}>
          {!!item.country && (
            <Text style={s.cardCountry} numberOfLines={1}>{item.country.toUpperCase()}</Text>
          )}
          <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
        </View>
      </View>
      {/* Description below image */}
      {!!item.description && (
        <Text style={s.cardDesc} numberOfLines={2}>{item.description}</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ExploreHome() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();
  const { user }   = useAuth();

  const [cities,  setCities]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState('');

  // Auth guard
  useEffect(() => {
    if (!user) navigation.replace('Login');
  }, [user]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchCities();
      // Handle: { data: [...] } or { data: { cities: [...] } }
      const raw = res.data?.data;
      setCities(Array.isArray(raw) ? raw : (raw?.cities ?? []));
    } catch (err) {
      if (err?.response?.status === 401) navigation.replace('Login');
      else setError('Could not load cities. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user]);

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return cities;
    const q = search.trim().toLowerCase();
    return cities.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.country?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    );
  }, [search, cities]);

  // Group into rows of 2
  const rows = useMemo(() => {
    const data = loading ? Array(6).fill(null) : filtered;
    const out = [];
    for (let i = 0; i < data.length; i += 2) {
      out.push([data[i], data[i + 1] ?? null]);
    }
    return out;
  }, [filtered, loading]);

  const goToCity = useCallback((item) => {
    navigation.navigate('ExploreCityDetail', {
      slug:        item.slug,
      cityName:    item.name,
      cityImage:   item.image,
      description: item.description,
    });
  }, [navigation]);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} translucent={false} />

      {/* ── Hero ── */}
      <LinearGradient
        colors={[BRAND, '#10545b', TEAL]}
        style={[s.hero, { paddingTop: insets.top + 14 }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <View style={s.blob1} />
        <View style={s.blob2} />

        {/* Top row */}
        <View style={s.heroTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={WHITE} />
          </TouchableOpacity>
          <View style={s.heroBadge}>
            <Ionicons name="compass" size={11} color={WHITE} />
            <Text style={s.heroBadgeTxt}>HAFRIK EXPLORE</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={s.heroTitle}>Discover Cities{'\n'}in China</Text>
        <Text style={s.heroSub}>
          Attractions · Food · Markets · Hotels{'\n'}Services tailored for African travellers.
        </Text>

        {/* Stats strip */}
        <View style={s.statsStrip}>
          {[
            { val: loading ? '—' : String(cities.length), lbl: 'Cities' },
            { val: 'Verified',   lbl: 'Services' },
            { val: 'African',    lbl: 'Friendly' },
          ].map((st, i) => (
            <View key={i} style={[s.statItem, i < 2 && s.statBorder]}>
              <Text style={s.statVal}>{st.val}</Text>
              <Text style={s.statLbl}>{st.lbl}</Text>
            </View>
          ))}
        </View>

        {/* Search bar */}
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={16} color={MUTED} />
          <TextInput
            style={s.searchInput}
            placeholder="Search cities…"
            placeholderTextColor={a(DARK, 0.4)}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={MUTED} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* ── Error ── */}
      {error ? (
        <View style={s.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={a(MUTED, 0.55)} />
          <Text style={s.errorTxt}>{error}</Text>
          <TouchableOpacity onPress={load} style={s.retryBtn}>
            <Text style={s.retryTxt}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 30 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            !loading && cities.length > 0 ? (
              <View style={s.listMeta}>
                <Text style={s.listMetaTxt}>
                  {filtered.length} {filtered.length === 1 ? 'city' : 'cities'}
                  {search.trim() ? ` for "${search.trim()}"` : ' available'}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item: pair }) =>
            loading ? (
              <SkeletonRow />
            ) : (
              <View style={s.row}>
                <CityCard item={pair[0]} onPress={goToCity} />
                {pair[1] ? (
                  <CityCard item={pair[1]} onPress={goToCity} />
                ) : (
                  <View style={{ width: CARD_W }} />
                )}
              </View>
            )
          }
          ListEmptyComponent={
            !loading ? (
              <View style={s.emptyWrap}>
                <Ionicons name="location-outline" size={44} color={a(MUTED, 0.4)} />
                <Text style={s.emptyTitle}>
                  {search ? `No cities match "${search}"` : 'No cities yet'}
                </Text>
                <Text style={s.emptySub}>
                  {search ? 'Try a different name or clear the search.' : 'Check back soon as we expand.'}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Hero
  hero:  { paddingHorizontal: 20, paddingBottom: 18, overflow: 'hidden' },
  blob1: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,255,255,0.05)', right: -70, top: -70 },
  blob2: { position: 'absolute', width: 160, height: 160, borderRadius: 80,  backgroundColor: 'rgba(255,255,255,0.04)', left: -40, bottom: -20 },
  heroTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  iconBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroBadge:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  heroBadgeTxt:{ color: WHITE, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  heroTitle:   { color: WHITE, fontSize: 28, fontWeight: '800', lineHeight: 36, marginBottom: 10 },
  heroSub:     { color: 'rgba(255,255,255,0.72)', fontSize: 13, lineHeight: 19, marginBottom: 20 },
  statsStrip:  { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', marginBottom: 16 },
  statItem:    { flex: 1, alignItems: 'center', paddingVertical: 11 },
  statBorder:  { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.15)' },
  statVal:     { color: WHITE, fontSize: 15, fontWeight: '800', marginBottom: 2 },
  statLbl:     { color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '600' },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: WHITE, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 11,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  searchInput: { flex: 1, fontSize: 14, color: DARK, padding: 0 },

  // List
  list:     { paddingHorizontal: H_PAD, paddingTop: 14 },
  listMeta: { marginBottom: 12 },
  listMetaTxt: { color: MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },

  // Row of 2 cards
  row: { flexDirection: 'row', gap: GAP, marginBottom: GAP + 4 },

  // Card
  card:       { width: CARD_W },
  cardImgWrap: {
    width: CARD_W, height: CARD_H,
    borderRadius: 18, overflow: 'hidden',
    backgroundColor: a(TEAL, 0.12),
  },
  scrim:    { position: 'absolute', bottom: 0, left: 0, right: 0, height: '58%' },
  cardOverlay: { position: 'absolute', bottom: 12, left: 11, right: 11 },
  cardCountry: { color: 'rgba(255,255,255,0.65)', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 3 },
  cardName:    { color: WHITE, fontSize: 17, fontWeight: '800', letterSpacing: -0.4 },
  cardDesc:    { color: MUTED, fontSize: 11, lineHeight: 15, marginTop: 7 },

  // Badges
  featuredBadge: {
    position: 'absolute', top: 9, left: 9,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.52)', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  featuredTxt: { color: GOLD, fontSize: 9, fontWeight: '800' },
  liveBadge: {
    position: 'absolute', top: 9, right: 9,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.52)', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  liveTxt: { color: WHITE, fontSize: 9, fontWeight: '700' },

  // States
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
  errorTxt:  { color: MUTED, fontSize: 13.5, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 },
  retryBtn:  { backgroundColor: a(TEAL, 0.1), borderRadius: 12, borderWidth: 1, borderColor: a(TEAL, 0.25), paddingHorizontal: 22, paddingVertical: 10 },
  retryTxt:  { color: TEAL, fontSize: 13, fontWeight: '700' },
  emptyWrap: { paddingTop: 50, alignItems: 'center', gap: 8, paddingHorizontal: 32 },
  emptyTitle:{ color: DARK, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  emptySub:  { color: MUTED, fontSize: 12.5, textAlign: 'center', lineHeight: 18 },
});
