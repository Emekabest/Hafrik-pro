/**
 * HafrikTV — Redesigned with Hafrik brand style.
 *
 * Layout:
 *  1. Brand header (solid dark, fixed)
 *  2. Featured hero slider (auto-scroll, weekly top)
 *  3. Reels strip (portrait horizontal)
 *  4. New on HafrikTV (clean vertical list)
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import { fetchWeeklyTop, fetchNewVideos } from './hafriktvapi';
import { getBusinessDetails, followBusiness, unfollowBusiness } from '../pages_/Businessapi';
import { Colors } from '../../theme';
import AppDetails from '../../helpers/appdetails';

const HAFRIKTV_PAGE_ID = 3;

// ─── Dimensions & constants ───────────────────────────────────────────────────
const { width: SW } = Dimensions.get('window');
const PAD           = 16;
const CARD_GAP      = 10;

// Featured slider
const FEAT_W   = SW - 32;
const FEAT_H   = 220;
const FEAT_GAP = 12;
const SNAP_INT = FEAT_W + FEAT_GAP;

// Reel card (portrait)
const REEL_W = 110;
const REEL_H = Math.round(REEL_W * (16 / 9));

// Video card (landscape)
const VID_W = 200;
const VID_H = Math.round(VID_W * (9 / 16));

// List row thumbnail
const THUMB_W = 112;
const THUMB_H = Math.round(THUMB_W * (9 / 16));

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const BRAND     = '#071e21';          // deepest brand dark
const BRAND_MID = '#0c3f44';          // card bg
const BRAND_ROW = '#0f3539';          // subtle row
const ACCENT    = '#1f8e93';          // teal
const ACCENT_LT = '#27adb5';          // lighter teal
const LIME      = '#a8e063';          // brand lime (accent sparingly)
const WHITE     = '#ffffff';
const W_70      = 'rgba(255,255,255,0.70)';
const W_40      = 'rgba(255,255,255,0.40)';
const W_14      = 'rgba(255,255,255,0.14)';
const W_08      = 'rgba(255,255,255,0.08)';
const BORDER    = 'rgba(255,255,255,0.07)';

const FONT_B = AppDetails?.fontFamily?.redex?.bold    ?? 'System';
const FONT_M = AppDetails?.fontFamily?.inter?.medium  ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const a = (hex, op) => {
  const h = (hex || '').replace('#', '');
  return `#${h}${Math.round(op * 255).toString(16).padStart(2, '0')}`;
};

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

function cleanText(str = '') {
  return String(str)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;|&rsquo;/g, "'")
    .replace(/<[^>]*>/g, '').trim();
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skel = memo(({ style }) => {
  const pulse = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.7,  duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[{ backgroundColor: BRAND_ROW, borderRadius: 10 }, style, { opacity: pulse }]} />;
});

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionHead({ icon, label, count, accent }) {
  return (
    <View style={m.secHead}>
      <View style={[m.secPill, { backgroundColor: accent ?? ACCENT }]}>
        <Ionicons name={icon} size={10} color={WHITE} />
        <Text style={m.secPillTxt}>{label.toUpperCase()}</Text>
      </View>
      <Text style={m.secTitle}>{label}</Text>
      {count != null && <Text style={m.secCount}>{count}</Text>}
    </View>
  );
}

// ─── Page Hero (channel info) ─────────────────────────────────────────────────
const PageHero = memo(() => {
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

  if (loading) {
    return (
      <View style={h.heroWrap}>
        <Skel style={{ height: 140, borderRadius: 0 }} />
        <View style={h.heroBody}>
          <Skel style={{ width: 56, height: 56, borderRadius: 28 }} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skel style={{ height: 14, width: '55%' }} />
            <Skel style={{ height: 11, width: '80%' }} />
            <Skel style={{ height: 28, width: 110, borderRadius: 100, marginTop: 4 }} />
          </View>
        </View>
      </View>
    );
  }

  if (!page) return null;

  const name     = cleanText(page.title || page.name || 'HafrikTV');
  const about    = cleanText(page.about || page.description || '');
  const cover    = page.cover ?? null;
  const avatar   = page.avatar ?? page.logo ?? null;
  const verified = page.verified === true || page.verified === 1;

  return (
    <View style={h.heroWrap}>
      {/* Cover */}
      <View style={h.cover}>
        {cover ? (
          <ExpoImage source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <LinearGradient colors={['#0c3f44', '#1a7a82', '#0c3f44']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        )}
        {/* TV watermark */}
        <View style={h.coverWatermark}>
          <Ionicons name="tv" size={48} color={a(WHITE, 0.06)} />
        </View>
        <LinearGradient colors={['transparent', a(BRAND_MID, 0.5), BRAND_MID]} locations={[0.3, 0.7, 1]} style={StyleSheet.absoluteFill} />
      </View>

      {/* Info row */}
      <View style={h.heroBody}>
        {/* Avatar */}
        <View style={h.avatarRing}>
          {avatar ? (
            <ExpoImage source={{ uri: avatar }} style={h.avatar} contentFit="cover" cachePolicy="memory-disk" />
          ) : (
            <View style={[h.avatar, { backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="tv" size={24} color={WHITE} />
            </View>
          )}
        </View>

        {/* Text + actions */}
        <View style={h.heroText}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={h.name} numberOfLines={1}>{name}</Text>
            {verified && <Ionicons name="checkmark-circle" size={15} color={ACCENT_LT} />}
          </View>

          {about ? <Text style={h.about} numberOfLines={2}>{about}</Text> : null}

          <View style={h.footer}>
            {/* Likes */}
            <View style={h.stat}>
              <Ionicons name="heart" size={11} color={liked ? '#ff4d6d' : ACCENT_LT} />
              <Text style={h.statNum}>{fmtCount(likesCount)}</Text>
              <Text style={h.statLabel}> fans</Text>
            </View>

            {/* Follow button */}
            <TouchableOpacity
              style={[h.followBtn, liked && h.followBtnActive]}
              onPress={handleLike}
              activeOpacity={0.8}
              disabled={likeLoading}
            >
              {likeLoading
                ? <ActivityIndicator size="small" color={liked ? BRAND : WHITE} />
                : <>
                    <Ionicons name={liked ? 'heart' : 'heart-outline'} size={12} color={liked ? BRAND : WHITE} />
                    <Text style={[h.followTxt, liked && { color: BRAND }]}>{liked ? 'Following' : 'Follow'}</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
});

const h = StyleSheet.create({
  heroWrap: { backgroundColor: BRAND_MID },
  cover: { height: 140, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  coverWatermark: { position: 'absolute', right: 20, bottom: 20 },
  heroBody: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: PAD, paddingTop: 8, paddingBottom: 16,
  },
  avatarRing: {
    marginTop: -22,
    borderRadius: 32, borderWidth: 2.5, borderColor: BRAND_MID,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 8,
  },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  heroText: { flex: 1, paddingTop: 4, gap: 4 },
  name: { color: WHITE, fontSize: 16, fontFamily: FONT_B, fontWeight: '900', letterSpacing: 0.2, flexShrink: 1 },
  about: { color: W_70, fontSize: 12, fontFamily: FONT_R, lineHeight: 17 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statNum: { color: WHITE, fontSize: 12, fontFamily: FONT_B, fontWeight: '700' },
  statLabel: { color: W_40, fontSize: 11, fontFamily: FONT_R },
  followBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 100, borderWidth: 1.5, borderColor: ACCENT_LT,
    backgroundColor: 'transparent',
  },
  followBtnActive: { backgroundColor: ACCENT_LT, borderColor: ACCENT_LT },
  followTxt: { color: WHITE, fontSize: 12, fontFamily: FONT_B, fontWeight: '800' },
});

// ─── Featured Slide Card ──────────────────────────────────────────────────────
const FeatSlide = memo(({ item, onPress }) => {
  const isReel = item.type === 'reel';
  return (
    <TouchableOpacity style={f.slide} onPress={() => onPress(item)} activeOpacity={0.92}>
      {item.thumbnail ? (
        <ExpoImage source={{ uri: item.thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={300} />
      ) : (
        <LinearGradient colors={['#0c3f44', '#1f8e93']} style={StyleSheet.absoluteFill} />
      )}

      {/* Gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.80)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Type badge — top left */}
      <View style={[f.typeBadge, isReel && { backgroundColor: ACCENT }]}>
        <Ionicons name={isReel ? 'play-circle' : 'film'} size={9} color={WHITE} />
        <Text style={f.typeTxt}>{isReel ? 'REEL' : 'VIDEO'}</Text>
      </View>

      {/* Views — top right */}
      {item.views > 0 && (
        <View style={f.views}>
          <Ionicons name="eye-outline" size={9} color={WHITE} />
          <Text style={f.viewsTxt}>{fmtCount(item.views)}</Text>
        </View>
      )}

      {/* Bottom content */}
      <View style={f.bottom}>
        {item.title ? <Text style={f.title} numberOfLines={2}>{item.title}</Text> : null}
        <View style={f.metaRow}>
          <View style={f.playBtn}>
            <Ionicons name="play" size={11} color={BRAND} style={{ paddingLeft: 1 }} />
            <Text style={f.playTxt}>Play</Text>
          </View>
          {item.time ? <Text style={f.date}>{fmtTime(item.time)}</Text> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const f = StyleSheet.create({
  slide: {
    width: FEAT_W, height: FEAT_H,
    borderRadius: 16, overflow: 'hidden',
    backgroundColor: BRAND_ROW,
  },
  typeBadge: {
    position: 'absolute', top: 12, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 100, paddingHorizontal: 9, paddingVertical: 4,
  },
  typeTxt: { color: WHITE, fontSize: 9, fontFamily: FONT_B, fontWeight: '800', letterSpacing: 0.7 },
  views: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 100, paddingHorizontal: 9, paddingVertical: 4,
  },
  viewsTxt: { color: WHITE, fontSize: 9, fontFamily: FONT_M, fontWeight: '600' },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14, gap: 8 },
  title: { color: WHITE, fontSize: 15, fontFamily: FONT_B, fontWeight: '800', lineHeight: 20, letterSpacing: -0.2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  playBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: WHITE, borderRadius: 100,
    paddingHorizontal: 13, paddingVertical: 6,
  },
  playTxt: { color: BRAND, fontSize: 12, fontFamily: FONT_B, fontWeight: '800' },
  date: { color: W_40, fontSize: 11, fontFamily: FONT_R },
});

// ─── Featured Slider ──────────────────────────────────────────────────────────
function FeaturedSlider({ items, loading, onPlay }) {
  const flatRef   = useRef(null);
  const idxRef    = useRef(0);
  const timerRef  = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);

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
    if (idx !== idxRef.current) { idxRef.current = idx; setActiveIdx(idx); }
  }, []);

  if (loading) {
    return (
      <View style={{ paddingHorizontal: PAD, marginBottom: 6 }}>
        <Skel style={{ width: FEAT_W, height: FEAT_H, borderRadius: 16 }} />
      </View>
    );
  }
  if (!items.length) return null;

  return (
    <View>
      <FlatList
        ref={flatRef}
        data={items}
        keyExtractor={item => `feat-${item.id}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INT}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: PAD, gap: FEAT_GAP }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => <FeatSlide item={item} onPress={onPlay} />}
        getItemLayout={(_, i) => ({ length: SNAP_INT, offset: SNAP_INT * i, index: i })}
        removeClippedSubviews
      />
      {/* Dot indicators */}
      {items.length > 1 && (
        <View style={sl.dots}>
          {items.slice(0, Math.min(items.length, 10)).map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                idxRef.current = i; setActiveIdx(i);
                flatRef.current?.scrollToIndex({ index: i, animated: true });
              }}
            >
              <View style={[sl.dot, i === activeIdx && sl.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const sl = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10, marginBottom: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: a(WHITE, 0.2) },
  dotActive: { width: 20, height: 6, borderRadius: 3, backgroundColor: ACCENT_LT },
});

// ─── Reel Card ────────────────────────────────────────────────────────────────
const ReelCard = memo(({ item, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 40 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 20 }).start();

  return (
    <Pressable onPress={() => onPress(item)} onPressIn={onIn} onPressOut={onOut}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <View style={r.thumb}>
          {item.thumbnail ? (
            <ExpoImage source={{ uri: item.thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={200} />
          ) : (
            <LinearGradient colors={['#0c3f44', '#1f8e93']} style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.72)']} style={StyleSheet.absoluteFill} />
          {/* Play circle */}
          <View style={r.play}>
            <Ionicons name="play" size={11} color={WHITE} style={{ paddingLeft: 1 }} />
          </View>
          {item.views > 0 && (
            <View style={r.views}>
              <Ionicons name="eye-outline" size={8} color={WHITE} />
              <Text style={r.viewsTxt}>{fmtCount(item.views)}</Text>
            </View>
          )}
        </View>
        {item.title ? <Text style={r.label} numberOfLines={2}>{item.title}</Text> : null}
      </Animated.View>
    </Pressable>
  );
});

const r = StyleSheet.create({
  thumb: {
    width: REEL_W, height: REEL_H, borderRadius: 12,
    backgroundColor: BRAND_ROW, overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
  },
  play: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1.5, borderColor: W_40,
    alignItems: 'center', justifyContent: 'center',
  },
  views: {
    position: 'absolute', bottom: 7, left: 7,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2,
  },
  viewsTxt: { color: WHITE, fontSize: 8, fontFamily: FONT_M, fontWeight: '600' },
  label: {
    color: W_70, fontSize: 11, fontFamily: FONT_M, fontWeight: '600',
    marginTop: 6, lineHeight: 15, width: REEL_W,
  },
});

// ─── List Row ─────────────────────────────────────────────────────────────────
const ListRow = memo(({ item, onPress, isLast }) => (
  <TouchableOpacity
    style={[li.row, isLast && { borderBottomWidth: 0 }]}
    activeOpacity={0.78}
    onPress={() => onPress(item)}
  >
    {/* Thumbnail */}
    <View style={li.thumb}>
      <ExpoImage source={{ uri: item.thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={220} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={StyleSheet.absoluteFill} />
      <View style={li.play}>
        <Ionicons name="play" size={10} color={WHITE} style={{ paddingLeft: 1 }} />
      </View>
    </View>

    {/* Info */}
    <View style={li.info}>
      <Text style={li.title} numberOfLines={2}>
        {item.title || item.description?.slice(0, 60) || '—'}
      </Text>
      <View style={li.meta}>
        {item.views > 0 && (
          <View style={li.metaItem}>
            <Ionicons name="eye-outline" size={10} color={W_40} />
            <Text style={li.metaTxt}>{fmtCount(item.views)} views</Text>
          </View>
        )}
        {item.time ? (
          <View style={li.metaItem}>
            <Ionicons name="time-outline" size={10} color={W_40} />
            <Text style={li.metaTxt}>{fmtTime(item.time)}</Text>
          </View>
        ) : null}
      </View>
      <View style={[li.typePill, item.type === 'reel' && li.typePillReel]}>
        <Text style={[li.typeText, item.type === 'reel' && li.typeTextReel]}>
          {item.type === 'reel' ? 'Reel' : 'Video'}
        </Text>
      </View>
    </View>

    <Ionicons name="chevron-forward" size={14} color={W_40} style={{ alignSelf: 'center' }} />
  </TouchableOpacity>
));

const li = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 12, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  thumb: {
    width: THUMB_W, height: THUMB_H, borderRadius: 9,
    backgroundColor: BRAND_ROW, overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  play: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1.5, borderColor: W_40,
    alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1, marginLeft: 12, gap: 5, justifyContent: 'center' },
  title: { color: WHITE, fontSize: 13, fontFamily: FONT_M, fontWeight: '600', lineHeight: 18 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt: { color: W_40, fontSize: 10.5, fontFamily: FONT_R },
  typePill: {
    alignSelf: 'flex-start',
    backgroundColor: W_08, borderWidth: 1, borderColor: W_14,
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginTop: 2,
  },
  typePillReel: { borderColor: a(ACCENT_LT, 0.35), backgroundColor: a(ACCENT, 0.12) },
  typeText: { color: W_40, fontSize: 10, fontFamily: FONT_M, fontWeight: '600' },
  typeTextReel: { color: ACCENT_LT },
});

// ─── Shared TV content (used inline in Home and standalone) ──────────────────
export function HafrikTVContent() {
  const { token }   = useAuth();
  const navigation  = useNavigation();
  const { bottom }  = useSafeAreaInsets();

  const [weeklyTop,   setWeeklyTop]   = useState([]);
  const [loadingTop,  setLoadingTop]  = useState(true);
  const [newVideos,   setNewVideos]   = useState([]);
  const [loadingNew,  setLoadingNew]  = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);

  useEffect(() => {
    let alive = true;
    fetchWeeklyTop(token).then((d) => { if (alive) { setWeeklyTop(d); setLoadingTop(false); } });
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
        return [...prev, ...res.videos.filter((v) => !ids.has(v.id))];
      });
      setCurrentPage(next);
      setTotalPages(res.totalPages);
    } catch {}
    setLoadingMore(false);
  }, [loadingMore, currentPage, totalPages, token]);

  // Derived: reels (portrait) — from both weekly + new, deduped
  const reelItems = useMemo(() => {
    const seen = new Set();
    return [...weeklyTop, ...newVideos]
      .filter((v) => v.type === 'reel')
      .filter((v) => { if (seen.has(v.id)) return false; seen.add(v.id); return true; });
  }, [weeklyTop, newVideos]);

  // Derived: plain videos (list)
  const videoItems = useMemo(() => {
    const seen = new Set();
    return newVideos
      .filter((v) => v.type !== 'reel')
      .filter((v) => { if (seen.has(v.id)) return false; seen.add(v.id); return true; });
  }, [newVideos]);

  // Derived: featured = weekly top deduped
  const featured = useMemo(() => {
    const seen = new Set();
    return weeklyTop.filter((v) => { if (seen.has(v.id)) return false; seen.add(v.id); return true; });
  }, [weeklyTop]);

  const handlePlay = useCallback((video) => {
    if (video.type === 'reel') {
      const reelIndex = Math.max(0, reelItems.findIndex((v) => v.id === video.id));
      navigation.navigate('HafrikTVPlayer', { video, reels: reelItems, reelIndex, related: [] });
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
    <View style={m.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} translucent={false} />

      {/* ── Scroll body ────────────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Channel hero */}
        <PageHero />

        {/* ① Featured — weekly top slider */}
        <View style={m.section}>
          <SectionHead icon="flame" label="Weekly Top" count={featured.length || undefined} accent="#ef4444" />
          <FeaturedSlider items={featured} loading={loadingTop} onPlay={handlePlay} />
        </View>

        {/* ② Reels strip */}
        {(loadingTop || reelItems.length > 0) ? (
          <View style={m.section}>
            <SectionHead icon="play-circle" label="Reels" count={reelItems.length || undefined} accent={ACCENT} />
            <FlatList
              horizontal
              data={loadingTop ? [0,1,2,3,4] : reelItems}
              keyExtractor={(v, i) => loadingTop ? `rsk-${i}` : `reel-${v.id}`}
              renderItem={({ item }) => loadingTop
                ? <Skel style={{ width: REEL_W, height: REEL_H + 40, borderRadius: 12 }} />
                : <ReelCard item={item} onPress={handlePlay} />
              }
              contentContainerStyle={{ paddingHorizontal: PAD, gap: CARD_GAP }}
              showsHorizontalScrollIndicator={false}
              snapToInterval={REEL_W + CARD_GAP}
              snapToAlignment="start"
              decelerationRate="fast"
              removeClippedSubviews
            />
          </View>
        ) : null}

        {/* ③ New on HafrikTV — vertical list */}
        <View style={m.section}>
          <SectionHead icon="add-circle" label="New on HafrikTV" accent={ACCENT_LT} />

          <View style={m.listCard}>
            {loadingNew ? (
              [0,1,2,3,4].map((i) => (
                <View key={i} style={{ flexDirection: 'row', padding: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: BORDER }}>
                  <Skel style={{ width: THUMB_W, height: THUMB_H, borderRadius: 9, flexShrink: 0 }} />
                  <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
                    <Skel style={{ height: 13, width: '85%' }} />
                    <Skel style={{ height: 11, width: '60%' }} />
                    <Skel style={{ height: 18, width: 55, borderRadius: 4 }} />
                  </View>
                </View>
              ))
            ) : videoItems.length === 0 ? (
              <View style={m.empty}>
                <Ionicons name="film-outline" size={36} color={W_40} />
                <Text style={m.emptyTxt}>No videos yet</Text>
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

          {/* Load more */}
          {!loadingNew && hasMore && (
            <TouchableOpacity
              style={m.loadMoreBtn}
              onPress={handleLoadMore}
              disabled={loadingMore}
              activeOpacity={0.75}
            >
              {loadingMore
                ? <ActivityIndicator size="small" color={ACCENT_LT} />
                : <>
                    <Text style={m.loadMoreTxt}>Load More</Text>
                    <Ionicons name="chevron-down" size={14} color={ACCENT_LT} />
                  </>
              }
            </TouchableOpacity>
          )}

          {!loadingNew && totalPages > 1 && (
            <Text style={m.pageIndicator}>Page {currentPage} of {totalPages}</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Standalone screen (accessed via stack nav) ───────────────────────────────
export default function HafrikTVScreen() {
  const navigation = useNavigation();
  return (
    <View style={{ flex: 1, backgroundColor: BRAND }}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} translucent={false} />
      <SafeAreaView edges={['top']} style={m.header}>
        <View style={m.headerInner}>
          <TouchableOpacity style={m.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Ionicons name="arrow-back" size={20} color={WHITE} />
          </TouchableOpacity>
          <View style={m.brandRow}>
            <View style={m.tvIconWrap}>
              <Ionicons name="tv" size={14} color={ACCENT_LT} />
            </View>
            <Text style={m.headerTitle}>HafrikTV</Text>
          </View>
          <View style={{ width: 34 }} />
        </View>
        <View style={m.underline} />
      </SafeAreaView>
      <HafrikTVContent />
    </View>
  );
}

// ─── Main + Section styles ────────────────────────────────────────────────────
const m = StyleSheet.create({
  root: { flex: 1, backgroundColor: BRAND },

  // Header — mirrors AppHeader exactly
  header: {
    backgroundColor: BRAND,
    zIndex: 10,
    elevation: 6,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
  },
  headerInner: {
    height: 44,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  underline: { height: 1, backgroundColor: ACCENT + '33' },
  iconBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: WHITE + '1A',
    borderWidth: 1, borderColor: WHITE + '24',
    alignItems: 'center', justifyContent: 'center',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tvIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: a(ACCENT, 0.2), borderWidth: 1, borderColor: a(ACCENT_LT, 0.35),
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: WHITE, fontSize: 17, fontFamily: FONT_B, fontWeight: '900', letterSpacing: 0.3 },

  // Section
  section: { marginTop: 24 },
  secHead: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: PAD, marginBottom: 14,
  },
  secPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 100, paddingHorizontal: 9, paddingVertical: 4,
  },
  secPillTxt: { color: WHITE, fontSize: 9, fontFamily: FONT_B, fontWeight: '900', letterSpacing: 0.8 },
  secTitle: { color: WHITE, fontSize: 18, fontFamily: FONT_B, fontWeight: '900', letterSpacing: -0.3, flex: 1 },
  secCount: { color: W_40, fontSize: 12, fontFamily: FONT_R },

  // List card
  listCard: {
    marginHorizontal: PAD,
    backgroundColor: BRAND_MID,
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER,
  },
  empty: { padding: 32, alignItems: 'center', gap: 8 },
  emptyTxt: { color: W_40, fontSize: 13, fontFamily: FONT_R },

  // Load more
  loadMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginHorizontal: PAD, marginTop: 10,
    paddingVertical: 12,
    backgroundColor: BRAND_MID, borderRadius: 12,
    borderWidth: 1, borderColor: a(ACCENT_LT, 0.35),
  },
  loadMoreTxt: { color: ACCENT_LT, fontSize: 14, fontFamily: FONT_M, fontWeight: '600' },
  pageIndicator: { textAlign: 'center', marginTop: 8, color: W_40, fontSize: 11, fontFamily: FONT_R },
});
