// src/pages/marketplace/index.jsx — Modern Marketplace (redesigned)
import React, {
  useCallback, useEffect, useRef, useState, memo,
} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl, Animated,
  Dimensions, ScrollView, TextInput, Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute } from '@react-navigation/native';

import { useAuth } from '../../AuthContext';
import { Colors } from '../../theme';
import AppDetails from '../../helpers/appdetails';
import useStore from '../../repository/store';
import {
  fetchMarketplaceProducts,
  fetchTrendyProducts,
  getCategories,
  getCart,
} from './marketplaceApi';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const { width: SW } = Dimensions.get('window');
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const BG     = '#F7F8FA';
const WHITE  = '#FFFFFF';
const DARK   = Colors.deepSlate ?? '#0F1923';
const MUTED  = Colors.secondaryText ?? '#8A96A3';
const BORDER = '#EAECF0';

const CARD_W   = (SW - 2) / 2;
const PAGE_SIZE = 12;

const FONT_B = AppDetails?.fontFamily?.redex?.bold    ?? 'System';
const FONT_M = AppDetails?.fontFamily?.inter?.medium  ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';

const a = (hex, op) => {
  const h = (hex || '').replace('#', '');
  return `#${h}${Math.round(op * 255).toString(16).padStart(2, '0')}`;
};

// ─── Currency conversion (1 CNY = 215 NGN — fixed) ───────────────────────────
const CNY_NGN_RATE = 215;

function convertAndFormat(price, fromCurrency, toCurrency) {
  const raw = Number(price ?? 0);
  let converted = raw;
  if (fromCurrency === 'NGN' && toCurrency === 'CNY') converted = raw / CNY_NGN_RATE;
  else if (fromCurrency === 'CNY' && toCurrency === 'NGN') converted = raw * CNY_NGN_RATE;
  if (toCurrency === 'NGN') return `₦${Math.round(converted).toLocaleString('en')}`;
  if (toCurrency === 'CNY') return `¥${converted.toFixed(2)}`;
  return `${toCurrency} ${raw.toLocaleString()}`;
}

// ─── Currency Toggle ──────────────────────────────────────────────────────────
function CurrencyToggle({ currency, onChange }) {
  return (
    <View style={cy.wrap}>
      <TouchableOpacity
        style={[cy.pill, currency === 'NGN' && cy.active]}
        onPress={() => onChange('NGN')}
        activeOpacity={0.8}
      >
        <Text style={[cy.txt, currency === 'NGN' && cy.activeTxt]}>₦ NGN</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[cy.pill, currency === 'CNY' && cy.active]}
        onPress={() => onChange('CNY')}
        activeOpacity={0.8}
      >
        <Text style={[cy.txt, currency === 'CNY' && cy.activeTxt]}>¥ CNY</Text>
      </TouchableOpacity>
    </View>
  );
}

const cy = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: a(WHITE, 0.12),
    borderRadius: 100,
    borderWidth: 1,
    borderColor: a(WHITE, 0.18),
    padding: 3,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
  },
  active: {
    backgroundColor: WHITE,
  },
  txt: {
    fontSize: 11.5,
    fontWeight: '800',
    color: a(WHITE, 0.6),
    fontFamily: FONT_B,
  },
  activeTxt: {
    color: BRAND,
  },
});

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

// ─── Category icon map ────────────────────────────────────────────────────────
const catMeta = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('electron') || n.includes('phone') || n.includes('gadget')) return { icon: 'phone-portrait-outline', color: '#0284c7' };
  if (n.includes('cloth') || n.includes('fashion') || n.includes('wear'))    return { icon: 'shirt-outline',          color: '#db2777' };
  if (n.includes('food')  || n.includes('drink')   || n.includes('bev'))     return { icon: 'fast-food-outline',      color: '#ea580c' };
  if (n.includes('furni') || n.includes('home')    || n.includes('decor'))   return { icon: 'home-outline',           color: '#059669' };
  if (n.includes('health')|| n.includes('medical'))                           return { icon: 'medkit-outline',         color: '#dc2626' };
  if (n.includes('beauty')|| n.includes('cosmetic'))                         return { icon: 'color-wand-outline',     color: '#ec4899' };
  if (n.includes('sport') || n.includes('fitness'))                          return { icon: 'football-outline',       color: '#16a34a' };
  if (n.includes('book')  || n.includes('station'))                          return { icon: 'book-outline',           color: '#ca8a04' };
  if (n.includes('jewel') || n.includes('access') || n.includes('watch'))   return { icon: 'diamond-outline',        color: '#9333ea' };
  if (n.includes('baby')  || n.includes('kid'))                              return { icon: 'happy-outline',          color: '#f97316' };
  if (n.includes('pet')   || n.includes('animal'))                           return { icon: 'paw-outline',            color: '#84cc16' };
  if (n.includes('tech')  || n.includes('computer')|| n.includes('laptop')) return { icon: 'laptop-outline',         color: '#0891b2' };
  return { icon: 'storefront-outline', color: BRAND };
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skel({ style }) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, []);
  return <Animated.View style={[{ backgroundColor: '#DDE3EC', borderRadius: 8, opacity: pulse }, style]} />;
}

