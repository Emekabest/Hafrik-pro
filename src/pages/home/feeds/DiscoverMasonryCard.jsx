/**
 * DiscoverMasonryCard
 * Three variants: image · reel · text
 * Dynamic image height. Footer shows reactions + views.
 */
import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../../theme/colors';
import AppDetails from '../../../helpers/appdetails';

// ─── Dimensions ───────────────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
export const MASONRY_H_PAD  = 6;    // left/right padding on the row container
export const MASONRY_COL_GAP = 5;   // gap between the two columns
export const MASONRY_CARD_W  = (SCREEN_W - MASONRY_H_PAD * 2 - MASONRY_COL_GAP) / 2;
const CARD_IMG_H = Math.round(MASONRY_CARD_W * 1.35); // fixed height for all variants
const CARD_RADIUS = 0;

// ─── Tokens ───────────────────────────────────────────────────────────────────
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const MUTED  = Colors.secondaryText ?? '#9ba8ad';
const BASE   = Colors.neutral150    ?? '#f0f0f0';
const WHITE  = Colors.white;
const FONT_M = AppDetails?.fontFamily?.inter?.medium  ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';
const DEFAULT_AVATAR = 'https://hafrik.com/assets/images/default_avatar.png';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const strip = (str) => {
  if (!str || typeof str !== 'string') return '';
  const map = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ', '&rsquo;': '\u2019', '&hellip;': '\u2026' };
  let out = str;
  for (const [e, c] of Object.entries(map)) out = out.split(e).join(c);
  return out.replace(/<[^>]*>/g, '').trim();
};

const totalLikes = (reactions, fallback = 0) => {
  if (reactions && typeof reactions === 'object') {
    const sum = Object.entries(reactions)
      .filter(([k]) => k !== 'total')
      .reduce((acc, [, v]) => acc + Number(v || 0), 0);
    if (sum > 0) return sum;
    if (typeof reactions.total === 'number') return reactions.total;
  }
  return Number(fallback) || 0;
};

const fmt = (n) => {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
};

const getVariant = (feed) => {
  if (feed?.type === 'reel' || !!feed?.media?.[0]?.video_url) return 'reel';
  if (feed?.media?.[0]?.url?.startsWith('http'))               return 'image';
  return 'text';
};

const textFs = (len) => {
  if (len <  40) return 17;
  if (len < 100) return 15;
  if (len < 200) return 13;
  return 11;
};

// ─── Footer ───────────────────────────────────────────────────────────────────
const Footer = memo(({ feed }) => {
  const user         = feed?.user ?? {};
  const avatar       = user.avatar?.startsWith('http') ? user.avatar : DEFAULT_AVATAR;
  const name         = user.username ?? user.full_name ?? 'User';
  const total = totalLikes(feed?.reactions, feed?.likes_count ?? feed?.total_reactions ?? feed?.total_likes ?? 0);
  const views = feed?.views ?? feed?.views_count ?? feed?.view_count ?? 0;

  return (
    <View style={styles.footer}>
      <ExpoImage source={{ uri: avatar }} style={styles.av} contentFit="cover" cachePolicy="memory-disk" />
      <Text style={styles.uname} numberOfLines={1} ellipsizeMode="tail">{name}</Text>
      <View style={styles.statRow}>
        <Ionicons name="heart" size={11} color={ACCENT} />
        <Text style={styles.statN}>{fmt(total)}</Text>
        {views > 0 && (
          <>
            <Ionicons name="eye-outline" size={11} color={MUTED} style={{ marginLeft: 5 }} />
            <Text style={[styles.statN, { color: MUTED }]}>{fmt(views)}</Text>
          </>
        )}
      </View>
    </View>
  );
});

// ─── Image card ───────────────────────────────────────────────────────────────
const ImageCard = memo(({ feed, onPress }) => {
  const m       = feed?.media?.[0];
  const uri     = m?.url?.startsWith('http') ? m.url : m?.thumbnail?.startsWith('http') ? m.thumbnail : null;
  const caption = strip(feed?.text || feed?.content || feed?.description || '');

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={onPress}>
      <View style={{ height: CARD_IMG_H, width: '100%', backgroundColor: BASE }}>
        {uri ? (
          <ExpoImage
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={`disc-img-${feed?.id}`}
            transition={150}
          />
        ) : (
          <View style={styles.fallback}>
            <Ionicons name="image-outline" size={24} color={MUTED} />
          </View>
        )}
      </View>
      <View style={styles.body}>
        {!!caption && <Text style={styles.caption} numberOfLines={2}>{caption}</Text>}
        <Footer feed={feed} />
      </View>
    </TouchableOpacity>
  );
});

