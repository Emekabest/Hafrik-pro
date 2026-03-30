/**
 * DiscoverMasonryGrid
 * ────────────────────
 * Two-column waterfall (masonry) grid for the Explore/Discover tab.
 * Inspired by Xiaohongshu (RedBook) — cards have dynamic height driven
 * by the image's natural aspect ratio, giving a staggered, organic feel.
 *
 * Features:
 *  • True two-column waterfall via parallel column Views inside a ScrollView
 *  • ExpoImage with cachePolicy="memory-disk" for lazy/cached loading
 *  • Shimmer skeleton while data loads
 *  • Pull-to-refresh and infinite scroll (onScroll proximity trigger)
 *  • Card: image · caption · avatar · username · like count
 */
import React, {
  memo, useCallback, useRef, useState, useEffect,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, RefreshControl,
  ActivityIndicator, Animated,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../../theme/colors';
import AppDetails from '../../../helpers/appdetails';

// ─── Design tokens ────────────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
const H_PAD  = 10;
const GAP    = 7;
const CARD_W = (SCREEN_W - H_PAD * 2 - GAP) / 2;

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const MUTED  = Colors.secondaryText  ?? '#888';
const BASE   = Colors.neutral150     ?? '#EFEFEF';
const SHINE  = Colors.neutral130     ?? '#F8F8F8';
const WHITE  = Colors.white;

const FONT_M = AppDetails?.fontFamily?.inter?.medium  ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';

const DEFAULT_AVATAR = 'https://hafrik.com/assets/images/default_avatar.png';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const decodeHtml = (str) => {
  if (!str || typeof str !== 'string') return str ?? '';
  const ent = {
    '&rsquo;': '\u2019', '&lsquo;': '\u2018', '&rdquo;': '\u201D',
    '&ldquo;': '\u201C', '&amp;': '&', '&lt;': '<', '&gt;': '>',
    '&quot;': '"', '&apos;': "'", '&#39;': "'",
    '&ndash;': '\u2013', '&mdash;': '\u2014',
    '&hellip;': '\u2026', '&nbsp;': ' ',
  };
  let out = str;
  for (const [e, c] of Object.entries(ent)) out = out.split(e).join(c);
  out = out.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  out = out.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  return out.replace(/<[^>]*>/g, '').trim();
};

const fmtCount = (n) => {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
};

// ─── Shimmer bar ──────────────────────────────────────────────────────────────
const ShimmerBar = memo(({ width, height, borderRadius = 6, style }) => {
  const x = useRef(new Animated.Value(-SCREEN_W)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(x, { toValue: SCREEN_W, duration: 1100, useNativeDriver: true })
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={[{ width, height, borderRadius, backgroundColor: BASE, overflow: 'hidden' }, style]}>
      <Animated.View style={{ ...StyleSheet.absoluteFillObject, transform: [{ translateX: x }] }}>
        <LinearGradient
          colors={['transparent', SHINE, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ width: SCREEN_W, height: '100%' }}
        />
      </Animated.View>
    </View>
  );
});

// ─── Skeleton card ────────────────────────────────────────────────────────────
const SkeletonCard = memo(({ tall }) => {
  const imgH = tall ? Math.round(CARD_W * 1.55) : Math.round(CARD_W * 1.0);
  return (
    <View style={sk.card}>
      <ShimmerBar width="100%" height={imgH} borderRadius={0} />
      <View style={sk.body}>
        <ShimmerBar width="90%" height={10} style={{ marginBottom: 5 }} />
        <ShimmerBar width="60%" height={10} style={{ marginBottom: 10 }} />
        <View style={sk.footerRow}>
          <ShimmerBar width={22} height={22} borderRadius={11} />
          <ShimmerBar width={55} height={9} style={{ marginLeft: 6 }} />
        </View>
      </View>
    </View>
  );
});

// ─── Skeleton grid ────────────────────────────────────────────────────────────
const SkeletonGrid = memo(() => {
  const leftPattern  = [true, false, false, true];
  const rightPattern = [false, true, true, false];
  return (
    <View style={sk.grid}>
      <View style={sk.col}>
        {leftPattern.map((tall, i) => <SkeletonCard key={i} tall={tall} />)}
      </View>
      <View style={sk.col}>
        {rightPattern.map((tall, i) => <SkeletonCard key={i} tall={tall} />)}
      </View>
    </View>
  );
});

// ─── Single masonry card ──────────────────────────────────────────────────────
const MasonryCard = memo(({ item, onPress }) => {
  const media    = item?.media?.[0];
  const imageUri = media?.url?.startsWith('http')       ? media.url
                 : media?.thumbnail?.startsWith('http') ? media.thumbnail
                 : null;

  const [imgH, setImgH] = useState(Math.round(CARD_W * 1.2));

  const handleLoad = useCallback((e) => {
    const { width, height } = e.source ?? {};
    if (width > 0 && height > 0) {
      setImgH(Math.max(80, Math.min(600, Math.round(CARD_W * height / width))));
    }
  }, []);

  const user     = item?.user ?? {};
  const avatar   = user.avatar?.startsWith('http') ? user.avatar : DEFAULT_AVATAR;
  const username = user.username ?? user.full_name ?? 'User';
  const caption  = decodeHtml(item?.text || item?.content || item?.description || '');
  const likes    = item?.likes_count ?? item?.total_likes ?? 0;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={() => onPress?.(item)}
    >
      {/* Image */}
      <View style={[styles.imgWrap, { height: imgH }]}>
        {imageUri ? (
          <ExpoImage
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={`masonry-${item?.id}`}
            transition={180}
            onLoad={handleLoad}
          />
        ) : (
          <View style={styles.imgPlaceholder}>
            <Ionicons name="image-outline" size={26} color={BASE} />
          </View>
        )}
      </View>

      {/* Body */}
      <View style={styles.body}>
        {!!caption && (
          <Text style={styles.caption} numberOfLines={2}>{caption}</Text>
        )}
        <View style={styles.footer}>
          <ExpoImage
            source={{ uri: avatar }}
            style={styles.avatar}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          <Text style={styles.username} numberOfLines={1} ellipsizeMode="tail">
            {username}
          </Text>
          <View style={styles.likeRow}>
            <Ionicons name="heart" size={11} color={ACCENT} />
            <Text style={styles.likeCount}>{fmtCount(likes)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ─── Main component ───────────────────────────────────────────────────────────
const DiscoverMasonryGrid = ({
  feeds             = [],
  refreshing        = false,
  onRefresh,
  onEndReached,
  loadingMore       = false,
  initialDataLoaded = false,
}) => {
  const navigation  = useNavigation();
  const loadingRef  = useRef(false);   // prevent double-fire

  const handlePress = useCallback((item) => {
    navigation.navigate('PostDetail', { postId: item?.id });
  }, [navigation]);

  // ── Distribute items into two columns (alternating) ─────────────────────
  const leftCol  = feeds.filter((_, i) => i % 2 === 0);
  const rightCol = feeds.filter((_, i) => i % 2 !== 0);

  // ── Trigger onEndReached when near bottom ────────────────────────────────
  const handleScroll = useCallback(({ nativeEvent }) => {
    const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    if (distanceFromBottom < 400 && !loadingRef.current && !loadingMore) {
      loadingRef.current = true;
      onEndReached?.();
      // Reset gate after a delay
      setTimeout(() => { loadingRef.current = false; }, 2000);
    }
  }, [loadingMore, onEndReached]);

  // ── Show skeleton until first batch loads ────────────────────────────────
  if (!initialDataLoaded) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.skeletonContent}
        scrollEnabled={false}
      >
        <SkeletonGrid />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={200}
      onScroll={handleScroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={ACCENT}
          colors={[ACCENT]}
        />
      }
    >
      {feeds.length === 0 && !loadingMore ? (
        <View style={styles.empty}>
          <Ionicons name="compass-outline" size={48} color={BRAND + '40'} />
          <Text style={styles.emptyText}>Nothing here yet</Text>
        </View>
      ) : (
        <View style={styles.columns}>
          {/* Left column */}
          <View style={styles.col}>
            {leftCol.map((item) => (
              <MasonryCard key={String(item?.id)} item={item} onPress={handlePress} />
            ))}
          </View>

          {/* Right column */}
          <View style={styles.col}>
            {rightCol.map((item) => (
              <MasonryCard key={String(item?.id)} item={item} onPress={handlePress} />
            ))}
          </View>
        </View>
      )}

      {/* Footer loader */}
      {loadingMore && (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={ACCENT} />
        </View>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

export default memo(DiscoverMasonryGrid);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
  },
  listContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 10,
  },
  skeletonContent: {
    paddingTop: 10,
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  col: {
    flex: 1,
    marginHorizontal: GAP / 2,
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 14,
    marginBottom: GAP + 2,
    overflow: 'hidden',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  imgWrap: {
    width: '100%',
    backgroundColor: BASE,
    overflow: 'hidden',
  },
  imgPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BASE,
    minHeight: 80,
  },
  body: {
    paddingHorizontal: 9,
    paddingTop: 8,
    paddingBottom: 9,
  },
  caption: {
    fontSize: 12,
    fontFamily: FONT_R,
    color: BRAND,
    lineHeight: 17,
    marginBottom: 7,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: BASE,
    marginRight: 5,
  },
  username: {
    flex: 1,
    fontSize: 11,
    fontFamily: FONT_M,
    color: MUTED,
  },
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  likeCount: {
    fontSize: 11,
    fontFamily: FONT_M,
    color: ACCENT,
  },
  footerLoader: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: BRAND + '60',
    fontFamily: FONT_R,
  },
});

// ─── Skeleton styles ──────────────────────────────────────────────────────────
const sk = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    paddingHorizontal: H_PAD,
    paddingTop: 10,
  },
  col: {
    flex: 1,
    marginHorizontal: GAP / 2,
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 14,
    marginBottom: GAP + 2,
    overflow: 'hidden',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  body: {
    paddingHorizontal: 9,
    paddingTop: 8,
    paddingBottom: 10,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
