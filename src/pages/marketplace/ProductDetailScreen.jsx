// src/pages/marketplace/ProductDetailScreen.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList,
  Image, Dimensions, ActivityIndicator, Modal, Platform, StatusBar,
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
const BRAND     = '#0c3f44';
const ACCENT    = '#1f8e93';
const ACCENT_LT = '#27adb5';
const BG        = '#F4F6F9';
const WHITE     = '#ffffff';
const DARK      = '#0F1923';
const MUTED     = '#8A96A3';
const DANGER    = '#ef4444';
const GREEN     = '#22c55e';

const FONT_B = AppDetails?.fontFamily?.redex?.bold    ?? 'System';
const FONT_M = AppDetails?.fontFamily?.inter?.medium  ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';

const { width: W, height: H } = Dimensions.get('window');
const IMG_H = Math.round(H * 0.50);

// Alpha helper
const a = (hex, op) => {
  const h = (hex || '').replace('#', '');
  return '#' + h + Math.round(op * 255).toString(16).padStart(2, '0');
};

// ─── HTML → clean text ────────────────────────────────────────────────────────
const stripHtml = (raw = '') => {
  if (!raw) return '';
  return raw
    .replace(/&#039;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<')
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
          color={i < rating ? '#f59e0b' : '#d4d4d4'}
        />
      ))}
    </View>
  );
}

// ─── Skeleton shimmer placeholder ─────────────────────────────────────────────
function SkeletonBox({ w, h, radius = 8 }) {
  return (
    <View
      style={{
        width: w, height: h, borderRadius: radius,
        backgroundColor: a(DARK, 0.08),
      }}
    />
  );
}

