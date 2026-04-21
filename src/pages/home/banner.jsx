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
  const normalized = (hex || '').replace('#', '');
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16).padStart(2, '0');
  return `#${normalized}${alpha}`;
};

// ── Design tokens ─────────────────────────────────────────────────────────────
const BRAND_DEEP   = Colors.brandDeep;
const BRAND_MID    = Colors.primaryDark;
const BRAND_ACCENT = Colors.tealAccent;
const BRAND_LIME   = Colors.brandLime;
const RADIUS       = 20;
const AUTO_SCROLL_MS = 4500;

// ── Local slides injected into the slider ─────────────────────────────────────
const LOCAL_SLIDES = [
  {
    id: '__hafriktv__',
    isLocal: true,
    navigateTo: 'HafrikTV',
    tag: 'STREAM',
    title: 'HafrikTV',
    subtitle: 'Watch videos, reels & live content from Africa',
    button_text: 'Watch Now',
    gradient: ['#071e21', '#0c2d32', '#1f8e93'],
    gradientDir: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    accentColor: '#27adb5',
    darkColor: '#071e21',
    iconName: 'tv',
    blob1Color: '#27adb540',
    blob2Color: '#27adb522',
    blob3Color: '#27adb515',
    tagBg: '#27adb5',
    tagColor: '#071e21',
  },
  // {
  //   id: '__arrival__',
  //   isLocal: true,
  //   navigateTo: 'ArrivalConcierge',
  //   tag: 'ARRIVAL',
  //   title: 'Arrival Concierge',
  //   subtitle: 'Airport pickup, hotel transfers & seamless city arrivals',
  //   button_text: 'Book Now',
  //   gradient: ['#071e21', '#0a2e2a', '#0d5c50'],
  //   gradientDir: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  //   accentColor: '#13c296',
  //   darkColor: '#071e21',
  //   iconName: 'airplane',
  //   blob1Color: '#13c29640',
  //   blob2Color: '#13c29622',
  //   blob3Color: '#13c29615',
  //   tagBg: '#13c296',
  //   tagColor: '#071e21',
  // },
  // {
  //   id: '__exchange__',
  //   isLocal: true,
  //   navigateTo: 'HafrikXCurrency',
  //   tag: 'EXCHANGE',
  //   title: 'Currency Exchange',
  //   subtitle: 'Best rates · Instant transfers · Trusted platform',
  //   button_text: 'Exchange Now',
  //   gradient: ['#071e21', '#0a2832', '#0e5568'],
  //   gradientDir: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  //   accentColor: '#1f8e93',
  //   darkColor: '#071e21',
  //   iconName: 'swap-horizontal',
  //   blob1Color: '#1f8e9340',
  //   blob2Color: '#1f8e9322',
  //   blob3Color: '#1f8e9315',
  //   tagBg: '#1f8e93',
  //   tagColor: '#071e21',
  // },
  // {
  //   id: '__visa__',
  //   isLocal: true,
  //   navigateTo: 'HafrikXVisa',
  //   tag: 'VISA',
  //   title: 'Visa Services',
  //   subtitle: 'Expert guidance for work, study & travel visa applications',
  //   button_text: 'Apply Now',
  //   gradient: ['#071e21', '#0d2e3a', '#1a5e6e'],
  //   gradientDir: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  //   accentColor: '#2aa8b5',
  //   darkColor: '#071e21',
  //   iconName: 'document-text',
  //   blob1Color: '#2aa8b540',
  //   blob2Color: '#2aa8b522',
  //   blob3Color: '#2aa8b515',
  //   tagBg: '#2aa8b5',
  //   tagColor: '#071e21',
  // },
];

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
    <Animated.View style={[ss.skeleton, { height, opacity: pulse }]} />
  );
});

