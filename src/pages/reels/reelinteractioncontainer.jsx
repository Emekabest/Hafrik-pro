import React, {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useState,
} from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import AppDetails from '../../helpers/appdetails';
import CalculateElapsedTime from '../../helpers/calculateelapsedtime';
import { followUser, toggleLike } from './reelsApi';
import useStore from '../../repository/store';
import ReelEngagementBar from './reelengagementbar';
import { Colors } from '../../theme/colors';

const decodeHtml = (t = '') =>
  String(t)
    .replace(/&rsquo;|&#039;|&#x27;/g, "'")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&ldquo;/g, "\u201C")
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

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const ACCENT = Colors.primary;

const TEXT_SHADOW = {
  textShadowColor:  withOpacity(Colors.black, 0.80),
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
};

const ReelInteractionContainer = forwardRef(({ reel }, ref) => {
  const { token } = useAuth();
  const navigation = useNavigation();
  const { bottom: safeBottom } = useSafeAreaInsets();
  // Bottom padding — reduced for more video real estate
  const panelBottom = safeBottom + 6;

  const {
    id: postId,
    user,
    created,
    text: caption,
    likes_count,
    comments_count,
    is_liked,
    is_saved,
    my_reaction,
    reactions,
  } = reel;

  const userId = user?.id;

  const [liked,    setLiked]    = useState(!!is_liked);
  const [likesCount, setLikesCount] = useState(likes_count ?? 0);
  const [myReaction, setMyReaction] = useState(my_reaction || (is_liked ? 'like' : null));
  const [following, setFollowing] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);

  /** Called by ReelEngagementBar when any reaction is sent (tap or picker) */
  const handleReaction = useCallback((reactionType) => {
    const isRemoving = myReaction === reactionType;
    const prevLiked = liked;
    const prevCount = likesCount;
    const prevReaction = myReaction;

    // Optimistic local update
    const newLiked = !isRemoving;
    const newCount = isRemoving ? Math.max(0, prevCount - 1) : (prevLiked ? prevCount : prevCount + 1);
    const newReaction = isRemoving ? null : reactionType;
    setLiked(newLiked);
    setLikesCount(newCount);
    setMyReaction(newReaction);

    // Sync to Zustand store
    const { feeds, updateFeedById } = useStore.getState();
    const currentFeed = feeds.feedsById[postId];
    if (currentFeed) {
      updateFeedById(postId, {
        ...currentFeed,
        is_liked: newLiked,
        my_reaction: newReaction,
        likes_count: newCount,
      });
    }
  }, [liked, likesCount, myReaction, postId]);

  /** Simple double-tap like (always sends 'like') */
  const handleDoubleTapLike = useCallback(() => {
    if (liked) return; // already liked, no-op
    handleReaction('like');
  }, [liked, handleReaction]);

  useImperativeHandle(ref, () => ({ triggerLike: handleDoubleTapLike }), [handleDoubleTapLike]);

  const handleFollow = useCallback(async () => {
    const prev = following;
    setFollowing(f => !f);
    try {
      const res = await followUser(userId, token);
      if (res?.following !== undefined) setFollowing(!!res.following);
    } catch {
      setFollowing(prev);
    }
  }, [following, userId, token]);

  const cleanCaption = caption ? decodeHtml(caption) : '';
  const isCaptionLong = cleanCaption && cleanCaption.length > 80;
  const audioLabel = user?.username ? `@${user.username}` : 'Original audio';

  const handleOpenProfile = useCallback(() => {
    if (userId) navigation.push('UserProfile', { userId });
  }, [userId, navigation]);

  return (
    <View style={styles.overlay}>
      <View style={[styles.panel, { paddingBottom: panelBottom }]}>

        {/* ── Left: username · caption · music ─────────────────────────── */}
        <View style={styles.leftSide}>

          {/* Username + verified + time */}
          <TouchableOpacity style={styles.userRow} activeOpacity={0.8} onPress={handleOpenProfile}>
            {user?.verified ? (
              <Ionicons name="checkmark-circle" size={14} color={ACCENT} style={{ marginRight: 4 }} />
            ) : null}
            <Text style={styles.username} numberOfLines={1}>
              @{user?.username}
            </Text>
            <Text style={styles.time}> · {CalculateElapsedTime(created)}</Text>
          </TouchableOpacity>

          {/* Caption */}
          {cleanCaption ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setCaptionExpanded(e => !e)}
            >
              <Text
                style={styles.caption}
                numberOfLines={captionExpanded ? undefined : 2}
              >
                {cleanCaption}
              </Text>
              {isCaptionLong ? (
                <Text style={styles.captionToggle}>
                  {captionExpanded ? 'less' : 'more'}
                </Text>
              ) : null}
            </TouchableOpacity>
          ) : null}

          {/* Music row — TikTok-style */}
          <View style={styles.musicRow}>
            <View style={styles.musicDisc}>
              <Ionicons name="musical-notes" size={10} color={Colors.white} />
            </View>
            <Text style={styles.musicLabel} numberOfLines={1}>
              {audioLabel}
            </Text>
          </View>

        </View>

        {/* ── Right: avatar + follow + engagement icons ─────────────────── */}
        <View style={styles.rightSide}>

          {/* Avatar with follow badge */}
          <View style={styles.avatarWrapper}>
            <TouchableOpacity activeOpacity={0.85} onPress={handleOpenProfile}>
              <View style={styles.avatarRing}>
                <ExpoImage
                  source={{ uri: user?.avatar }}
                  style={styles.avatar}
                  cachePolicy="memory-disk"
                  contentFit="cover"
                />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.followBtn, following && styles.followBtnActive]}
              onPress={handleFollow}
            >
              <Ionicons
                name={following ? 'checkmark' : 'add'}
                size={13}
                color={Colors.white}
              />
            </TouchableOpacity>
          </View>

          {/* Like / Comment / Bookmark / Share */}
          <ReelEngagementBar
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
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 3,
  },
  panel: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
  },

  // ── Left column ──────────────────────────────────────────────────────────
  leftSide: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingRight: 12,
    paddingBottom: 6,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  username: {
    fontSize: 15,
    fontFamily: 'ReadexPro_600SemiBold',
    color: Colors.white,
    ...TEXT_SHADOW,
  },
  time: {
    fontSize: 12,
    color: withOpacity(Colors.white, 0.60),
    fontFamily: 'WorkSans_500Medium',
    ...TEXT_SHADOW,
  },
  caption: {
    fontSize: 13.5,
    color: withOpacity(Colors.white, 0.92),
    fontFamily: 'WorkSans_500Medium',
    lineHeight: 20,
    ...TEXT_SHADOW,
  },
  captionToggle: {
    color: withOpacity(Colors.white, 0.55),
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 12,
    marginTop: 3,
    ...TEXT_SHADOW,
  },
  // Music row at bottom of left column
  musicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 7,
  },
  musicDisc: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.nearBlackSoft,
    borderWidth: 3,
    borderColor: Colors.neutral700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicLabel: {
    fontSize: 12.5,
    color: withOpacity(Colors.white, 0.85),
    fontFamily: 'WorkSans_500Medium',
    flex: 1,
    ...TEXT_SHADOW,
  },

  // ── Right column ─────────────────────────────────────────────────────────
  rightSide: {
    width: 62,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },

  // Avatar
  avatarWrapper: {
    alignItems: 'center',
    marginBottom: 14,
    position: 'relative',
  },
  avatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: Colors.white,
    overflow: 'hidden',
    backgroundColor: Colors.blueGreenDeep,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.55,
    shadowRadius: 6,
    elevation: 6,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  followBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: -8,
    borderWidth: 2,
    borderColor: Colors.black,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.45,
    shadowRadius: 3,
    elevation: 4,
  },
  followBtnActive: {
    backgroundColor: ACCENT,
  },
});

const shouldSkipRerender = (prev, next) => prev.reel.id === next.reel.id;

export default memo(ReelInteractionContainer, shouldSkipRerender);
