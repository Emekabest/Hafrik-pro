import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl, ActivityIndicator,
  StatusBar, Dimensions,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import { getSavedPosts } from '../../api/feedApi';
import AppDetails from '../../helpers/appdetails';
import { Colors } from '../../theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const WHITE  = Colors.white;
const DARK   = Colors.black;
const MUTED  = Colors.secondaryText;
const BG     = Colors.surfaceTint ?? '#F4F5FB';

const FONT_B = AppDetails?.fontFamily?.redex?.bold      ?? 'System';
const FONT_M = AppDetails?.fontFamily?.inter?.medium    ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular   ?? 'System';

const LIMIT = 10;

// ─── Type badge config ────────────────────────────────────────────────────────
const TYPE_META = {
  article: { label: 'Article',  icon: 'newspaper-outline',   color: '#6366F1' },
  reel:    { label: 'Reel',     icon: 'flame-outline',       color: '#EF4444' },
  video:   { label: 'Video',    icon: 'videocam-outline',    color: '#0EA5E9' },
  photos:  { label: 'Photos',   icon: 'images-outline',      color: '#10B981' },
  product: { label: 'Product',  icon: 'bag-handle-outline',  color: '#F59E0B' },
  event_cover: { label: 'Event', icon: 'calendar-outline',   color: '#8B5CF6' },
};

const getTypeMeta = (type) =>
  TYPE_META[(type || '').toLowerCase()] ??
  { label: 'Post', icon: 'document-text-outline', color: ACCENT };

// ─── Thumbnail helper — pick best image from a feed item ─────────────────────
const getThumb = (item) => {
  if (item?.media?.[0]?.thumbnail) return item.media[0].thumbnail;
  if (item?.media?.[0]?.url)       return item.media[0].url;
  if (item?.thumbnail)             return item.thumbnail;
  if (item?.cover)                 return item.cover;
  if (item?.image)                 return item.image;
  if (item?.payload?.image)        return item.payload.image;
  return null;
};

// ─── Single saved post card ───────────────────────────────────────────────────
const SavedPostCard = ({ item, onPress, onUnsave }) => {
  const thumb    = getThumb(item);
  const typeMeta = getTypeMeta(item.type);
  const author   = item.user?.full_name || item.user?.username || 'Unknown';
  const avatar   = item.user?.avatar;
  const text     = (item.text || item.body || '').replace(/<[^>]+>/g, '').trim();

  return (
    <TouchableOpacity
      style={card.wrap}
      activeOpacity={0.88}
      onPress={() => onPress(item)}
    >
      {/* Thumbnail */}
      {!!thumb && (
        <ExpoImage
          source={{ uri: thumb }}
          style={card.thumb}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      )}

      <View style={card.body}>
        {/* Author row */}
        <View style={card.authorRow}>
          {avatar ? (
            <ExpoImage
              source={{ uri: avatar }}
              style={card.avatar}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[card.avatar, card.avatarFallback]}>
              <Ionicons name="person" size={12} color={WHITE} />
            </View>
          )}
          <Text style={card.authorName} numberOfLines={1}>{author}</Text>

          {/* Type badge */}
          <View style={[card.typeBadge, { backgroundColor: typeMeta.color + '18' }]}>
            <Ionicons name={typeMeta.icon} size={11} color={typeMeta.color} />
            <Text style={[card.typeLabel, { color: typeMeta.color }]}>{typeMeta.label}</Text>
          </View>
        </View>

        {/* Post text */}
        {!!text && (
          <Text style={card.postText} numberOfLines={3}>{text}</Text>
        )}

        {/* Bottom row */}
        <View style={card.bottomRow}>
          <View style={card.openHint}>
            <Ionicons name="arrow-forward-circle-outline" size={14} color={ACCENT} />
            <Text style={card.openHintText}>Open</Text>
          </View>
          <TouchableOpacity
            style={card.unsaveBtn}
            onPress={() => onUnsave(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="bookmark" size={16} color={ACCENT} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const card = StyleSheet.create({
  wrap: {
    backgroundColor: WHITE,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  thumb: {
    width: '100%',
    height: 180,
    backgroundColor: BG,
  },
  body: {
    padding: 14,
    gap: 8,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ACCENT + '33',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
  },
  authorName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: DARK,
    fontFamily: FONT_B,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: FONT_B,
  },
  postText: {
    fontSize: 13.5,
    color: DARK,
    lineHeight: 20,
    fontFamily: FONT_R,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  openHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openHintText: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: '600',
    fontFamily: FONT_M,
  },
  unsaveBtn: {
    padding: 4,
  },
});

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = () => (
  <View style={empty.wrap}>
    <View style={empty.iconWrap}>
      <Ionicons name="bookmark-outline" size={40} color={ACCENT + '88'} />
    </View>
    <Text style={empty.title}>No saved posts yet</Text>
    <Text style={empty.sub}>
      Tap the bookmark icon on any post to save it here for later.
    </Text>
  </View>
);

const empty = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: ACCENT + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: DARK,
    fontFamily: FONT_B,
    marginBottom: 8,
    textAlign: 'center',
  },
  sub: {
    fontSize: 13.5,
    color: MUTED,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: FONT_R,
  },
});