// ─── Reel card ────────────────────────────────────────────────────────────────
const ReelCard = memo(({ feed, onPress }) => {
  const m       = feed?.media?.[0];
  const uri     = m?.thumbnail?.startsWith('http') ? m.thumbnail : m?.url?.startsWith('http') ? m.url : null;
  const caption = strip(feed?.text || feed?.content || feed?.description || '');

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={onPress}>
      <View style={{ height: CARD_IMG_H, width: '100%', backgroundColor: BRAND + '22' }}>
        {uri ? (
          <ExpoImage
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={`disc-reel-${feed?.id}`}
            transition={150}
          />
        ) : (
          <View style={styles.fallback}>
            <Ionicons name="film-outline" size={26} color={MUTED} />
          </View>
        )}
        <View style={styles.playWrap}>
          <View style={styles.playBtn}>
            <Ionicons name="play" size={13} color={WHITE} />
          </View>
        </View>
      </View>
      <View style={styles.body}>
        {!!caption && <Text style={styles.caption} numberOfLines={2}>{caption}</Text>}
        <Footer feed={feed} />
      </View>
    </TouchableOpacity>
  );
});

// ─── Text card ────────────────────────────────────────────────────────────────
const TextCard = memo(({ feed, onPress }) => {
  const text = strip(feed?.text || feed?.content || feed?.description || '');
  const fs   = textFs(text.length);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={onPress}>
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.textBg}
      >
        <Text style={[styles.textBody, { fontSize: fs, lineHeight: fs + 6 }]} numberOfLines={8}>
          {text || 'Post'}
        </Text>
      </LinearGradient>
      <View style={styles.body}>
        <Footer feed={feed} />
      </View>
    </TouchableOpacity>
  );
});

// ─── Main ─────────────────────────────────────────────────────────────────────
const DiscoverMasonryCard = memo(({ feed, allFeeds = [] }) => {
  const navigation = useNavigation();
  const v = getVariant(feed);

  const onPress = useCallback(() => {
    if (v === 'reel') {
      // Filter to reel-only items so swipe-up/down stays within the reels feed
      const reelFeeds = allFeeds.filter(
        (f) => f?.type === 'reel' || !!f?.media?.[0]?.video_url
      );
      const pool = reelFeeds.length > 0 ? reelFeeds : [feed];
      const idx  = pool.findIndex((f) => String(f?.id) === String(feed?.id));
      navigation.navigate('Reels2', {
        initialReels:  pool,
        startIndex:    idx >= 0 ? idx : 0,
        initialReelId: feed?.id,
      });
    } else {
      navigation.navigate('PostDetail', { postId: feed?.id });
    }
  }, [v, feed, allFeeds, navigation]);

  if (v === 'reel')  return <ReelCard  feed={feed} onPress={onPress} />;
  if (v === 'image') return <ImageCard feed={feed} onPress={onPress} />;
  return <TextCard feed={feed} onPress={onPress} />;
});

export default DiscoverMasonryCard;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    // subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 7,
    paddingTop: 6,
    paddingBottom: 8,
  },
  caption: {
    fontSize: 12,
    fontFamily: FONT_R,
    color: BRAND,
    lineHeight: 16,
    marginBottom: 5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  av: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: BASE,
    marginRight: 4,
  },
  uname: {
    flex: 1,
    fontSize: 11,
    fontFamily: FONT_M,
    color: MUTED,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statN: {
    fontSize: 11,
    fontFamily: FONT_M,
    color: ACCENT,
  },
  playWrap: {
    position: 'absolute',
    bottom: 7,
    right: 7,
  },
  playBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBg: {
    width: '100%',
    height: CARD_IMG_H,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  textBody: {
    color: WHITE,
    fontFamily: FONT_M,
    fontWeight: '600',
    textAlign: 'center',
  },
});
