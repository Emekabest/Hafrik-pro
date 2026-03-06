/**
 * ReelsGridView
 * ─────────────
 * 2-column grid of reel thumbnails shown when the "Reels" tab is active
 * on the home feed. Each card shows: thumbnail, play overlay, caption,
 * avatar, username, and like count.
 *
 * Supports infinite scroll pagination and pull-to-refresh.
 */
import React, { memo, useCallback, useMemo } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../../theme/colors';
import AppDetails from '../../../helpers/appdetails';

// ─── Tokens ──────────────────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
const H_PAD   = 12;
const GAP     = 8;
const COL     = 2;
const CARD_W  = (SCREEN_W - H_PAD * 2 - GAP * (COL - 1)) / COL;
const THUMB_H = Math.round(CARD_W * 1.4);                   // ~9:16-ish portrait

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const MUTED  = Colors.secondaryText;
const WHITE  = Colors.white;

const FONT_B = AppDetails?.fontFamily?.redex?.bold ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';
const FONT_M = AppDetails?.fontFamily?.inter?.medium ?? 'System';

const DEFAULT_AVATAR =
  'https://hafrik.com/assets/images/default_avatar.png';

// ─── Helpers ─────────────────────────────────────────────────────────────────
/** Decode common HTML entities */
const decodeHtml = (str) => {
  if (!str || typeof str !== 'string') return str ?? '';
  const entities = {
    '&rsquo;': '\u2019', '&lsquo;': '\u2018', '&rdquo;': '\u201D',
    '&ldquo;': '\u201C', '&amp;': '&', '&lt;': '<', '&gt;': '>',
    '&quot;': '"', '&apos;': "'", '&#39;': "'", '&ndash;': '\u2013',
    '&mdash;': '\u2014', '&hellip;': '\u2026', '&nbsp;': ' ',
  };
  let out = str;
  for (const [ent, ch] of Object.entries(entities)) out = out.split(ent).join(ch);
  out = out.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  out = out.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  return out.replace(/<[^>]*>/g, '').trim();
};

const fmtCount = (n) => {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
};

