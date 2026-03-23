// src/pages/blogs/ArticlesScreen.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, TextInput, ActivityIndicator, Image, RefreshControl, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fetchArticles,
  fetchTrendingArticles,
  fetchMostReadWeekArticles,
} from './articlesApi';
import { ArticleCard } from './ArticleCard';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../AuthContext';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || '').replace('#', '');
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0');
  return `#${normalized}${alpha}`;
};

const LIMIT        = 8;
const SCREEN_W     = Dimensions.get('window').width;
const SLIDER_W     = Math.round(SCREEN_W * 0.82);
const SLIDER_H     = 200;
const SLIDER_SNAP  = SLIDER_W + 12;
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const WARM   = Colors.warm;
const MUTED  = Colors.secondaryText;
const DARK   = Colors.deepSlate;
const WHITE  = Colors.white;
const CREAM  = Colors.background;
const BORDER = BRAND + '14';

const ON_DARK_14 = WHITE + '24';
const ON_DARK_55 = WHITE + '8C';

const FALLBACK_IMAGE = 'https://s3.ap-northeast-1.wasabisys.com/hafriksocial/uploads/photos/2026/01/hafrik_2b884253077d991796e12f7d1d13d243.png';

const fmtViews = (n) => {
  const num = Number(n || 0);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return String(num);
};

// ─── Ad banner ────────────────────────────────────────────────────────────────
const AdBanner = () => (
  <View style={ads.wrap}>
    <View style={ads.sponsorRow}>
      <Ionicons name="megaphone-outline" size={11} color={MUTED} />
      <Text style={ads.sponsorTxt}>Sponsored</Text>
    </View>
    <View style={ads.body}>
      <View style={ads.imgBox}>
        <Ionicons name="storefront-outline" size={26} color={ACCENT} />
      </View>
      <View style={ads.text}>
        <Text style={ads.adTitle} numberOfLines={2}>Grow your business with Hafrik</Text>
        <Text style={ads.adSub}>Reach thousands across Africa. Advertise your brand today.</Text>
        <View style={ads.cta}>
          <Text style={ads.ctaTxt}>Learn More</Text>
          <Ionicons name="arrow-forward" size={12} color={ACCENT} />
        </View>
      </View>
    </View>
  </View>
);

// ─── Featured slider card ──────────────────────────────────────────────────────
const SliderCard = ({ item, onPress }) => (
  <TouchableOpacity style={sl.card} onPress={onPress} activeOpacity={0.84}>
    <Image
      source={{ uri: item.image || FALLBACK_IMAGE }}
      style={sl.image}
      resizeMode="cover"
    />
    <LinearGradient
      colors={['transparent', withOpacity(Colors.deepSlate, 0.92)]}
      style={sl.grad}
    />
    <View style={sl.badge}>
      <Ionicons name="flame" size={10} color={WHITE} />
      <Text style={sl.badgeTxt}>FEATURED</Text>
    </View>
    <View style={sl.bottom}>
      {!!item.category_name && (
        <View style={sl.catPill}>
          <Text style={sl.catTxt}>{item.category_name}</Text>
        </View>
      )}
      <Text style={sl.title} numberOfLines={2}>{item.title}</Text>
      <View style={sl.meta}>
        <Ionicons name="eye-outline" size={12} color={ON_DARK_55} />
        <Text style={sl.metaTxt}>{fmtViews(item.views)} views</Text>
      </View>
    </View>
  </TouchableOpacity>
);

