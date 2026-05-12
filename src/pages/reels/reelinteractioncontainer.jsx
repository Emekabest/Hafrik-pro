import React, {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../AuthContext';
import { Colors } from '../../theme/colors';
import useStore from '../../repository/store';
import ReelEngagementBar from './reelengagementbar';

const BRAND = Colors.primaryDark;
const ACCENT = Colors.primary;
const WHITE = Colors.white;
const TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.82)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 5,
};

const alpha = (hex, opacity) => {
  const normalized = String(hex || '').replace('#', '');
  if (normalized.length !== 6) return hex || 'transparent';
  return `#${normalized}${Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0')}`;
};

const decodeHtml = (t = '') =>
  String(t)
    .replace(/&rsquo;|&#039;|&#x27;/g, "'")
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&amp;amp;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&hellip;/g, '\u2026')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/<[^>]*>/g, '')
    .trim();

const fmtCount = (n) => {
  const v = Number(n ?? 0);
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
};

const ReelInteractionContainer = forwardRef(({ reel }, ref) => {
  const { token } = useAuth();
  const navigation = useNavigation();
  const { bottom: safeBottom } = useSafeAreaInsets();
  const engBarRef = useRef(null);

  const {
    user,
    text: caption,
    likes_count,
    comments_count,
    is_liked,
    is_saved,
    my_reaction,
    reactions,
    views,
  } = reel;
  const postId = reel?.post_id ?? reel?.id;

  const userId = user?.id;
  const [liked, setLiked] = useState(!!is_liked);
  const [likesCount, setLikesCount] = useState(likes_count ?? 0);
  const [myReaction, setMyReaction] = useState(my_reaction || (is_liked ? 'like' : null));
  const [captionExpanded, setCaptionExpanded] = useState(false);

  const handleReaction = useCallback((reactionType) => {
    const removing = myReaction === reactionType;
    const prevLiked = liked;
    const prevCount = Number(likesCount || 0);
    const nextLiked = !removing;
    const nextReaction = removing ? null : reactionType;
    const nextCount = removing ? Math.max(0, prevCount - 1) : (prevLiked ? prevCount : prevCount + 1);

    setLiked(nextLiked);
    setMyReaction(nextReaction);
    setLikesCount(nextCount);

    const { feeds, updateFeedById } = useStore.getState();
    const currentFeed = feeds.feedsById[postId];
    if (currentFeed) {
      updateFeedById(postId, {
        ...currentFeed,
        is_liked: nextLiked,
        my_reaction: nextReaction,
        likes_count: nextCount,
      });
    }
  }, [liked, likesCount, myReaction, postId]);

  const handleDoubleTapLike = useCallback(() => {
    if (liked) return;
    handleReaction('like');
  }, [handleReaction, liked]);

  useImperativeHandle(ref, () => ({ triggerLike: handleDoubleTapLike }), [handleDoubleTapLike]);

  const handleOpenProfile = useCallback(() => {
    const entity = String(user?.entity || user?.type || user?.source || '').toLowerCase();
    const pageId = user?.page_id ?? user?.business_id ?? user?.id;
    if (entity === 'page' || entity === 'business' || user?.is_page || user?.page_id || user?.business_id) {
      navigation.push('BusinessDetails', { pageId: Number(pageId) });
      return;
    }
    if (userId) navigation.push('UserProfile', { userId });
  }, [navigation, user?.entity, userId]);

  const rawCaption = caption ? decodeHtml(caption) : '';
  const hashtagMatches = rawCaption.match(/#[\w\u00C0-\u024F]+/g) || [];
  const captionText = rawCaption.replace(/#[\w\u00C0-\u024F]+/g, '').trim();
  const isCaptionLong = captionText.length > 92;
  const displayName = decodeHtml(
    user?.display_name ||
    user?.page_title ||
    user?.page_name ||
    user?.business_name ||
    user?.name ||
    user?.full_name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    user?.username ||
    'Creator',
  );
  const username = decodeHtml(user?.username || '');
  const avatar = typeof user?.avatar === 'string' && user.avatar.startsWith('http')
    ? user.avatar
    : 'https://hafrik.com/assets/images/default_avatar.png';
  const panelBottom = safeBottom + 18;
  const viewCount = Number(views ?? reel?.media?.views ?? 0);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <LinearGradient
        colors={['transparent', alpha('#000000', 0.18), alpha('#000000', 0.82)]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      <View style={[styles.creatorPanel, { bottom: panelBottom }]} pointerEvents="box-none">
        <TouchableOpacity style={styles.creatorTop} activeOpacity={0.86} onPress={handleOpenProfile}>
          <View style={styles.avatarOuter}>
            <ExpoImage source={{ uri: avatar }} style={styles.avatar} cachePolicy="memory-disk" contentFit="cover" />
          </View>

          <View style={styles.creatorText}>
            <View style={styles.nameRow}>
              <Text style={styles.displayName} numberOfLines={1}>{displayName}</Text>
              {user?.verified ? <Ionicons name="checkmark-circle" size={15} color={ACCENT} /> : null}
            </View>
            <Text style={styles.username} numberOfLines={1}>
              {username ? `@${username}` : (user?.verified ? 'Verified creator' : 'Creator')}
            </Text>
          </View>

          <View style={styles.followHint}>
            <Text style={styles.followHintText}>View</Text>
          </View>
        </TouchableOpacity>

        {!!captionText && (
          <TouchableOpacity activeOpacity={0.9} onPress={() => setCaptionExpanded((value) => !value)}>
            <Text style={styles.caption} numberOfLines={captionExpanded ? undefined : 2}>{captionText}</Text>
            {isCaptionLong && <Text style={styles.captionToggle}>{captionExpanded ? 'Show less' : 'Read more'}</Text>}
          </TouchableOpacity>
        )}

        {hashtagMatches.length > 0 && (
          <View style={styles.hashtagRow}>
            {hashtagMatches.slice(0, 5).map((tag, index) => (
              <View key={`${tag}-${index}`} style={styles.hashtagChip}>
                <Text style={styles.hashtagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {viewCount > 0 && (
          <View style={styles.viewsRow}>
            <Ionicons name="play" size={10} color={alpha(WHITE, 0.72)} />
            <Text style={styles.viewsText}>{fmtCount(viewCount)} views</Text>
          </View>
        )}
      </View>

      <View style={[styles.rightRail, { bottom: panelBottom }]}>
        <ReelEngagementBar
          ref={engBarRef}
          postId={postId}
          userId={userId}
          token={token}
          liked={liked}
          likesCount={likesCount}
          onLikePress={handleReaction}
          myReaction={myReaction}
          reactions={reactions}
          commentCount={comments_count}
          isSavedInitial={!!is_saved}
        />
      </View>

    </View>
  );
});

const styles = StyleSheet.create({
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '62%',
    zIndex: 1,
  },
  creatorPanel: {
    position: 'absolute',
    left: 14,
    right: 84,
    zIndex: 5,
    padding: 0,
  },
  creatorTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 9,
  },
  avatarOuter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: alpha(WHITE, 0.86),
    padding: 2,
    backgroundColor: alpha('#000000', 0.16),
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 23,
    backgroundColor: BRAND,
  },
  creatorText: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  displayName: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '900',
    maxWidth: '88%',
    fontFamily: 'ReadexPro-Bold',
    ...TEXT_SHADOW,
  },
  username: {
    color: alpha(WHITE, 0.76),
    fontSize: 11.5,
    fontWeight: '800',
    marginTop: 1,
    ...TEXT_SHADOW,
  },
  followHint: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
    backgroundColor: alpha(ACCENT, 0.18),
    borderWidth: 1,
    borderColor: alpha(WHITE, 0.42),
  },
  followHintText: { color: WHITE, fontSize: 11, fontWeight: '900' },
  caption: {
    color: alpha(WHITE, 0.95),
    fontSize: 14,
    lineHeight: 20.5,
    fontWeight: '700',
    ...TEXT_SHADOW,
  },
  captionToggle: {
    color: alpha(WHITE, 0.7),
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
    ...TEXT_SHADOW,
  },
  hashtagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  hashtagChip: {
    backgroundColor: alpha(WHITE, 0.14),
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: alpha(WHITE, 0.13),
  },
  hashtagText: {
    color: WHITE,
    fontSize: 11.5,
    fontWeight: '900',
    ...TEXT_SHADOW,
  },
  viewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  viewsText: {
    color: alpha(WHITE, 0.72),
    fontSize: 11.5,
    fontWeight: '800',
    ...TEXT_SHADOW,
  },
  rightRail: {
    position: 'absolute',
    right: 8,
    width: 62,
    alignItems: 'center',
    zIndex: 6,
  },
});

const shouldSkipRerender = (prev, next) =>
  (prev.reel.post_id ?? prev.reel.id) === (next.reel.post_id ?? next.reel.id);

export default memo(ReelInteractionContainer, shouldSkipRerender);
