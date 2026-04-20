/**
 * HafrikTV — Premium video discovery screen.
 *
 * Layout:
 *  1. Page-profile hero  (full-width, edge-to-edge, top of app)
 *  2. Weekly Top 🔥      (horizontal snap cards)
 *  3. New on HafrikTV 🆕 (classic vertical list with pagination)
 */
import React, {
  useCallback, useEffect, useMemo, useRef, useState, memo,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import { fetchWeeklyTop, fetchNewVideos } from './hafriktvapi';
import { getBusinessDetails, followBusiness, unfollowBusiness } from '../pages_/Businessapi';
import ProgressBarLoader from '../progressbarloader';

const HAFRIKTV_PAGE_ID = 3;

// ─── Constants ────────────────────────────────────────────────────────────────
const { width: W } = Dimensions.get('window');
const COVER_H      = Math.round(W * 0.38);   // cover image height — compact
const CARD_W       = 190;
const CARD_H       = Math.round(CARD_W * (9 / 16));
const REEL_W       = 108;
const REEL_H       = Math.round(REEL_W * (16 / 9));  // portrait
const THUMB_W      = 118;
const THUMB_H      = Math.round(THUMB_W * (9 / 16));
const PAD          = 16;
const CARD_GAP     = 12;

// ─── Brand colours ────────────────────────────────────────────────────────────
const BG           = '#071e21';
const BG_CARD      = '#0d2d32';
const BG_ROW       = '#0f3539';
const ACCENT       = '#1f8e93';
const ACCENT_LIGHT = '#27adb5';
const WHITE        = '#ffffff';
const WHITE_DIM    = 'rgba(255,255,255,0.65)';
const WHITE_MUTED  = 'rgba(255,255,255,0.38)';
const BORDER       = 'rgba(255,255,255,0.07)';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCount(n) {
  if (!n || n < 1) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max).trimEnd() + '…' : str;
}

function cleanText(str = '') {
  return String(str)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;|&rsquo;/g, "'")
    .replace(/<[^>]*>/g, '').trim();
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SkeletonBox = memo(({ style }) => {
  const pulse = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.65, duration: 850, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3,  duration: 850, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);
  return (
    <Animated.View style={[{ backgroundColor: BG_ROW, borderRadius: 8 }, style, { opacity: pulse }]} />
  );
});

