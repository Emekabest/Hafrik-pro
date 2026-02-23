// src/pages/blogs/ArticlesScreen.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Image,
  RefreshControl,
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

const LIMIT  = 20;
const BRAND  = '#0C3F44';
const ACCENT = '#13C296';
const WARM   = '#F4A535';
const MUTED  = '#7A9198';
const DARK   = '#0D1B1E';
const BORDER = 'rgba(12,63,68,0.09)';

const FALLBACK_IMAGE = 'https://s3.ap-northeast-1.wasabisys.com/hafriksocial/uploads/photos/2026/01/hafrik_2b884253077d991796e12f7d1d13d243.png';

const formatViews = (n) => {
  const num = Number(n || 0);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return String(num);
};

// ─── Trending card (wide, with image) ────────────────────────────────────────
const TrendingCard = ({ item, onPress }) => (
  <TouchableOpacity style={styles.trendCard} onPress={onPress} activeOpacity={0.82}>
    <Image
      source={{ uri: item.image || FALLBACK_IMAGE }}
      style={styles.trendImage}
      resizeMode="cover"
    />
    <LinearGradient
      colors={['transparent', 'rgba(13,27,30,0.88)']}
      style={styles.trendGradient}
    />
    {/* flame badge */}
    <View style={styles.flameBadge}>
      <Ionicons name="flame" size={11} color="#fff" />
      <Text style={styles.flameTxt}>Trending</Text>
    </View>
    <View style={styles.trendBottom}>
      {!!item.category_name && (
        <View style={styles.trendCat}>
          <Text style={styles.trendCatTxt}>{item.category_name}</Text>
        </View>
      )}
      <Text style={styles.trendTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.trendMeta}>
        {formatViews(item.views)} views
      </Text>
    </View>
  </TouchableOpacity>
);

