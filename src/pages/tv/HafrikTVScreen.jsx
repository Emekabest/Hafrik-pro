import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
const { width: W } = Dimensions.get('window');
const PAD = 16;
const HERO_W = W - 32;
const HERO_H = 232;
const REEL_W = 118;
const REEL_H = Math.round(REEL_W * 1.55);
const THUMB_W = 118;
const THUMB_H = Math.round(THUMB_W * 9 / 16);

const BRAND = Colors.primaryDark;
const ACCENT = Colors.primary;
const BG = '#F4F8F8';
const CARD = Colors.white;
const TEXT = Colors.black;
const MUTED = Colors.secondaryText;
const BORDER = Colors.borderSoft ?? Colors.borderLight ?? '#E3ECEC';
const WHITE = Colors.white;
const BLACK = Colors.black;
const GOLD = '#F2A900';
const RED = '#E5484D';

const FONT_B = AppDetails?.fontFamily?.redex?.bold ?? 'System';
const FONT_M = AppDetails?.fontFamily?.inter?.medium ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';

const cleanText = (str = '') =>
  String(str)
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const fmtCount = (n) => {
  const v = Number(n ?? 0);
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K`;
  return String(v);
};

const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const isRealImage = (url) => typeof url === 'string' && /^https?:\/\//i.test(url);

const Skeleton = memo(({ style }) => {
  const pulse = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.72, duration: 780, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 780, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[styles.skeleton, style, { opacity: pulse }]} />;
});

const SectionHeader = ({ icon, title, sub, action, tone = ACCENT }) => (
  <View style={styles.sectionHeader}>
    <View style={[styles.sectionIcon, { backgroundColor: `${tone}15` }]}>
      <Ionicons name={icon} size={15} color={tone} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {!!sub && <Text style={styles.sectionSub}>{sub}</Text>}
    </View>
    {action}
  </View>
);

const ChannelHero = memo(() => {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    getBusinessDetails(HAFRIKTV_PAGE_ID)
      .then((result) => {
        if (!alive || !result) return;
        setPage(result);
        setLiked(!!result.is_liked);
        setLikesCount(Number(result.likes ?? result.followers ?? result.followers_count ?? 0));
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const handleFollow = useCallback(async () => {
    if (likeLoading) return;
    setLikeLoading(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesCount((count) => wasLiked ? Math.max(0, count - 1) : count + 1);
    try {
      const res = await (wasLiked ? unfollowBusiness(HAFRIKTV_PAGE_ID) : followBusiness(HAFRIKTV_PAGE_ID));
      if (res?.is_liked != null) setLiked(!!res.is_liked);
      if (res?.likes != null) setLikesCount(Number(res.likes));
    } catch {
      setLiked(wasLiked);
      setLikesCount((count) => wasLiked ? count + 1 : Math.max(0, count - 1));
    } finally {
      setLikeLoading(false);
    }
  }, [liked, likeLoading]);

  if (loading) {
    return (
      <View style={styles.channelHero}>
        <Skeleton style={{ height: 132, borderRadius: 24 }} />
      </View>
    );
  }

  const name = cleanText(page?.title || page?.name || 'HafrikTV');
  const about = cleanText(page?.about || page?.description || 'Original videos, stories and helpful content from Hafrik.');
  const cover = page?.cover ?? page?.cover_image ?? null;
  const avatar = page?.avatar ?? page?.logo ?? null;

  return (
    <View style={styles.channelHero}>
      <LinearGradient colors={[BRAND, '#0C4B4F', ACCENT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.channelCard}>
        {isRealImage(cover) && (
          <ExpoImage source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
        )}
        <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.65)']} style={StyleSheet.absoluteFill} />
        <View style={styles.channelWatermark}>
          <Ionicons name="tv-outline" size={72} color="rgba(255,255,255,0.08)" />
        </View>
        <View style={styles.channelContent}>
          <View style={styles.channelAvatarWrap}>
            {isRealImage(avatar) ? (
              <ExpoImage source={{ uri: avatar }} style={styles.channelAvatar} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <View style={[styles.channelAvatar, styles.channelAvatarFallback]}>
                <Ionicons name="tv" size={26} color={WHITE} />
              </View>
            )}
          </View>
          <View style={styles.channelCopy}>
            <View style={styles.channelKicker}>
              <Ionicons name="sparkles" size={11} color={GOLD} />
              <Text style={styles.channelKickerText}>Hafrik Originals</Text>
            </View>
            <Text style={styles.channelName} numberOfLines={1}>{name}</Text>
            <Text style={styles.channelAbout} numberOfLines={2}>{about}</Text>
            <View style={styles.channelBottom}>
              <View style={styles.channelStat}>
                <Ionicons name="heart" size={12} color={liked ? RED : WHITE} />
                <Text style={styles.channelStatText}>{fmtCount(likesCount)} fans</Text>
              </View>
              <TouchableOpacity style={[styles.followButton, liked && styles.followButtonOn]} onPress={handleFollow} disabled={likeLoading} activeOpacity={0.84}>
                {likeLoading ? (
                  <ActivityIndicator size="small" color={liked ? BRAND : WHITE} />
                ) : (
                  <>
                    <Ionicons name={liked ? 'checkmark' : 'add'} size={14} color={liked ? BRAND : WHITE} />
                    <Text style={[styles.followButtonText, liked && styles.followButtonTextOn]}>{liked ? 'Following' : 'Follow'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
});

const FeaturedCard = memo(({ item, onPress }) => (
  <TouchableOpacity style={styles.featuredCard} activeOpacity={0.92} onPress={() => onPress(item)}>
    {isRealImage(item.thumbnail) ? (
      <ExpoImage source={{ uri: item.thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={250} />
    ) : (
      <LinearGradient colors={[BRAND, ACCENT]} style={StyleSheet.absoluteFill} />
    )}
    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.82)']} style={StyleSheet.absoluteFill} />
    <View style={styles.featuredTop}>
      <View style={[styles.typeBadge, item.type === 'reel' && { backgroundColor: ACCENT }]}>
        <Ionicons name={item.type === 'reel' ? 'phone-portrait-outline' : 'film-outline'} size={11} color={WHITE} />
        <Text style={styles.typeBadgeText}>{item.type === 'reel' ? 'REEL' : 'VIDEO'}</Text>
      </View>
      {item.views > 0 && (
        <View style={styles.viewsBadge}>
          <Ionicons name="eye-outline" size={11} color={WHITE} />
          <Text style={styles.viewsBadgeText}>{fmtCount(item.views)}</Text>
        </View>
      )}
    </View>
    <View style={styles.featuredBottom}>
      <Text style={styles.featuredTitle} numberOfLines={2}>{item.title || 'HafrikTV video'}</Text>
      <View style={styles.playPill}>
        <Ionicons name="play" size={12} color={BRAND} style={{ paddingLeft: 1 }} />
        <Text style={styles.playPillText}>Watch now</Text>
      </View>
    </View>
  </TouchableOpacity>
));

const ReelCard = memo(({ item, onPress }) => (
  <TouchableOpacity style={styles.reelCard} onPress={() => onPress(item)} activeOpacity={0.9}>
    <View style={styles.reelThumb}>
      {isRealImage(item.thumbnail) ? (
        <ExpoImage source={{ uri: item.thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
      ) : (
        <LinearGradient colors={[BRAND, ACCENT]} style={StyleSheet.absoluteFill} />
      )}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFill} />
      <View style={styles.reelPlay}>
        <Ionicons name="play" size={13} color={WHITE} style={{ paddingLeft: 1 }} />
      </View>
    </View>
    <Text style={styles.reelTitle} numberOfLines={2}>{item.title || 'Reel'}</Text>
  </TouchableOpacity>
));

const VideoRow = memo(({ item, onPress }) => (
  <TouchableOpacity style={styles.videoRow} onPress={() => onPress(item)} activeOpacity={0.84}>
    <View style={styles.videoThumb}>
      {isRealImage(item.thumbnail) ? (
        <ExpoImage source={{ uri: item.thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
      ) : (
        <LinearGradient colors={[BRAND, ACCENT]} style={StyleSheet.absoluteFill} />
      )}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={StyleSheet.absoluteFill} />
      <View style={styles.rowPlay}>
        <Ionicons name="play" size={10} color={WHITE} style={{ paddingLeft: 1 }} />
      </View>
    </View>
    <View style={styles.videoRowCopy}>
      <Text style={styles.videoRowTitle} numberOfLines={2}>{item.title || item.description?.slice(0, 70) || 'HafrikTV video'}</Text>
      <View style={styles.videoMetaRow}>
        {item.views > 0 && (
          <>
            <Ionicons name="eye-outline" size={11} color={MUTED} />
            <Text style={styles.videoMetaText}>{fmtCount(item.views)} views</Text>
          </>
        )}
        {!!item.time && <Text style={styles.videoMetaText}>{fmtTime(item.time)}</Text>}
      </View>
      <View style={[styles.rowTypePill, item.type === 'reel' && { borderColor: `${ACCENT}30`, backgroundColor: `${ACCENT}12` }]}>
        <Text style={styles.rowTypeText}>{item.type === 'reel' ? 'Reel' : 'Video'}</Text>
      </View>
    </View>
    <Ionicons name="chevron-forward" size={16} color={MUTED} />
  </TouchableOpacity>
));

export function HafrikTVContent() {
  const { token } = useAuth();
  const navigation = useNavigation();
  const { bottom } = useSafeAreaInsets();
  const [weeklyTop, setWeeklyTop] = useState([]);
  const [loadingTop, setLoadingTop] = useState(true);
  const [newVideos, setNewVideos] = useState([]);
  const [loadingNew, setLoadingNew] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let alive = true;
    fetchWeeklyTop(token).then((items) => {
      if (!alive) return;
      setWeeklyTop(items);
      setLoadingTop(false);
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

  const reelItems = useMemo(() => {
    const seen = new Set();
    return [...weeklyTop, ...newVideos]
      .filter((item) => item.type === 'reel')
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
  }, [weeklyTop, newVideos]);

  const videoItems = useMemo(() => {
    const seen = new Set();
    return newVideos
      .filter((item) => item.type !== 'reel')
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
  }, [newVideos]);

  const featured = useMemo(() => {
    const seen = new Set();
    return weeklyTop.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [weeklyTop]);

  const handlePlay = useCallback((video) => {
    if (video.type === 'reel') {
      const reelIndex = Math.max(0, reelItems.findIndex((item) => item.id === video.id));
      navigation.navigate('HafrikTVPlayer', { video, reels: reelItems, reelIndex, related: [] });
      return;
    }
    const seen = new Set([video.id]);
    const related = [...weeklyTop, ...newVideos]
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .slice(0, 12);
    navigation.navigate('HafrikTVPlayer', { video, related });
  }, [navigation, newVideos, reelItems, weeklyTop]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || currentPage >= totalPages) return;
    setLoadingMore(true);
    const next = currentPage + 1;
    try {
      const res = await fetchNewVideos(token, next);
      setNewVideos((prev) => {
        const ids = new Set(prev.map((item) => item.id));
        return [...prev, ...res.videos.filter((item) => !ids.has(item.id))];
      });
      setCurrentPage(next);
      setTotalPages(res.totalPages);
    } catch {}
    setLoadingMore(false);
  }, [currentPage, loadingMore, token, totalPages]);

  const hasMore = currentPage < totalPages;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottom + 84 }}>
        <ChannelHero />

        <View style={styles.section}>
          <SectionHeader icon="flame" title="Weekly Top" sub="Most watched on HafrikTV" tone={RED} />
          {loadingTop ? (
            <Skeleton style={{ width: HERO_W, height: HERO_H, marginHorizontal: PAD, borderRadius: 26 }} />
          ) : featured.length ? (
            <FlatList
              horizontal
              data={featured}
              keyExtractor={(item) => `featured-${item.id}`}
              renderItem={({ item }) => <FeaturedCard item={item} onPress={handlePlay} />}
              contentContainerStyle={styles.featuredScroll}
              showsHorizontalScrollIndicator={false}
              snapToInterval={HERO_W + 12}
              decelerationRate="fast"
            />
          ) : null}
        </View>

        {(loadingTop || reelItems.length > 0) && (
          <View style={styles.section}>
            <SectionHeader icon="phone-portrait-outline" title="Short Reels" sub="Quick stories and highlights" />
            <FlatList
              horizontal
              data={loadingTop ? [0, 1, 2, 3] : reelItems}
              keyExtractor={(item, index) => loadingTop ? `reel-skeleton-${index}` : `reel-${item.id}`}
              renderItem={({ item }) => loadingTop ? <Skeleton style={{ width: REEL_W, height: REEL_H + 40, borderRadius: 20 }} /> : <ReelCard item={item} onPress={handlePlay} />}
              contentContainerStyle={styles.reelScroll}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader icon="play-circle-outline" title="Latest Videos" sub="Fresh uploads from HafrikTV" />
          <View style={styles.latestCard}>
            {loadingNew ? (
              [0, 1, 2, 3].map((index) => (
                <View key={index} style={styles.videoRow}>
                  <Skeleton style={{ width: THUMB_W, height: THUMB_H, borderRadius: 16 }} />
                  <View style={{ flex: 1, gap: 8 }}>
                    <Skeleton style={{ width: '88%', height: 14 }} />
                    <Skeleton style={{ width: '52%', height: 11 }} />
                    <Skeleton style={{ width: 58, height: 19, borderRadius: 10 }} />
                  </View>
                </View>
              ))
            ) : videoItems.length ? (
              videoItems.map((item) => <VideoRow key={`video-${item.id}`} item={item} onPress={handlePlay} />)
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="film-outline" size={36} color={MUTED} />
                <Text style={styles.emptyTitle}>No videos yet</Text>
                <Text style={styles.emptySub}>New HafrikTV uploads will appear here.</Text>
              </View>
            )}
          </View>

          {!loadingNew && hasMore && (
            <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore} disabled={loadingMore} activeOpacity={0.82}>
              {loadingMore ? (
                <ActivityIndicator size="small" color={ACCENT} />
              ) : (
                <>
                  <Text style={styles.loadMoreText}>Load more videos</Text>
                  <Ionicons name="chevron-down" size={15} color={ACCENT} />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

export default function HafrikTVScreen() {
  const navigation = useNavigation();
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerInner}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()} activeOpacity={0.84}>
            <Ionicons name="arrow-back" size={20} color={WHITE} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>HafrikTV</Text>
            <Text style={styles.headerSub}>Watch stories from Hafrik</Text>
          </View>
          <View style={styles.headerIconGhost}>
            <Ionicons name="tv" size={18} color={WHITE} />
          </View>
        </View>
      </SafeAreaView>
      <HafrikTVContent />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  root: { flex: 1, backgroundColor: BG },
  header: {
    backgroundColor: BRAND,
    shadowColor: BLACK,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
  headerInner: {
    minHeight: 54,
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: WHITE + '18',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: WHITE + '22',
  },
  headerIconGhost: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: { color: WHITE, fontSize: 17, fontWeight: '900', fontFamily: FONT_B },
  headerSub: { color: WHITE + 'AA', fontSize: 11, marginTop: 1, fontFamily: FONT_R },

  skeleton: { backgroundColor: BRAND + '14', borderRadius: 12 },
  channelHero: { paddingTop: 0 },
  channelCard: {
    minHeight: 176,
    borderRadius: 0,
    overflow: 'hidden',
    padding: 16,
    justifyContent: 'flex-end',
  },
  channelWatermark: { position: 'absolute', right: 22, top: 18 },
  channelContent: { flexDirection: 'row', alignItems: 'flex-end', gap: 13 },
  channelAvatarWrap: {
    width: 66,
    height: 66,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: WHITE,
    overflow: 'hidden',
    backgroundColor: BRAND,
  },
  channelAvatar: { width: '100%', height: '100%' },
  channelAvatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: ACCENT },
  channelCopy: { flex: 1 },
  channelKicker: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  channelKickerText: { color: WHITE + 'D8', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: FONT_B },
  channelName: { color: WHITE, fontSize: 21, fontWeight: '900', fontFamily: FONT_B, letterSpacing: -0.4 },
  channelAbout: { color: WHITE + 'C8', fontSize: 12.5, lineHeight: 18, marginTop: 3, fontFamily: FONT_R },
  channelBottom: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 11 },
  channelStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  channelStatText: { color: WHITE + 'D8', fontSize: 12, fontWeight: '800', fontFamily: FONT_M },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  followButtonOn: { backgroundColor: WHITE },
  followButtonText: { color: WHITE, fontSize: 12, fontWeight: '900', fontFamily: FONT_B },
  followButtonTextOn: { color: BRAND },

  section: { marginTop: 22 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: PAD,
    marginBottom: 12,
  },
  sectionIcon: { width: 34, height: 34, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: TEXT, fontSize: 17, fontWeight: '900', fontFamily: FONT_B, letterSpacing: -0.3 },
  sectionSub: { color: MUTED, fontSize: 11.5, marginTop: 1, fontFamily: FONT_R },

  featuredScroll: { paddingHorizontal: PAD, gap: 12 },
  featuredCard: {
    width: HERO_W,
    height: HERO_H,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: BRAND,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 4,
  },
  featuredTop: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: BLACK + '88', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  typeBadgeText: { color: WHITE, fontSize: 10, fontWeight: '900', letterSpacing: 0.7, fontFamily: FONT_B },
  viewsBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: BLACK + '88', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  viewsBadgeText: { color: WHITE, fontSize: 10, fontWeight: '800', fontFamily: FONT_M },
  featuredBottom: { position: 'absolute', left: 14, right: 14, bottom: 14, gap: 10 },
  featuredTitle: { color: WHITE, fontSize: 18, lineHeight: 24, fontWeight: '900', fontFamily: FONT_B },
  playPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: WHITE, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  playPillText: { color: BRAND, fontSize: 12, fontWeight: '900', fontFamily: FONT_B },

  reelScroll: { paddingHorizontal: PAD, gap: 11 },
  reelCard: { width: REEL_W },
  reelThumb: { width: REEL_W, height: REEL_H, borderRadius: 22, overflow: 'hidden', backgroundColor: BRAND },
  reelPlay: { position: 'absolute', left: 10, bottom: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: BLACK + '77', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: WHITE + '55' },
  reelTitle: { color: TEXT, fontSize: 12, fontWeight: '800', marginTop: 8, lineHeight: 16, fontFamily: FONT_M },

  latestCard: { marginHorizontal: PAD, backgroundColor: CARD, borderRadius: 26, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  videoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  videoThumb: { width: THUMB_W, height: THUMB_H, borderRadius: 16, overflow: 'hidden', backgroundColor: BRAND },
  rowPlay: { position: 'absolute', alignSelf: 'center', top: '50%', marginTop: -13, width: 26, height: 26, borderRadius: 13, backgroundColor: BLACK + '77', alignItems: 'center', justifyContent: 'center' },
  videoRowCopy: { flex: 1, gap: 5 },
  videoRowTitle: { color: TEXT, fontSize: 13.5, lineHeight: 19, fontWeight: '900', fontFamily: FONT_B },
  videoMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  videoMetaText: { color: MUTED, fontSize: 11, fontFamily: FONT_R },
  rowTypePill: { alignSelf: 'flex-start', borderWidth: 1, borderColor: BORDER, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: BG },
  rowTypeText: { color: ACCENT, fontSize: 10, fontWeight: '900', fontFamily: FONT_B },
  loadMoreButton: { marginHorizontal: PAD, marginTop: 12, borderRadius: 999, borderWidth: 1, borderColor: `${ACCENT}35`, backgroundColor: `${ACCENT}10`, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  loadMoreText: { color: ACCENT, fontSize: 13, fontWeight: '900', fontFamily: FONT_B },
  emptyState: { paddingVertical: 40, alignItems: 'center', gap: 8 },
  emptyTitle: { color: TEXT, fontSize: 15, fontWeight: '900', fontFamily: FONT_B },
  emptySub: { color: MUTED, fontSize: 12, fontFamily: FONT_R },
});
