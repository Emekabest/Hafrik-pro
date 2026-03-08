// src/pages/events/EventDetailScreen.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Share,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../AuthContext';
import { fetchEventFeed } from './eventsApi';
import { Colors } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const COVER_H = SCREEN_H * 0.38;

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const WARM   = Colors.warm;
const MUTED  = Colors.secondaryText;
const DARK   = Colors.black;
const CREAM  = Colors.background;
const BORDER = BRAND + '17';
const WHITE  = Colors.white;

const STATUS_CONFIG = {
  upcoming: { label: 'Upcoming', bg: BRAND,  icon: 'calendar-outline' },
  ongoing:  { label: 'Ongoing',  bg: ACCENT, icon: 'radio-button-on' },
  past:     { label: 'Past',     bg: MUTED,  icon: 'checkmark-circle-outline' },
};

const formatNum = (n) => {
  const num = Number(n || 0);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return String(num);
};

const formatDate = (start, end) => {
  if (!start) return '';
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const s = new Date(start).toLocaleDateString('en-US', opts);
  if (!end) return s;
  const e = new Date(end);
  const sDate = new Date(start);
  if (sDate.toDateString() === e.toDateString()) {
    const timeOpts = { hour: 'numeric', minute: '2-digit' };
    return `${s}, ${new Date(start).toLocaleTimeString('en-US', timeOpts)} – ${e.toLocaleTimeString('en-US', timeOpts)}`;
  }
  return `${s} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// ─── Post Card ────────────────────────────────────────────────────────────────
const PostCard = ({ post }) => {
  const [liked, setLiked] = useState(post.is_liked ?? false);
  const [likes, setLikes] = useState(post.likes_count ?? 0);

  const handleLike = () => {
    setLiked(p => !p);
    setLikes(p => liked ? Math.max(0, p - 1) : p + 1);
  };

  const images = (post.media ?? []).filter(m => m.type === 'image');
  const displayName = post.user?.full_name || post.user?.username || 'Hafrik User';
  const isDefaultAvatar = !post.user?.avatar ||
    String(post.user.avatar).includes('blank_profile');

  return (
    <View style={styles.postCard}>
      {/* User row */}
      <View style={styles.postHeader}>
        {!isDefaultAvatar ? (
          <Image source={{ uri: post.user.avatar }} style={styles.postAvatar} />
        ) : (
          <View style={[styles.postAvatar, styles.avatarFallback]}>
            <Text style={{ fontSize: 18 }}>👤</Text>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.postName} numberOfLines={1}>{displayName}</Text>
            {post.user?.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={8} color={WHITE} />
              </View>
            )}
          </View>
          <Text style={styles.postTime}>{timeAgo(post.created_at)}</Text>
        </View>
      </View>

      {/* Text */}
      {!!post.text && (
        <Text style={styles.postText}>{post.text}</Text>
      )}

      {/* Images */}
      {images.length > 0 && (
        <View style={styles.postImagesWrap}>
          {images.length === 1 ? (
            <Image source={{ uri: images[0].url }} style={styles.postImageSingle} resizeMode="cover" />
          ) : (
            <View style={styles.postImageGrid}>
              {images.slice(0, 4).map((img, idx) => (
                <View key={idx} style={[styles.postImageGridItem, images.length === 2 && { width: '49%' }]}>
                  <Image source={{ uri: img.url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  {idx === 3 && images.length > 4 && (
                    <View style={styles.moreOverlay}>
                      <Text style={styles.moreTxt}>+{images.length - 4}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Engagement bar */}
      <View style={styles.engBar}>
        <TouchableOpacity style={styles.engBtn} onPress={handleLike} activeOpacity={0.8}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={17}
            color={liked ? Colors.warning : MUTED}
          />
          <Text style={[styles.engBtnTxt, liked && { color: Colors.warning }]}>
            {formatNum(likes)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.engBtn} activeOpacity={0.8}>
          <Ionicons name="chatbubble-outline" size={16} color={MUTED} />
          <Text style={styles.engBtnTxt}>{formatNum(post.comments_count)}</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <View style={styles.viewsRow}>
          <Ionicons name="eye-outline" size={14} color={MUTED} />
          <Text style={styles.viewsTxt}>{formatNum(post.views)}</Text>
        </View>
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function EventDetailScreen({ navigation, route }) {
  const event = route.params?.event ?? {};
  const { token } = useAuth();
  const { top, bottom } = useSafeAreaInsets();
  const { colors: tc } = useTheme();

  const [posts,       setPosts]       = useState([]);
  const [feedPage,    setFeedPage]    = useState(1);
  const [feedHasMore, setFeedHasMore] = useState(true);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  const status = event.status ?? 'upcoming';
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.upcoming;

  // ─── Feed fetch ─────────────────────────────────────────────────────────────
  const loadFeed = useCallback(async (pageNum, replace) => {
    if (!event.id) { setFeedLoading(false); return; }
    try {
      const res = await fetchEventFeed(event.id, { page: pageNum, limit: 10 }, token);
      const items = res?.data ?? [];
      setPosts(prev => replace ? items : [...prev, ...items]);
      setFeedHasMore(items.length >= 10);
      setFeedPage(pageNum);
    } catch {
      // silently fail; show empty state
    } finally {
      setFeedLoading(false);
      setFeedLoadingMore(false);
    }
  }, [event.id, token]);

  useEffect(() => { loadFeed(1, true); }, [loadFeed]);

  const onFeedEndReached = useCallback(() => {
    if (!feedHasMore || feedLoadingMore || feedLoading) return;
    setFeedLoadingMore(true);
    loadFeed(feedPage + 1, false);
  }, [feedHasMore, feedLoadingMore, feedLoading, feedPage, loadFeed]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `${event.title ?? 'Event'}\n${event.link ?? ''}`,
        url: event.link,
      });
    } catch {}
  }, [event]);

  // ─── Header opacity for sticky bar ──────────────────────────────────────────
  const headerOpacity = scrollY.interpolate({
    inputRange: [COVER_H * 0.5, COVER_H * 0.85],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // ─── List header (event details) ─────────────────────────────────────────────
  const EventHeader = (
    <View>
      {/* Cover */}
      <View style={[styles.coverWrap, { height: COVER_H }]}>
        {event.cover ? (
          <Image source={{ uri: event.cover }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <LinearGradient colors={Colors.gradientPrimary} style={StyleSheet.absoluteFill} />
        )}

        <LinearGradient
          colors={[DARK + '85', 'transparent', DARK + 'B8']}
          style={StyleSheet.absoluteFill}
        />

        {/* Overlay buttons */}
        <View style={[styles.coverBtns, { paddingTop: top + 8 }]}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={DARK} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.circleBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color={DARK} />
          </TouchableOpacity>
        </View>

        {/* Status badge on cover */}
        <View style={styles.coverBadgeWrap}>
          <View style={[styles.coverBadge, { backgroundColor: statusCfg.bg }]}>
            <Ionicons name={statusCfg.icon} size={12} color={WHITE} />
            <Text style={styles.coverBadgeTxt}>{statusCfg.label}</Text>
          </View>
          {event.is_online && (
            <View style={[styles.coverBadge, { backgroundColor: WHITE + 'F2' }]}>
              <Ionicons name="globe-outline" size={12} color={ACCENT} />
              <Text style={[styles.coverBadgeTxt, { color: ACCENT }]}>Online</Text>
            </View>
          )}
          {event.is_sponsored && (
            <View style={[styles.coverBadge, { backgroundColor: WARM }]}>
              <Ionicons name="star" size={12} color={WHITE} />
              <Text style={styles.coverBadgeTxt}>Sponsored</Text>
            </View>
          )}
        </View>
      </View>

      {/* Content card */}
      <View style={styles.contentCard}>
        {/* Category */}
        {!!event.category_name && (
          <View style={styles.catPill}>
            <Text style={styles.catPillTxt}>{event.category_name}</Text>
          </View>
        )}

        {/* Title */}
        <Text style={styles.eventTitle}>{event.title ?? 'Event'}</Text>

        {/* Engagement pills */}
        <View style={styles.engPills}>
          <View style={styles.engPill}>
            <Ionicons name="people" size={14} color={BRAND} />
            <Text style={styles.engPillNum}>{formatNum(event.going)}</Text>
            <Text style={styles.engPillLabel}>Going</Text>
          </View>
          <View style={styles.engPillDivider} />
          <View style={styles.engPill}>
            <Ionicons name="heart" size={14} color={WARM} />
            <Text style={styles.engPillNum}>{formatNum(event.interested)}</Text>
            <Text style={styles.engPillLabel}>Interested</Text>
          </View>
        </View>

        {/* Info rows */}
        <View style={styles.infoCard}>
          {/* Date */}
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: `${BRAND}12` }]}>
              <Ionicons name="calendar-outline" size={16} color={BRAND} />
            </View>
            <Text style={styles.infoTxt}>{formatDate(event.start_date, event.end_date)}</Text>
          </View>

          {/* Location */}
          {(!!event.location || !!event.country) && (
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: `${ACCENT}12` }]}>
                <Ionicons name="location-outline" size={16} color={ACCENT} />
              </View>
              <Text style={styles.infoTxt}>
                {[event.location, event.country].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}

          {/* Online */}
          {event.is_online && (
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: `${ACCENT}12` }]}>
                <Ionicons name="globe-outline" size={16} color={ACCENT} />
              </View>
              <Text style={styles.infoTxt}>This is an online event</Text>
            </View>
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtnPrimary} activeOpacity={0.85}>
            <Ionicons name="checkmark-circle-outline" size={18} color={WHITE} />
            <Text style={styles.actionBtnPrimaryTxt}>Going</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnSecondary} activeOpacity={0.85}>
            <Ionicons name="heart-outline" size={18} color={BRAND} />
            <Text style={styles.actionBtnSecondaryTxt}>Interested</Text>
          </TouchableOpacity>
          {!!event.link && (
            <TouchableOpacity style={styles.actionBtnIcon} activeOpacity={0.85} onPress={handleShare}>
              <Ionicons name="share-outline" size={20} color={BRAND} />
            </TouchableOpacity>
          )}
        </View>

        {/* Feed section header */}
        <View style={styles.feedHeader}>
          <View style={styles.feedHeaderLeft}>
            <Ionicons name="chatbubbles-outline" size={18} color={BRAND} />
            <Text style={styles.feedHeaderTxt}>Community Feed</Text>
          </View>
          <Text style={styles.feedHeaderSub}>Posts from this event</Text>
        </View>
      </View>
    </View>
  );

  const FeedFooter = () =>
    feedLoadingMore ? (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={BRAND} />
      </View>
    ) : null;

  const FeedEmpty = () => (
    <View style={styles.feedEmpty}>
      {feedLoading ? (
        <ActivityIndicator size="large" color={BRAND} />
      ) : (
        <>
          <Ionicons name="chatbubble-ellipses-outline" size={46} color={MUTED} />
          <Text style={styles.feedEmptyTxt}>No posts yet</Text>
          <Text style={styles.feedEmptySub}>Be the first to post in this event!</Text>
        </>
      )}
    </View>
  );

  // ─── Sticky top bar (appears after scrolling past cover) ────────────────────
  return (
    <View style={[styles.root, { backgroundColor: tc.background }]}>
      {/* Sticky transparent → solid top bar */}
      <Animated.View
        style={[styles.stickyBar, { paddingTop: top + 4, opacity: headerOpacity }]}
        pointerEvents="none"
      >
        <Text style={styles.stickyTitle} numberOfLines={1}>{event.title ?? 'Event'}</Text>
      </Animated.View>

      <Animated.FlatList
        data={posts}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => <PostCard post={item} />}
        contentContainerStyle={[styles.feedList, { paddingBottom: bottom + 30 }]}
        showsVerticalScrollIndicator={false}
        onEndReached={onFeedEndReached}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={EventHeader}
        ListFooterComponent={FeedFooter}
        ListEmptyComponent={FeedEmpty}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },

  // Sticky bar
  stickyBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50,
    backgroundColor: BRAND,
    paddingHorizontal: 20, paddingBottom: 12, alignItems: 'center',
  },
  stickyTitle: { fontSize: 15, fontWeight: '800', color: WHITE },

  // Cover
  coverWrap: { width: SCREEN_W, position: 'relative', overflow: 'hidden' },
  coverBtns: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, zIndex: 10,
  },
  circleBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: WHITE + 'F0',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.black, shadowOpacity: 0.12, shadowRadius: 8, elevation: 6,
  },
  coverBadgeWrap: {
    position: 'absolute', bottom: 14, left: 14,
    flexDirection: 'row', gap: 6,
  },
  coverBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  coverBadgeTxt: { fontSize: 11, fontWeight: '800', color: WHITE },

  // Content card
  contentCard: {
    backgroundColor: CREAM,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    marginTop: -22, paddingTop: 22, paddingHorizontal: 18,
  },
  catPill: {
    alignSelf: 'flex-start',
    backgroundColor: `${ACCENT}18`, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10,
  },
  catPillTxt: { fontSize: 11, fontWeight: '900', color: BRAND },

  eventTitle: {
    fontSize: 26, fontWeight: '900', color: DARK, lineHeight: 34, marginBottom: 16,
  },

  // Engagement pills
  engPills: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WHITE, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    paddingVertical: 14, paddingHorizontal: 10,
    marginBottom: 16, gap: 0,
  },
  engPill: { flex: 1, alignItems: 'center', gap: 4, flexDirection: 'row', justifyContent: 'center' },
  engPillDivider: { width: 1, height: 24, backgroundColor: BORDER },
  engPillNum: { fontSize: 18, fontWeight: '900', color: DARK },
  engPillLabel: { fontSize: 12, color: MUTED, fontWeight: '600' },

  // Info card
  infoCard: {
    backgroundColor: WHITE, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, paddingVertical: 6, marginBottom: 16, gap: 2,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10,
  },
  infoIcon: {
    width: 34, height: 34, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  infoTxt: { fontSize: 13.5, color: DARK, flex: 1, lineHeight: 19 },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  actionBtnPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: BRAND, borderRadius: 14, paddingVertical: 13,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22, shadowRadius: 12, elevation: 8,
  },
  actionBtnPrimaryTxt: { color: WHITE, fontWeight: '800', fontSize: 14 },
  actionBtnSecondary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: WHITE, borderRadius: 14, paddingVertical: 13,
    borderWidth: 1.5, borderColor: BRAND,
  },
  actionBtnSecondaryTxt: { color: BRAND, fontWeight: '800', fontSize: 14 },
  actionBtnIcon: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: WHITE, borderWidth: 1.5, borderColor: BORDER,
    justifyContent: 'center', alignItems: 'center',
  },

  // Feed section header
  feedHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
    paddingTop: 4,
  },
  feedHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  feedHeaderTxt: { fontSize: 17, fontWeight: '900', color: DARK },
  feedHeaderSub: { fontSize: 11.5, color: MUTED },

  // Feed list
  feedList: { paddingHorizontal: 0 },
  feedEmpty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 24, gap: 8 },
  feedEmptyTxt: { fontSize: 17, fontWeight: '800', color: DARK },
  feedEmptySub: { fontSize: 13, color: MUTED, textAlign: 'center' },

  // Post card
  postCard: {
    backgroundColor: WHITE, marginHorizontal: 14, marginBottom: 10,
    borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: Colors.black, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  postAvatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: {
    backgroundColor: `${BRAND}12`,
    justifyContent: 'center', alignItems: 'center',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  postName: { fontSize: 13.5, fontWeight: '800', color: DARK },
  verifiedBadge: {
    width: 15, height: 15, borderRadius: 8,
    backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center',
  },
  postTime: { fontSize: 11, color: MUTED, marginTop: 2 },
  postText: { fontSize: 14, color: DARK, lineHeight: 21, marginBottom: 10 },

  // Post images
  postImagesWrap: { borderRadius: 12, overflow: 'hidden', marginBottom: 10 },
  postImageSingle: { width: '100%', height: 220, backgroundColor: `${BRAND}12` },
  postImageGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 2,
  },
  postImageGridItem: {
    width: '49%', aspectRatio: 1,
    backgroundColor: `${BRAND}12`, position: 'relative', overflow: 'hidden',
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DARK + '99',
    justifyContent: 'center', alignItems: 'center',
  },
  moreTxt: { fontSize: 22, fontWeight: '900', color: WHITE },

  // Engagement bar
  engBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: BORDER,
  },
  engBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: `${BRAND}07`,
  },
  engBtnTxt: { fontSize: 12, fontWeight: '700', color: MUTED },
  viewsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewsTxt: { fontSize: 11, color: MUTED },
});
