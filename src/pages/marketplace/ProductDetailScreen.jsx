// src/pages/marketplace/ProductDetailScreen.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList,
  Image, Dimensions, ActivityIndicator, Modal, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors }    from '../../theme';
import AppDetails    from '../../helpers/appdetails';
import useStore      from '../../repository/store';
import { useAuth }   from '../../AuthContext';
import {
  getProductDetail,
  addToCart,
  getCart,
  fetchMarketplaceProducts,
} from './marketplaceApi';

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const BRAND     = Colors.primaryDark  ?? '#0c3f44';
const ACCENT    = Colors.primary      ?? '#1f8e93';
const BG        = Colors.background   ?? '#F4F6F9';
const WHITE     = Colors.white        ?? '#ffffff';
const DARK      = Colors.black        ?? '#0F1923';
const MUTED     = Colors.secondaryText ?? '#8A96A3';
const DANGER    = '#ef4444';
const GREEN     = '#22c55e';
const GOLD      = '#f59e0b';

// ─── Currency conversion (same fixed rate as marketplace screen) ──────────────
const CNY_NGN_RATE = 215;
function convertAndFormat(price, fromCcy, toCcy) {
  const raw = Number(price ?? 0);
  let v = raw;
  if (fromCcy === 'NGN' && toCcy === 'CNY') v = raw / CNY_NGN_RATE;
  else if (fromCcy === 'CNY' && toCcy === 'NGN') v = raw * CNY_NGN_RATE;
  if (toCcy === 'NGN') return `₦${Math.round(v).toLocaleString('en')}`;
  if (toCcy === 'CNY') return `¥${v.toFixed(2)}`;
  return `${toCcy} ${raw.toLocaleString()}`;
}

const FONT_B = AppDetails?.fontFamily?.redex?.bold    ?? 'System';
const FONT_M = AppDetails?.fontFamily?.inter?.medium  ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';

const { width: W, height: H } = Dimensions.get('window');
const IMG_H = Math.round(W * 0.88); // square-ish, scrolls with content

const a = (hex, op) => {
  const h = (hex || '').replace('#', '');
  return '#' + h + Math.round(op * 255).toString(16).padStart(2, '0');
};

// ─── HTML → clean text ────────────────────────────────────────────────────────
const stripHtml = (raw = '') => {
  if (!raw) return '';
  return raw
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)))
    .replace(/&rsquo;|&lsquo;|&apos;/g, "'")
    .replace(/&rdquo;|&ldquo;/g, '"')
    .replace(/&ndash;|&mdash;/g, '-')
    .replace(/&hellip;/g, '...')
    .replace(/&#039;/g, "'").replace(/&amp;?/g, '&').replace(/&#038;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/&apos;/g, "'").replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n').trim();
};

// ─── Color resolution ─────────────────────────────────────────────────────────
const COLOR_MAP = {
  black: '#0f0f0f', white: '#f5f5f5', red: '#ef4444', blue: '#3b82f6',
  green: '#22c55e', yellow: '#eab308', pink: '#ec4899', purple: '#a855f7',
  orange: '#f97316', gray: '#9ca3af', grey: '#9ca3af', brown: '#92400e',
  navy: '#1e3a5f', gold: '#f59e0b', silver: '#d1d5db', beige: '#d4b896',
  maroon: '#7f1d1d', teal: '#0891b2', olive: '#65a30d', coral: '#fb7185',
  cream: '#fef9c3', ivory: '#fffff0', khaki: '#c3a96d', cyan: '#06b6d4',
};
const getColorHex = (val = '') => {
  const lower = val.toLowerCase().trim();
  return Object.entries(COLOR_MAP).find(([k]) => lower.includes(k))?.[1] ?? null;
};
const isColorVar = (name = '') => {
  const n = name.toLowerCase();
  return n.includes('color') || n.includes('colour') || n === 'shade' || n === 'finish';
};