// ─── Full-width Page Hero ─────────────────────────────────────────────────────
const PageHero = memo(({ safeTop }) => {
  const [page,        setPage]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [liked,       setLiked]       = useState(false);
  const [likesCount,  setLikesCount]  = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    getBusinessDetails(HAFRIKTV_PAGE_ID)
      .then((p) => {
        if (!alive || !p) return;
        setPage(p);
        setLiked(!!p.is_liked);
        setLikesCount(Number(p.likes ?? p.followers ?? p.followers_count ?? 0));
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const handleLike = useCallback(async () => {
    if (likeLoading) return;
    setLikeLoading(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesCount((c) => wasLiked ? Math.max(0, c - 1) : c + 1);
    try {
      const res = await (wasLiked ? unfollowBusiness(HAFRIKTV_PAGE_ID) : followBusiness(HAFRIKTV_PAGE_ID));
      if (res?.is_liked != null) setLiked(!!res.is_liked);
      if (res?.likes    != null) setLikesCount(Number(res.likes));
    } catch {
      setLiked(wasLiked);
      setLikesCount((c) => wasLiked ? c + 1 : Math.max(0, c - 1));
    } finally {
      setLikeLoading(false);
    }
  }, [liked, likeLoading]);

  // ── Loading skeleton ──────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.heroWrap}>
        <SkeletonBox style={{ height: COVER_H, borderRadius: 0 }} />
        <View style={styles.heroInfo}>
          <SkeletonBox style={{ width: 52, height: 52, borderRadius: 26, flexShrink: 0 }} />
          <View style={{ flex: 1, gap: 7 }}>
            <SkeletonBox style={{ height: 15, width: '60%' }} />
            <SkeletonBox style={{ height: 11, width: '90%' }} />
            <SkeletonBox style={{ height: 11, width: '75%' }} />
          </View>
        </View>
      </View>
    );
  }

  if (!page) return null;

  const name       = cleanText(page.title || page.name || 'HafrikTV');
  const about      = cleanText(page.about || page.description || '');
  const cover      = page.cover || null;
  const avatar     = page.avatar || page.logo || null;
  const isVerified = page.verified === true || page.verified === 1 || page.verified_value === 1;
  const category   = cleanText(page.category || '');

  return (
    <View style={styles.heroWrap}>
      {/* ── Cover image ───────────────────────────────────────────── */}
      <View style={[styles.coverImg, { height: COVER_H }]}>
        {cover ? (
          <ExpoImage
            source={{ uri: cover }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition="top"
            cachePolicy="memory-disk"
          />
        ) : (
          <LinearGradient
            colors={['#0c3f44', '#1f8e93', '#0c3f44']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(7,30,33,0.55)', BG_CARD]}
          locations={[0.35, 0.75, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* ── Compact side-by-side info row ─────────────────────────── */}
      <View style={styles.heroInfo}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          {avatar ? (
            <ExpoImage source={{ uri: avatar }} style={styles.avatarImg} contentFit="cover" cachePolicy="memory-disk" />
          ) : (
            <View style={[styles.avatarImg, { backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="tv" size={22} color={WHITE} />
            </View>
          )}
        </View>

        {/* Text block */}
        <View style={styles.heroTextBlock}>
          <View style={styles.nameRow}>
            <Text style={styles.heroName} numberOfLines={1}>{name}</Text>
            {isVerified ? <Ionicons name="checkmark-circle" size={15} color={ACCENT} style={{ marginLeft: 4 }} /> : null}
          </View>
          {category ? <Text style={styles.heroCategory}>{category}</Text> : null}
          {about ? (
            <Text style={styles.heroAbout} numberOfLines={2}>{truncate(about, 120)}</Text>
          ) : null}

          {/* Stats + Like in one line */}
          <View style={styles.heroFooter}>
            <View style={styles.heroStat}>
              <Ionicons name="heart" size={12} color={liked ? '#ff4d6d' : ACCENT} />
              <Text style={styles.heroStatNum}>{fmtCount(likesCount)}</Text>
              <Text style={styles.heroStatLabel}> likes</Text>
            </View>
            <TouchableOpacity
              style={[styles.likeBtn, liked && styles.likeBtnFilled]}
              onPress={handleLike}
              activeOpacity={0.8}
              disabled={likeLoading}
            >
              {likeLoading ? (
                <ActivityIndicator size="small" color={liked ? BG : WHITE} style={{ marginRight: 4 }} />
              ) : (
                <Ionicons name={liked ? 'heart' : 'heart-outline'} size={12} color={liked ? BG : WHITE} style={{ marginRight: 4 }} />
              )}
              <Text style={[styles.likeBtnTxt, liked && { color: BG }]}>
                {liked ? 'Liked' : 'Like Page'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
});

// ─── Horizontal video card ────────────────────────────────────────────────────
const VideoCard = memo(({ item, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 40 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 20 }).start();

  return (
    <Pressable onPress={() => onPress(item)} onPressIn={onIn} onPressOut={onOut}>
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <View style={styles.cardThumb}>
          <ExpoImage
            source={{ uri: item.thumbnail }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={250}
          />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFill} />
          <View style={styles.cardPlay}>
            <Ionicons name="play" size={14} color={WHITE} style={{ paddingLeft: 1 }} />
          </View>
          {item.views > 0 ? (
            <View style={styles.cardViews}>
              <Ionicons name="eye-outline" size={9} color={WHITE} style={{ marginRight: 2 }} />
              <Text style={styles.cardViewsTxt}>{fmtCount(item.views)}</Text>
            </View>
          ) : null}
          <View style={styles.cardTypeBadge}>
            <Text style={styles.cardTypeTxt}>{item.type === 'reel' ? 'REEL' : 'VIDEO'}</Text>
          </View>
        </View>
        {item.title ? (
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
});

// ─── Portrait reel card ───────────────────────────────────────────────────────
const ReelCard = memo(({ item, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 40 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 20 }).start();

  return (
    <Pressable onPress={() => onPress(item)} onPressIn={onIn} onPressOut={onOut}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <View style={styles.reelThumb}>
          {item.thumbnail ? (
            <ExpoImage
              source={{ uri: item.thumbnail }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
            />
          ) : (
            <LinearGradient colors={['#0c3f44', '#1f8e93']} style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.72)']} style={StyleSheet.absoluteFill} />
          <View style={styles.reelPlay}>
            <Ionicons name="play" size={12} color={WHITE} style={{ paddingLeft: 1 }} />
          </View>
          {item.views > 0 ? (
            <View style={styles.reelViews}>
              <Ionicons name="eye-outline" size={8} color={WHITE} style={{ marginRight: 2 }} />
              <Text style={styles.reelViewsTxt}>{fmtCount(item.views)}</Text>
            </View>
          ) : null}
        </View>
        {item.title ? (
          <Text style={styles.reelTitle} numberOfLines={2}>{item.title}</Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
});

// ─── Classic list row ─────────────────────────────────────────────────────────
const ListRow = memo(({ item, onPress, isLast }) => (
  <TouchableOpacity
    style={[styles.listRow, isLast && { borderBottomWidth: 0 }]}
    activeOpacity={0.78}
    onPress={() => onPress(item)}
  >
    <View style={styles.listThumb}>
      <ExpoImage
        source={{ uri: item.thumbnail }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={220}
      />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.58)']} style={StyleSheet.absoluteFill} />
      <View style={styles.listPlay}>
        <Ionicons name="play" size={11} color={WHITE} style={{ paddingLeft: 1 }} />
      </View>
    </View>

    <View style={styles.listInfo}>
      <Text style={styles.listTitle} numberOfLines={2}>
        {item.title || truncate(item.description, 60)}
      </Text>
      <View style={styles.listMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="eye-outline" size={11} color={WHITE_MUTED} />
          <Text style={styles.metaTxt}>{fmtCount(item.views)} views</Text>
        </View>
        {item.time ? (
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={11} color={WHITE_MUTED} />
            <Text style={styles.metaTxt}>{fmtTime(item.time)}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.listTypeRow}>
        <View style={[
          styles.typePill,
          item.type === 'reel' && { borderColor: ACCENT, backgroundColor: 'rgba(31,142,147,0.15)' },
        ]}>
          <Text style={[styles.typeTxt, item.type === 'reel' && { color: ACCENT_LIGHT }]}>
            {item.type === 'reel' ? 'Reel' : item.type === 'media' ? 'Media' : 'Video'}
          </Text>
        </View>
      </View>
    </View>

    <Ionicons name="chevron-forward" size={15} color={WHITE_MUTED} style={{ alignSelf: 'center' }} />
  </TouchableOpacity>
));

// ─── Section label ────────────────────────────────────────────────────────────
const SectionLabel = ({ emoji, label }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionEmoji}>{emoji}</Text>
    <Text style={styles.sectionTitle}>{label}</Text>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HafrikTVScreen() {
  const { token }  = useAuth();
  const navigation = useNavigation();
  const { top }    = useSafeAreaInsets();

  // Weekly top
  const [weeklyTop,  setWeeklyTop]  = useState([]);
  const [loadingTop, setLoadingTop] = useState(true);

  // New videos + pagination
  const [newVideos,    setNewVideos]    = useState([]);
  const [loadingNew,   setLoadingNew]   = useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [currentPage,  setCurrentPage]  = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerBg = scrollY.interpolate({
    inputRange: [0, COVER_H - top - 10],
    outputRange: ['rgba(7,30,33,0)', 'rgba(7,30,33,1)'],
    extrapolate: 'clamp',
  });

  // Initial loads
  useEffect(() => {
    let alive = true;

    fetchWeeklyTop(token).then((d) => {
      if (alive) { setWeeklyTop(d); setLoadingTop(false); }
    });

    fetchNewVideos(token, 1).then((res) => {
      if (!alive) return;
      setNewVideos(res.videos);
      setTotalPages(res.totalPages);
      setCurrentPage(1);
      setLoadingNew(false);
    });

    return () => { alive = false; };
  }, [token]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || currentPage >= totalPages) return;
    setLoadingMore(true);
    const next = currentPage + 1;
    try {
      const res = await fetchNewVideos(token, next);
      setNewVideos((prev) => {
        const ids = new Set(prev.map((v) => v.id));
        const fresh = res.videos.filter((v) => !ids.has(v.id));
        return [...prev, ...fresh];
      });
      setCurrentPage(next);
      setTotalPages(res.totalPages);
    } catch {}
    setLoadingMore(false);
  }, [loadingMore, currentPage, totalPages, token]);

  // ── Reels pagination ────────────────────────────────────────────
  const REELS_PER_PAGE = 10;
  const [reelPage, setReelPage] = useState(1);

  // ── Derived lists (deduplicated) ────────────────────────────────
  const reelItems = useMemo(() => {
    const seen = new Set();
    return [...weeklyTop, ...newVideos]
      .filter((v) => v.type === 'reel')
      .filter((v) => { if (seen.has(v.id)) return false; seen.add(v.id); return true; });
  }, [weeklyTop, newVideos]);

  const videoItems = useMemo(() => {
    const seen = new Set();
    return newVideos
      .filter((v) => v.type !== 'reel')
      .filter((v) => { if (seen.has(v.id)) return false; seen.add(v.id); return true; });
  }, [newVideos]);

  // Weekly Top shows everything (reels + videos) — it's a popularity ranking
  const weeklyTopDeduped = useMemo(() => {
    const seen = new Set();
    return weeklyTop.filter((v) => { if (seen.has(v.id)) return false; seen.add(v.id); return true; });
  }, [weeklyTop]);

  // Show all reels — user scrolls horizontally to see them all
  const visibleReels = reelItems;

  const handlePlay = useCallback((video) => {
    if (video.type === 'reel') {
      const reelIndex = Math.max(0, reelItems.findIndex((v) => v.id === video.id));
      navigation.navigate('HafrikTVPlayer', {
        video, reels: reelItems, reelIndex, related: [],
      });
    } else {
      const seen = new Set([video.id]);
      const related = [...weeklyTop, ...newVideos]
        .filter((v) => { if (seen.has(v.id)) return false; seen.add(v.id); return true; })
        .slice(0, 12);
      navigation.navigate('HafrikTVPlayer', { video, related });
    }
  }, [navigation, weeklyTop, newVideos, reelItems]);

  const hasMore = currentPage < totalPages;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ProgressBarLoader visible={loadingTop || loadingNew} />

      {/* ── Floating header ───────────────────────────────────────── */}
      <Animated.View style={[styles.header, { paddingTop: top + 4, backgroundColor: headerBg }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={WHITE} />
        </TouchableOpacity>
        <View style={styles.logoRow}>
          <Ionicons name="tv" size={17} color={ACCENT} style={{ marginRight: 7 }} />
          <Text style={styles.logoText}>HafrikTV</Text>
        </View>
        <View style={{ width: 38 }} />
      </Animated.View>

      {/* ── Scroll body ───────────────────────────────────────────── */}
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* ① Hero — full width, starts at y=0 (behind status bar) */}
        <PageHero safeTop={top} />

        {/* ② Reels — 2-row horizontal grid */}
        {(loadingTop || reelItems.length > 0) ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEmoji}>🎬</Text>
              <Text style={styles.sectionTitle}>Reels</Text>
              {reelItems.length > 0 ? (
                <Text style={styles.sectionCount}>{reelItems.length} reels</Text>
              ) : null}
            </View>
            <FlatList
              horizontal
              data={loadingTop ? [0,1,2,3,4,5] : visibleReels}
              keyExtractor={(v, i) => loadingTop ? `rsk-${i}` : `reel-${v.id}`}
              renderItem={({ item }) => loadingTop
                ? <SkeletonBox style={{ width: REEL_W, height: REEL_H + 36 }} />
                : <ReelCard item={item} onPress={handlePlay} />
              }
              contentContainerStyle={[styles.hScroll, { alignItems: 'flex-start' }]}
              showsHorizontalScrollIndicator={false}
              snapToInterval={REEL_W + CARD_GAP}
              snapToAlignment="start"
              decelerationRate="fast"
              removeClippedSubviews
            />
          </View>
        ) : null}

        {/* ③ Weekly Top — all items ranked by popularity */}
        {(loadingTop || weeklyTopDeduped.length > 0) ? (
          <View style={styles.section}>
            <SectionLabel emoji="🔥" label="Weekly Top" />
            {loadingTop ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hScroll} scrollEnabled={false}>
                {[0,1,2,3].map((i) => (
                  <SkeletonBox key={i} style={{ width: CARD_W, height: CARD_H + 46 }} />
                ))}
              </ScrollView>
            ) : (
              <FlatList
                horizontal
                data={weeklyTopDeduped}
                keyExtractor={(v) => `top-${v.id}`}
                renderItem={({ item }) => <VideoCard item={item} onPress={handlePlay} />}
                contentContainerStyle={styles.hScroll}
                showsHorizontalScrollIndicator={false}
                snapToInterval={CARD_W + CARD_GAP}
                snapToAlignment="start"
                decelerationRate="fast"
                removeClippedSubviews
              />
            )}
          </View>
        ) : null}

        {/* ④ New on HafrikTV — classic list, videos only, paginated */}
        <View style={styles.section}>
          <SectionLabel emoji="🆕" label="New on HafrikTV" />

          <View style={styles.listCard}>
            {loadingNew ? (
              [0,1,2,3,4].map((i) => (
                <View key={i} style={styles.listRow}>
                  <SkeletonBox style={{ width: THUMB_W, height: THUMB_H, borderRadius: 8, flexShrink: 0 }} />
                  <View style={{ flex: 1, gap: 8, marginLeft: 12 }}>
                    <SkeletonBox style={{ height: 13, width: '88%' }} />
                    <SkeletonBox style={{ height: 11, width: '65%' }} />
                    <SkeletonBox style={{ height: 9,  width: '40%' }} />
                  </View>
                </View>
              ))
            ) : videoItems.length === 0 ? (
              <View style={{ padding: 28, alignItems: 'center' }}>
                <Ionicons name="film-outline" size={32} color={WHITE_MUTED} />
                <Text style={{ color: WHITE_MUTED, fontFamily: 'WorkSans_400Regular', fontSize: 13, marginTop: 10 }}>
                  No videos yet
                </Text>
              </View>
            ) : (
              videoItems.map((item, idx) => (
                <ListRow
                  key={`vid-${item.id}`}
                  item={item}
                  onPress={handlePlay}
                  isLast={idx === videoItems.length - 1 && !hasMore}
                />
              ))
            )}
          </View>

          {/* Load more / pagination */}
          {!loadingNew && hasMore ? (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={handleLoadMore}
              disabled={loadingMore}
              activeOpacity={0.75}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color={ACCENT} />
              ) : (
                <>
                  <Text style={styles.loadMoreTxt}>Load More</Text>
                  <Ionicons name="chevron-down" size={15} color={ACCENT} style={{ marginLeft: 5 }} />
                </>
              )}
            </TouchableOpacity>
          ) : null}

          {/* Page indicator */}
          {!loadingNew && totalPages > 1 ? (
            <Text style={styles.pageIndicator}>
              Page {currentPage} of {totalPages}
            </Text>
          ) : null}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },

  // ── Floating header ───────────────────────────────────────────────
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: PAD, paddingBottom: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoText: {
    color: WHITE, fontSize: 17,
    fontFamily: 'ReadexPro_700Bold', letterSpacing: 0.3,
  },

  // ── Hero ──────────────────────────────────────────────────────────
  heroWrap: {
    width: W,
    backgroundColor: BG_CARD,
  },
  coverImg: {
    width: W,
    overflow: 'hidden',
  },
  heroInfo: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: BG_CARD,
    paddingHorizontal: PAD, paddingTop: 10, paddingBottom: 14,
    gap: 12,
  },
  avatarWrap: {
    marginTop: -20,
    borderRadius: 28,
    borderWidth: 2.5,
    borderColor: BG_CARD,
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  avatarImg: {
    width: 52, height: 52, borderRadius: 26,
  },
  heroTextBlock: {
    flex: 1, paddingTop: 2, gap: 3,
  },
  nameRow: {
    flexDirection: 'row', alignItems: 'center',
  },
  heroName: {
    color: WHITE, fontSize: 16,
    fontFamily: 'ReadexPro_700Bold', letterSpacing: 0.1, flexShrink: 1,
  },
  heroCategory: {
    color: ACCENT_LIGHT, fontSize: 10,
    fontFamily: 'WorkSans_600SemiBold',
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  heroAbout: {
    color: WHITE_DIM, fontSize: 12,
    fontFamily: 'WorkSans_400Regular',
    lineHeight: 17,
  },
  heroFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4,
  },
  heroStat: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
  },
  heroStatNum: {
    color: WHITE, fontSize: 12,
    fontFamily: 'ReadexPro_600SemiBold',
  },
  heroStatLabel: {
    color: WHITE_MUTED, fontSize: 11,
    fontFamily: 'WorkSans_400Regular',
  },
  likeBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1.5, borderColor: ACCENT,
  },
  likeBtnFilled: {
    backgroundColor: ACCENT, borderColor: ACCENT,
  },
  likeBtnTxt: {
    color: WHITE, fontSize: 11,
    fontFamily: 'WorkSans_700Bold',
  },

  // ── Sections ──────────────────────────────────────────────────────
  section: { marginTop: 22 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: PAD, marginBottom: 12, gap: 6,
  },
  sectionEmoji: { fontSize: 17 },
  sectionTitle: {
    color: WHITE, fontSize: 16,
    fontFamily: 'ReadexPro_600SemiBold', letterSpacing: 0.2,
    flex: 1,
  },
  sectionCount: {
    color: WHITE_MUTED, fontSize: 12,
    fontFamily: 'WorkSans_400Regular',
  },

  // ── Horizontal cards ──────────────────────────────────────────────
  hScroll: { paddingLeft: PAD, paddingRight: PAD / 2, gap: CARD_GAP },
  card: { width: CARD_W },
  cardThumb: {
    width: CARD_W, height: CARD_H, borderRadius: 10,
    backgroundColor: BG_CARD, overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
  },
  cardPlay: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  cardViews: {
    position: 'absolute', bottom: 7, left: 7,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2,
  },
  cardViewsTxt: { color: WHITE, fontSize: 9, fontFamily: 'WorkSans_600SemiBold' },
  cardTypeBadge: {
    position: 'absolute', top: 7, right: 7,
    backgroundColor: 'rgba(31,142,147,0.75)',
    borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2,
  },
  cardTypeTxt: { color: WHITE, fontSize: 8, fontFamily: 'WorkSans_700Bold', letterSpacing: 0.5 },
  cardTitle: {
    color: WHITE_DIM, fontSize: 12, fontFamily: 'WorkSans_500Medium',
    marginTop: 7, lineHeight: 17,
  },

  // ── Portrait reel cards ───────────────────────────────────────
  reelThumb: {
    width: REEL_W, height: REEL_H, borderRadius: 10,
    backgroundColor: BG_CARD, overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
  },
  reelPlay: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  reelViews: {
    position: 'absolute', bottom: 6, left: 6,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2,
  },
  reelViewsTxt: { color: WHITE, fontSize: 8, fontFamily: 'WorkSans_600SemiBold' },
  reelTitle: {
    color: WHITE_DIM, fontSize: 11, fontFamily: 'WorkSans_500Medium',
    marginTop: 5, lineHeight: 15, width: REEL_W,
  },
  reelLoadMore: {
    width: 64, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 8, gap: 4,
  },
  reelLoadMoreTxt: {
    color: ACCENT, fontSize: 10, fontFamily: 'WorkSans_600SemiBold',
  },

  // ── Classic list ──────────────────────────────────────────────────
  listCard: {
    marginHorizontal: PAD,
    backgroundColor: BG_CARD,
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER,
  },
  listRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  listThumb: {
    width: THUMB_W, height: THUMB_H, borderRadius: 8,
    backgroundColor: BG_ROW, overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  listPlay: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  listInfo: { flex: 1, marginLeft: 12, gap: 4, justifyContent: 'center' },
  listTitle: {
    color: WHITE, fontSize: 13,
    fontFamily: 'WorkSans_600SemiBold', lineHeight: 18,
  },
  listMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt: { color: WHITE_MUTED, fontSize: 11, fontFamily: 'WorkSans_400Regular' },
  listTypeRow: { flexDirection: 'row', marginTop: 2 },
  typePill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  typeTxt: { color: WHITE_MUTED, fontSize: 10, fontFamily: 'WorkSans_600SemiBold' },

  // ── Pagination ────────────────────────────────────────────────────
  loadMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: PAD, marginTop: 12,
    paddingVertical: 12,
    backgroundColor: BG_CARD,
    borderRadius: 12, borderWidth: 1, borderColor: ACCENT,
    gap: 4,
  },
  loadMoreTxt: {
    color: ACCENT, fontSize: 14,
    fontFamily: 'WorkSans_600SemiBold',
  },
  pageIndicator: {
    textAlign: 'center', marginTop: 8,
    color: WHITE_MUTED, fontSize: 11,
    fontFamily: 'WorkSans_400Regular',
  },
});