// ─── Most-read-week compact card ───────────────────────────────────────────────
const WeekCard = ({ item, index, onPress }) => (
  <TouchableOpacity style={wk.card} onPress={onPress} activeOpacity={0.82}>
    <View style={wk.rank}>
      <Text style={wk.rankTxt}>#{index + 1}</Text>
    </View>
    <Text style={wk.title} numberOfLines={3}>{item.title}</Text>
    <View style={wk.footer}>
      <Ionicons name="eye-outline" size={12} color={MUTED} />
      <Text style={wk.views}>{fmtViews(item.views)}</Text>
    </View>
  </TouchableOpacity>
);

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ArticlesScreen({ navigation }) {
  const { top } = useSafeAreaInsets();
  const { user } = useAuth();
  const isVerified = user?.verified_value === 1 || user?.verified_value === true ||
                     user?.verified === 1 || user?.verified === true ||
                     user?.is_verified === true || user?.is_verified === 1;

  const [trending,        setTrending]        = useState([]);
  const [mostRead,        setMostRead]        = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);

  const [articles,    setArticles]    = useState([]);
  const [search,      setSearch]      = useState('');
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(true);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState(null);

  const abortRef  = useRef(null);
  const skipFirst = useRef(true);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // Load trending + most-read on mount
  useEffect(() => {
    let mounted = true;
    setSectionsLoading(true);
    Promise.all([fetchTrendingArticles(10), fetchMostReadWeekArticles(10)])
      .then(([t, w]) => { if (mounted) { setTrending([...t].sort(() => Math.random() - 0.5)); setMostRead(w); } })
      .catch(() => {})
      .finally(() => { if (mounted) setSectionsLoading(false); });
    return () => { mounted = false; };
  }, []);

  const fetchPage = useCallback(async (pageNum, q, replace) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const data = await fetchArticles({ page: pageNum, limit: LIMIT, q: q || undefined }, ctrl.signal);
      setArticles(prev => replace ? data : [...prev, ...data]);
      setHasMore(data.length >= LIMIT);
      setPage(pageNum);
      setError(null);
    } catch (e) {
      if (e.name !== 'AbortError') setError(`Could not load articles: ${e.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchPage(1, '', true); }, []);

  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return; }
    const t = setTimeout(() => { setLoading(true); fetchPage(1, search, true); }, 400);
    return () => clearTimeout(t);
  }, [search, fetchPage]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchTrendingArticles(10), fetchMostReadWeekArticles(10)])
      .then(([t, w]) => { setTrending([...t].sort(() => Math.random() - 0.5)); setMostRead(w); })
      .catch(() => {});
    fetchPage(1, search, true);
  }, [search, fetchPage]);

  const onEndReached = useCallback(() => {
    if (!hasMore || loadingMore || loading || refreshing) return;
    setLoadingMore(true);
    fetchPage(page + 1, search, false);
  }, [hasMore, loadingMore, loading, refreshing, page, search, fetchPage]);

  const openArticle = useCallback((item) => {
    navigation.navigate('ArticleDetails', { postId: item.post_id, link: item.link, title: item.title });
  }, [navigation]);

  // Build 2-per-row + ad entries from articles
  const processedData = useMemo(() => {
    const rows = [];
    let rowCount = 0;
    for (let i = 0; i < articles.length; i += 2) {
      rows.push({ _type: 'row', id: `row-${i}`, items: articles.slice(i, i + 2) });
      rowCount += 1;
      // inject ad every 3 rows (= every 6 articles), skip if nothing after
      if (rowCount % 3 === 0 && i + 2 < articles.length) {
        rows.push({ _type: 'ad', id: `ad-${i}` });
      }
    }
    return rows;
  }, [articles]);

  const renderRow = useCallback(({ item }) => {
    if (item._type === 'ad') return <AdBanner />;
    return (
      <View style={st.gridRow}>
        {item.items.map((a) => (
          <ArticleCard key={String(a.id)} item={a} onPress={() => openArticle(a)} />
        ))}
        {item.items.length === 1 && <View style={{ flex: 1 }} />}
      </View>
    );
  }, [openArticle]);

  const listHeaderElement = (
    <View>
      {/* ── Hero block (same pattern as BusinessList / CommunitiesScreen) ── */}
      <View style={st.heroBlock}>
        <View style={st.heroPills}>
          <View style={st.heroLivePill}>
            <View style={st.heroLiveDot} />
            <Text style={st.heroLiveText}>ARTICLES</Text>
          </View>
          {trending.length > 0 && (
            <View style={st.heroCountPill}>
              <Ionicons name="flame" size={10} color={WHITE + 'BF'} />
              <Text style={st.heroCountText}>{trending.length}+ Trending</Text>
            </View>
          )}
        </View>

        <Text style={st.heroTitle}>Read, Explore{'\n'}&amp; Stay Informed.</Text>
        <Text style={st.heroSub}>
          Stories, guides, and updates from Africa and the world.
        </Text>

        <View style={st.heroStats}>
          <View style={st.heroStatItem}>
            <Text style={st.heroStatNum}>{trending.length > 0 ? `${trending.length}+` : '—'}</Text>
            <Text style={st.heroStatLabel}>TRENDING</Text>
          </View>
          <View style={st.heroStatDivider} />
          <View style={st.heroStatItem}>
            <Text style={st.heroStatNum}>{mostRead.length > 0 ? `${mostRead.length}+` : '—'}</Text>
            <Text style={st.heroStatLabel}>THIS WEEK</Text>
          </View>
          <View style={st.heroStatDivider} />
          <View style={st.heroStatItem}>
            <Text style={st.heroStatNum}>{articles.length > 0 ? `${articles.length}+` : '—'}</Text>
            <Text style={st.heroStatLabel}>ARTICLES</Text>
          </View>
        </View>

        {/* Search */}
        <View style={st.heroSearch}>
          <Ionicons name="search" size={19} color={WHITE + 'BF'} />
          <TextInput
            style={st.searchInput}
            placeholder="Search articles…"
            placeholderTextColor={WHITE + '70'}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          <TouchableOpacity activeOpacity={0.85} style={st.heroSearchBtn} onPress={() => setSearch('')}>
            {search.length > 0
              ? <Ionicons name="close" size={16} color={BRAND} />
              : <Ionicons name="arrow-forward" size={17} color={BRAND} />
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Featured slider ── */}
      {!sectionsLoading && trending.length > 0 && (
        <View>
          <View style={st.sectionBar}>
            <View style={st.sectionAccent} />
            <Text style={st.sectionBarText}>FEATURED</Text>
            <Ionicons name="flame" size={13} color={WARM} style={{ marginLeft: 4 }} />
          </View>
          <FlatList
            data={trending}
            keyExtractor={item => `slider-${item.id}`}
            renderItem={({ item }) => <SliderCard item={item} onPress={() => openArticle(item)} />}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={st.scrollRow}
            snapToInterval={SLIDER_SNAP}
            decelerationRate="fast"
          />
        </View>
      )}

      {/* ── Most read this week ── */}
      {!sectionsLoading && mostRead.length > 0 && (
        <View>
          <View style={st.sectionBar}>
            <View style={st.sectionAccent} />
            <Text style={st.sectionBarText}>MOST READ THIS WEEK</Text>
          </View>
          <FlatList
            data={mostRead}
            keyExtractor={item => `week-${item.id}`}
            renderItem={({ item, index }) => (
              <WeekCard item={item} index={index} onPress={() => openArticle(item)} />
            )}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={st.scrollRow}
          />
        </View>
      )}

      {sectionsLoading && (
        <View style={st.skeleton}>
          <ActivityIndicator size="small" color={BRAND} />
        </View>
      )}

      {/* ── Section label ── */}
      <View style={st.sectionBar}>
        <View style={st.sectionAccent} />
        <Text style={st.sectionBarText}>ALL ARTICLES</Text>
        {articles.length > 0 && <Text style={st.sectionCount}>{articles.length} results</Text>}
      </View>
    </View>
  );

  return (
    <View style={st.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      {/* Flat header — back only */}
      <View style={[st.header, { paddingTop: top + 12 }]}>
        <View style={st.headerTop}>
          {/* Left — fixed width to balance right side */}
          <View style={st.headerSide}>
            <TouchableOpacity style={st.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={20} color={WHITE} />
            </TouchableOpacity>
          </View>

          {/* Center — logo truly centered */}
          <View style={st.headerCenter} pointerEvents="none">
            <Image source={require('../../assl.js/Layer 3.png')} style={st.headerLogo} resizeMode="contain" />
          </View>

          {/* Right — same fixed width as left */}
          <View style={[st.headerSide, { alignItems: 'flex-end' }]}>
            {isVerified && (
              <TouchableOpacity style={st.createBtn} onPress={() => navigation.navigate('CreateArticle')} activeOpacity={0.85}>
                <Ionicons name="create-outline" size={15} color={WHITE} />
                <Text style={st.createBtnTxt}>Write</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <FlatList
        data={processedData}
        keyExtractor={item => item.id}
        renderItem={renderRow}
        contentContainerStyle={st.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={listHeaderElement}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator size="small" color={BRAND} style={{ marginVertical: 20 }} /> : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={st.centered}>
              <ActivityIndicator size="large" color={BRAND} />
              <Text style={{ marginTop: 10, color: MUTED }}>Loading articles...</Text>
            </View>
          ) : (
            <View style={st.emptyWrap}>
              <View style={st.emptyCircle}>
                <Ionicons name="newspaper-outline" size={36} color={MUTED} />
              </View>
              <Text style={st.emptyTitle}>No articles found</Text>
              <Text style={st.emptySub}>{error ?? 'Try a different search term.'}</Text>
            </View>
          )
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },

  // Header — flat BRAND, same as BusinessList / CommunitiesScreen
  header: {
    backgroundColor: BRAND,
    paddingHorizontal: 16, paddingBottom: 10,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 10, elevation: 8,
  },
  headerTop:      { flexDirection: 'row', alignItems: 'center' },
  headerSide:     { width: 80 },
  headerCenter:   { flex: 1, alignItems: 'center' },
  backBtn:        { width: 36, height: 36, borderRadius: 18, backgroundColor: ON_DARK_14, alignItems: 'center', justifyContent: 'center' },
  headerLogoWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  headerLogo:     { height: 26, width: 110 },
  createBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: ACCENT, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100 },
  createBtnTxt: { fontSize: 12, fontWeight: '800', color: WHITE },

  // Hero block — flat brand, rounded bottom, same pattern as Explore hero
  heroBlock: {
    backgroundColor: '#0c3f44',
    paddingHorizontal: 20, paddingTop: 28, paddingBottom: 20,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    overflow: 'hidden', marginBottom: 4,
    marginHorizontal: -14,
  },
  heroPills:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  heroLivePill:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: WHITE + '12', borderWidth: 1, borderColor: WHITE + '1E', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  heroLiveDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT },
  heroLiveText:  { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: WHITE + 'BF' },
  heroCountPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: WHITE + '12', borderWidth: 1, borderColor: WHITE + '1E', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  heroCountText: { fontSize: 11, fontWeight: '700', color: WHITE + 'BF' },
  heroTitle:     { fontSize: 27, fontWeight: '900', color: WHITE, lineHeight: 34 },
  heroSub:       { marginTop: 6, fontSize: 13, lineHeight: 18, color: WHITE + '99' },
  heroStats: {
    flexDirection: 'row', alignItems: 'center', marginTop: 18,
    backgroundColor: WHITE + '12', borderRadius: 14,
    borderWidth: 1, borderColor: WHITE + '1A',
    paddingVertical: 13, paddingHorizontal: 16,
  },
  heroStatItem:    { flex: 1, alignItems: 'center' },
  heroStatNum:     { fontSize: 18, fontWeight: '900', color: WHITE },
  heroStatLabel:   { fontSize: 10, color: WHITE + '88', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroStatDivider: { width: 1, height: 30, backgroundColor: WHITE + '22' },
  heroSearch: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: WHITE + '15', borderRadius: 999,
    borderWidth: 1, borderColor: WHITE + '28',
    paddingHorizontal: 18, paddingRight: 10, height: 52, marginTop: 18,
  },
  heroSearchBtn: { width: 36, height: 36, borderRadius: 999, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  searchInput: { flex: 1, color: WHITE, fontSize: 14, paddingVertical: 0 },

  // Section label
  sectionBar:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  sectionAccent:  { width: 3, height: 14, borderRadius: 2, backgroundColor: ACCENT },
  sectionBarText: { fontSize: 11, fontWeight: '800', color: MUTED, letterSpacing: 1.5 },
  sectionCount:   { marginLeft: 'auto', fontSize: 11, color: MUTED },
  skeleton:       { height: 60, alignItems: 'center', justifyContent: 'center' },
  scrollRow:      { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },

  // Grid
  listContent: { paddingHorizontal: 14, paddingBottom: 40, gap: 10 },
  gridRow:     { flexDirection: 'row', gap: 10 },

  centered:  { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 24 },
  emptyCircle: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', backgroundColor: ACCENT + '18' },
  emptyTitle:  { fontSize: 16, fontWeight: '800', color: DARK },
  emptySub:    { fontSize: 13, color: MUTED, textAlign: 'center' },
});

// ─── Slider card styles ────────────────────────────────────────────────────────
const sl = StyleSheet.create({
  card:     { width: SLIDER_W, height: SLIDER_H, borderRadius: 18, overflow: 'hidden', backgroundColor: Colors.neutral220 },
  image:    { ...StyleSheet.absoluteFillObject },
  grad:     { position: 'absolute', left: 0, right: 0, bottom: 0, height: 130 },
  badge: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: withOpacity(Colors.coral, 0.92),
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
  },
  badgeTxt: { color: WHITE, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  bottom:   { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 },
  catPill:  { alignSelf: 'flex-start', backgroundColor: ACCENT + '33', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginBottom: 5 },
  catTxt:   { fontSize: 9, fontWeight: '800', color: ACCENT },
  title:    { fontSize: 14, fontWeight: '800', color: WHITE, lineHeight: 19, marginBottom: 5 },
  meta:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt:  { fontSize: 11, color: ON_DARK_55, fontWeight: '600' },
});

// ─── Week card styles ──────────────────────────────────────────────────────────
const wk = StyleSheet.create({
  card: {
    width: 150, backgroundColor: Colors.white, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: BORDER, justifyContent: 'space-between',
    shadowColor: Colors.black, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  rank:    { alignSelf: 'flex-start', backgroundColor: BRAND + '18', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  rankTxt: { fontSize: 11, fontWeight: '900', color: BRAND },
  title:   { fontSize: 12.5, fontWeight: '700', color: DARK, lineHeight: 17, flex: 1 },
  footer:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  views:   { fontSize: 11, color: MUTED, fontWeight: '600' },
});

// ─── Ad banner styles ──────────────────────────────────────────────────────────
const ads = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.white, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: BRAND + '14',
    shadowColor: DARK, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    marginBottom: 4,
  },
  sponsorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingTop: 10, marginBottom: 6 },
  sponsorTxt: { fontSize: 9, fontWeight: '700', color: MUTED, letterSpacing: 0.8, textTransform: 'uppercase' },
  body:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingBottom: 14 },
  imgBox:     { width: 76, height: 76, borderRadius: 14, backgroundColor: ACCENT + '14', alignItems: 'center', justifyContent: 'center' },
  text:       { flex: 1 },
  adTitle:    { fontSize: 14, fontWeight: '800', color: DARK, lineHeight: 19, marginBottom: 4 },
  adSub:      { fontSize: 12, color: MUTED, lineHeight: 17, marginBottom: 8 },
  cta:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ctaTxt:     { fontSize: 12, fontWeight: '800', color: ACCENT },
});