// ─── Star rating ──────────────────────────────────────────────────────────────
function Stars({ rating = 0, size = 13 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1.5 }}>
      {[0, 1, 2, 3, 4].map(i => (
        <Ionicons
          key={i}
          name={i < Math.floor(rating) ? 'star' : i < rating ? 'star-half' : 'star-outline'}
          size={size}
          color={i < rating ? GOLD : '#d4d4d4'}
        />
      ))}
    </View>
  );
}

// ─── Product Detail Screen ────────────────────────────────────────────────────
export default function ProductDetailScreen({ navigation, route }) {
  const { token }          = useAuth();
  const showToast          = useStore(s => s.showToast);
  const setCartCount       = useStore(s => s.setCartCount);
  const cartCount          = useStore(s => s.cartCount);
  const displayCurrency    = useStore(s => s.marketplaceCurrency);
  const setDisplayCurrency = useStore(s => s.setMarketplaceCurrency);
  const insets             = useSafeAreaInsets();

  const routeProduct = route.params?.product;
  const postId       = routeProduct?.post_id ?? route.params?.post_id;

  const [product,     setProduct]     = useState(routeProduct ?? null);
  const [loadingFull, setLoadingFull] = useState(true);
  const [activeImg,   setActiveImg]   = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [related,     setRelated]     = useState([]);
  const [qty,         setQty]         = useState(1);
  const [selected,    setSelected]    = useState({});
  const [adding,      setAdding]      = useState(false);
  const [addError,    setAddError]    = useState('');

  const imgListRef = useRef(null);

  useEffect(() => {
    if (!postId) { setLoadingFull(false); return; }
    setLoadingFull(true);
    getProductDetail(postId, token)
      .then(p => { setProduct(p); setLoadingFull(false); })
      .catch(() => setLoadingFull(false));
  }, [postId, token]);

  useEffect(() => {
    const catId = product?.category_id;
    if (!catId) return;
    fetchMarketplaceProducts({ limit: 10, category_id: catId }, undefined, token)
      .then(d =>
        setRelated(
          (d.products ?? [])
            .filter(p => p.post_id !== product.post_id)
            .slice(0, 8),
        ),
      )
      .catch(() => {});
  }, [product?.category_id, product?.post_id, token]);

  if (!product && !loadingFull) {
    return (
      <View style={s.notFoundRoot}>
        <Ionicons name="alert-circle-outline" size={52} color={MUTED} />
        <Text style={s.notFoundTxt}>Product not found.</Text>
        <TouchableOpacity style={s.notFoundBtn} onPress={() => navigation.goBack()}>
          <Text style={s.notFoundBtnTxt}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const images      = product?.photos?.length ? product.photos : product?.thumbnail ? [product.thumbnail] : [];
  const inStock     = product?.in_stock === true;
  const variations  = product?.variations ?? [];
  const cleanTitle  = stripHtml(product?.title ?? '');
  const cleanDesc   = stripHtml(product?.description ?? '');
  const rating      = parseFloat(product?.average_rating ?? '0') || 0;
  const reviewCount = product?.review_count ?? 0;

  const allSelected = variations.length === 0 || variations.every(v => !!selected[v.id]);
  const canAdd      = inStock && allSelected && !adding;

  const handleSelectOption = useCallback((variationId, optionId) => {
    setSelected(prev => ({ ...prev, [variationId]: optionId }));
    setAddError('');
  }, []);

  const handleClearAll = useCallback(() => {
    setSelected({});
    setAddError('');
  }, []);

  const buildSelectedVariations = useCallback(() => {
    const out = [];
    variations.forEach(v => {
      const opt = v.options.find(o => o.id === selected[v.id]);
      if (opt) {
        out.push({
          attribute: v.add_to_cart_key || v.slug || v.name,
          value: opt.add_to_cart_value || opt.slug || opt.value,
          attribute_candidates: [
            v.add_to_cart_key,
            v.name,
            v.slug,
            v.slug ? `pa_${v.slug}` : '',
          ],
          value_candidates: [
            opt.add_to_cart_value,
            opt.value,
            opt.slug,
          ],
        });
      }
    });
    return out;
  }, [variations, selected]);

  const handleAddToCart = useCallback(async () => {
    if (!allSelected) {
      setAddError('Please select all options before adding to cart.');
      return;
    }
    setAdding(true);
    setAddError('');
    try {
      await addToCart(token, product.post_id, buildSelectedVariations(), qty);
      const cart = await getCart(token).catch(() => null);
      if (cart) setCartCount(cart.count);
      showToast('Added to cart', null);
    } catch (e) {
      setAddError(e.message ?? 'Could not add to cart.');
    }
    setAdding(false);
  }, [allSelected, buildSelectedVariations, qty, token, product, setCartCount, showToast]);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      {/* ── Branded gradient header ── */}
      <LinearGradient
        colors={[BRAND, ACCENT]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[s.topBar, { paddingTop: insets.top + 8 }]}
      >
        <TouchableOpacity style={s.topBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </TouchableOpacity>

        {/* Currency toggle — centered */}
        <View style={s.currencyToggle}>
          <TouchableOpacity
            style={[s.cyPill, displayCurrency === 'NGN' && s.cyPillActive]}
            onPress={() => setDisplayCurrency('NGN')}
            activeOpacity={0.8}
          >
            <Text style={[s.cyTxt, displayCurrency === 'NGN' && s.cyTxtActive]}>₦ NGN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.cyPill, displayCurrency === 'CNY' && s.cyPillActive]}
            onPress={() => setDisplayCurrency('CNY')}
            activeOpacity={0.8}
          >
            <Text style={[s.cyTxt, displayCurrency === 'CNY' && s.cyTxtActive]}>¥ CNY</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.topBtn} onPress={() => navigation.navigate('CartScreen')}>
          <Ionicons name="bag-outline" size={20} color={WHITE} />
          {cartCount > 0 && (
            <View style={s.cartBadge}>
              <Text style={s.cartBadgeTxt}>{cartCount > 99 ? '99+' : cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Image gallery (scrolls with content) ── */}
        <View style={s.gallery}>
          {images.length > 0 ? (
            <>
              <FlatList
                ref={imgListRef}
                data={images}
                keyExtractor={(_, i) => String(i)}
                horizontal
                pagingEnabled
                scrollEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={e =>
                  setActiveImg(Math.round(e.nativeEvent.contentOffset.x / W))
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    activeOpacity={0.96}
                    onPress={() => setPreviewOpen(true)}
                    style={{ width: W, height: IMG_H }}
                  >
                    <Image
                      source={{ uri: item }}
                      style={{ width: W, height: IMG_H }}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}
              />

              {/* Gradient overlay at bottom of image */}
              <LinearGradient
                colors={['transparent', a('#000', 0.22)]}
                style={s.galleryGradient}
                pointerEvents="none"
              />

              {/* Dot indicators */}
              {images.length > 1 && (
                <View style={s.dotsRow}>
                  {images.map((_, i) => (
                    <View key={i} style={[s.dot, i === activeImg && s.dotActive]} />
                  ))}
                </View>
              )}

              {/* Image counter badge */}
              {images.length > 1 && (
                <View style={s.imgBadge}>
                  <Ionicons name="images-outline" size={11} color={WHITE} />
                  <Text style={s.imgBadgeTxt}>{activeImg + 1}/{images.length}</Text>
                </View>
              )}

              {/* Thumbnail strip */}
              {images.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.thumbStrip}
                >
                  {images.map((img, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => {
                        setActiveImg(i);
                        imgListRef.current?.scrollToIndex({ index: i, animated: true });
                      }}
                      style={[s.thumb, i === activeImg && s.thumbActive]}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: img }} style={s.thumbImg} resizeMode="cover" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </>
          ) : (
            <View style={s.galleryEmpty}>
              <Ionicons name="image-outline" size={56} color={a(DARK, 0.12)} />
              <Text style={s.galleryEmptyTxt}>No images</Text>
            </View>
          )}
        </View>

        {/* ── Main content card ── */}
        <View style={s.card}>

          {/* Header row: condition + stock */}
          <View style={s.cardHeaderRow}>
            {!!product?.condition && (
              <View style={s.condBadge}>
                <View style={s.condDot} />
                <Text style={s.condTxt}>{product.condition}</Text>
              </View>
            )}
            <View style={{ flex: 1 }} />
            <View style={[s.stockChip, !inStock && s.stockChipOut]}>
              <View style={[s.stockDot, !inStock && { backgroundColor: DANGER }]} />
              <Text style={[s.stockTxt, !inStock && { color: DANGER }]}>
                {inStock ? 'In Stock' : 'Out of Stock'}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={s.title}>{cleanTitle || '—'}</Text>

          {/* Rating */}
          <View style={s.ratingRow}>
            <Stars rating={rating} size={14} />
            <Text style={s.ratingTxt}>
              {rating > 0 ? rating.toFixed(1) : 'No ratings'}
              {reviewCount > 0 ? `  (${reviewCount} reviews)` : ''}
            </Text>
          </View>

          {/* Price */}
          <View style={s.priceRow}>
            <Text style={s.price}>
              {convertAndFormat(product?.price, product?.currency ?? 'NGN', displayCurrency)}
            </Text>
          </View>

          <View style={s.divider} />

          {/* Quantity */}
          <View style={s.qtyRow}>
            <Text style={s.qtyLabel}>Quantity</Text>
            <View style={s.qtyStepper}>
              <TouchableOpacity
                style={[s.qtyBtn, qty <= 1 && s.qtyBtnDisabled]}
                onPress={() => setQty(q => Math.max(1, q - 1))}
                disabled={qty <= 1}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="remove" size={16} color={qty <= 1 ? a(DARK, 0.25) : BRAND} />
              </TouchableOpacity>
              <Text style={s.qtyVal}>{qty}</Text>
              <TouchableOpacity
                style={s.qtyBtn}
                onPress={() => setQty(q => Math.min(product?.quantity ?? 99, q + 1))}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="add" size={16} color={BRAND} />
              </TouchableOpacity>
            </View>
          </View>

        </View>

        {/* ── Description card ── */}
        {(!!cleanDesc || loadingFull) && (
          <View style={s.descCard}>
            <View style={s.sectionHeader}>
              <View style={s.sectionIconBox}>
                <Ionicons name="document-text-outline" size={16} color={ACCENT} />
              </View>
              <Text style={s.sectionTitle}>Description</Text>
            </View>
            {loadingFull ? (
              <View style={s.descSkeleton}>
                {[W * 0.7, W * 0.85, W * 0.6, W * 0.78].map((w, i) => (
                  <View key={i} style={[s.skeletonLine, { width: w - 40 }]} />
                ))}
              </View>
            ) : (
              <Text style={s.descTxt}>{cleanDesc}</Text>
            )}
          </View>
        )}

        {/* ── Variations card ── */}
        {(variations.length > 0 || loadingFull) && (
          <View style={s.varCard}>
            <View style={s.sectionHeader}>
              <View style={s.sectionIconBox}>
                <Ionicons name="options-outline" size={16} color={ACCENT} />
              </View>
              <Text style={s.sectionTitle}>Options</Text>
              {Object.keys(selected).length > 0 && (
                <TouchableOpacity onPress={handleClearAll} style={{ marginLeft: 'auto' }}>
                  <Text style={s.clearTxt}>Clear all</Text>
                </TouchableOpacity>
              )}
            </View>

            {loadingFull ? (
              <View style={{ gap: 16 }}>
                {[0, 1].map(i => (
                  <View key={i} style={{ gap: 10 }}>
                    <View style={[s.skeletonLine, { width: 80, height: 12 }]} />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {[0, 1, 2].map(j => (
                        <View key={j} style={[s.skeletonLine, { width: 52, height: 36, borderRadius: 10 }]} />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              variations.map((v, vi) => {
                const colorMode = isColorVar(v.name);
                return (
                  <View key={`variation-${v.id}-${vi}`} style={[s.varGroup, vi > 0 && { marginTop: 20 }]}>
                    <View style={s.varLabelRow}>
                      <Text style={s.varLabel}>{v.name}</Text>
                      {!!selected[v.id] && (
                        <Text style={s.varVal}>
                          — {v.options.find(o => o.id === selected[v.id])?.value ?? ''}
                        </Text>
                      )}
                    </View>
                    <View style={s.chipsWrap}>
                      {v.options.map((opt, oi) => {
                        const isChosen = selected[v.id] === opt.id;
                        const colorHex = colorMode ? getColorHex(opt.value) : null;
                        if (colorMode && colorHex) {
                          return (
                            <TouchableOpacity
                              key={`color-option-${v.id}-${opt.id}-${oi}`}
                              onPress={() => handleSelectOption(v.id, opt.id)}
                              style={[s.colorChip, isChosen && s.colorChipActive]}
                              activeOpacity={0.75}
                            >
                              <View style={[s.colorDot, { backgroundColor: colorHex },
                                colorHex === '#f5f5f5' && { borderWidth: 1, borderColor: '#ccc' }]}
                              />
                              <Text style={[s.colorChipTxt, isChosen && { color: DARK, fontFamily: FONT_B }]}>
                                {opt.value}
                              </Text>
                              {isChosen && <Ionicons name="checkmark-circle" size={13} color={BRAND} />}
                            </TouchableOpacity>
                          );
                        }
                        return (
                          <TouchableOpacity
                            key={`option-${v.id}-${opt.id}-${oi}`}
                            onPress={() => handleSelectOption(v.id, opt.id)}
                            style={[s.sizeChip, isChosen && s.sizeChipActive]}
                            activeOpacity={0.75}
                          >
                            <Text style={[s.sizeChipTxt, isChosen && s.sizeChipTxtActive]}>
                              {opt.value}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ── Related products ── */}
        {related.length > 0 && (
          <View style={s.relatedSection}>
            <View style={s.sectionHeader}>
              <View style={s.sectionIconBox}>
                <Ionicons name="grid-outline" size={16} color={ACCENT} />
              </View>
              <Text style={s.sectionTitle}>You May Also Like</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.relatedScroll}
            >
              {related.map((item, index) => {
                const thumb  = item.thumbnail ?? item.photos?.[0] ?? null;
                const rTitle = stripHtml(item.title ?? '');
                return (
                  <View key={`related-${item.post_id ?? item.id}-${index}`} style={s.relCard}>
                    <TouchableOpacity
                      onPress={() => navigation.push('ProductDetail', { product: item })}
                      activeOpacity={0.86}
                    >
                      <View style={s.relImg}>
                        {thumb
                          ? <Image source={{ uri: thumb }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                          : <View style={s.relImgEmpty}><Ionicons name="image-outline" size={22} color={MUTED} /></View>
                        }
                        <TouchableOpacity
                          style={s.relQuickAdd}
                          onPress={async () => {
                            try {
                              await addToCart(token, item.post_id, {}, 1);
                              const cart = await getCart(token).catch(() => null);
                              if (cart) setCartCount(cart.count);
                              showToast('Added to cart', null);
                            } catch { showToast('Could not add', null); }
                          }}
                        >
                          <Ionicons name="add" size={16} color={WHITE} />
                        </TouchableOpacity>
                      </View>
                      <Text style={s.relName} numberOfLines={2}>{rTitle}</Text>
                      <Text style={s.relPrice}>{convertAndFormat(item.price, item.currency ?? 'NGN', displayCurrency)}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* ── Bottom bar ── */}
      <View style={[s.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {!!addError && (
          <View style={s.errorStrip}>
            <Ionicons name="alert-circle-outline" size={13} color={DANGER} />
            <Text style={s.errorStripTxt} numberOfLines={1}>{addError}</Text>
          </View>
        )}
        <View style={s.bottomInner}>
          <View style={s.qtyStepper2}>
            <TouchableOpacity
              style={[s.qtyBtn2, qty <= 1 && s.qtyBtn2Dis]}
              onPress={() => setQty(q => Math.max(1, q - 1))}
              disabled={qty <= 1}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Ionicons name="remove" size={17} color={qty <= 1 ? a(DARK, 0.25) : DARK} />
            </TouchableOpacity>
            <Text style={s.qtyVal2}>{qty}</Text>
            <TouchableOpacity
              style={s.qtyBtn2}
              onPress={() => setQty(q => Math.min(product?.quantity ?? 99, q + 1))}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Ionicons name="add" size={17} color={DARK} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[s.addBtn, !canAdd && s.addBtnDisabled]}
            onPress={handleAddToCart}
            disabled={!canAdd}
            activeOpacity={0.86}
          >
            {adding ? (
              <ActivityIndicator size="small" color={WHITE} />
            ) : (
              <>
                {canAdd && <Ionicons name="bag-add-outline" size={18} color={WHITE} />}
                <Text style={s.addBtnTxt}>
                  {!inStock ? 'Out of Stock'
                    : !allSelected && variations.length > 0 ? 'Select Options'
                    : 'Add to Cart'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Fullscreen preview ── */}
      <Modal
        visible={previewOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewOpen(false)}
      >
        <View style={s.previewOverlay}>
          <FlatList
            data={images}
            keyExtractor={(_, i) => String(i)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={activeImg}
            getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
            renderItem={({ item }) => (
              <View style={{ width: W, height: H, alignItems: 'center', justifyContent: 'center' }}>
                <Image source={{ uri: item }} style={{ width: W, height: H * 0.8 }} resizeMode="contain" />
              </View>
            )}
          />
          <TouchableOpacity
            style={[s.previewClose, { top: insets.top + 12 }]}
            onPress={() => setPreviewOpen(false)}
          >
            <Ionicons name="close" size={22} color={WHITE} />
          </TouchableOpacity>
          {images.length > 1 && (
            <View style={[s.previewCounter, { bottom: insets.bottom + 24 }]}>
              <Text style={s.previewCounterTxt}>{activeImg + 1} / {images.length}</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  notFoundRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: WHITE, gap: 14, padding: 32 },
  notFoundTxt:  { fontSize: 15, color: MUTED, fontFamily: FONT_R, textAlign: 'center' },
  notFoundBtn:  { backgroundColor: BRAND, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 13 },
  notFoundBtnTxt: { fontSize: 14, fontWeight: '800', color: WHITE, fontFamily: FONT_M },

  // ── Top bar (gradient) ─────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingBottom: 12,
    zIndex: 10,
  },
  topBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: a(WHITE, 0.15),
    borderWidth: 1, borderColor: a(WHITE, 0.2),
    alignItems: 'center', justifyContent: 'center',
  },

  // Currency toggle
  currencyToggle: {
    flex: 1, flexDirection: 'row', justifyContent: 'center',
    backgroundColor: a(WHITE, 0.12),
    borderRadius: 100, borderWidth: 1, borderColor: a(WHITE, 0.18),
    padding: 3, marginHorizontal: 12,
  },
  cyPill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 100 },
  cyPillActive: { backgroundColor: WHITE },
  cyTxt: { fontSize: 11.5, fontWeight: '800', color: a(WHITE, 0.65), fontFamily: FONT_B },
  cyTxtActive: { color: BRAND },
  cartBadge: {
    position: 'absolute', top: -2, right: -2,
    backgroundColor: DANGER, borderRadius: 9,
    minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: WHITE,
  },
  cartBadgeTxt: { color: WHITE, fontSize: 8.5, fontWeight: '900', fontFamily: FONT_B },

  // ── Gallery ────────────────────────────────────────────────────────────────
  gallery: {
    width: W, backgroundColor: '#F0F2F5',
  },
  galleryGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
    pointerEvents: 'none',
  },
  galleryEmpty: {
    height: IMG_H, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  galleryEmptyTxt: { fontSize: 13, color: a(DARK, 0.3), fontFamily: FONT_R },

  dotsRow: {
    position: 'absolute', bottom: 52, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 5,
  },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: a(WHITE, 0.55) },
  dotActive: { width: 22, height: 6, borderRadius: 3, backgroundColor: WHITE },

  imgBadge: {
    position: 'absolute', bottom: 56, right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: a('#000', 0.48),
    borderRadius: 100, paddingHorizontal: 9, paddingVertical: 4,
  },
  imgBadgeTxt: { color: WHITE, fontSize: 11, fontWeight: '700', fontFamily: FONT_M },

  // Thumbnail strip
  thumbStrip: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  thumb: {
    width: 56, height: 56, borderRadius: 10,
    overflow: 'hidden', borderWidth: 2, borderColor: 'transparent',
  },
  thumbActive: { borderColor: ACCENT },
  thumbImg: { width: '100%', height: '100%' },

  // ── Main card ──────────────────────────────────────────────────────────────
  card: {
    backgroundColor: WHITE, marginHorizontal: 14, marginTop: 14,
    borderRadius: 20, padding: 18,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },

  condBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: a(GREEN, 0.1), borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  condDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN },
  condTxt:  { fontSize: 11, fontWeight: '800', color: GREEN, fontFamily: FONT_M },

  stockChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: a(GREEN, 0.09), borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  stockChipOut: { backgroundColor: a(DANGER, 0.08) },
  stockDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN },
  stockTxt:     { fontSize: 11, fontWeight: '700', color: GREEN, fontFamily: FONT_M },

  title: { fontSize: 21, fontWeight: '900', color: DARK, lineHeight: 28, fontFamily: FONT_B, marginBottom: 10 },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  ratingTxt:  { fontSize: 12.5, color: MUTED, fontFamily: FONT_R },

  priceRow: { marginBottom: 16 },
  price: { fontSize: 30, fontWeight: '900', color: BRAND, fontFamily: FONT_B, letterSpacing: -0.5 },

  divider: { height: 1, backgroundColor: a(DARK, 0.06), marginBottom: 16 },

  qtyRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qtyLabel:  { fontSize: 14, fontWeight: '800', color: DARK, fontFamily: FONT_B },
  qtyStepper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: a(BRAND, 0.18), borderRadius: 12,
    overflow: 'hidden', backgroundColor: WHITE,
  },
  qtyBtn:         { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: a(BRAND, 0.05) },
  qtyBtnDisabled: { opacity: 0.3 },
  qtyVal:         { fontSize: 15, fontWeight: '900', color: DARK, paddingHorizontal: 14, fontFamily: FONT_B },

  // ── Description card ───────────────────────────────────────────────────────
  descCard: {
    backgroundColor: WHITE, marginHorizontal: 14, marginTop: 12,
    borderRadius: 20, padding: 18,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  descTxt: { fontSize: 14.5, color: '#4A5568', lineHeight: 24, fontFamily: FONT_R },
  descSkeleton: { gap: 10, marginTop: 4 },
  skeletonLine: { height: 13, borderRadius: 6, backgroundColor: a(DARK, 0.07) },

  // ── Variations card ────────────────────────────────────────────────────────
  varCard: {
    backgroundColor: WHITE, marginHorizontal: 14, marginTop: 12,
    borderRadius: 20, padding: 18,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  varGroup:   {},
  varLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  varLabel:   { fontSize: 13.5, fontWeight: '800', color: DARK, fontFamily: FONT_B },
  varVal:     { fontSize: 13, color: ACCENT, fontWeight: '700', fontFamily: FONT_M },
  chipsWrap:  { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  clearTxt:   { fontSize: 13, fontWeight: '600', color: ACCENT, fontFamily: FONT_M },

  colorChip:       { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100, borderWidth: 1.5, borderColor: '#E8ECF0', backgroundColor: WHITE },
  colorChipActive: { borderColor: DARK, backgroundColor: a(DARK, 0.04) },
  colorDot:        { width: 14, height: 14, borderRadius: 7 },
  colorChipTxt:    { fontSize: 13, color: MUTED, fontFamily: FONT_M },

  sizeChip:        { minWidth: 50, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 11, borderWidth: 1.5, borderColor: '#E8ECF0', backgroundColor: WHITE, alignItems: 'center' },
  sizeChipActive:  { borderColor: BRAND, backgroundColor: BRAND },
  sizeChipTxt:     { fontSize: 13.5, fontWeight: '600', color: MUTED, fontFamily: FONT_M },
  sizeChipTxtActive: { color: WHITE, fontFamily: FONT_B, fontWeight: '800' },

  // ── Section header ─────────────────────────────────────────────────────────
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionIconBox: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: a(ACCENT, 0.1),
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: DARK, fontFamily: FONT_B },

  // ── Related ────────────────────────────────────────────────────────────────
  relatedSection: {
    backgroundColor: WHITE, marginHorizontal: 14, marginTop: 12,
    borderRadius: 20, padding: 18,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  relatedScroll: { gap: 12 },
  relCard:       { width: 140 },
  relImg: {
    width: 140, height: 140, borderRadius: 16,
    backgroundColor: '#F0F2F5', overflow: 'hidden', marginBottom: 8,
  },
  relImgEmpty:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  relQuickAdd:  {
    position: 'absolute', bottom: 8, right: 8,
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center',
    shadowColor: BRAND, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 5,
  },
  relName:  { fontSize: 12, fontWeight: '600', color: DARK, lineHeight: 16, fontFamily: FONT_M, marginBottom: 4 },
  relPrice: { fontSize: 13.5, fontWeight: '900', color: BRAND, fontFamily: FONT_B },

  // ── Bottom bar ─────────────────────────────────────────────────────────────
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: WHITE,
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: a(DARK, 0.06),
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 14, elevation: 18,
  },
  errorStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: a(DANGER, 0.07), borderRadius: 9,
    paddingHorizontal: 10, paddingVertical: 7, marginBottom: 10,
  },
  errorStripTxt: { flex: 1, fontSize: 12, color: DANGER, fontFamily: FONT_R },
  bottomInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },

  qtyStepper2: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 1.5, borderColor: '#E8ECF0',
    backgroundColor: WHITE, overflow: 'hidden',
  },
  qtyBtn2:    { width: 42, height: 50, alignItems: 'center', justifyContent: 'center' },
  qtyBtn2Dis: { opacity: 0.32 },
  qtyVal2:    { minWidth: 32, textAlign: 'center', fontSize: 16, fontWeight: '800', color: DARK, fontFamily: FONT_B },

  addBtn:         { flex: 1, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: BRAND, borderRadius: 14 },
  addBtnDisabled: { backgroundColor: a(MUTED, 0.55) },
  addBtnTxt:      { fontSize: 15, fontWeight: '900', color: WHITE, fontFamily: FONT_B, letterSpacing: 0.2 },

  // ── Fullscreen preview ─────────────────────────────────────────────────────
  previewOverlay:  { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  previewClose:    { position: 'absolute', right: 18, width: 42, height: 42, borderRadius: 21, backgroundColor: a(WHITE, 0.15), alignItems: 'center', justifyContent: 'center' },
  previewCounter:  { position: 'absolute', alignSelf: 'center' },
  previewCounterTxt: { fontSize: 13, color: a(WHITE, 0.75), fontFamily: FONT_M, backgroundColor: a('#000', 0.45), paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100 },
});