// ─── SavedPostsScreen ─────────────────────────────────────────────────────────
const SavedPostsScreen = () => {
  const navigation   = useNavigation();
  const { token }    = useAuth();
  const insets       = useSafeAreaInsets();

  const [posts,        setPosts]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [hasMore,      setHasMore]      = useState(true);
  const [error,        setError]        = useState('');

  const pageRef = useRef(1);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchPosts = useCallback(async (page = 1, append = false) => {
    try {
      const json = await getSavedPosts(token, page, LIMIT);
      const items =
  json?.data?.data ??
  json?.data ??
  json?.posts ??
  json?.items ??
  (Array.isArray(json) ? json : []);

      setPosts(prev => append ? [...prev, ...items] : items);
      setHasMore(items.length >= LIMIT);
      pageRef.current = page;
      setError('');
    } catch (err) {
      setError(err?.message || 'Failed to load saved posts.');
    }
  }, [token]);

  useEffect(() => {
    setLoading(true);
    fetchPosts(1, false).finally(() => setLoading(false));
  }, [fetchPosts]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts(1, false);
    setRefreshing(false);
  }, [fetchPosts]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchPosts(pageRef.current + 1, true);
    setLoadingMore(false);
  }, [loadingMore, hasMore, fetchPosts]);

  // ── Navigation on press ───────────────────────────────────────────────────
  const handlePress = useCallback((item) => {
    const type = (item.type || '').toLowerCase();

    if (type === 'article') {
      navigation.navigate('ArticleDetails', {
        postId: item.id,
        title:  item.payload?.title ?? item.title,
      });
      return;
    }

    const isReel =
      type === 'reel' ||
      (type === 'video' && item.media?.[0]?.video_url && !item.media?.[0]?.url);

    if (isReel) {
      navigation.navigate('Reels2', {
        initialReels:  [item],
        startIndex:    0,
        initialReelId: item.id,
      });
      return;
    }

    navigation.navigate('PostDetail', { postId: item.id });
  }, [navigation]);

  // ── Unsave (remove from list optimistically) ──────────────────────────────
  const handleUnsave = useCallback((item) => {
    setPosts(prev => prev.filter(p => p.id !== item.id));
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  const renderItem = useCallback(({ item }) => (
    <SavedPostCard item={item} onPress={handlePress} onUnsave={handleUnsave} />
  ), [handlePress, handleUnsave]);

  const keyExtractor = useCallback((item) => String(item.id), []);

  const renderFooter = () =>
    loadingMore ? (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={ACCENT} />
      </View>
    ) : null;

  return (
    <View style={[styles.screen, { paddingTop: 0 }]}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <LinearGradient
        colors={[BRAND, ACCENT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        {/* Decorative blob */}
        <View style={styles.blob} />

        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={20} color={WHITE} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Ionicons name="bookmark" size={18} color={WHITE + 'CC'} />
            <Text style={styles.headerTitle}>Saved Posts</Text>
          </View>

          <View style={{ width: 38 }} />
        </View>

        <Text style={styles.headerSub}>
          {posts.length > 0 ? `${posts.length} saved item${posts.length !== 1 ? 's' : ''}` : 'Your bookmarked posts'}
        </Text>
      </LinearGradient>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Loading saved posts…</Text>
        </View>
      ) : error ? (
        <View style={styles.errorWrap}>
          <Ionicons name="cloud-offline-outline" size={40} color={MUTED} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => { setLoading(true); fetchPosts(1, false).finally(() => setLoading(false)); }}
            activeOpacity={0.8}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListEmptyComponent={<EmptyState />}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={ACCENT}
              colors={[ACCENT, BRAND]}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            posts.length === 0 && { flex: 1 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },

  // ── Header ──
  header: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: WHITE + '0F',
    top: -60,
    right: -50,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: WHITE + '20',
    borderWidth: 1,
    borderColor: WHITE + '28',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: WHITE,
    fontFamily: FONT_B,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: WHITE + '99',
    fontFamily: FONT_R,
    marginTop: 2,
  },

  // ── List ──
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 40,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  // ── Loading ──
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: MUTED,
    fontFamily: FONT_R,
  },

  // ── Error ──
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    fontFamily: FONT_R,
  },
  retryBtn: {
    paddingVertical: 11,
    paddingHorizontal: 28,
    borderRadius: 14,
    backgroundColor: ACCENT,
    marginTop: 4,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    color: WHITE,
    fontFamily: FONT_B,
  },
});

export default SavedPostsScreen;