// ─── Most-read-week card (compact, no image) ──────────────────────────────────
const WeekCard = ({ item, index, onPress }) => (
  <TouchableOpacity style={styles.weekCard} onPress={onPress} activeOpacity={0.82}>
    <View style={styles.weekRankBadge}>
      <Text style={styles.weekRankTxt}>#{index + 1}</Text>
    </View>
    <Text style={styles.weekTitle} numberOfLines={3}>{item.title}</Text>
    <View style={styles.weekFooter}>
      <Ionicons name="eye-outline" size={12} color={MUTED} />
      <Text style={styles.weekViews}>{formatViews(item.views)}</Text>
    </View>
  </TouchableOpacity>
);

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ArticlesScreen({ navigation }) {
  const { top } = useSafeAreaInsets();

  // Sections state
  const [trending,    setTrending]    = useState([]);
  const [mostRead,    setMostRead]    = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);

  // Paginated grid state
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // Load trending + most-read on mount
  useEffect(() => {
    let mounted = true;
    setSectionsLoading(true);
    Promise.all([
      fetchTrendingArticles(10),
      fetchMostReadWeekArticles(10),
    ])
      .then(([trendData, weekData]) => {
        if (!mounted) return;
        setTrending(trendData);
        setMostRead(weekData);
      })
      .catch(() => {/* silently ignore; grid still works */})
      .finally(() => { if (mounted) setSectionsLoading(false); });
    return () => { mounted = false; };
  }, []);

  // Paginated grid fetch
  const fetchPage = useCallback(async (pageNum, q, replace) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const data = await fetchArticles(
        { page: pageNum, limit: LIMIT, q: q || undefined },
        ctrl.signal,
      );
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

  // Initial load
  useEffect(() => {
    fetchPage(1, '', true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search debounce
  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return; }
    const t = setTimeout(() => {
      setLoading(true);
      setArticles([]);
      fetchPage(1, search, true);
    }, 400);
    return () => clearTimeout(t);
  }, [search, fetchPage]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // also refresh sections
    Promise.all([fetchTrendingArticles(10), fetchMostReadWeekArticles(10)])
      .then(([t, w]) => { setTrending(t); setMostRead(w); })
      .catch(() => {});
    fetchPage(1, search, true);
  }, [search, fetchPage]);

  const onEndReached = useCallback(() => {
    if (!hasMore || loadingMore || loading || refreshing) return;
    setLoadingMore(true);
    fetchPage(page + 1, search, false);
  }, [hasMore, loadingMore, loading, refreshing, page, search, fetchPage]);

  const openArticle = useCallback((item) => {
    navigation.navigate('ArticleDetails', {
      postId: item.post_id,
      link: item.link,
      title: item.title,
    });
  }, [navigation]);

  // ─── Render helpers ───────────────────────────────────────────────────────

  const renderGridItem = useCallback(({ item }) => (
    <ArticleCard item={item} onPress={() => openArticle(item)} />
  ), [openArticle]);

  const ListFooter = () =>
    loadingMore ? (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={BRAND} />
      </View>
    ) : null;

  const ListEmpty = () => (
    <View style={styles.emptyWrap}>
      <Ionicons name="newspaper-outline" size={56} color={MUTED} />
      <Text style={styles.emptyTitle}>No articles found</Text>
      <Text style={styles.emptySub}>
        {error ? error : 'Try a different search term.'}
      </Text>
    </View>
  );

  // Sections header rendered as FlatList ListHeaderComponent
  const ListHeader = () => (
    <View>
      {/* ── Trending ── */}
      {!sectionsLoading && trending.length > 0 && (
        <View>
          <View style={styles.sectionRow}>
            <View style={styles.sectionLabelWrap}>
              <Ionicons name="flame" size={16} color={WARM} />
              <Text style={styles.sectionLabel}>Trending</Text>
            </View>
            <Text style={styles.sectionSub}>All-time most viewed</Text>
          </View>

          <FlatList
            data={trending}
            keyExtractor={item => `trend-${item.id}`}
            renderItem={({ item }) => (
              <TrendingCard item={item} onPress={() => openArticle(item)} />
            )}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hScroll}
          />
        </View>
      )}

      {/* ── Most Read This Week ── */}
      {!sectionsLoading && mostRead.length > 0 && (
        <View>
          <View style={styles.sectionRow}>
            <View style={styles.sectionLabelWrap}>
              <Ionicons name="trending-up" size={16} color={ACCENT} />
              <Text style={styles.sectionLabel}>Most Read This Week</Text>
            </View>
            <Text style={styles.sectionSub}>Last 7 days</Text>
          </View>

          <FlatList
            data={mostRead}
            keyExtractor={item => `week-${item.id}`}
            renderItem={({ item, index }) => (
              <WeekCard item={item} index={index} onPress={() => openArticle(item)} />
            )}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hScroll}
          />
        </View>
      )}

      {/* Sections skeleton */}
      {sectionsLoading && (
        <View style={styles.sectionSkeleton}>
          <ActivityIndicator size="small" color={BRAND} />
        </View>
      )}

      {/* All articles title */}
      <View style={[styles.sectionRow, { marginTop: 4 }]}>
        <View style={styles.sectionLabelWrap}>
          <Ionicons name="newspaper-outline" size={16} color={BRAND} />
          <Text style={styles.sectionLabel}>All Articles</Text>
        </View>
      </View>
    </View>
  );

  // ─── UI ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      {/* Header */}
      <LinearGradient
        colors={[BRAND, '#1a5c63']}
        style={[styles.header, { paddingTop: top + 4 }]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Articles</Text>
            <Text style={styles.headerSub}>Stories, guides & updates</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="rgba(255,255,255,0.7)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search articles..."
            placeholderTextColor="rgba(255,255,255,0.45)"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color="rgba(255,255,255,0.55)" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={{ marginTop: 10, color: MUTED }}>Loading articles...</Text>
        </View>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={item => String(item.id)}
          renderItem={renderGridItem}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={ListEmpty}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F6F8' },

  // Header
  header: { paddingHorizontal: 16, paddingBottom: 14 },
  headerTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerSub:   { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 1 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },

  // Section headers
  sectionRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14, paddingTop: 18, paddingBottom: 10,
  },
  sectionLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionLabel: { fontSize: 15, fontWeight: '800', color: DARK },
  sectionSub:   { fontSize: 11, color: MUTED },

  hScroll: { paddingHorizontal: 14, gap: 12 },

  sectionSkeleton: {
    height: 60, justifyContent: 'center', alignItems: 'center',
  },

  // Trending card
  trendCard: {
    width: 220,
    height: 160,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#ddd',
  },
  trendImage: { ...StyleSheet.absoluteFillObject },
  trendGradient: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 110,
  },
  flameBadge: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(232,93,74,0.92)',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 999,
  },
  flameTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  trendBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10 },
  trendCat: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(19,194,150,0.22)',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    marginBottom: 4,
  },
  trendCatTxt: { fontSize: 9, fontWeight: '800', color: ACCENT },
  trendTitle:  { fontSize: 13, fontWeight: '800', color: '#fff', lineHeight: 17, marginBottom: 4 },
  trendMeta:   { fontSize: 10, color: 'rgba(255,255,255,0.65)' },

  // Week card
  weekCard: {
    width: 150,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  weekRankBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(12,63,68,0.10)',
    borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    marginBottom: 8,
  },
  weekRankTxt:  { fontSize: 11, fontWeight: '900', color: BRAND },
  weekTitle:    { fontSize: 12.5, fontWeight: '700', color: DARK, lineHeight: 17, flex: 1 },
  weekFooter:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  weekViews:    { fontSize: 11, color: MUTED, fontWeight: '600' },

  // Grid
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  grid: { paddingHorizontal: 10, paddingBottom: 40 },
  row:  { gap: 10, marginBottom: 10 },

  footerLoader: { paddingVertical: 20, alignItems: 'center' },

  emptyWrap:  { alignItems: 'center', paddingTop: 40, gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: DARK },
  emptySub:   { fontSize: 13, color: MUTED, textAlign: 'center' },
});
