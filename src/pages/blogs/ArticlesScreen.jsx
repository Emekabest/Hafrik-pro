// src/pages/blogs/ArticlesScreen.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fetchArticles,
  fetchArticleCategories,
  fetchMostReadWeekArticles,
  fetchTrendingArticles,
} from './articlesApi';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../AuthContext';

const BRAND = Colors.primaryDark;
const ACCENT = Colors.primary;
const BG = '#F4F8F8';
const CARD = Colors.white;
const WHITE = Colors.white;
const TEXT = Colors.deepSlate ?? Colors.black;
const MUTED = Colors.secondaryText;
const BORDER = Colors.borderSoft ?? Colors.borderLight ?? '#E5EEEE';
const GOLD = '#F2A900';
const LIMIT = 12;

const FALLBACK_IMAGE =
  'https://s3.ap-northeast-1.wasabisys.com/hafriksocial/uploads/photos/2026/01/hafrik_2b884253077d991796e12f7d1d13d243.png';

const alpha = (hex, opacity) => {
  const normalized = String(hex || '').replace('#', '');
  if (normalized.length !== 6) return hex || 'transparent';
  return `#${normalized}${Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0')}`;
};

const decodeHtml = (text = '') =>
  String(text)
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&amp;amp;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '-')
    .replace(/&ndash;/g, '-')
    .replace(/&hellip;/g, '...')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

const cleanText = (text = '') => decodeHtml(text).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const isRealImage = (url) =>
  typeof url === 'string' &&
  /^https?:\/\//i.test(url.trim()) &&
  !url.includes('default-article') &&
  !url.includes('blank_profile') &&
  !url.includes('/default.');

const getArticleId = (item) => item?.post_id ?? item?.id;

const SkeletonArticle = ({ index }) => {
  const pulse = useRef(new Animated.Value(0.38)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.72, duration: 760, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.38, duration: 760, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View style={[styles.articleCard, { opacity: pulse, marginTop: index ? 12 : 0 }]}>
      <View style={styles.skeletonImage} />
      <View style={styles.articleBody}>
        <View style={styles.skeletonSmall} />
        <View style={styles.skeletonTitle} />
        <View style={[styles.skeletonTitle, { width: '70%' }]} />
        <View style={styles.skeletonLine} />
      </View>
    </Animated.View>
  );
};