function GridSkeleton() {
  return (
    <View style={{ flexDirection: 'row', gap: 2, marginBottom: 2 }}>
      {[0, 1].map(i => (
        <View key={i} style={{ width: CARD_W, backgroundColor: WHITE, borderRadius: 0, overflow: 'hidden' }}>
          <Skel style={{ width: '100%', height: CARD_W * 1.1 }} />
          <View style={{ padding: 12, gap: 7 }}>
            <Skel style={{ height: 11, width: '85%' }} />
            <Skel style={{ height: 11, width: '55%' }} />
            <Skel style={{ height: 18, width: '40%', borderRadius: 6, marginTop: 4 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Category pill (compact horizontal) ──────────────────────────────────────
const CatPill = memo(function CatPill({ cat, isActive, onPress }) {
  const { icon, color } = cat.id === 0 ? { icon: 'apps', color: BRAND } : catMeta(cat.name);
  return (
    <TouchableOpacity
      style={[p.pill, isActive && { backgroundColor: color, borderColor: color }]}
      onPress={() => onPress(cat.id)}
      activeOpacity={0.75}
    >
      <View style={[p.pillIcon, isActive && { backgroundColor: a(WHITE, 0.18) }]}>
        <Ionicons name={icon} size={17} color={isActive ? WHITE : color} />
      </View>
      <Text style={[p.pillTxt, isActive && { color: WHITE }]} numberOfLines={1}>
        {cat.name}
      </Text>
      {cat.count != null && cat.id !== 0 && (
        <Text style={[p.pillCount, isActive && { color: a(WHITE, 0.72) }]}>
          {Number(cat.count).toLocaleString()}
        </Text>
      )}
    </TouchableOpacity>
  );
});

function CategoryRow({ categories, activeCatId, onChange }) {
  const all = [{ id: 0, name: 'All' }, ...categories];
  return (
    <View style={p.pillWrap}>
      <View style={p.sectionTop}>
        <View>
          <Text style={p.kicker}>SHOP DEPARTMENTS</Text>
          <Text style={p.title}>Browse by category</Text>
        </View>
        <Ionicons name="grid-outline" size={19} color={BRAND} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={p.pillRow}
      >
        {all.map((cat, idx) => (
          <CatPill key={`shop-cat-${cat.id}-${idx}`} cat={cat} isActive={activeCatId === cat.id} onPress={onChange} />
        ))}
      </ScrollView>
    </View>
  );
}

const p = StyleSheet.create({
  pillWrap: { backgroundColor: BG, paddingTop: 20, paddingBottom: 12 },
  sectionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  kicker: { color: ACCENT, fontSize: 10, fontWeight: '900', letterSpacing: 1.4, fontFamily: FONT_B, marginBottom: 3 },
  title: { color: DARK, fontSize: 20, fontWeight: '900', fontFamily: FONT_B, letterSpacing: -0.5 },
  pillRow:  { paddingHorizontal: 16, paddingBottom: 4, gap: 10 },
  pill: {
    minWidth: 106,
    alignItems: 'flex-start', gap: 7,
    paddingHorizontal: 13, paddingVertical: 12,
    borderRadius: 18, borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: WHITE,
  },
  pillIcon: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: a(BRAND, 0.07) },
  pillTxt: { fontSize: 12.5, fontWeight: '900', color: DARK, fontFamily: FONT_B, maxWidth: 92 },
  pillCount: { fontSize: 10.5, color: MUTED, fontWeight: '700', fontFamily: FONT_M },
});

// ─── Product Card ─────────────────────────────────────────────────────────────
const ProductCard = memo(function ProductCard({ item, onPress, displayCurrency = 'NGN' }) {
  const thumb   = item.thumbnail ?? item.photos?.[0] ?? null;
  const title   = stripHtml(item.title);
  const inStock = item.in_stock !== false;
  const itemCcy = item.currency ?? 'NGN';
  const price   = (itemCcy === 'NGN' || itemCcy === 'CNY')
    ? convertAndFormat(item.price, itemCcy, displayCurrency)
    : (item.price_formatted ?? `${itemCcy} ${Number(item.price ?? 0).toLocaleString()}`);

  return (
    <TouchableOpacity style={c.card} onPress={onPress} activeOpacity={0.92}>
      {/* Image */}
      <View style={c.imgWrap}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={c.img} resizeMode="cover" />
        ) : (
          <View style={c.imgFallback}>
            <Ionicons name="image-outline" size={32} color={a(MUTED, 0.4)} />
          </View>
        )}
        {/* Stock badge */}
        <View style={[c.stockBadge, !inStock && c.stockBadgeOut]}>
          <View style={c.stockDot} />
          <Text style={c.stockTxt}>{inStock ? 'In Stock' : 'Sold Out'}</Text>
        </View>
        {/* Digital tag */}
        {item.is_digital && (
          <View style={c.digitalTag}>
            <Ionicons name="cloud-download-outline" size={9} color={WHITE} />
            <Text style={c.digitalTxt}>Digital</Text>
          </View>
        )}
      </View>

      {/* Body */}
      <View style={c.body}>
        <Text style={c.title} numberOfLines={2}>{title || '—'}</Text>
        <View style={c.priceRow}>
          <Text style={c.price}>{price}</Text>
          <View style={c.arrowBtn}>
            <Ionicons name="arrow-forward" size={12} color={WHITE} />
          </View>
        </View>

        {/* Rating row (if available) */}
        {Number(item.review_count) > 0 && (
          <View style={c.ratingRow}>
            <Ionicons name="star" size={10} color="#f59e0b" />
            <Text style={c.ratingTxt}>
              {parseFloat(item.average_rating || '0').toFixed(1)}
              <Text style={c.ratingCount}> ({item.review_count})</Text>
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

const c = StyleSheet.create({
  card: {
    width: CARD_W,
    backgroundColor: WHITE,
    borderRadius: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  imgWrap:    { width: '100%', height: CARD_W * 1.1, backgroundColor: BG },
  img:        { width: '100%', height: '100%' },
  imgFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stockBadge: {
    position: 'absolute', bottom: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#16a34aDD',
    borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3,
  },
  stockBadgeOut: { backgroundColor: '#dc2626DD' },
  stockDot:   { width: 5, height: 5, borderRadius: 3, backgroundColor: WHITE },
  stockTxt:   { fontSize: 9.5, fontWeight: '800', color: WHITE, fontFamily: FONT_B },
  digitalTag: {
    position: 'absolute', top: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: BRAND, borderRadius: 100,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  digitalTxt: { fontSize: 9, fontWeight: '800', color: WHITE, fontFamily: FONT_B },
  body:       { padding: 12, gap: 4 },
  title:      { fontSize: 13, fontWeight: '700', color: DARK, lineHeight: 18, fontFamily: FONT_M },
  priceRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  price:      { flex: 1, fontSize: 16, fontWeight: '900', color: ACCENT, fontFamily: FONT_B, marginTop: 2 },
  arrowBtn:   { display: 'none' },
  ratingRow:  { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  ratingTxt:  { fontSize: 11, color: DARK, fontWeight: '700' },
  ratingCount:{ color: MUTED, fontWeight: '500' },
});

// ─── Hot Right Now — full-width auto-scrolling slider ────────────────────────
const SLIDE_W   = SW - 32;   // card width: 16px margin each side
const SLIDE_H   = 230;       // card height
const SLIDE_GAP = 12;
const SNAP_INT  = SLIDE_W + SLIDE_GAP;

const SlideCard = memo(function SlideCard({ item, onPress, displayCurrency = 'NGN' }) {
  const thumb = item.thumbnail ?? item.photos?.[0] ?? null;
  const itemCcy = item.currency ?? 'NGN';
  const price = (itemCcy === 'NGN' || itemCcy === 'CNY')
    ? convertAndFormat(item.price, itemCcy, displayCurrency)
    : (item.price_formatted ?? `${itemCcy} ${Number(item.price ?? 0).toLocaleString()}`);
  const title = stripHtml(item.title);
  const inStock = item.in_stock !== false;

  return (
    <TouchableOpacity style={t.slide} onPress={onPress} activeOpacity={0.93}>
      {/* Full-bleed image */}
      {thumb ? (
        <Image source={{ uri: thumb }} style={t.slideImg} resizeMode="cover" />
      ) : (
        <View style={[t.slideImg, t.slideImgFb]}>
          <Ionicons name="image-outline" size={36} color={a(WHITE, 0.3)} />
        </View>
      )}

      {/* Dark gradient overlay — bottom 60% */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.78)']}
        locations={[0, 0.4, 1]}
        style={t.slideGrad}
      />

      {/* Top-left: hot badge */}
      <View style={t.hotBadge}>
        <Ionicons name="flame" size={10} color={WHITE} />
        <Text style={t.hotTxt}>HOT</Text>
      </View>

      {/* Top-right: stock pill */}
      <View style={[t.slideStock, !inStock && t.slideStockOut]}>
        <Text style={t.slideStockTxt}>{inStock ? 'In Stock' : 'Sold Out'}</Text>
      </View>

      {/* Bottom overlay: title + price */}
      <View style={t.slideBottom}>
        <Text style={t.slideTitle} numberOfLines={2}>{title}</Text>
        <View style={t.slidePriceRow}>
          <Text style={t.slidePrice}>{price}</Text>
          <View style={t.slideBtn}>
            <Text style={t.slideBtnTxt}>View</Text>
            <Ionicons name="arrow-forward" size={11} color={BRAND} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

function TrendingStrip({ onProductPress, displayCurrency = 'NGN' }) {
  const { token }  = useAuth();
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [apiPage,  setApiPage]  = useState(1);
  const [hasMore,  setHasMore]  = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);

  const flatRef  = useRef(null);
  const idxRef   = useRef(0);
  const timerRef = useRef(null);
  const seen     = useRef(new Set());
  const abort    = useRef(null);

  const load = useCallback(async (pg, replace = false) => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const res   = await fetchTrendyProducts(pg, 10, ctrl.signal, token);
      const fresh = (res.data ?? []).filter(p => {
        const k = String(p.post_id ?? p.id ?? '');
        if (!k || seen.current.has(k)) return false;
        seen.current.add(k);
        return true;
      });
      setItems(prev => replace ? fresh : [...prev, ...fresh]);
      setHasMore(res.has_more);
      setApiPage(pg);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    load(1, true);
    return () => abort.current?.abort();
  }, [load]);

  // Auto-advance every 3.5 s
  useEffect(() => {
    if (items.length < 2) return;
    timerRef.current = setInterval(() => {
      const next = (idxRef.current + 1) % items.length;
      idxRef.current = next;
      setActiveIdx(next);
      flatRef.current?.scrollToIndex({ index: next, animated: true });
    }, 3500);
    return () => clearInterval(timerRef.current);
  }, [items.length]);

  const onScroll = useCallback((e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SNAP_INT);
    if (idx !== idxRef.current) {
      idxRef.current = idx;
      setActiveIdx(idx);
    }
    // fetch more when near end
    if (idx >= items.length - 3 && hasMore) {
      load(apiPage + 1, false);
    }
  }, [items.length, hasMore, apiPage, load]);

  if (!loading && items.length === 0) return null;

  return (
    <View style={t.section}>
      {/* Section heading */}
      <View style={t.topRow}>
        <View>
          <View style={t.flamePill}>
            <Ionicons name="flame" size={11} color={WHITE} />
            <Text style={t.flameTxt}>LIVE PICKS</Text>
          </View>
          <Text style={t.heading}>Trending from China</Text>
        </View>
        <Text style={t.count}>{items.length > 0 ? `${items.length} items` : ''}</Text>
      </View>

      {/* Slider */}
      {loading ? (
        // Skeleton slide
        <View style={{ paddingHorizontal: 16 }}>
          <Skel style={{ width: SLIDE_W, height: SLIDE_H, borderRadius: 18 }} />
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={items}
          keyExtractor={(item, index) => `tr-${item.post_id ?? item.id}-${index}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={SNAP_INT}
          snapToAlignment="start"
          decelerationRate="fast"
          contentContainerStyle={t.listContent}
          onScroll={onScroll}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <SlideCard item={item} onPress={() => onProductPress(item)} displayCurrency={displayCurrency} />
          )}
          getItemLayout={(_, i) => ({ length: SNAP_INT, offset: SNAP_INT * i, index: i })}
        />
      )}

      {/* Dot indicators */}
      {items.length > 1 && (
        <View style={t.dots}>
          {items.slice(0, Math.min(items.length, 10)).map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                idxRef.current = i;
                setActiveIdx(i);
                flatRef.current?.scrollToIndex({ index: i, animated: true });
              }}
            >
              <Animated.View style={[t.dot, i === activeIdx && t.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const t = StyleSheet.create({
  section: {
    backgroundColor: BG,
    paddingTop: 20,
    paddingBottom: 18,
  },
  topRow: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 14, gap: 10,
  },
  flamePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#ef4444', borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 5, marginBottom: 7,
  },
  flameTxt: { fontSize: 9.5, fontWeight: '900', color: WHITE, fontFamily: FONT_B, letterSpacing: 0.8 },
  heading:  { fontSize: 21, fontWeight: '900', color: DARK, fontFamily: FONT_B, letterSpacing: -0.5 },
  count:    { fontSize: 12, color: MUTED, fontFamily: FONT_R },

  // List
  listContent: { paddingHorizontal: 16, gap: SLIDE_GAP },

  // Individual slide card
  slide: {
    width: SLIDE_W, height: SLIDE_H,
    borderRadius: 24, overflow: 'hidden',
    backgroundColor: '#1a1a2e',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 7,
  },
  slideImg:   { width: '100%', height: '100%', position: 'absolute' },
  slideImgFb: { backgroundColor: '#2a2a3e', alignItems: 'center', justifyContent: 'center' },
  slideGrad:  { position: 'absolute', left: 0, right: 0, bottom: 0, height: SLIDE_H * 0.65 },

  // Hot badge (top-left)
  hotBadge: {
    position: 'absolute', top: 12, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ef4444',
    borderRadius: 100, paddingHorizontal: 10, paddingVertical: 5,
  },
  hotTxt: { fontSize: 9.5, fontWeight: '900', color: WHITE, fontFamily: FONT_B, letterSpacing: 0.8 },

  // Stock pill (top-right)
  slideStock: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: '#16a34add',
    borderRadius: 100, paddingHorizontal: 10, paddingVertical: 5,
  },
  slideStockOut: { backgroundColor: '#dc2626dd' },
  slideStockTxt: { fontSize: 9.5, fontWeight: '800', color: WHITE, fontFamily: FONT_B },

  // Bottom text overlay
  slideBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, gap: 8,
  },
  slideTitle: {
    fontSize: 15, fontWeight: '800', color: WHITE,
    fontFamily: FONT_B, lineHeight: 20, letterSpacing: -0.2,
  },
  slidePriceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  slidePrice: {
    fontSize: 20, fontWeight: '900', color: WHITE,
    fontFamily: FONT_B, letterSpacing: -0.4,
  },
  slideBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: WHITE, borderRadius: 100,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  slideBtnTxt: { fontSize: 12, fontWeight: '800', color: BRAND, fontFamily: FONT_B },

  // Dot indicators
  dots: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 5, marginTop: 12,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: a(DARK, 0.18),
  },
  dotActive: {
    width: 20, height: 6, borderRadius: 3,
    backgroundColor: BRAND,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MarketplaceScreen({ navigation }) {
  const { token }    = useAuth();
  const route        = useRoute();
  const insets       = useSafeAreaInsets();
  const setCartCount          = useStore(s => s.setCartCount);
  const displayCurrency       = useStore(s => s.marketplaceCurrency);
  const setDisplayCurrency    = useStore(s => s.setMarketplaceCurrency);

  const [products,    setProducts]    = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [activeCatId, setActiveCatId] = useState(0);
  const [search,      setSearch]      = useState('');
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(true);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [loadMore,    setLoadMore]    = useState(false);
  const [error,       setError]       = useState(null);

  const abortRef   = useRef(null);
  const firstMount = useRef(true);

  useFocusEffect(useCallback(() => {
    if (!token) return;
    getCart(token).then(c => setCartCount(c.count)).catch(() => {});
  }, [token, setCartCount]));

  useEffect(() => {
    if (!token) return;
    getCategories(token).then(setCategories).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!Object.prototype.hasOwnProperty.call(route.params ?? {}, 'categoryId')) return;
    const nextCatId = Number(route.params?.categoryId ?? 0);
    setActiveCatId(nextCatId);
    if (typeof route.params?.categoryName === 'string') setSearch('');
    navigation.setParams?.({ categoryId: undefined, categoryName: undefined });
  }, [navigation, route.params?.categoryId, route.params?.categoryName]);

  const fetchPage = useCallback(async (pg, q, catId, replace) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const data = await fetchMarketplaceProducts(
        { page: pg, limit: PAGE_SIZE, search: q || undefined, category_id: catId || undefined },
        ctrl.signal,
        token,
      );
      const list = data.products ?? [];
      setProducts(prev => {
        if (replace) return list;
        const seen = new Set(prev.map(p => String(p.post_id ?? p.id)));
        return [...prev, ...list.filter(p => !seen.has(String(p.post_id ?? p.id)))];
      });
      setHasMore(pg * PAGE_SIZE < (data.total ?? 0));
      setPage(pg);
      setError(null);
    } catch (e) {
      if (e?.name !== 'AbortError') setError('Could not load products.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadMore(false);
    }
  }, [token]);

  useEffect(() => { fetchPage(1, '', 0, true); }, [fetchPage]);

  useEffect(() => {
    if (firstMount.current) { firstMount.current = false; return; }
    const delay = search ? 420 : 0;
    const id = setTimeout(() => {
      setLoading(true); setProducts([]);
      fetchPage(1, search, activeCatId, true);
    }, delay);
    return () => clearTimeout(id);
  }, [search, activeCatId]);

  const onRefresh    = useCallback(() => { setRefreshing(true); fetchPage(1, search, activeCatId, true); }, [search, activeCatId, fetchPage]);
  const onEndReached = useCallback(() => {
    if (!hasMore || loadMore || loading || refreshing) return;
    setLoadMore(true);
    fetchPage(page + 1, search, activeCatId, false);
  }, [hasMore, loadMore, loading, refreshing, page, search, activeCatId, fetchPage]);

  const openProduct = useCallback(item => navigation.navigate('ProductDetail', { product: item }), [navigation]);
  const handleCat   = useCallback(id => setActiveCatId(id), []);

  const activeCatName = activeCatId === 0
    ? (search ? `"${search}"` : 'All Products')
    : (categories.find(c => c.id === activeCatId)?.name ?? 'Products');

  const StickyHeader = useCallback(() => (
    <LinearGradient
      colors={[BRAND, '#144f55', '#1f8e93']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={m.stickyHeader}
    >
      <View style={m.deco1} /><View style={m.deco2} />

      <View style={[m.navRow, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={m.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={19} color={WHITE} />
        </TouchableOpacity>

        <View style={m.brandRow}>
          <Text style={m.headerTitle}>Hafrik Shop</Text>
        </View>
        <View style={m.headerSpacer} />
      </View>
    </LinearGradient>
  ), [insets.top, navigation]);

  const ShopHeader = useCallback(() => (
    <LinearGradient
      colors={[BRAND, '#144f55', '#1f8e93']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={m.header}
    >
      <View style={m.deco1} /><View style={m.deco2} />

      <View style={m.heroTop}>
        <View style={m.heroCopy}>
          <View style={m.heroBadge}>
            <Ionicons name="shield-checkmark" size={11} color={WHITE} />
            <Text style={m.heroBadgeTxt}>VERIFIED CHINA SOURCING</Text>
          </View>
          <Text style={m.heroTitle}>Shop China. Ship with confidence.</Text>
          <Text style={m.heroSub}>Products, buying support, and logistics handled through Hafrik’s trusted partners.</Text>
        </View>
        <View style={m.heroOrb}>
          <Ionicons name="cube-outline" size={31} color={WHITE} />
        </View>
      </View>

      <View style={m.searchWrap}>
        <View style={m.searchBar}>
          <View style={m.searchIconWrap}>
            <Ionicons name="search-outline" size={15} color={BRAND} />
          </View>
          <TextInput
            style={m.searchInput}
            placeholder="Search products, brands…"
            placeholderTextColor={a(DARK, 0.35)}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={a(DARK, 0.3)} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={m.partnerCard}>
        <View style={m.partnerIcon}>
          <Ionicons name="people-circle-outline" size={18} color={WHITE} />
        </View>
        <Text style={m.partnerText}>
          Partnered with <Text style={m.partnerStrong}>Guangzhou Qintian Trading Co., Ltd.</Text> and <Text style={m.partnerStrong}>Fish Logistics</Text>.
        </Text>
      </View>

      <View style={m.bottomRow}>
        <CurrencyToggle currency={displayCurrency} onChange={setDisplayCurrency} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={m.ordersChip}
            onPress={() => navigation.navigate('HafrikShopGuide')}
            activeOpacity={0.85}
          >
            <Ionicons name="help-circle-outline" size={13} color={WHITE} />
            <Text style={m.ordersChipTxt}>How to Order</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={m.ordersChip}
            onPress={() => navigation.navigate('MktOrders')}
            activeOpacity={0.85}
          >
            <Ionicons name="receipt-outline" size={13} color={WHITE} />
            <Text style={m.ordersChipTxt}>My Orders</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  ), [displayCurrency, navigation, search, setDisplayCurrency]);

  // ── List header ────────────────────────────────────────────────────────────
  const ListHeader = useCallback(() => (
    <>
      <ShopHeader />
      <TrendingStrip onProductPress={openProduct} displayCurrency={displayCurrency} />

      {/* Section label + sell CTA */}
      <View style={m.sectionRow}>
        <View>
          <Text style={m.sectionEyebrow}>PRODUCT FEED</Text>
          <Text style={m.sectionLabel}>{activeCatName}</Text>
          {!loading && !error && (
            <Text style={m.sectionCount}>{products.length} item{products.length !== 1 ? 's' : ''}</Text>
          )}
        </View>

      </View>
    </>
  ), [ShopHeader, activeCatName, loading, error, products.length, openProduct, displayCurrency]);

  const ListFooter = useCallback(() => (
    loadMore
      ? <View style={{ paddingVertical: 24, alignItems: 'center' }}><ActivityIndicator size="small" color={ACCENT} /></View>
      : <View style={{ height: 80 }} />
  ), [loadMore]);

  const ListEmpty = useCallback(() => {
    if (loading) return null;
    return (
      <View style={m.empty}>
        <View style={m.emptyIcon}>
          <Ionicons name={error ? 'cloud-offline-outline' : 'search-outline'} size={40} color={a(MUTED, 0.5)} />
        </View>
        <Text style={m.emptyTitle}>{error ? 'Something went wrong' : 'No products found'}</Text>
        <Text style={m.emptySub}>{error ?? 'Try a different search or category.'}</Text>
        <TouchableOpacity style={m.retryBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={13} color={WHITE} />
          <Text style={m.retryTxt}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }, [loading, error, onRefresh]);

  const renderItem = useCallback(({ item }) => (
    <ProductCard item={item} onPress={() => openProduct(item)} displayCurrency={displayCurrency} />
  ), [openProduct, displayCurrency]);

  return (
    <View style={m.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <StickyHeader />

      {/* ── Product grid ───────────────────────────────────────────────── */}
      {loading && !refreshing ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}>
          <ShopHeader />
          <TrendingStrip onProductPress={openProduct} displayCurrency={displayCurrency} />
          <View style={m.sectionRow}>
            <View>
              <Text style={m.sectionEyebrow}>PRODUCT FEED</Text>
              <Text style={m.sectionLabel}>Loading products</Text>
            </View>
          </View>
          <GridSkeleton />
          <GridSkeleton />
          <GridSkeleton />
        </ScrollView>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item, index) => `p-${item.post_id ?? item.id}-${index}`}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={m.row}
          contentContainerStyle={[m.grid, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={<ListHeader />}
          ListFooterComponent={<ListFooter />}
          ListEmptyComponent={<ListEmpty />}
          removeClippedSubviews={Platform.OS === 'android'}
          maxToRenderPerBatch={8}
          windowSize={10}
          initialNumToRender={8}
        />
      )}
    </View>
  );
}

// ─── Main Styles ──────────────────────────────────────────────────────────────
const m = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // ── Header ──
  stickyHeader: {
    overflow: 'hidden',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 10,
  },
  header: { overflow: 'hidden', paddingTop: 16, paddingBottom: 4 },
  deco1: {
    position: 'absolute', width: 240, height: 240, borderRadius: 120,
    backgroundColor: a(WHITE, 0.05), top: -80, right: -60, pointerEvents: 'none',
  },
  deco2: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: a(WHITE, 0.06), bottom: -50, left: -30, pointerEvents: 'none',
  },
  navRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 14,
    gap: 12,
  },
  brandRow: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18, fontWeight: '900',
    color: WHITE, fontFamily: FONT_B, letterSpacing: -0.2,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: a(WHITE, 0.13),
    borderWidth: 1, borderColor: a(WHITE, 0.15),
    alignItems: 'center', justifyContent: 'center',
  },
  headerSpacer: { width: 36, height: 36 },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  heroCopy: { flex: 1 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: a(WHITE, 0.13),
    borderWidth: 1,
    borderColor: a(WHITE, 0.18),
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginBottom: 10,
  },
  heroBadgeTxt: { color: WHITE, fontSize: 9, fontWeight: '900', letterSpacing: 1, fontFamily: FONT_B },
  heroTitle: {
    color: WHITE,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '900',
    fontFamily: FONT_B,
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  heroSub: {
    color: a(WHITE, 0.68),
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: FONT_R,
  },
  heroOrb: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: a(WHITE, 0.13),
    borderWidth: 1,
    borderColor: a(WHITE, 0.18),
    transform: [{ rotate: '-8deg' }],
  },
  partnerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: a(WHITE, 0.12),
    borderWidth: 1, borderColor: a(WHITE, 0.18),
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  partnerIcon: {
    width: 30, height: 30, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: a(WHITE, 0.14),
    borderWidth: 1, borderColor: a(WHITE, 0.18),
  },
  partnerText: {
    flex: 1,
    color: a(WHITE, 0.78),
    fontSize: 11,
    lineHeight: 16,
    fontFamily: FONT_R,
  },
  partnerStrong: { color: WHITE, fontWeight: '900', fontFamily: FONT_B },

  // Search
  searchWrap: { paddingHorizontal: 16, marginBottom: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: WHITE, borderRadius: 14,
    paddingRight: 12, overflow: 'hidden',
    shadowColor: BRAND, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  searchIconWrap: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    backgroundColor: a(BRAND, 0.07),
  },
  searchInput: { flex: 1, fontSize: 14, color: DARK, fontFamily: FONT_R, paddingVertical: 12 },

  // Bottom row
  bottomRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 16,
  },
  ordersChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: a(WHITE, 0.14),
    borderRadius: 100, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: a(WHITE, 0.18),
  },
  ordersChipTxt: { fontSize: 12, fontWeight: '700', color: WHITE, fontFamily: FONT_M },

  // Section row
  sectionRow: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12,
  },
  sectionEyebrow: { color: ACCENT, fontSize: 10, fontWeight: '900', letterSpacing: 1.3, fontFamily: FONT_B, marginBottom: 3 },
  sectionLabel: { fontSize: 22, fontWeight: '900', color: DARK, fontFamily: FONT_B, letterSpacing: -0.6 },
  sectionCount: { fontSize: 12, color: MUTED, fontFamily: FONT_R, marginTop: 2 },
  sellBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: BRAND, borderRadius: 100,
    paddingHorizontal: 16, paddingVertical: 9,
  },
  sellBtnTxt: { fontSize: 13, fontWeight: '800', color: WHITE, fontFamily: FONT_B },

  // Grid
  grid: { paddingHorizontal: 0, backgroundColor: BG },
  row:  { gap: 2, marginBottom: 2 },

  // Empty / error
  empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 40, gap: 10 },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 28,
    backgroundColor: a(BRAND, 0.06),
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: DARK, fontFamily: FONT_B, textAlign: 'center' },
  emptySub:   { fontSize: 13, color: MUTED, fontFamily: FONT_R, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, backgroundColor: BRAND, borderRadius: 100,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  retryTxt: { color: WHITE, fontWeight: '700', fontSize: 14, fontFamily: FONT_M },
});
