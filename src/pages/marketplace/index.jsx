// src/pages/marketplace/index.jsx
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
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../AuthContext';
import { fetchMarketplaceProducts } from './marketplaceApi';
import { ProductCard } from './ProductCard';
import { Colors } from '../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const API   = 'https://hafrik.com/api/v1/marketplace/get_marketplace.php';
const LIMIT = 10;

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const MUTED  = Colors.secondaryText;
const DARK   = Colors.deepSlate;
const BORDER = withOpacity(Colors.primaryDark, 0.09);

const CATS = ['All', 'Electronics', 'Clothing', 'Food', 'Furniture', 'Services', 'Other'];

export default function MarketplaceScreen({ navigation }) {
  const { token } = useAuth();
  const { top }   = useSafeAreaInsets();

  const [products,     setProducts]     = useState([]);
  const [search,       setSearch]       = useState('');
  const [category,     setCategory]     = useState('All');
  const [page,         setPage]         = useState(1);
  const [hasMore,      setHasMore]      = useState(true);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [error,        setError]        = useState(null);

  const abortRef      = useRef(null);
  const isFirstMount  = useRef(true);

  // ─── Core fetch ──────────────────────────────────────────────
  const fetchPage = useCallback(async (pageNum, q, cat, replace) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const data = await fetchMarketplaceProducts(
        API,
        {
          page:     pageNum,
          limit:    LIMIT,
          search:   q   || undefined,
          category: cat !== 'All' ? cat : undefined,
        },
        ctrl.signal,
        token,
      );

      const incoming = data.products ?? [];
      setProducts(prev => replace ? incoming : [...prev, ...incoming]);
      setHasMore(pageNum * LIMIT < data.total);
      setPage(pageNum);
      setError(null);
    } catch (e) {
      if (e.name !== 'AbortError') {
        setError('Could not load listings. Pull down to retry.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    fetchPage(1, '', 'All', true);
  }, [fetchPage]);

  // Reload when search or category changes (skip first mount)
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return; }
    const delay = search ? 400 : 0;
    const t = setTimeout(() => {
      setLoading(true);
      setProducts([]);
      fetchPage(1, search, category, true);
    }, delay);
    return () => clearTimeout(t);
  }, [search, category]);

  // ─── Actions ─────────────────────────────────────────────────
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPage(1, search, category, true);
  }, [search, category, fetchPage]);

  const onEndReached = useCallback(() => {
    if (!hasMore || loadingMore || loading || refreshing) return;
    setLoadingMore(true);
    fetchPage(page + 1, search, category, false);
  }, [hasMore, loadingMore, loading, refreshing, page, search, category, fetchPage]);

  const openProduct = useCallback((product) => {
    navigation.navigate('ProductDetail', { product });
  }, [navigation]);

  // ─── Render helpers ──────────────────────────────────────────
  const renderItem = useCallback(({ item }) => (
    <ProductCard item={item} onPress={() => openProduct(item)} />
  ), [openProduct]);

  const ListFooter = () =>
    loadingMore ? (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={BRAND} />
      </View>
    ) : null;

  const ListEmpty = () => (
    <View style={styles.emptyWrap}>
      <Ionicons name="storefront-outline" size={56} color={MUTED} />
      <Text style={styles.emptyTitle}>No listings found</Text>
      <Text style={styles.emptySub}>Try adjusting your search or filters.</Text>
    </View>
  );

  // ─── Render ──────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      {/* Header */}
      <LinearGradient
        colors={[BRAND, Colors.tealHeader]}
        style={[styles.header, { paddingTop: top + 4 }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Marketplace</Text>
            <Text style={styles.headerSub}>Buy, sell &amp; trade</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate('MyListings')}
            >
              <Ionicons name="list-outline" size={20} color={Colors.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: ACCENT }]}
              onPress={() => navigation.navigate('CreateListing')}
            >
              <Ionicons name="add" size={22} color={BRAND} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={withOpacity(Colors.white, 0.7)} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search listings..."
            placeholderTextColor={withOpacity(Colors.white, 0.45)}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color={withOpacity(Colors.white, 0.55)} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Category chips */}
      <View style={styles.catsRow}>
        <FlatList
          data={CATS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={c => c}
          contentContainerStyle={styles.catsList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.catPill, category === item && styles.catPillActive]}
              onPress={() => setCategory(item)}
            >
              <Text style={[styles.catTxt, category === item && styles.catTxtActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* States */}
      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BRAND} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={MUTED} />
          <Text style={styles.errorTxt}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
            <Text style={styles.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={ListEmpty}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surfaceSky },

  header: { paddingHorizontal: 16, paddingBottom: 14 },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: { color: Colors.white, fontSize: 22, fontWeight: '800' },
  headerSub:   { color: withOpacity(Colors.white, 0.65), fontSize: 12, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: withOpacity(Colors.white, 0.15),
    justifyContent: 'center', alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: withOpacity(Colors.white, 0.15),
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, color: Colors.white, fontSize: 14 },

  catsRow: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  catsList:     { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  catPill:      { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100, borderWidth: 1.5, borderColor: BORDER },
  catPillActive:{ backgroundColor: BRAND, borderColor: BRAND },
  catTxt:       { fontSize: 12, fontWeight: '600', color: MUTED },
  catTxtActive: { color: Colors.white },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorTxt:  { fontSize: 14, color: MUTED, textAlign: 'center', paddingHorizontal: 24 },
  retryBtn:  { backgroundColor: BRAND, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10 },
  retryTxt:  { color: Colors.white, fontWeight: '700', fontSize: 14 },

  grid: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 40 },
  row:  { gap: 8 },

  footerLoader: { paddingVertical: 20, alignItems: 'center' },

  emptyWrap:  { alignItems: 'center', paddingTop: 60, gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: Colors.deepSlate },
  emptySub:   { fontSize: 13, color: MUTED, textAlign: 'center' },
});