const CategoryChip = ({ item, active, onPress }) => {
  const label = item ? cleanText(item.name ?? item.category_name ?? 'Category') : 'All';
  return (
    <TouchableOpacity style={[styles.categoryChip, active && styles.categoryChipActive]} onPress={onPress} activeOpacity={0.82}>
      <Ionicons name={item ? 'bookmark-outline' : 'apps-outline'} size={13} color={active ? WHITE : BRAND} />
      <Text style={[styles.categoryText, active && styles.categoryTextActive]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
};

const FeaturedCard = ({ item, onPress }) => {
  const title = cleanText(item?.title || 'Article');
  const image = isRealImage(item?.image) ? item.image : FALLBACK_IMAGE;
  return (
    <TouchableOpacity style={styles.featuredCard} onPress={onPress} activeOpacity={0.9}>
      <Image source={{ uri: image }} style={styles.featuredImage} resizeMode="cover" />
      <LinearGradient colors={['transparent', 'rgba(5,31,35,0.94)']} style={StyleSheet.absoluteFill} />
      <View style={styles.featuredBadge}>
        <Ionicons name="flame" size={11} color={WHITE} />
        <Text style={styles.featuredBadgeText}>Featured</Text>
      </View>
      <View style={styles.featuredBottom}>
        {!!item?.category_name && (
          <Text style={styles.featuredCategory} numberOfLines={1}>{cleanText(item.category_name)}</Text>
        )}
        <Text style={styles.featuredTitle} numberOfLines={2}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
};

const SliderCard = ({ item, onPress, index }) => {
  const title = cleanText(item?.title || 'Article');
  const image = isRealImage(item?.image) ? item.image : FALLBACK_IMAGE;
  return (
    <TouchableOpacity style={styles.sliderCard} onPress={onPress} activeOpacity={0.9}>
      <Image source={{ uri: image }} style={styles.sliderImage} resizeMode="cover" />
      <LinearGradient colors={['transparent', 'rgba(5,31,35,0.88)']} style={StyleSheet.absoluteFill} />
      <View style={styles.sliderNumber}>
        <Text style={styles.sliderNumberText}>{index + 1}</Text>
      </View>
      <View style={styles.sliderBottom}>
        {!!item?.category_name && <Text style={styles.sliderCategory} numberOfLines={1}>{cleanText(item.category_name)}</Text>}
        <Text style={styles.sliderTitle} numberOfLines={2}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
};

const ArticleRow = ({ item, onPress }) => {
  const title = cleanText(item?.title || 'Article');
  const snippet = cleanText(item?.snippet || '');
  const category = cleanText(item?.category_name || '');
  const image = isRealImage(item?.image) ? item.image : null;
  return (
    <TouchableOpacity style={styles.articleCard} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.articleImageWrap}>
        {image ? (
          <Image source={{ uri: image }} style={styles.articleImage} resizeMode="cover" />
        ) : (
          <LinearGradient colors={[alpha(BRAND, 0.9), alpha(ACCENT, 0.86)]} style={styles.articleImage}>
            <Ionicons name="newspaper-outline" size={28} color={WHITE + 'CC'} />
          </LinearGradient>
        )}
      </View>
      <View style={styles.articleBody}>
        <View style={styles.articleMetaTop}>
          {!!category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText} numberOfLines={1}>{category}</Text>
            </View>
          )}
          {!!item?.date && <Text style={styles.dateText} numberOfLines={1}>{cleanText(item.date)}</Text>}
        </View>
        <Text style={styles.articleTitle} numberOfLines={2}>{title}</Text>
        {!!snippet && <Text style={styles.articleSnippet} numberOfLines={2}>{snippet}</Text>}
        <View style={styles.readRow}>
          <Text style={styles.readText}>Read article</Text>
          <Ionicons name="arrow-forward" size={14} color={ACCENT} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function ArticlesScreen({ navigation }) {
  const { top } = useSafeAreaInsets();
  const { user } = useAuth();
  const isVerified =
    user?.verified_value === 1 ||
    user?.verified_value === true ||
    user?.verified === 1 ||
    user?.verified === true ||
    user?.is_verified === true ||
    user?.is_verified === 1;

  const [articles, setArticles] = useState([]);
  const [trending, setTrending] = useState([]);
  const [mostRead, setMostRead] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const abortRef = useRef(null);
  const firstSearch = useRef(true);
  const searchRef = useRef(search);
  const categoryRef = useRef(selectedCategory);
  searchRef.current = search;
  categoryRef.current = selectedCategory;

  useEffect(() => () => abortRef.current?.abort(), []);

  const loadHighlights = useCallback(async () => {
    try {
      const [trend, week, cats] = await Promise.all([
        fetchTrendingArticles(8),
        fetchMostReadWeekArticles(6),
        fetchArticleCategories(),
      ]);
      setTrending(Array.isArray(trend) ? trend : []);
      setMostRead(Array.isArray(week) ? week : []);
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (err) {
      console.log('[ArticlesScreen] highlights error:', err?.message || err);
    }
  }, []);

  const loadArticles = useCallback(async (nextPage = 1, replace = false) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      if (nextPage === 1) setLoading(true);
      else setLoadingMore(true);

      const query = searchRef.current.trim();
      const data = await fetchArticles({
        page: nextPage,
        limit: LIMIT,
        q: query || undefined,
        category: categoryRef.current || undefined,
      }, ctrl.signal);

      const list = Array.isArray(data) ? data : [];
      setArticles((prev) => (replace || nextPage === 1 ? list : [...prev, ...list]));
      setHasMore(list.length >= LIMIT);
      setPage(nextPage);
      setError(null);
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.log('[ArticlesScreen] load error:', err?.message || err);
        setError('Could not load articles right now.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadHighlights();
    loadArticles(1, true);
  }, [loadArticles, loadHighlights]);

  useEffect(() => {
    if (firstSearch.current) {
      firstSearch.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setPage(1);
      setHasMore(true);
      loadArticles(1, true);
    }, 360);
    return () => clearTimeout(timer);
  }, [search, loadArticles]);

  const openArticle = useCallback((item) => {
    navigation.navigate('ArticleDetails', {
      postId: getArticleId(item),
      title: cleanText(item?.title),
      link: item?.link,
    });
  }, [navigation]);

  const selectCategory = useCallback((categoryId) => {
    setSelectedCategory(categoryId);
    categoryRef.current = categoryId;
    setPage(1);
    setHasMore(true);
    setArticles([]);
    setTimeout(() => loadArticles(1, true), 0);
  }, [loadArticles]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadHighlights();
    loadArticles(1, true);
  }, [loadArticles, loadHighlights]);

  const onEndReached = useCallback(() => {
    if (!hasMore || loading || loadingMore || refreshing) return;
    loadArticles(page + 1, false);
  }, [hasMore, loading, loadingMore, loadArticles, page, refreshing]);

  const heroArticle = trending[0] || articles[0];
  const randomArticles = useMemo(() => {
    const pool = [...trending, ...articles].filter(Boolean);
    const seen = new Set();
    const unique = pool.filter((item) => {
      const id = getArticleId(item) ?? item?.title;
      if (!id || seen.has(String(id))) return false;
      seen.add(String(id));
      return true;
    });
    return unique
      .map((item) => ({ item, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ item }) => item)
      .slice(0, 10);
  }, [articles, trending]);
  const topReads = useMemo(() => mostRead.slice(0, 3), [mostRead]);

  const ListHeader = (
    <View>
      <LinearGradient colors={[BRAND, '#0D5056', ACCENT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroBadgeRow}>
          <View style={styles.heroBadge}>
            <View style={styles.heroDot} />
            <Text style={styles.heroBadgeText}>HAFRIK READS</Text>
          </View>
          {isVerified && (
            <TouchableOpacity style={styles.writePill} onPress={() => navigation.navigate('CreateArticle')} activeOpacity={0.86}>
              <Ionicons name="create-outline" size={13} color={BRAND} />
              <Text style={styles.writePillText}>Write</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.heroTitle}>Stories worth{'\n'}slowing down for.</Text>
        <Text style={styles.heroSub}>Guides, updates, business insight and community stories from Hafrik.</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={WHITE + 'BD'} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search articles, guides, topics..."
            placeholderTextColor={WHITE + '82'}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {!!search && (
            <TouchableOpacity style={styles.clearBtn} onPress={() => setSearch('')} activeOpacity={0.8}>
              <Ionicons name="close" size={16} color={BRAND} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {!!heroArticle && !search && (
        <View style={styles.featuredSection}>
          <View style={styles.sectionHead}>
            <View>
              <Text style={styles.sectionEyebrow}>Featured read</Text>
              <Text style={styles.sectionTitle}>Editor’s pick</Text>
            </View>
          </View>
          <FeaturedCard item={heroArticle} onPress={() => openArticle(heroArticle)} />
        </View>
      )}

      {randomArticles.length > 0 && !search && (
        <View style={styles.sliderSection}>
          <View style={[styles.sectionHead, styles.sliderHead]}>
            <View>
              <Text style={styles.sectionEyebrow}>Explore more</Text>
              <Text style={styles.sectionTitle}>Random picks</Text>
            </View>
          </View>
          <FlatList
            data={randomArticles}
            keyExtractor={(item, index) => `random-${getArticleId(item) ?? index}-${index}`}
            renderItem={({ item, index }) => (
              <SliderCard item={item} index={index} onPress={() => openArticle(item)} />
            )}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sliderScroll}
          />
        </View>
      )}

      {topReads.length > 0 && !search && (
        <View style={styles.topReads}>
          <Text style={styles.sectionEyebrow}>Popular this week</Text>
          {topReads.map((item, index) => (
            <TouchableOpacity key={`top-${getArticleId(item) ?? index}`} style={styles.topReadItem} onPress={() => openArticle(item)} activeOpacity={0.84}>
              <View style={styles.topReadRank}>
                <Text style={styles.topReadRankText}>{index + 1}</Text>
              </View>
              <Text style={styles.topReadTitle} numberOfLines={2}>{cleanText(item?.title)}</Text>
              <Ionicons name="chevron-forward" size={16} color={ACCENT} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.categoryStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          <CategoryChip item={null} active={selectedCategory == null} onPress={() => selectCategory(null)} />
          {categories.map((cat, index) => {
            const id = cat.id ?? cat.category_id ?? index;
            return (
              <CategoryChip
                key={`article-cat-${id}`}
                item={cat}
                active={String(selectedCategory ?? '') === String(id)}
                onPress={() => selectCategory(id)}
              />
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.latestHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>{search ? 'Search results' : 'Latest articles'}</Text>
          <Text style={styles.latestTitle}>
            {search ? `For "${search}"` : selectedCategory ? 'From selected category' : 'Fresh from Hafrik'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />
      <LinearGradient colors={[BRAND, BRAND]} style={[styles.header, { paddingTop: top + 10 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.82}>
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Articles</Text>
        {isVerified ? (
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('CreateArticle')} activeOpacity={0.82}>
            <Ionicons name="create-outline" size={20} color={WHITE} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtnGhost} />
        )}
      </LinearGradient>

      <FlatList
        data={loading && articles.length === 0 ? [] : articles}
        keyExtractor={(item, index) => `article-${getArticleId(item) ?? index}-${index}`}
        renderItem={({ item }) => <ArticleRow item={item} onPress={() => openArticle(item)} />}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.35}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color={BRAND} style={styles.footerLoader} /> : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.skeletonWrap}>
              {[0, 1, 2].map((i) => <SkeletonArticle key={`sk-${i}`} index={i} />)}
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="newspaper-outline" size={34} color={MUTED} />
              </View>
              <Text style={styles.emptyTitle}>No articles found</Text>
              <Text style={styles.emptySub}>{error || 'Try another keyword or category.'}</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    backgroundColor: BRAND,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: WHITE + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnGhost: { width: 38, height: 38 },
  headerTitle: { color: WHITE, fontSize: 17, fontWeight: '900', fontFamily: 'ReadexPro-Bold' },
  listContent: { paddingBottom: 34 },
  hero: {
    marginHorizontal: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginTop: -1,
  },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: WHITE + '16',
    borderWidth: 1,
    borderColor: WHITE + '24',
  },
  heroDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: GOLD },
  heroBadgeText: { color: WHITE + 'D9', fontSize: 10, letterSpacing: 1.1, fontWeight: '900' },
  writePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: WHITE, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  writePillText: { color: BRAND, fontSize: 12, fontWeight: '900' },
  heroTitle: { color: WHITE, fontSize: 31, lineHeight: 37, fontWeight: '900', fontFamily: 'ReadexPro-Bold' },
  heroSub: { marginTop: 8, color: WHITE + 'B8', fontSize: 13, lineHeight: 19, maxWidth: '88%' },
  searchBox: {
    marginTop: 20,
    height: 52,
    borderRadius: 26,
    backgroundColor: WHITE + '17',
    borderWidth: 1,
    borderColor: WHITE + '29',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 17,
    paddingRight: 8,
  },
  searchInput: { flex: 1, color: WHITE, fontSize: 14, paddingVertical: 0 },
  clearBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center' },
  featuredSection: { paddingHorizontal: 16, marginTop: 18 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionEyebrow: { color: ACCENT, fontSize: 10, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  sectionTitle: { color: TEXT, fontSize: 18, fontWeight: '900', marginTop: 2 },
  featuredCard: {
    height: 238,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: BRAND,
    shadowColor: BRAND,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 6,
  },
  featuredImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  featuredBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: alpha('#F97316', 0.92),
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  featuredBadgeText: { color: WHITE, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  featuredBottom: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  featuredCategory: { color: ACCENT, fontSize: 11, fontWeight: '900', marginBottom: 5 },
  featuredTitle: { color: WHITE, fontSize: 21, lineHeight: 27, fontWeight: '900', fontFamily: 'ReadexPro-Bold' },
  sliderSection: { marginTop: 16 },
  sliderHead: { paddingHorizontal: 16 },
  sliderScroll: { paddingHorizontal: 16, gap: 12, paddingBottom: 2 },
  sliderCard: {
    width: 218,
    height: 176,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: BRAND,
    shadowColor: BRAND,
    shadowOpacity: 0.13,
    shadowRadius: 14,
    elevation: 5,
  },
  sliderImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  sliderNumber: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: WHITE + 'E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderNumberText: { color: BRAND, fontSize: 12, fontWeight: '900' },
  sliderBottom: { position: 'absolute', left: 13, right: 13, bottom: 13 },
  sliderCategory: { color: ACCENT, fontSize: 10.5, fontWeight: '900', marginBottom: 5 },
  sliderTitle: { color: WHITE, fontSize: 15.5, lineHeight: 21, fontWeight: '900', fontFamily: 'ReadexPro-Bold' },
  topReads: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: CARD,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  topReadItem: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 9 },
  topReadRank: { width: 28, height: 28, borderRadius: 14, backgroundColor: alpha(BRAND, 0.1), alignItems: 'center', justifyContent: 'center' },
  topReadRankText: { color: BRAND, fontSize: 12, fontWeight: '900' },
  topReadTitle: { flex: 1, color: TEXT, fontSize: 13, lineHeight: 18, fontWeight: '800' },
  categoryStrip: { marginTop: 16 },
  categoryScroll: { paddingHorizontal: 16, gap: 9, paddingBottom: 2 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 999,
  },
  categoryChipActive: { backgroundColor: BRAND, borderColor: BRAND },
  categoryText: { color: BRAND, fontSize: 12, fontWeight: '800' },
  categoryTextActive: { color: WHITE },
  latestHeader: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10 },
  latestTitle: { color: TEXT, fontSize: 18, fontWeight: '900', marginTop: 2 },
  articleCard: {
    marginHorizontal: 16,
    marginBottom: 13,
    backgroundColor: CARD,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: BRAND,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  articleImageWrap: { height: 176, backgroundColor: alpha(BRAND, 0.1) },
  articleImage: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  articleBody: { padding: 15 },
  articleMetaTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  categoryBadge: { backgroundColor: alpha(ACCENT, 0.12), borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, maxWidth: '68%' },
  categoryBadgeText: { color: ACCENT, fontSize: 10.5, fontWeight: '900' },
  dateText: { color: MUTED, fontSize: 11, flex: 1 },
  articleTitle: { color: TEXT, fontSize: 18, lineHeight: 24, fontWeight: '900', fontFamily: 'ReadexPro-Bold' },
  articleSnippet: { marginTop: 7, color: MUTED, fontSize: 13, lineHeight: 19 },
  readRow: { marginTop: 13, flexDirection: 'row', alignItems: 'center', gap: 6 },
  readText: { color: ACCENT, fontSize: 13, fontWeight: '900' },
  footerLoader: { marginVertical: 24 },
  skeletonWrap: { paddingTop: 2 },
  skeletonImage: { height: 176, backgroundColor: alpha(BRAND, 0.12) },
  skeletonSmall: { width: 88, height: 18, borderRadius: 9, backgroundColor: alpha(BRAND, 0.1), marginBottom: 12 },
  skeletonTitle: { width: '90%', height: 18, borderRadius: 9, backgroundColor: alpha(BRAND, 0.1), marginBottom: 8 },
  skeletonLine: { width: '55%', height: 14, borderRadius: 7, backgroundColor: alpha(BRAND, 0.08), marginTop: 8 },
  emptyWrap: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 38, paddingBottom: 70 },
  emptyIcon: { width: 82, height: 82, borderRadius: 41, backgroundColor: alpha(BRAND, 0.08), alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { color: TEXT, fontSize: 17, fontWeight: '900' },
  emptySub: { color: MUTED, fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: 'center' },
});
