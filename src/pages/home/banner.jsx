import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import GetBannersController from '../../controllers/getbannerscontroller';
import useStore from '../../repository/store';
import { Colors } from '../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


// ── Design tokens ─────────────────────────────────────────────────────────────
const BRAND_DEEP   = Colors.brandDeep;
const BRAND_MID    = Colors.primaryDark;
const BRAND_ACCENT = Colors.tealAccent;
const BRAND_LIME   = Colors.brandLime;
const RADIUS       = 18;
const AUTO_SCROLL_MS = 4500;

// ── Skeleton placeholder ──────────────────────────────────────────────────────
const SkeletonBanner = memo(({ height }) => {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 750, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 750, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <Animated.View style={[styles.skeleton, { height, opacity: pulse }]} />
  );
});

// ── Single banner slide ───────────────────────────────────────────────────────
const BannerSlide = memo(({ item, slideWidth, slideHeight, onPress }) => {
  const imageUrl =
    item.image ?? item.banner_image ?? item.image_url ?? null;
  const tag = item.tag ?? item.category ?? item.badge ?? null;

  return (
    <TouchableOpacity
      style={[styles.card, { width: slideWidth, height: slideHeight }]}
      activeOpacity={0.95}
      onPress={() => onPress(item)}
    >
      {/* Background */}
      {imageUrl ? (
        <ExpoImage
          source={{ uri: imageUrl }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={300}
        />
      ) : (
        <LinearGradient
          colors={[BRAND_DEEP, BRAND_MID, Colors.brandMidAlt]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}

      {/* Scrim for legibility */}
      <LinearGradient
        colors={[withOpacity(Colors.black, 0.04), withOpacity(Colors.black, 0.72)]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Tag / badge pill */}
      {!!tag && (
        <View style={styles.tag}>
          <Text style={styles.tagText}>{tag.toUpperCase()}</Text>
        </View>
      )}

      {/* Bottom content */}
      <View style={styles.contentArea}>
        {!!item.title && (
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
        )}

        {!!(item.subtitle ?? item.description) && (
          <Text style={styles.subtitle} numberOfLines={2}>
            {item.subtitle ?? item.description}
          </Text>
        )}

        {/* CTA — only rendered when a valid link exists */}
        {!!(item.button_link && item.button_link !== '#') && (
          <View style={styles.ctaWrap}>
            <LinearGradient
              colors={[BRAND_ACCENT, BRAND_LIME]}
              style={styles.ctaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.ctaLabel} numberOfLines={1}>
                {item.button_text ?? 'Explore'}
              </Text>
              <Ionicons name="arrow-forward" size={13} color={BRAND_DEEP} />
            </LinearGradient>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

// ── Dot row ───────────────────────────────────────────────────────────────────
const DotRow = memo(({ count, activeIndex }) => (
  <View style={styles.dotRow}>
    {Array.from({ length: count }).map((_, i) => (
      <View
        key={i}
        style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]}
      />
    ))}
  </View>
));

// ── Main component ────────────────────────────────────────────────────────────
const Banner = () => {
  const navigation             = useNavigation();
  const { token, user }        = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const refreshSignal          = useStore(s => s.refreshSignal);

  // Responsive sizing — fills phone, capped at 600 on tablets
  const H_PAD       = screenWidth > 600 ? 24 : 16;
  const SLIDE_W     = Math.min(screenWidth - H_PAD * 2, 600);
  const SLIDE_H     = Math.round(SLIDE_W * 0.5);
  const ITEM_STRIDE = SLIDE_W + 12;

  const [banners,     setBanners]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const flatListRef    = useRef(null);
  const timerRef       = useRef(null);
  const isTouching     = useRef(false);
  const activeIdxRef   = useRef(0);

  // ── Data ─────────────────────────────────────────────────────────────────
  const loadBanners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await GetBannersController();
      if (res?.status === 200) {
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        setBanners(list);
      }
    } catch {}
    setLoading(false);
  }, []);

  // Initial load
  useEffect(() => { loadBanners(); }, [loadBanners]);

  // Reload when country filter changes (refreshSignal is bumped by FeedsHeader)
  const prevSignal = useRef(refreshSignal);
  useEffect(() => {
    if (refreshSignal === prevSignal.current) return;
    prevSignal.current = refreshSignal;
    loadBanners();
  }, [refreshSignal, loadBanners]);

  // ── Auto-scroll (resets when user swipes manually) ───────────────────────
  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (isTouching.current) return;
      const next =
        activeIdxRef.current + 1 >= banners.length
          ? 0
          : activeIdxRef.current + 1;
      flatListRef.current?.scrollToOffset({
        offset: next * ITEM_STRIDE,
        animated: true,
      });
      activeIdxRef.current = next;
      setActiveIndex(next);
    }, AUTO_SCROLL_MS);
  }, [banners.length, ITEM_STRIDE]);

  useEffect(() => {
    if (banners.length > 1) startTimer();
    return () => clearInterval(timerRef.current);
  }, [banners.length, startTimer]);

  // ── Event handlers ───────────────────────────────────────────────────────
  const onScrollBegin = useCallback(() => {
    isTouching.current = true;
  }, []);

  const onScrollEnd = useCallback(() => {
    isTouching.current = false;
    startTimer(); // restart timer after manual interaction
  }, [startTimer]);

  const onMomentumScrollEnd = useCallback((e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / ITEM_STRIDE);
    activeIdxRef.current = idx;
    setActiveIndex(idx);
  }, [ITEM_STRIDE]);

  const handleBannerPress = useCallback((banner) => {
    if (banner.button_link && banner.button_link !== '#') {
      navigation.navigate('WebView', {
        url:   banner.button_link,
        title: banner.title ?? 'Hafrik',
        token,
        user,
      });
    }
  }, [navigation, token, user]);

  const renderItem = useCallback(({ item }) => (
    <BannerSlide
      item={item}
      slideWidth={SLIDE_W}
      slideHeight={SLIDE_H}
      onPress={handleBannerPress}
    />
  ), [SLIDE_W, SLIDE_H, handleBannerPress]);

  const keyExtractor = useCallback((item, idx) =>
    `banner-${item.id ?? idx}`, []);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.wrapper, { paddingHorizontal: H_PAD }]}>
        <SkeletonBanner height={SLIDE_H} />
        <DotRow count={3} activeIndex={0} />
      </View>
    );
  }

  if (!banners.length) return null;

  return (
    <View style={styles.wrapper}>
      <FlatList
        ref={flatListRef}
        data={banners}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_STRIDE}
        snapToAlignment="start"
        decelerationRate={Platform.OS === 'ios' ? 'fast' : 0.9}
        contentContainerStyle={{
          paddingHorizontal: (screenWidth - SLIDE_W) / 2,
          gap: 12,
        }}
        onScrollBeginDrag={onScrollBegin}
        onMomentumScrollBegin={onScrollEnd}
        onMomentumScrollEnd={onMomentumScrollEnd}
        removeClippedSubviews
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={5}
      />

      {banners.length > 1 && (
        <DotRow count={banners.length} activeIndex={activeIndex} />
      )}
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 12,
  },

  // skeleton
  skeleton: {
    backgroundColor: Colors.bannerSurface,
    borderRadius: RADIUS,
    width: '100%',
  },

  // card
  card: {
    borderRadius: RADIUS,
    overflow: 'hidden',
    backgroundColor: BRAND_DEEP,
  },

  // tag pill
  tag: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: BRAND_ACCENT,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 2,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '800',
    color: BRAND_DEEP,
    letterSpacing: 0.8,
  },

  // content
  contentArea: {
    position: 'absolute',
    bottom: 18,
    left: 18,
    right: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 5,
    lineHeight: 26,
  },
  subtitle: {
    fontSize: 12,
    color: withOpacity(Colors.white, 0.72),
    marginBottom: 14,
    lineHeight: 17,
  },

  // CTA
  ctaWrap: {
    alignSelf: 'flex-start',
    borderRadius: 30,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    gap: 6,
  },
  ctaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: BRAND_DEEP,
    maxWidth: 160,
  },

  // dots
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: BRAND_ACCENT,
  },
  dotInactive: {
    width: 6,
    backgroundColor: BRAND_ACCENT,
    opacity: 0.3,
  },
});

export default memo(Banner);