// ─── Reel Card ───────────────────────────────────────────────────────────────
const ReelCard = memo(({ item, index, onPress }) => {
  const user = item?.user ?? {};
  const media = item?.media?.[0];
  const thumbnail =
    media?.thumbnail?.startsWith('http') ? media.thumbnail
    : media?.url?.startsWith('http') ? media.url
    : null;

  const avatar = user.avatar?.startsWith('http') ? user.avatar : DEFAULT_AVATAR;
  const username = user.username ?? 'User';
  const caption = decodeHtml(item?.text || item?.description || '');
  const likes = item?.likes_count ?? 0;
  const isVideo = !!(media?.video_url);

  const handlePress = useCallback(() => {
    onPress?.(item, index);
  }, [item, index, onPress]);

  return (
    <TouchableOpacity
      style={[styles.card, index % 2 === 0 ? styles.cardLeft : styles.cardRight]}
      activeOpacity={0.88}
      onPress={handlePress}
    >
      {/* ── Thumbnail ── */}
      <View style={styles.thumbWrap}>
        {thumbnail ? (
          <ExpoImage
            source={{ uri: thumbnail }}
            style={styles.thumb}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={`reel-thumb-${item?.id}`}
          />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Ionicons name="film-outline" size={32} color={MUTED} />
          </View>
        )}

        {/* Gradient scrim at bottom of thumbnail */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)']}
          style={styles.thumbGradient}
        />

        {/* Play icon overlay */}
        {isVideo && (
          <View style={styles.playBadge}>
            <Ionicons name="play" size={13} color={WHITE} />
          </View>
        )}

        {/* Like count on thumbnail */}
        <View style={styles.likeOverlay}>
          <Ionicons name="heart" size={12} color={Colors.warningPink} />
          <Text style={styles.likeOverlayText}>{fmtCount(likes)}</Text>
        </View>
      </View>

      {/* ── Info area ── */}
      <View style={styles.infoArea}>
        <View style={styles.userRow}>
          <ExpoImage
            source={{ uri: avatar }}
            style={styles.avatar}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          <Text style={styles.username} numberOfLines={1}>
            {username}
          </Text>
        </View>
        {caption ? (
          <Text style={styles.caption} numberOfLines={2}>
            {caption}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

// ─── Footer loader ───────────────────────────────────────────────────────────
const ListFooter = memo(({ loading }) =>
  loading ? (
    <View style={styles.footer}>
      <ActivityIndicator color={ACCENT} size="small" />
    </View>
  ) : null,
);

// ─── Empty state ─────────────────────────────────────────────────────────────
const EmptyState = memo(() => (
  <View style={styles.emptyWrap}>
    <Ionicons name="film-outline" size={52} color={Colors.mutedBlueGray} />
    <Text style={styles.emptyTitle}>No reels yet</Text>
    <Text style={styles.emptySub}>Check back later for new content</Text>
  </View>
));

// ─── Main Component ──────────────────────────────────────────────────────────
const ReelsGridView = ({
  feeds,
  refreshing,
  onRefresh,
  onEndReached,
  loadingMore,
}) => {
  const navigation = useNavigation();

  // Filter to reels only (safety net — API should only return reels)
  const reels = useMemo(
    () => feeds.filter(f => f && (f.type === 'reel' || f.media?.[0]?.video_url)),
    [feeds],
  );

  const handleReelPress = useCallback(
    (item, index) => {
      navigation.navigate('Reels2', {
        initialReels: reels,
        startIndex: index,
        initialReelId: item?.id,
      });
    },
    [navigation, reels],
  );

  const renderItem = useCallback(
    ({ item, index }) => (
      <ReelCard item={item} index={index} onPress={handleReelPress} />
    ),
    [handleReelPress],
  );

  const keyExtractor = useCallback((item, index) => {
    return item?.id ? `reel-${item.id}` : `reel-idx-${index}`;
  }, []);

  return (
    <FlatList
      data={reels}
      numColumns={COL}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      ListFooterComponent={<ListFooter loading={loadingMore} />}
      ListEmptyComponent={!refreshing ? <EmptyState /> : null}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={ACCENT}
          colors={[ACCENT]}
        />
      }
      removeClippedSubviews
      maxToRenderPerBatch={8}
      windowSize={7}
      initialNumToRender={6}
    />
  );
};

export default memo(ReelsGridView);

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 10,
    paddingBottom: 40,
  },

  /* ── Card ── */
  card: {
    width: CARD_W,
    marginBottom: GAP,
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardLeft: {
    marginRight: GAP / 2,
  },
  cardRight: {
    marginLeft: GAP / 2,
  },

  /* ── Thumbnail ── */
  thumbWrap: {
    width: '100%',
    height: THUMB_H,
    backgroundColor: Colors.neutral150,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neutral180,
  },
  thumbGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 50,
  },

  /* ── Play badge ── */
  playBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Like overlay on thumb ── */
  likeOverlay: {
    position: 'absolute',
    bottom: 7,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  likeOverlayText: {
    color: WHITE,
    fontSize: 11,
    fontFamily: FONT_B,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  /* ── Info area ── */
  infoArea: {
    padding: 10,
    paddingTop: 8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 4,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.neutral200,
  },
  username: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONT_M,
    color: Colors.neutral750,
    fontWeight: '700',
  },
  caption: {
    fontSize: 12,
    fontFamily: FONT_R,
    color: Colors.mutedText,
    lineHeight: 16,
  },

  /* ── Footer ── */
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  /* ── Empty state ── */
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: FONT_B,
    color: Colors.neutral750,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 13,
    fontFamily: FONT_R,
    color: MUTED,
  },
});