// ── Rich local slide ───────────────────────────────────────────────────────────
const LocalSlide = memo(({ item, slideWidth, slideHeight, onPress }) => {
  const pressAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(pressAnim, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
  const onPressOut = () =>
    Animated.spring(pressAnim, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  return (
    <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
      <TouchableOpacity
        style={[ss.card, { width: slideWidth, height: slideHeight }]}
        activeOpacity={1}
        onPress={() => onPress(item)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        {/* Base gradient */}
        <LinearGradient
          colors={item.gradient}
          style={StyleSheet.absoluteFillObject}
          start={item.gradientDir.start}
          end={item.gradientDir.end}
        />

        {/* Decorative blobs — large circle back-right */}
        <View style={[ss.blob, ss.blobBR, { borderColor: item.blob1Color }]} />
        {/* Mid circle top-left */}
        <View style={[ss.blob, ss.blobTL, { borderColor: item.blob2Color }]} />
        {/* Small filled circle */}
        <View style={[ss.blobFill, ss.blobFillPos, { backgroundColor: item.blob3Color }]} />

        {/* Watermark icon — very large, translucent, bottom-right */}
        <View style={ss.watermark} pointerEvents="none">
          <Ionicons name={item.iconName} size={slideHeight * 0.85} color={item.accentColor} style={{ opacity: 0.06 }} />
        </View>

        {/* Main icon ring — top-right */}
        <View
          style={[
            ss.iconRing,
            {
              borderColor: item.blob1Color,
              backgroundColor: item.blob3Color,
              top: slideHeight * 0.12,
              right: 20,
            },
          ]}
        >
          <Ionicons name={item.iconName} size={26} color={item.accentColor} />
        </View>

        {/* Tag pill — top-left */}
        <View style={[ss.tag, { backgroundColor: item.tagBg, top: slideHeight * 0.12 }]}>
          <Text style={[ss.tagText, { color: item.tagColor }]}>{item.tag}</Text>
        </View>

        {/* Bottom scrim */}
        <LinearGradient
          colors={['transparent', withOpacity(item.gradient[0], 0.7), item.gradient[0]]}
          style={[StyleSheet.absoluteFillObject, { top: '30%' }]}
        />

        {/* Content */}
        <View style={[ss.content, { bottom: slideHeight * 0.1 }]}>
          <Text style={ss.title} numberOfLines={1}>{item.title}</Text>
          <Text style={ss.subtitle} numberOfLines={2}>{item.subtitle}</Text>
          <View style={ss.ctaRow}>
            <View style={[ss.ctaBtn, { backgroundColor: item.tagBg }]}>
              <Text style={[ss.ctaTxt, { color: item.tagColor }]}>{item.button_text}</Text>
              <Ionicons name="arrow-forward" size={11} color={item.tagColor} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ── API banner slide (image-based) ────────────────────────────────────────────
const ApiBannerSlide = memo(({ item, slideWidth, slideHeight, onPress }) => {
  const imageUrl = item.image ?? item.banner_image ?? item.image_url ?? null;
  const tag      = item.tag ?? item.category ?? item.badge ?? null;

  return (
    <TouchableOpacity
      style={[ss.card, { width: slideWidth, height: slideHeight }]}
      activeOpacity={0.95}
      onPress={() => onPress(item)}
    >
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

      {/* Scrim */}
      <LinearGradient
        colors={[withOpacity(Colors.black, 0.04), withOpacity(Colors.black, 0.72)]}
        style={StyleSheet.absoluteFillObject}
      />

      {!!tag && (
        <View style={ss.tag}>
          <Text style={[ss.tagText, { color: BRAND_DEEP }]}>{tag.toUpperCase()}</Text>
        </View>
      )}

      <View style={ss.content}>
        {!!item.title && (
          <Text style={ss.title} numberOfLines={2}>{item.title}</Text>
        )}
        {!!(item.subtitle ?? item.description) && (
          <Text style={ss.subtitle} numberOfLines={2}>
            {item.subtitle ?? item.description}
          </Text>
        )}
        {!!(item.button_link && item.button_link !== '#') && (
          <View style={ss.ctaRow}>
            <LinearGradient
              colors={[BRAND_ACCENT, BRAND_LIME]}
              style={ss.ctaGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={[ss.ctaTxt, { color: BRAND_DEEP }]} numberOfLines={1}>
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
  <View style={ss.dotRow}>
    {Array.from({ length: count }).map((_, i) => (
      <View
        key={i}
        style={[ss.dot, i === activeIndex ? ss.dotActive : ss.dotInactive]}
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

  const H_PAD       = screenWidth > 600 ? 24 : 16;
  const SLIDE_W     = Math.min(screenWidth - H_PAD * 2, 600);
  const SLIDE_H     = Math.round(SLIDE_W * 0.5);   // taller for richer visuals
  const ITEM_STRIDE = SLIDE_W + 12;

  const [banners,     setBanners]     = useState([...LOCAL_SLIDES]);
  const [loading,     setLoading]     = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const flatListRef  = useRef(null);
  const timerRef     = useRef(null);
  const isTouching   = useRef(false);
  const activeIdxRef = useRef(0);

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
        setBanners([...LOCAL_SLIDES, ...list]);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadBanners(); }, [loadBanners]);

  const prevSignal = useRef(refreshSignal);
  useEffect(() => {
    if (refreshSignal === prevSignal.current) return;
    prevSignal.current = refreshSignal;
    loadBanners();
  }, [refreshSignal, loadBanners]);

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (isTouching.current) return;
      const next = activeIdxRef.current + 1 >= banners.length
        ? 0 : activeIdxRef.current + 1;
      flatListRef.current?.scrollToOffset({ offset: next * ITEM_STRIDE, animated: true });
      activeIdxRef.current = next;
      setActiveIndex(next);
    }, AUTO_SCROLL_MS);
  }, [banners.length, ITEM_STRIDE]);

  useEffect(() => {
    if (banners.length > 1) startTimer();
    return () => clearInterval(timerRef.current);
  }, [banners.length, startTimer]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const onScrollBeginDrag      = useCallback(() => { isTouching.current = true; },  []);
  const onMomentumScrollBegin  = useCallback(() => { isTouching.current = false; startTimer(); }, [startTimer]);
  const onMomentumScrollEnd    = useCallback((e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / ITEM_STRIDE);
    activeIdxRef.current = idx;
    setActiveIndex(idx);
  }, [ITEM_STRIDE]);

  const handleBannerPress = useCallback((banner) => {
    if (banner.isLocal && banner.navigateTo) {
      navigation.navigate(banner.navigateTo);
      return;
    }
    if (banner.button_link && banner.button_link !== '#') {
      navigation.navigate('WebView', {
        url:   banner.button_link,
        title: banner.title ?? 'Hafrik',
        token,
        user,
      });
    }
  }, [navigation, token, user]);

  const renderItem = useCallback(({ item }) => {
    if (item.isLocal) {
      return (
        <LocalSlide
          item={item}
          slideWidth={SLIDE_W}
          slideHeight={SLIDE_H}
          onPress={handleBannerPress}
        />
      );
    }
    return (
      <ApiBannerSlide
        item={item}
        slideWidth={SLIDE_W}
        slideHeight={SLIDE_H}
        onPress={handleBannerPress}
      />
    );
  }, [SLIDE_W, SLIDE_H, handleBannerPress]);

  const keyExtractor = useCallback((item, idx) => `banner-${item.id ?? idx}`, []);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[ss.wrapper, { paddingHorizontal: H_PAD }]}>
        <SkeletonBanner height={SLIDE_H} />
        <DotRow count={4} activeIndex={0} />
      </View>
    );
  }

  if (!banners.length) return null;

  return (
    <View style={ss.wrapper}>
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
        onScrollBeginDrag={onScrollBeginDrag}
        onMomentumScrollBegin={onMomentumScrollBegin}
        onMomentumScrollEnd={onMomentumScrollEnd}
        removeClippedSubviews
        initialNumToRender={3}
        maxToRenderPerBatch={4}
        windowSize={5}
      />

      {banners.length > 1 && (
        <DotRow count={banners.length} activeIndex={activeIndex} />
      )}
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  wrapper: {
    marginVertical: 8,
  },

  skeleton: {
    backgroundColor: Colors.bannerSurface,
    borderRadius: RADIUS,
    width: '100%',
  },

  card: {
    borderRadius: RADIUS,
    overflow: 'hidden',
    backgroundColor: BRAND_DEEP,
  },

  // ── Decorative blobs ──
  blob: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 9999,
  },
  blobBR: {
    width: 180,
    height: 180,
    bottom: -55,
    right: -55,
  },
  blobTL: {
    width: 110,
    height: 110,
    top: -30,
    left: -30,
  },
  blobFill: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 9999,
  },
  blobFillPos: {
    top: '40%',
    right: '28%',
  },

  // ── Watermark ──
  watermark: {
    position: 'absolute',
    bottom: -16,
    right: -12,
  },

  // ── Icon ring ──
  iconRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Tag pill ──
  tag: {
    position: 'absolute',
    left: 16,
    top: 16,
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 2,
    backgroundColor: BRAND_ACCENT,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: BRAND_DEEP,
  },

  // ── Content ──
  content: {
    position: 'absolute',
    bottom: 18,
    left: 18,
    right: 18,
  },
  title: {
    fontSize: 21,
    fontWeight: '900',
    color: Colors.white,
    marginBottom: 5,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: withOpacity(Colors.white, 0.68),
    marginBottom: 14,
    lineHeight: 17,
  },

  // ── CTA ──
  ctaRow: {
    alignSelf: 'flex-start',
    borderRadius: 30,
    overflow: 'hidden',
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    gap: 6,
    borderRadius: 30,
  },
  ctaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    gap: 6,
  },
  ctaTxt: {
    fontSize: 12,
    fontWeight: '800',
    color: BRAND_DEEP,
    maxWidth: 160,
  },

  // ── Dots ──
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 5,
  },
  dot: {
    height: 5,
    borderRadius: 3,
  },
  dotActive: {
    width: 22,
    backgroundColor: BRAND_ACCENT,
  },
  dotInactive: {
    width: 5,
    backgroundColor: BRAND_ACCENT,
    opacity: 0.3,
  },
});

export default memo(Banner);