// ─── Product Detail Screen ────────────────────────────────────────────────────
export default function ProductDetailScreen({ navigation, route }) {
  const { token }    = useAuth();
  const showToast    = useStore(s => s.showToast);
  const setCartCount = useStore(s => s.setCartCount);
  const cartCount    = useStore(s => s.cartCount);
  const insets       = useSafeAreaInsets();

  const routeProduct = route.params?.product;
  const postId       = routeProduct?.post_id ?? route.params?.post_id;

  const [product,      setProduct]      = useState(routeProduct ?? null);
  const [loadingFull,  setLoadingFull]  = useState(true);
  const [activeImg,    setActiveImg]    = useState(0);
  const [previewOpen,  setPreviewOpen]  = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [related,      setRelated]      = useState([]);
  const [qty,          setQty]          = useState(1);

  // { variationId: optionId }
  const [selected, setSelected] = useState({});
  const [adding,   setAdding]   = useState(false);
  const [addError, setAddError] = useState('');

  const imgListRef = useRef(null);

  // ── Fetch full product detail ──────────────────────────────────────────────
  useEffect(() => {
    if (!postId) { setLoadingFull(false); return; }
    setLoadingFull(true);
    getProductDetail(postId, token)
      .then(p => { setProduct(p); setLoadingFull(false); })
      .catch(() => setLoadingFull(false));
  }, [postId, token]);

  // ── Fetch related products ─────────────────────────────────────────────────
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

  // ── Not found ────────────────────────────────────────────────────────────
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

  // ── Derived ───────────────────────────────────────────────────────────────
  const images    = product?.photos?.length ? product.photos : product?.thumbnail ? [product.thumbnail] : [];
  const inStock   = product?.in_stock === true;
  const variations = product?.variations ?? [];
  const cleanTitle = stripHtml(product?.title ?? '');
  const cleanDesc  = stripHtml(product?.description ?? '');
  const isPage     = product?.seller?.type === 'page';
  const sellerName = isPage && product?.seller?.page_name
    ? product.seller.page_name
    : product?.seller?.username ?? '—';
  const rating     = parseFloat(product?.average_rating ?? '0') || 0;
  const reviewCount = product?.review_count ?? 0;

  const allSelected = variations.length === 0 || variations.every(v => !!selected[v.id]);
  const canAdd      = inStock && allSelected && !adding;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelectOption = useCallback((variationId, optionId) => {
    setSelected(prev => ({ ...prev, [variationId]: optionId }));
    setAddError('');
  }, []);

  const handleClearAll = useCallback(() => {
    setSelected({});
    setAddError('');
  }, []);

  const buildSelectedVariations = useCallback(() => {
    const out = {};
    variations.forEach(v => {
      const opt = v.options.find(o => o.id === selected[v.id]);
      if (opt) out[v.name] = opt.value;
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

  const handleChat = useCallback(() => {
    if (!product?.seller) return;
    const initialMessage = "Hi, I'm interested in this product";
    if (isPage) {
      navigation.navigate('Thread', {
        pageId: product.seller.id,
        pageName: product.seller.page_name ?? product.seller.username,
        pageAvatar: product.seller.avatar,
        initialMessage,
        product_id: product.post_id,
      });
    } else {
      navigation.navigate('Thread', {
        conversationId: null,
        otherUser: {
          id: product.seller.id,
          username: product.seller.username,
          avatar: product.seller.avatar,
          full_name: product.seller.username,
        },
        initialMessage,
        product_id: product.post_id,
      });
    }
  }, [product, isPage, navigation]);

  const openPreview = useCallback(() => setPreviewOpen(true), []);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━ HERO IMAGE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <View style={[s.heroSection, { height: IMG_H }]}>
        {images.length > 0 ? (
          <FlatList
            ref={imgListRef}
            data={images}
            keyExtractor={(_, i) => String(i)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={e => {
              setActiveImg(Math.round(e.nativeEvent.contentOffset.x / W));
            }}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.95}
                onPress={openPreview}
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
        ) : (
          <View style={s.heroPlaceholder}>
            <Ionicons name="image-outline" size={64} color={a(DARK, 0.15)} />
          </View>
        )}

        {/* Bottom gradient */}
        <LinearGradient
          colors={['transparent', a('#000', 0.38)]}
          style={s.heroGradient}
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

        {/* Floating header overlay */}
        <View style={[s.floatingHeader, { paddingTop: insets.top + 8 }]}>
          {/* Back button */}
          <TouchableOpacity
            style={s.floatBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={20} color={DARK} />
          </TouchableOpacity>

          {/* Cart icon with badge */}
          <TouchableOpacity
            style={s.floatBtn}
            onPress={() => navigation.navigate('CartScreen')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="bag-outline" size={20} color={DARK} />
            {cartCount > 0 && (
              <View style={s.cartBadge}>
                <Text style={s.cartBadgeTxt}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Image count badge */}
        {images.length > 1 && (
          <View style={[s.imgCountBadge, { top: insets.top + 14 }]}>
            <Ionicons name="images-outline" size={11} color={WHITE} />
            <Text style={s.imgCountTxt}>{activeImg + 1} / {images.length}</Text>
          </View>
        )}
      </View>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━ CONTENT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* White panel: rounded top, overlaps image by 28px */}
        <View style={s.contentPanel}>

          {/* ── Condition badge ── */}
          {!!product?.condition && (
            <View style={s.conditionBadge}>
              <View style={s.conditionDot} />
              <Text style={s.conditionTxt}>{product.condition}</Text>
            </View>
          )}

          {/* ── Product title ── */}
          <Text style={s.productTitle}>{cleanTitle || '—'}</Text>

          {/* ── Rating row ── */}
          <View style={s.ratingRow}>
            <Stars rating={rating} size={14} />
            <Text style={s.ratingTxt}>
              {rating > 0 ? rating.toFixed(1) : 'No ratings'}&nbsp;
              {reviewCount > 0 ? `(${reviewCount})` : ''}
            </Text>
          </View>

          {/* ── Price + Stock row ── */}
          <View style={s.priceStockRow}>
            <Text style={s.price}>
              {product?.currency ?? ''} {Number(product?.price ?? 0).toLocaleString()}
            </Text>
            <View style={[s.stockChip, !inStock && s.stockChipOut]}>
              <View style={[s.stockDot, !inStock && { backgroundColor: DANGER }]} />
              <Text style={[s.stockTxt, !inStock && { color: DANGER }]}>
                {inStock ? 'In Stock' : 'Out of Stock'}
              </Text>
            </View>
          </View>

          {/* Teal divider */}
          <View style={s.tealDivider} />

          {/* ── Quantity selector ── */}
          <View style={s.qtySection}>
            <Text style={s.qtySectionLabel}>Quantity</Text>
            <View style={s.qtyStepper}>
              <TouchableOpacity
                style={[s.qtyStepBtn, qty <= 1 && s.qtyStepBtnDisabled]}
                onPress={() => setQty(q => Math.max(1, q - 1))}
                disabled={qty <= 1}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="remove" size={16} color={qty <= 1 ? a(DARK, 0.25) : BRAND} />
              </TouchableOpacity>
              <Text style={s.qtyStepVal}>{qty}</Text>
              <TouchableOpacity
                style={s.qtyStepBtn}
                onPress={() => setQty(q => Math.min(product?.quantity ?? 99, q + 1))}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="add" size={16} color={BRAND} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━ VARIATIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {loadingFull ? (
            <View style={s.skeletonBlock}>
              {[80, 110].map((w, i) => (
                <View key={i} style={{ gap: 10 }}>
                  <SkeletonBox w={w} h={13} radius={6} />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[0, 1, 2, 3].map(j => <SkeletonBox key={j} w={52} h={38} radius={10} />)}
                  </View>
                </View>
              ))}
            </View>
          ) : variations.length > 0 && (
            <View style={s.variationsBlock}>
              {/* Options header */}
              <View style={s.varHeaderRow}>
                <Text style={s.varHeaderTitle}>Options</Text>
                {Object.keys(selected).length > 0 && (
                  <TouchableOpacity
                    onPress={handleClearAll}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={s.clearAllTxt}>Clear all</Text>
                  </TouchableOpacity>
                )}
              </View>

              {variations.map((v, vi) => {
                const colorMode = isColorVar(v.name);
                return (
                  <View key={v.id} style={[s.varGroup, vi > 0 && { marginTop: 20 }]}>
                    <View style={s.varLabelRow}>
                      <Text style={s.varLabel}>{v.name}</Text>
                      {!!selected[v.id] && (
                        <Text style={s.varSelectedVal}>
                          — {v.options.find(o => o.id === selected[v.id])?.value ?? ''}
                        </Text>
                      )}
                    </View>

                    <View style={s.chipsWrap}>
                      {v.options.map(opt => {
                        const isChosen = selected[v.id] === opt.id;
                        const colorHex = colorMode ? getColorHex(opt.value) : null;

                        if (colorMode && colorHex) {
                          return (
                            <TouchableOpacity
                              key={opt.id}
                              onPress={() => handleSelectOption(v.id, opt.id)}
                              style={[s.colorChip, isChosen && s.colorChipActive]}
                              activeOpacity={0.75}
                            >
                              <View
                                style={[
                                  s.colorDot,
                                  { backgroundColor: colorHex },
                                  colorHex === '#f5f5f5' && { borderWidth: 1, borderColor: '#ccc' },
                                ]}
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
                            key={opt.id}
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
              })}
              <View style={s.thinDivider} />
            </View>
          )}

          {/* ── Description ── */}
          {!!cleanDesc && (
            <View style={s.descBlock}>
              <TouchableOpacity
                style={s.descToggleRow}
                onPress={() => setDescExpanded(x => !x)}
                activeOpacity={0.72}
              >
                <View style={s.descIconBox}>
                  <Ionicons name="document-text-outline" size={16} color={BRAND} />
                </View>
                <Text style={s.descToggleLabel}>Description</Text>
                <View style={{ flex: 1 }} />
                <Ionicons
                  name={descExpanded ? 'chevron-up' : 'chevron-forward'}
                  size={17}
                  color={MUTED}
                />
              </TouchableOpacity>

              {descExpanded && (
                <View style={s.descBody}>
                  <Text style={s.descTxt}>{cleanDesc}</Text>
                </View>
              )}
              <View style={s.thinDivider} />
            </View>
          )}

          {/* ── Seller card ── */}
          {!!product?.seller && (
            <View style={s.sellerCard}>
              <TouchableOpacity
                style={s.sellerRow}
                activeOpacity={0.78}
                onPress={() => {
                  if (isPage) navigation.navigate('BusinessDetails', { pageId: product.seller.id });
                  else navigation.navigate('UserProfile', { userId: product.seller.id });
                }}
              >
                <View style={s.sellerAvatarWrap}>
                  {product.seller.avatar ? (
                    <Image source={{ uri: product.seller.avatar }} style={s.sellerAvatar} />
                  ) : (
                    <View style={[s.sellerAvatar, s.sellerAvatarFallback]}>
                      <Ionicons name={isPage ? 'storefront' : 'person'} size={22} color={BRAND} />
                    </View>
                  )}
                  {product.seller.verified && (
                    <View style={s.verifiedBadge}>
                      <Ionicons name="checkmark" size={8} color={WHITE} />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.sellerName} numberOfLines={1}>{sellerName}</Text>
                  <View style={s.sellerTypeBadgeRow}>
                    <View style={s.sellerTypeBadge}>
                      <Text style={s.sellerTypeTxt}>
                        {isPage ? 'Official Store' : 'Individual Seller'}
                      </Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={MUTED} />
              </TouchableOpacity>

              <TouchableOpacity
                style={s.chatBtn}
                onPress={handleChat}
                activeOpacity={0.82}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={15} color={BRAND} />
                <Text style={s.chatBtnTxt}>Chat with Seller</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━ RELATED PRODUCTS ━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {related.length > 0 && (
          <View style={s.relatedSection}>
            <View style={s.relatedHeader}>
              <Text style={s.relatedTitle}>You May Also Like</Text>
              <Ionicons name="chevron-forward" size={16} color={MUTED} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.relatedScroll}
            >
              {related.map(item => {
                const thumb  = item.thumbnail ?? item.photos?.[0] ?? null;
                const rTitle = stripHtml(item.title ?? '');
                return (
                  <View key={String(item.post_id ?? item.id)} style={s.relatedCard}>
                    <TouchableOpacity
                      onPress={() => navigation.push('ProductDetail', { product: item })}
                      activeOpacity={0.86}
                    >
                      <View style={s.relatedImg}>
                        {thumb ? (
                          <Image
                            source={{ uri: thumb }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={s.relatedImgEmpty}>
                            <Ionicons name="image-outline" size={22} color={MUTED} />
                          </View>
                        )}
                      </View>
                      <View style={s.relatedBody}>
                        <Text style={s.relatedName} numberOfLines={2}>{rTitle}</Text>
                        <Text style={s.relatedPrice}>
                          {item.currency} {Number(item.price ?? 0).toLocaleString()}
                        </Text>
                        <Stars rating={0} size={10} />
                      </View>
                    </TouchableOpacity>

                    {/* Quick add */}
                    <TouchableOpacity
                      style={s.relatedQuickAdd}
                      activeOpacity={0.82}
                      onPress={async () => {
                        try {
                          await addToCart(token, item.post_id, {}, 1);
                          const cart = await getCart(token).catch(() => null);
                          if (cart) setCartCount(cart.count);
                          showToast('Added to cart', null);
                        } catch {
                          showToast('Could not add to cart', null);
                        }
                      }}
                    >
                      <Ionicons name="add" size={16} color={WHITE} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━ BOTTOM ADD TO CART BAR ━━━━━━━━━━━━━━━━━━━━━ */}
      <View style={[s.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {/* Error strip */}
        {!!addError && (
          <View style={s.errorStrip}>
            <Ionicons name="alert-circle-outline" size={13} color={DANGER} />
            <Text style={s.errorStripTxt} numberOfLines={1}>{addError}</Text>
          </View>
        )}

        <View style={s.bottomInner}>
          {/* Compact qty stepper */}
          <View style={s.bottomQtyWrap}>
            <TouchableOpacity
              style={[s.bottomQtyBtn, qty <= 1 && s.bottomQtyBtnDisabled]}
              onPress={() => setQty(q => Math.max(1, q - 1))}
              disabled={qty <= 1}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Ionicons name="remove" size={17} color={qty <= 1 ? a(DARK, 0.25) : DARK} />
            </TouchableOpacity>
            <Text style={s.bottomQtyVal}>{qty}</Text>
            <TouchableOpacity
              style={s.bottomQtyBtn}
              onPress={() => setQty(q => Math.min(product?.quantity ?? 99, q + 1))}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Ionicons name="add" size={17} color={DARK} />
            </TouchableOpacity>
          </View>

          {/* Add to Cart button */}
          <TouchableOpacity
            style={[s.addCartBtn, !canAdd && s.addCartBtnDisabled]}
            onPress={handleAddToCart}
            disabled={!canAdd}
            activeOpacity={0.86}
          >
            {adding ? (
              <ActivityIndicator size="small" color={WHITE} />
            ) : (
              <>
                {canAdd && <Ionicons name="bag-add-outline" size={18} color={WHITE} />}
                <Text style={s.addCartTxt}>
                  {!inStock
                    ? 'Out of Stock'
                    : !allSelected && variations.length > 0
                      ? 'Select Options'
                      : 'Add to Cart'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━ FULLSCREEN PREVIEW ━━━━━━━━━━━━━━━━━━━━━━━━━ */}
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
                <Image
                  source={{ uri: item }}
                  style={{ width: W, height: H * 0.8 }}
                  resizeMode="contain"
                />
              </View>
            )}
          />

          {/* Close */}
          <TouchableOpacity
            style={[s.previewCloseBtn, { top: insets.top + 12 }]}
            onPress={() => setPreviewOpen(false)}
          >
            <Ionicons name="close" size={22} color={WHITE} />
          </TouchableOpacity>

          {/* Counter */}
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
  root: { flex: 1, backgroundColor: WHITE },

  // ── Not found ──────────────────────────────────────────────────────────────
  notFoundRoot: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: WHITE, gap: 14, padding: 32,
  },
  notFoundTxt: {
    fontSize: 15, color: MUTED, fontFamily: FONT_R, textAlign: 'center',
  },
  notFoundBtn: {
    backgroundColor: BRAND, borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 13,
  },
  notFoundBtnTxt: {
    fontSize: 14, fontWeight: '800', color: WHITE, fontFamily: FONT_M,
  },

  // ── Hero section ───────────────────────────────────────────────────────────
  heroSection: { position: 'relative', backgroundColor: '#f0f0f0' },
  heroPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F0F2F5',
  },
  heroGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 100,
  },

  // Dots
  dotsRow: {
    position: 'absolute', bottom: 40, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 5,
    pointerEvents: 'none',
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: a(WHITE, 0.5),
  },
  dotActive: {
    width: 22, height: 6, borderRadius: 3, backgroundColor: WHITE,
  },

  // Floating header
  floatingHeader: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10,
  },
  floatBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: a(WHITE, 0.92),
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14, shadowRadius: 8, elevation: 5,
  },
  cartBadge: {
    position: 'absolute', top: -2, right: -2,
    backgroundColor: DANGER, borderRadius: 9,
    minWidth: 17, height: 17,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: WHITE,
  },
  cartBadgeTxt: {
    color: WHITE, fontSize: 9, fontWeight: '900', fontFamily: FONT_B,
  },

  imgCountBadge: {
    position: 'absolute', right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: a('#000', 0.5),
    borderRadius: 100, paddingHorizontal: 9, paddingVertical: 4,
  },
  imgCountTxt: { color: WHITE, fontSize: 11, fontWeight: '700', fontFamily: FONT_M },

  // ── Content panel ──────────────────────────────────────────────────────────
  contentPanel: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -28,
    paddingHorizontal: 20, paddingTop: 26, paddingBottom: 12,
  },

  // Condition badge
  conditionBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: a(GREEN, 0.1), borderRadius: 100,
    paddingHorizontal: 12, paddingVertical: 5, marginBottom: 12,
  },
  conditionDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN,
  },
  conditionTxt: {
    fontSize: 11.5, fontWeight: '800', color: GREEN, fontFamily: FONT_M, letterSpacing: 0.3,
  },

  productTitle: {
    fontSize: 22, fontWeight: '900', color: DARK,
    lineHeight: 30, fontFamily: FONT_B, marginBottom: 10,
  },

  ratingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 16,
  },
  ratingTxt: { fontSize: 12.5, color: MUTED, fontFamily: FONT_R },

  priceStockRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 18,
  },
  price: {
    fontSize: 32, fontWeight: '900', color: BRAND,
    fontFamily: FONT_B, letterSpacing: -0.5,
  },
  stockChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: a(GREEN, 0.1), borderRadius: 100,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  stockChipOut: { backgroundColor: a(DANGER, 0.08) },
  stockDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: GREEN },
  stockTxt: { fontSize: 12, fontWeight: '700', color: GREEN, fontFamily: FONT_M },

  // Teal divider
  tealDivider: {
    height: 2, backgroundColor: a(ACCENT, 0.2),
    borderRadius: 2, marginBottom: 20,
  },
  thinDivider: {
    height: 1, backgroundColor: '#F0F2F5', marginVertical: 18,
  },

  // ── Quantity selector ──────────────────────────────────────────────────────
  qtySection: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 20,
  },
  qtySectionLabel: {
    fontSize: 15, fontWeight: '800', color: DARK, fontFamily: FONT_B,
  },
  qtyStepper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: a(BRAND, 0.18), borderRadius: 12,
    overflow: 'hidden', backgroundColor: WHITE,
  },
  qtyStepBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: a(BRAND, 0.05),
  },
  qtyStepBtnDisabled: { opacity: 0.3 },
  qtyStepVal: {
    fontSize: 15, fontWeight: '900', color: DARK,
    paddingHorizontal: 14, fontFamily: FONT_B,
  },

  // ── Skeleton ───────────────────────────────────────────────────────────────
  skeletonBlock: { gap: 14, marginBottom: 20 },

  // ── Variations ─────────────────────────────────────────────────────────────
  variationsBlock: { marginBottom: 4 },
  varHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  varHeaderTitle: {
    fontSize: 16, fontWeight: '800', color: DARK, fontFamily: FONT_B,
  },
  clearAllTxt: { fontSize: 13, fontWeight: '600', color: ACCENT, fontFamily: FONT_M },
  varGroup: {},
  varLabelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12,
  },
  varLabel: { fontSize: 13.5, fontWeight: '800', color: DARK, fontFamily: FONT_B },
  varSelectedVal: { fontSize: 13, color: ACCENT, fontWeight: '700', fontFamily: FONT_M },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },

  colorChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 100, borderWidth: 1.5, borderColor: '#E8ECF0',
    backgroundColor: WHITE,
  },
  colorChipActive: { borderColor: DARK, backgroundColor: a(DARK, 0.04) },
  colorDot: { width: 14, height: 14, borderRadius: 7 },
  colorChipTxt: { fontSize: 13, color: MUTED, fontFamily: FONT_M },

  sizeChip: {
    minWidth: 50, paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 11, borderWidth: 1.5, borderColor: '#E8ECF0',
    backgroundColor: WHITE, alignItems: 'center',
  },
  sizeChipActive: { borderColor: BRAND, backgroundColor: BRAND },
  sizeChipTxt: { fontSize: 13.5, fontWeight: '600', color: MUTED, fontFamily: FONT_M },
  sizeChipTxtActive: { color: WHITE, fontFamily: FONT_B, fontWeight: '800' },

  // ── Description ────────────────────────────────────────────────────────────
  descBlock: { marginBottom: 4 },
  descToggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4,
  },
  descIconBox: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: a(BRAND, 0.08),
    alignItems: 'center', justifyContent: 'center',
  },
  descToggleLabel: {
    fontSize: 15, fontWeight: '700', color: DARK, fontFamily: FONT_B,
  },
  descBody: { paddingTop: 10, paddingBottom: 4, paddingLeft: 48 },
  descTxt: { fontSize: 14, color: MUTED, lineHeight: 22, fontFamily: FONT_R },

  // ── Seller card ────────────────────────────────────────────────────────────
  sellerCard: {
    backgroundColor: BG, borderRadius: 18,
    padding: 16, gap: 14,
    borderWidth: 1, borderColor: a(BRAND, 0.07),
  },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sellerAvatarWrap: { position: 'relative' },
  sellerAvatar: {
    width: 50, height: 50, borderRadius: 15,
    backgroundColor: a(BRAND, 0.07),
  },
  sellerAvatarFallback: {
    alignItems: 'center', justifyContent: 'center',
  },
  verifiedBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: WHITE,
  },
  sellerName: { fontSize: 14, fontWeight: '800', color: DARK, fontFamily: FONT_B },
  sellerTypeBadgeRow: { marginTop: 4 },
  sellerTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: a(ACCENT, 0.1), borderRadius: 100,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  sellerTypeTxt: { fontSize: 10.5, color: ACCENT, fontWeight: '700', fontFamily: FONT_M },
  chatBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderWidth: 1.5, borderColor: a(BRAND, 0.28), borderRadius: 12,
    paddingVertical: 11, backgroundColor: a(BRAND, 0.04),
  },
  chatBtnTxt: { fontSize: 13.5, fontWeight: '700', color: BRAND, fontFamily: FONT_M },

  // ── Related products ───────────────────────────────────────────────────────
  relatedSection: { paddingTop: 20, paddingBottom: 8, backgroundColor: WHITE },
  relatedHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 14, gap: 6,
  },
  relatedTitle: {
    fontSize: 17, fontWeight: '900', color: DARK, fontFamily: FONT_B,
  },
  relatedScroll: { paddingHorizontal: 20, gap: 14 },
  relatedCard: { width: 140, position: 'relative' },
  relatedImg: {
    width: 140, height: 140, borderRadius: 16,
    backgroundColor: '#F0F2F5', overflow: 'hidden', marginBottom: 9,
  },
  relatedImgEmpty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  relatedBody: { gap: 4 },
  relatedName: {
    fontSize: 12, fontWeight: '600', color: DARK, lineHeight: 16, fontFamily: FONT_M,
  },
  relatedPrice: {
    fontSize: 13.5, fontWeight: '900', color: BRAND, fontFamily: FONT_B,
  },
  relatedQuickAdd: {
    position: 'absolute', top: 9, right: 9,
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center',
    shadowColor: BRAND, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 5,
  },

  // ── Bottom add-to-cart bar ─────────────────────────────────────────────────
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: WHITE,
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#F0F2F5',
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

  // Compact qty stepper
  bottomQtyWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 1.5, borderColor: '#E8ECF0',
    backgroundColor: WHITE, overflow: 'hidden',
  },
  bottomQtyBtn: {
    width: 42, height: 50, alignItems: 'center', justifyContent: 'center',
  },
  bottomQtyBtnDisabled: { opacity: 0.32 },
  bottomQtyVal: {
    minWidth: 32, textAlign: 'center',
    fontSize: 16, fontWeight: '800', color: DARK, fontFamily: FONT_B,
  },

  addCartBtn: {
    flex: 1, height: 50,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: BRAND, borderRadius: 14,
  },
  addCartBtnDisabled: { backgroundColor: a(MUTED, 0.55) },
  addCartTxt: {
    fontSize: 15, fontWeight: '900', color: WHITE,
    fontFamily: FONT_B, letterSpacing: 0.2,
  },

  // ── Fullscreen preview ─────────────────────────────────────────────────────
  previewOverlay: {
    flex: 1, backgroundColor: '#000',
    alignItems: 'center', justifyContent: 'center',
  },
  previewCloseBtn: {
    position: 'absolute', right: 18,
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: a(WHITE, 0.15),
    alignItems: 'center', justifyContent: 'center',
  },
  previewCounter: {
    position: 'absolute', alignSelf: 'center',
  },
  previewCounterTxt: {
    fontSize: 13, color: a(WHITE, 0.75), fontFamily: FONT_M,
    backgroundColor: a('#000', 0.45),
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100,
  },
});
