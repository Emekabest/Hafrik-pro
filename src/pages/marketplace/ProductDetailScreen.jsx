// src/pages/marketplace/ProductDetailScreen.jsx
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Share,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const { width, height } = Dimensions.get('window');

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const WARM   = Colors.warm;
const MUTED  = Colors.secondaryText;
const DARK   = Colors.deepSlate;
const CREAM  = Colors.background;
const BORDER = withOpacity(Colors.primaryDark, 0.09);

const API_BASE = 'https://hafrik.com';
const FALLBACK_AVATAR =
  'https://hafrik.com/content/themes/default/images/blank_profile_male.jpg';

export default function ProductDetailScreen({ navigation, route }) {
  // product is passed directly from the list — no API call needed
  const product = route.params?.product;
  const { top } = useSafeAreaInsets();
  const { colors: tc } = useTheme();

  const [activeImg, setActiveImg] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;

  if (!product) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={MUTED} />
        <Text style={styles.errorTxt}>Product not found.</Text>
        <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.goBackTxt}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Derived values ────────────────────────────────────────────
  const images =
    product.photos?.length > 0
      ? product.photos
      : product.thumbnail
      ? [product.thumbnail]
      : [];

  const mainImage = images[activeImg] ?? `${API_BASE}/default-avatar.png`;
  const inStock   = product.stock_status === 'In Stock';
  const isPage    = product.seller?.type === 'page';
  const sellerName =
    isPage && product.seller.page_name
      ? product.seller.page_name
      : product.seller?.username ?? '—';
  const postedDate = product.posted ? product.posted.split(' ')[0] : null;

  const openWebview = (url, title) => {
    navigation.navigate('MarketplaceWebview', { url, title });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out "${product.title}" on Hafrik!\n${API_BASE}/posts/${product.post_id}`,
      });
    } catch (_) {}
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 180],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // ── Render ───────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: tc.background }]}>
      <StatusBar barStyle={tc.statusBar} />

      {/* Sticky header (fades in on scroll) */}
      <Animated.View
        style={[styles.stickyHeader, { paddingTop: top + 6, opacity: headerOpacity }]}
      >
        <TouchableOpacity style={styles.stickyBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={BRAND} />
        </TouchableOpacity>
        <Text style={styles.stickyTitle} numberOfLines={1}>{product.title}</Text>
        <TouchableOpacity style={styles.stickyBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color={BRAND} />
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
      >
        {/* ── Hero image ─────────────────────────────────────── */}
        <View style={styles.heroWrap}>
          <Image source={{ uri: mainImage }} style={styles.heroImg} resizeMode="cover" />

          {/* Back + share */}
          <View style={[styles.imgTopRow, { paddingTop: top + 8 }]}>
            <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color={BRAND} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.circleBtn} onPress={handleShare}>
              <Ionicons name="share-outline" size={20} color={BRAND} />
            </TouchableOpacity>
          </View>

          {/* Dot indicators */}
          {images.length > 1 && (
            <View style={styles.dotRow}>
              {images.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => setActiveImg(i)}>
                  <View style={[styles.dot, i === activeImg && styles.dotActive]} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.thumbStrip}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
            >
              {images.map((img, i) => (
                <TouchableOpacity key={i} onPress={() => setActiveImg(i)}>
                  <Image
                    source={{ uri: img }}
                    style={[styles.thumb, i === activeImg && styles.thumbActive]}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── Content card ───────────────────────────────────── */}
        <View style={styles.card}>

          {/* Badges row */}
          <View style={styles.badgeRow}>
            {!!product.condition && (
              <View style={[styles.badge, { backgroundColor: `${ACCENT}18` }]}>
                <Text style={[styles.badgeTxt, { color: Colors.successStrong }]}>{product.condition}</Text>
              </View>
            )}
            <View style={[styles.badge, inStock ? styles.badgeInStock : styles.badgeOutStock]}>
              <View style={[styles.badgeDot, !inStock && { backgroundColor: Colors.coral }]} />
              <Text style={[styles.badgeTxt, !inStock && { color: Colors.coral }]}>
                {product.stock_status}
              </Text>
            </View>
            {product.is_digital && (
              <View style={[styles.badge, { backgroundColor: `${BRAND}14` }]}>
                <Text style={[styles.badgeTxt, { color: BRAND }]}>Digital</Text>
              </View>
            )}
          </View>

          {/* Title + price */}
          <Text style={styles.productTitle}>{product.title}</Text>
          <Text style={styles.productPrice}>
            {product.currency} {Number(product.price).toLocaleString()}
          </Text>

          {/* Meta chips */}
          <View style={styles.metaRow}>
            {!!product.location && (
              <View style={styles.metaChip}>
                <Ionicons name="location-outline" size={13} color={MUTED} />
                <Text style={styles.metaChipTxt}>{product.location}</Text>
              </View>
            )}
            {!!postedDate && (
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={13} color={MUTED} />
                <Text style={styles.metaChipTxt}>{postedDate}</Text>
              </View>
            )}
            {product.quantity > 0 && (
              <View style={styles.metaChip}>
                <Ionicons name="cube-outline" size={13} color={MUTED} />
                <Text style={styles.metaChipTxt}>Qty: {product.quantity}</Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {/* Description */}
          {!!product.description && (
            <>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{product.description}</Text>
              <View style={styles.divider} />
            </>
          )}

          {/* Seller */}
          {!!product.seller && (
            <>
              <Text style={styles.sectionTitle}>Seller</Text>
              <View style={styles.sellerRow}>
                <Image
                  source={{ uri: product.seller.avatar ?? FALLBACK_AVATAR }}
                  style={styles.sellerAvatar}
                />
                <View style={{ flex: 1 }}>
                  <View style={styles.sellerNameRow}>
                    <Text style={styles.sellerName}>{sellerName}</Text>
                    {product.seller.verified && (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark" size={10} color={Colors.white} />
                      </View>
                    )}
                    <View style={[styles.sellerTypeBadge, isPage && styles.sellerTypePage]}>
                      <Text style={styles.sellerTypeTxt}>{isPage ? 'PAGE' : 'USER'}</Text>
                    </View>
                  </View>
                  {isPage && product.seller.page_name && (
                    <Text style={styles.sellerSub}>@{product.seller.page_name}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.viewProfileBtn}
                  onPress={() =>
                    openWebview(`${API_BASE}/posts/${product.post_id}`, product.title)
                  }
                >
                  <Text style={styles.viewProfileTxt}>View</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.divider} />
            </>
          )}

          <View style={{ height: 110 }} />
        </View>
      </Animated.ScrollView>

      {/* ── Bottom action bar ──────────────────────────────────── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() =>
            openWebview(`${API_BASE}/posts/${product.post_id}`, 'Chat with Seller')
          }
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={BRAND} />
          <Text style={styles.chatBtnTxt}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buyBtn}
          onPress={() =>
            openWebview(`${API_BASE}/posts/${product.post_id}`, product.title)
          }
        >
          <LinearGradient
            colors={[BRAND, Colors.tealHeader]}
            style={styles.buyGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buyBtnTxt}>View Listing</Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: CREAM },
  centered: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: CREAM, gap: 12, padding: 24,
  },
  errorTxt:  { fontSize: 14, color: MUTED },
  goBackBtn: {
    backgroundColor: BRAND, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  goBackTxt: { color: Colors.white, fontWeight: '700', fontSize: 14 },

  // Sticky header
  stickyHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, paddingHorizontal: 14, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
    shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 4,
  },
  stickyBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surfaceBase, justifyContent: 'center', alignItems: 'center',
  },
  stickyTitle: {
    flex: 1, fontSize: 15, fontWeight: '700', color: DARK, marginHorizontal: 10,
  },

  // Hero
  heroWrap: { position: 'relative', backgroundColor: Colors.black },
  heroImg:  { width, height: height * 0.42 },
  imgTopRow: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16,
  },
  circleBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: withOpacity(Colors.white, 0.92),
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },
  dotRow: {
    position: 'absolute', bottom: 68, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: withOpacity(Colors.white, 0.45) },
  dotActive: { backgroundColor: Colors.white, width: 20 },
  thumbStrip:   { position: 'absolute', bottom: 10, left: 0, right: 0 },
  thumb:        { width: 52, height: 52, borderRadius: 10, borderWidth: 2, borderColor: withOpacity(Colors.white, 0.4) },
  thumbActive:  { borderColor: ACCENT, borderWidth: 2.5 },

  // Content card
  card: {
    backgroundColor: CREAM,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -24, paddingTop: 24, paddingHorizontal: 18,
  },

  // Badges
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: `${BRAND}12`, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeInStock:  { backgroundColor: `${ACCENT}18` },
  badgeOutStock: { backgroundColor: withOpacity(Colors.coral, 0.1) },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT },
  badgeTxt: { fontSize: 11, fontWeight: '700', color: BRAND },

  // Title / price
  productTitle: { fontSize: 22, fontWeight: '900', color: DARK, lineHeight: 30, marginBottom: 6 },
  productPrice: { fontSize: 26, fontWeight: '900', color: ACCENT, marginBottom: 14 },

  // Meta
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.white, borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: BORDER,
  },
  metaChipTxt: { fontSize: 12, color: MUTED, fontWeight: '500' },

  divider: { height: 1, backgroundColor: BORDER, marginVertical: 16 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: DARK, marginBottom: 8 },
  description:  { fontSize: 14, color: MUTED, lineHeight: 22 },

  // Seller
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sellerAvatar: {
    width: 52, height: 52, borderRadius: 16,
    borderWidth: 2, borderColor: `${ACCENT}40`,
    backgroundColor: Colors.neutral190,
  },
  sellerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  sellerName:    { fontSize: 15, fontWeight: '800', color: DARK },
  sellerSub:     { fontSize: 11, color: MUTED, marginTop: 2 },
  verifiedBadge: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center',
  },
  sellerTypeBadge: {
    backgroundColor: Colors.slate, borderRadius: 100,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  sellerTypePage: { backgroundColor: BRAND },
  sellerTypeTxt:  { color: Colors.white, fontSize: 9, fontWeight: '800' },
  viewProfileBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 100, borderWidth: 1.5, borderColor: BRAND,
  },
  viewProfileTxt: { fontSize: 12, fontWeight: '700', color: BRAND },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 10,
    backgroundColor: Colors.white, paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: BORDER,
    shadowColor: Colors.black, shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 10,
  },
  chatBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: BRAND, borderRadius: 14, paddingVertical: 13,
  },
  chatBtnTxt:  { fontSize: 14, fontWeight: '700', color: BRAND },
  buyBtn:      { flex: 1.4, borderRadius: 14, overflow: 'hidden' },
  buyGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, gap: 6,
  },
  buyBtnTxt: { fontSize: 14, fontWeight: '800', color: Colors.white },
});
