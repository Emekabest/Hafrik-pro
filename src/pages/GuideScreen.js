import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { Colors } from '../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const PURPLE = Colors.violet;
const MUTED  = Colors.secondaryText;
const BORDER = withOpacity(Colors.primaryDark, 0.09);

const BASE_URL = 'https://hafrik.com/api/v1';

// ✅ Put your real endpoint path here
// Example: /blogs/latest.php or /articles/latest.php depending on where you placed it
const ARTICLES_ENDPOINT = '/articles/list.php';

// ✅ Replace these IDs with your real category IDs from DB
const CATEGORY_ID_MAP = {
  'Visa & Legal': '1',
  'Housing': '2',
  'Banking': '3',
  'Shopping': '4',
  'Health': '5',
  'Language': '6',
};

const categories = ['All', ...Object.keys(CATEGORY_ID_MAP)];

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

const cleanText = (t = '') =>
  String(t)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, '')
    .trim();

const categoryMeta = (categoryIdOrName) => {
  // You can tune these per category (icons + gradient)
  const metaByName = {
    'Visa & Legal': { icon: 'document-text-outline', colors: [Colors.violet, Colors.violetDeep] },
    Housing:        { icon: 'home-outline',          colors: [Colors.amberStrong, Colors.orangeStrong] },
    Banking:        { icon: 'card-outline',          colors: [Colors.tealAccent, Colors.tealDarkAlt] },
    Shopping:       { icon: 'storefront-outline',    colors: [Colors.pinkBright, Colors.pinkDeep] },
    Health:         { icon: 'medkit-outline',        colors: [Colors.redStrong, Colors.redDeep] },
    Language:       { icon: 'chatbubble-ellipses-outline', colors: [Colors.blueAccent, Colors.blueDeep] },
  };

  // If API returns category_id, try to reverse map it to a label
  const nameFromId =
    Object.entries(CATEGORY_ID_MAP).find(([, id]) => String(id) === String(categoryIdOrName))?.[0];

  const label = nameFromId || String(categoryIdOrName || 'All');
  const meta = metaByName[label] || { icon: 'newspaper-outline', colors: [Colors.primaryDark, Colors.tealDeepAlt] };

  return { label, ...meta };
};

