import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl, TextInput, StatusBar, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../AuthContext';
import { Colors } from '../../theme';
import AppDetails from '../../helpers/appdetails';
import useStore from '../../repository/store';
import { fetchMarketplaceProducts, getCategories } from './marketplaceApi';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const TEAL   = '#1f8e93';
const BG     = '#F7F8FA';
const WHITE  = '#FFFFFF';
const DARK   = Colors.deepSlate ?? '#0F1923';
const MUTED  = Colors.secondaryText ?? '#8A96A3';
const BORDER = '#EAECF0';
const GREEN  = '#16a34a';

const FONT_B = AppDetails?.fontFamily?.redex?.bold    ?? 'System';
const FONT_M = AppDetails?.fontFamily?.inter?.medium  ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';

const PAGE_SIZE = 12;
const CNY_NGN_RATE = 215;

const a = (hex, op) => {
  const h = (hex || '').replace('#', '');
  return `#${h}${Math.round(op * 255).toString(16).padStart(2, '0')}`;
};

const stripHtml = (raw = '') =>
  (raw || '')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)))
    .replace(/&rsquo;|&lsquo;|&apos;/g, "'")
    .replace(/&rdquo;|&ldquo;/g, '"')
    .replace(/&ndash;|&mdash;/g, '-')
    .replace(/&hellip;/g, '...')
    .replace(/&#039;/g, "'").replace(/&amp;?/g, '&').replace(/&#038;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

function convertAndFormat(price, fromCurrency, toCurrency) {
  const raw = Number(price ?? 0);
  let converted = raw;
  if (fromCurrency === 'NGN' && toCurrency === 'CNY') converted = raw / CNY_NGN_RATE;
  else if (fromCurrency === 'CNY' && toCurrency === 'NGN') converted = raw * CNY_NGN_RATE;
  if (toCurrency === 'NGN') return `₦${Math.round(converted).toLocaleString('en')}`;
  if (toCurrency === 'CNY') return `¥${converted.toFixed(2)}`;
  return `${toCurrency} ${raw.toLocaleString()}`;
}

const SORTS = [
  { key: 'latest', label: 'Latest', orderby: 'date', order: 'desc' },
  { key: 'popular', label: 'Popular', orderby: 'popularity', order: 'desc' },
  { key: 'rating', label: 'Top Rated', orderby: 'rating', order: 'desc' },
  { key: 'price_low', label: 'Low Price', orderby: 'price', order: 'asc' },
  { key: 'price_high', label: 'High Price', orderby: 'price', order: 'desc' },
];

function ProductCard({ item, onPress, displayCurrency }) {
  const thumb = item.thumbnail ?? item.photos?.[0] ?? null;
  const itemCcy = item.currency ?? 'NGN';
  const price = (itemCcy === 'NGN' || itemCcy === 'CNY')
    ? convertAndFormat(item.price, itemCcy, displayCurrency)
    : (item.price_formatted ?? `${itemCcy} ${Number(item.price ?? 0).toLocaleString()}`);
  const inStock = item.in_stock !== false;

  return (
    <TouchableOpacity style={s.productCard} onPress={onPress} activeOpacity={0.92}>
      <View style={s.productImageWrap}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={s.productImage} resizeMode="cover" />
        ) : (
          <View style={s.productFallback}>
            <Ionicons name="image-outline" size={30} color={a(MUTED, 0.45)} />
          </View>
        )}
        <View style={[s.stockBadge, !inStock && s.stockBadgeOut]}>
          <View style={s.stockDot} />
          <Text style={s.stockTxt}>{inStock ? 'In Stock' : 'Sold Out'}</Text>
        </View>
      </View>
      <View style={s.productBody}>
        <Text style={s.productTitle} numberOfLines={2}>{stripHtml(item.title) || 'Product'}</Text>
        <Text style={s.productPrice}>{price}</Text>
        {Number(item.review_count) > 0 && (
          <View style={s.ratingRow}>
            <Ionicons name="star" size={10} color="#f59e0b" />
            <Text style={s.ratingTxt}>{parseFloat(item.average_rating || '0').toFixed(1)} ({item.review_count})</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function FilterChip({ label, active, onPress }) {
  return (
    <TouchableOpacity style={[s.filterChip, active && s.filterChipActive]} onPress={onPress} activeOpacity={0.78}>
      <Text style={[s.filterTxt, active && s.filterTxtActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function MarketplaceCategoryProductsScreen({ navigation, route }) {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const displayCurrency = useStore(st => st.marketplaceCurrency);
  const category = route.params?.category ?? {};
  const parentCategory = route.params?.parentCategory ?? category;

  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState(category);
  const [subcategories, setSubcategories] = useState([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('latest');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [appliedMinPrice, setAppliedMinPrice] = useState('');
  const [appliedMaxPrice, setAppliedMaxPrice] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const sortCfg = useMemo(() => SORTS.find(item => item.key === sort) ?? SORTS[0], [sort]);

  useEffect(() => {
    setActiveCategory(category);
  }, [category?.id]);

  useEffect(() => {
    const parentId = Number(parentCategory?.id ?? category?.id);
    if (!parentId) return;
    getCategories(token, { parent: parentId }).then(setSubcategories).catch(() => setSubcategories([]));
  }, [category?.id, parentCategory?.id, token]);

  const buildQuery = useCallback((nextPage) => ({
    page: nextPage,
    limit: PAGE_SIZE,
    category_id: Number(activeCategory.id),
    search: search.trim() || undefined,
    min_price: appliedMinPrice.trim() ? Number(appliedMinPrice) : undefined,
    max_price: appliedMaxPrice.trim() ? Number(appliedMaxPrice) : undefined,
    orderby: sortCfg.orderby,
    order: sortCfg.order,
  }), [activeCategory.id, appliedMaxPrice, appliedMinPrice, search, sortCfg.order, sortCfg.orderby]);

  const load = useCallback(async (nextPage = 1, replace = true) => {
    if (!activeCategory.id) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      if (replace) setLoading(true);
      const data = await fetchMarketplaceProducts(buildQuery(nextPage), ctrl.signal, token);
      const list = data.products ?? [];
      setProducts(prev => {
        if (replace) return list;
        const seen = new Set(prev.map(p => String(p.post_id ?? p.id)));
        return [...prev, ...list.filter(p => !seen.has(String(p.post_id ?? p.id)))];
      });
      setTotal(data.total ?? list.length);
      setHasMore(nextPage * PAGE_SIZE < (data.total ?? 0));
      setPage(nextPage);
      setError(null);
    } catch (e) {
      if (e?.name !== 'AbortError') setError('Could not load products in this category.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [activeCategory.id, buildQuery, token]);

  useEffect(() => {
    const delay = search ? 420 : 0;
    const id = setTimeout(() => load(1, true), delay);
    return () => clearTimeout(id);
  }, [load, search, sort]);

  const applyPrice = useCallback(() => {
    setAppliedMinPrice(minPrice);
    setAppliedMaxPrice(maxPrice);
  }, [maxPrice, minPrice]);
  const resetFilters = useCallback(() => {
    setSearch('');
    setSort('latest');
    setMinPrice('');
    setMaxPrice('');
    setAppliedMinPrice('');
    setAppliedMaxPrice('');
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(1, true);
  }, [load]);

  const onEndReached = useCallback(() => {
    if (!hasMore || loading || loadingMore || refreshing) return;
    setLoadingMore(true);
    load(page + 1, false);
  }, [hasMore, load, loading, loadingMore, page, refreshing]);

  const openProduct = useCallback(item => navigation.navigate('ProductDetail', { product: item }), [navigation]);
  const filterByCategory = useCallback(nextCategory => {
    setActiveCategory(nextCategory);
    setSearch('');
  }, []);

  const ListHeader = (
    <View>
      <LinearGradient
        colors={[BRAND, '#144f55', TEAL]}
        style={[s.header, { paddingTop: insets.top + 14 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={s.blob} />
        <View style={s.headerTop}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.82}>
            <Ionicons name="arrow-back" size={19} color={WHITE} />
          </TouchableOpacity>
          <View style={s.headerIcon}>
            <Ionicons name="grid-outline" size={18} color={WHITE} />
          </View>
        </View>
        <Text style={s.headerKicker}>CATEGORY</Text>
        <Text style={s.headerTitle}>{parentCategory.name ?? category.name ?? 'Products'}</Text>
        <Text style={s.headerSub}>Explore verified Hafrik Shop products in this category.</Text>
      </LinearGradient>

      <View style={s.filterPanel}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={16} color={MUTED} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={`Search ${activeCategory.name ?? 'category'}...`}
            placeholderTextColor={a(DARK, 0.35)}
            style={s.searchInput}
            returnKeyType="search"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={a(MUTED, 0.5)} />
            </TouchableOpacity>
          )}
        </View>

        {subcategories.length > 0 && (
          <>
            <Text style={s.filterLabel}>SUBCATEGORIES</Text>
            <View style={s.chipWrap}>
              <FilterChip
                label={`All ${parentCategory.name ?? category.name}`}
                active={Number(activeCategory.id) === Number(parentCategory.id ?? category.id)}
                onPress={() => filterByCategory(parentCategory)}
              />
              {subcategories.map((item, index) => (
                <FilterChip
                  key={`subcategory-${item.id}-${index}`}
                  label={item.name}
                  active={Number(activeCategory.id) === Number(item.id)}
                  onPress={() => filterByCategory(item)}
                />
              ))}
            </View>
          </>
        )}

        <Text style={s.filterLabel}>SORT</Text>
        <View style={s.chipWrap}>
          {SORTS.map(item => (
            <FilterChip key={item.key} label={item.label} active={sort === item.key} onPress={() => setSort(item.key)} />
          ))}
        </View>

        <Text style={s.filterLabel}>PRICE RANGE</Text>
        <View style={s.priceRow}>
          <TextInput
            value={minPrice}
            onChangeText={setMinPrice}
            placeholder="Min"
            keyboardType="numeric"
            placeholderTextColor={a(DARK, 0.35)}
            style={s.priceInput}
          />
          <TextInput
            value={maxPrice}
            onChangeText={setMaxPrice}
            placeholder="Max"
            keyboardType="numeric"
            placeholderTextColor={a(DARK, 0.35)}
            style={s.priceInput}
          />
          <TouchableOpacity style={s.applyBtn} onPress={applyPrice} activeOpacity={0.84}>
            <Text style={s.applyTxt}>Apply</Text>
          </TouchableOpacity>
        </View>

        <View style={s.resultRow}>
          <Text style={s.resultTitle}>{total.toLocaleString()} product{total === 1 ? '' : 's'}</Text>
          <TouchableOpacity onPress={resetFilters} activeOpacity={0.75}>
            <Text style={s.resetTxt}>Reset filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const ListEmpty = () => {
    if (loading) return null;
    return (
      <View style={s.empty}>
        <Ionicons name={error ? 'cloud-offline-outline' : 'cube-outline'} size={40} color={a(MUTED, 0.5)} />
        <Text style={s.emptyTitle}>{error ? 'Something went wrong' : 'No products found'}</Text>
        <Text style={s.emptySub}>{error ?? 'Try changing the price, stock, or search filters.'}</Text>
      </View>
    );
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />
      {loading && !refreshing ? (
        <FlatList
          key="category-products-loading"
          data={[]}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={<View style={s.loadingBox}><ActivityIndicator color={BRAND} /><Text style={s.loadingTxt}>Loading category products...</Text></View>}
          contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
        />
      ) : (
        <FlatList
          key="category-products-grid"
          data={products}
          keyExtractor={(item, index) => `cat-${item.post_id ?? item.id}-${index}`}
          renderItem={({ item }) => <ProductCard item={item} onPress={() => openProduct(item)} displayCurrency={displayCurrency} />}
          numColumns={2}
          columnWrapperStyle={s.gridRow}
          contentContainerStyle={[s.grid, { paddingBottom: insets.bottom + 90 }]}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={<ListEmpty />}
          ListFooterComponent={loadingMore ? <View style={s.footer}><ActivityIndicator color={ACCENT} /></View> : <View style={{ height: 28 }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={Platform.OS === 'android'}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 18, paddingBottom: 24, overflow: 'hidden' },
  blob: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: a(WHITE, 0.05), right: -60, top: -70 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  backBtn: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: a(WHITE, 0.14), borderWidth: 1, borderColor: a(WHITE, 0.18) },
  headerIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: a(WHITE, 0.14), borderWidth: 1, borderColor: a(WHITE, 0.18) },
  headerKicker: { color: a(WHITE, 0.72), fontSize: 10, fontWeight: '900', letterSpacing: 1.5, fontFamily: FONT_B, marginBottom: 7 },
  headerTitle: { color: WHITE, fontSize: 25, fontWeight: '900', fontFamily: FONT_B, letterSpacing: -0.4, marginBottom: 8 },
  headerSub: { color: a(WHITE, 0.72), fontSize: 12.5, lineHeight: 19, fontFamily: FONT_R },
  filterPanel: { backgroundColor: WHITE, paddingHorizontal: 16, paddingTop: 15, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: BG, borderRadius: 14, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, marginBottom: 15 },
  searchInput: { flex: 1, paddingVertical: 12, color: DARK, fontSize: 14, fontFamily: FONT_R },
  filterLabel: { color: MUTED, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, fontFamily: FONT_B, marginBottom: 8, marginTop: 3 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: BORDER, backgroundColor: WHITE },
  filterChipActive: { backgroundColor: a(BRAND, 0.08), borderColor: a(BRAND, 0.24) },
  filterTxt: { color: MUTED, fontSize: 12, fontWeight: '800', fontFamily: FONT_M },
  filterTxtActive: { color: BRAND, fontFamily: FONT_B },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  priceInput: { flex: 1, height: 43, borderRadius: 13, borderWidth: 1, borderColor: BORDER, backgroundColor: BG, paddingHorizontal: 12, color: DARK, fontFamily: FONT_M },
  applyBtn: { height: 43, paddingHorizontal: 15, borderRadius: 13, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' },
  applyTxt: { color: WHITE, fontSize: 12.5, fontWeight: '900', fontFamily: FONT_B },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultTitle: { color: DARK, fontSize: 16, fontWeight: '900', fontFamily: FONT_B },
  resetTxt: { color: ACCENT, fontSize: 12.5, fontWeight: '900', fontFamily: FONT_B },
  grid: { backgroundColor: BG, paddingHorizontal: 0 },
  gridRow: { gap: 2, marginBottom: 2 },
  productCard: { width: '49.75%', backgroundColor: WHITE, overflow: 'hidden' },
  productImageWrap: { width: '100%', aspectRatio: 0.9, backgroundColor: BG },
  productImage: { width: '100%', height: '100%' },
  productFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stockBadge: { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${GREEN}DD`, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  stockBadgeOut: { backgroundColor: '#dc2626DD' },
  stockDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: WHITE },
  stockTxt: { color: WHITE, fontSize: 9.5, fontWeight: '900', fontFamily: FONT_B },
  productBody: { padding: 12, gap: 4 },
  productTitle: { color: DARK, fontSize: 13, lineHeight: 18, fontWeight: '800', fontFamily: FONT_M },
  productPrice: { color: ACCENT, fontSize: 16, fontWeight: '900', fontFamily: FONT_B },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingTxt: { color: MUTED, fontSize: 11, fontWeight: '700', fontFamily: FONT_M },
  loadingBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  loadingTxt: { color: MUTED, marginTop: 10, fontSize: 13, fontFamily: FONT_R },
  footer: { paddingVertical: 24, alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 40, gap: 9 },
  emptyTitle: { color: DARK, fontSize: 18, fontWeight: '900', fontFamily: FONT_B },
  emptySub: { color: MUTED, fontSize: 13, lineHeight: 19, textAlign: 'center', fontFamily: FONT_R },
});