const GuideScreen = ({ navigation }) => {
  const [activeCategory, setActiveCategory] = useState('All');

  // optional search state (if you later hook it to a search screen/modal)
  const [q, setQ] = useState('');

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const categoryParam = useMemo(() => {
    if (activeCategory === 'All') return '';
    return CATEGORY_ID_MAP[activeCategory] || '';
  }, [activeCategory]);

  const fetchArticles = useCallback(
    async ({ nextPage = 1, replace = false } = {}) => {
      if (loading) return;

      setLoading(true);
      try {
        const params = {
          page: nextPage,
          limit,
        };

        // Backend supports these
        if (categoryParam) params.category = categoryParam;
        if (q.trim()) params.q = q.trim();

        const res = await api.get(ARTICLES_ENDPOINT, { params });

        // Your API returns:
        // { status: "success", data: { page, limit, count, data: [...] } }
        // OR sometimes json_response("success", $articles) (older style)
        const payload = res?.data;

        if (payload?.status !== 'success') {
          setHasMore(false);
          return;
        }

        const list = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.data?.data)
            ? payload.data.data
            : [];

        setItems(prev => (replace ? list : [...prev, ...list]));
        setPage(nextPage);

        // If less than limit returned, no more pages
        setHasMore(list.length >= limit);
      } catch (e) {
        console.log('[GuideScreen] fetch error:', e?.response?.data || e?.message || e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [categoryParam, q, limit, loading]
  );

  // initial + when category/search changes
  useEffect(() => {
    setHasMore(true);
    fetchArticles({ nextPage: 1, replace: true });
  }, [fetchArticles, activeCategory, q]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setHasMore(true);
    fetchArticles({ nextPage: 1, replace: true });
  }, [fetchArticles]);

  const onEndReached = useCallback(() => {
    if (!hasMore || loading) return;
    fetchArticles({ nextPage: page + 1, replace: false });
  }, [hasMore, loading, fetchArticles, page]);

  const openArticle = useCallback((item) => {
    // Best practice: navigate to your Article/Post screen using post_id
    // Replace 'ArticleView' with your real route
    navigation?.navigate?.('ArticleView', {
      post_id: item.post_id,
      link: item.link,
      title: item.title,
    });
  }, [navigation]);

  const renderItem = ({ item }) => {
    const meta = categoryMeta(item.category);

    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.82} onPress={() => openArticle(item)}>
        <LinearGradient
          colors={meta.colors}
          style={styles.cardIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={meta.icon} size={22} color={Colors.white} />
        </LinearGradient>

        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{meta.label}</Text>
            </View>

            {/* You can compute read time from snippet length later if you want */}
            <Text style={styles.readTime}>
              <Ionicons name="time-outline" size={11} color={MUTED} /> {' '}
              {item.readTime || '•'}
            </Text>
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>
            {cleanText(item.title)}
          </Text>

          <Text style={styles.cardSummary} numberOfLines={2}>
            {cleanText(item.snippet)}
          </Text>

          <View style={styles.cardFooter}>
            <Ionicons name="chevron-forward" size={16} color={ACCENT} style={{ marginLeft: 'auto' }} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = (
    <>
      <StatusBar barStyle="light-content" backgroundColor={PURPLE} />

      {/* Header */}
      <LinearGradient
        colors={[Colors.violet, Colors.violetDeep]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Diaspora Guide</Text>
          <Text style={styles.headerSub}>Latest articles from Hafrik</Text>
        </View>

        {/* Hook this to your search screen/modal later */}
        <TouchableOpacity style={styles.searchBtn} onPress={() => { /* open search UI */ }}>
          <Ionicons name="search-outline" size={22} color={Colors.white} />
        </TouchableOpacity>
      </LinearGradient>

      {/* Category filter */}
      <View style={styles.filterWrap}>
        <FlatList
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(c) => c}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterPill, activeCategory === item && styles.filterPillActive]}
              onPress={() => setActiveCategory(item)}
              activeOpacity={0.85}
            >
              <Text style={[styles.filterPillText, activeCategory === item && styles.filterPillTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id || item.post_id)}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingTop: 30 }}>
              <ActivityIndicator color={ACCENT} />
            </View>
          ) : (
            <View style={{ paddingTop: 30, alignItems: 'center' }}>
              <Text style={{ color: MUTED }}>No articles found</Text>
            </View>
          )
        }
        ListFooterComponent={
          loading && items.length > 0 ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator color={ACCENT} />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceBase },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: withOpacity(Colors.white, 0.15),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.white, letterSpacing: 0.3 },
  headerSub: { fontSize: 11, color: withOpacity(Colors.white, 0.7), marginTop: 2 },
  searchBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: withOpacity(Colors.white, 0.15),
    justifyContent: 'center',
    alignItems: 'center',
  },

  filterWrap: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  filterList: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: Colors.white,
  },
  filterPillActive: { backgroundColor: BRAND, borderColor: BRAND },
  filterPillText: { fontSize: 12, fontWeight: '600', color: MUTED },
  filterPillTextActive: { color: Colors.white },

  list: { padding: 14, gap: 12 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardContent: { flex: 1 },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  categoryPill: {
    backgroundColor: withOpacity(Colors.violet, 0.1),
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: PURPLE,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  readTime: { fontSize: 11, color: MUTED },
  cardTitle: { fontSize: 14, fontWeight: '700', color: BRAND, lineHeight: 20, marginBottom: 4 },
  cardSummary: { fontSize: 12, color: MUTED, lineHeight: 18, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});

export default GuideScreen;