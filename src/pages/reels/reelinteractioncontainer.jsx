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
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import AppDetails from '../../helpers/appdetails';
import CalculateElapsedTime from '../../helpers/calculateelapsedtime';
import { toggleLike } from './reelsApi';
import useStore from '../../repository/store';
import ReelEngagementBar from './reelengagementbar';
import { Colors } from '../../theme/colors';

const decodeHtml = (t = '') =>
  String(t)
    .replace(/&rsquo;|&#039;|&#x27;/g, "'")
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&ldquo;/g, '\u201C')
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
  const normalized = (hex || '').replace('#', '');
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${normalized}${alpha}`;
};

const ACCENT = Colors.primary;

const TEXT_SHADOW = {
  textShadowColor: withOpacity(Colors.black, 0.80),
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
};

// Height of the "Say something…" bar at the bottom
const COMMENT_BAR_H = 52;

const ReelInteractionContainer = forwardRef(({ reel }, ref) => {
  const { token } = useAuth();
  const navigation = useNavigation();
  const { bottom: safeBottom } = useSafeAreaInsets();
  const engBarRef = useRef(null);

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

  const [liked,      setLiked]      = useState(!!is_liked);
  const [likesCount, setLikesCount] = useState(likes_count ?? 0);
  const [myReaction, setMyReaction] = useState(my_reaction || (is_liked ? 'like' : null));
  const [captionExpanded, setCaptionExpanded] = useState(false);

  /** Called by ReelEngagementBar when any reaction is sent */
  const handleReaction = useCallback((reactionType) => {
    const isRemoving = myReaction === reactionType;
    const prevLiked  = liked;
    const prevCount  = likesCount;

    const newLiked    = !isRemoving;
    const newCount    = isRemoving ? Math.max(0, prevCount - 1) : (prevLiked ? prevCount : prevCount + 1);
    const newReaction = isRemoving ? null : reactionType;
    setLiked(newLiked);
    setLikesCount(newCount);
    setMyReaction(newReaction);

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

  /** Double-tap like */
  const handleDoubleTapLike = useCallback(() => {
    if (liked) return;
    handleReaction('like');
  }, [liked, handleReaction]);

  useImperativeHandle(ref, () => ({ triggerLike: handleDoubleTapLike }), [handleDoubleTapLike]);

  const handleOpenProfile = useCallback(() => {
    if (userId) navigation.push('UserProfile', { userId });
  }, [userId, navigation]);

  // Parse caption — split hashtags out for separate display
  const rawCaption = caption ? decodeHtml(caption) : '';
  const hashtagMatches = rawCaption.match(/#[\w\u00C0-\u024F]+/g) || [];
  const captionText = rawCaption.replace(/#[\w\u00C0-\u024F]+/g, '').trim();
  const isCaptionLong = captionText.length > 80;
  const audioLabel = user?.username ? `@${user.username}` : 'Original audio';

  // Panels sit above the comment bar
  const panelBottom = safeBottom + COMMENT_BAR_H + 12;

  const openCommentsSheet = useCallback(() => {
    engBarRef.current?.openComments();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">

      {/* ── Bottom gradient for readability ─────────────────────────── */}
      <LinearGradient
        colors={['transparent', withOpacity(Colors.black, 0.72)]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      {/* ── LEFT column — avatar · user · follow · caption · hashtags · music ── */}
      <View style={[styles.leftCol, { bottom: panelBottom }]} pointerEvents="box-none">

        {/* Avatar */}
        <TouchableOpacity style={styles.avatarWrapper} activeOpacity={0.85} onPress={handleOpenProfile}>
          <View style={styles.avatarRing}>
            <ExpoImage
              source={{ uri: user?.avatar }}
              style={styles.avatar}
              cachePolicy="memory-disk"
              contentFit="cover"
            />
          </View>
        </TouchableOpacity>

        {/* Username */}
        <TouchableOpacity activeOpacity={0.8} onPress={handleOpenProfile} style={styles.userRow}>
          {user?.verified ? (
            <Ionicons name="checkmark-circle" size={13} color={ACCENT} style={{ marginRight: 3 }} />
          ) : null}
          <Text style={styles.username} numberOfLines={1}>
            @{user?.username}
          </Text>
        </TouchableOpacity>

        {/* Caption */}
        {captionText ? (
          <TouchableOpacity activeOpacity={0.85} onPress={() => setCaptionExpanded(e => !e)}>
            <Text
              style={styles.caption}
              numberOfLines={captionExpanded ? undefined : 2}
            >
              {captionText}
            </Text>
            {isCaptionLong ? (
              <Text style={styles.captionToggle}>
                {captionExpanded ? 'less' : 'more'}
              </Text>
            ) : null}
          </TouchableOpacity>
        ) : null}

        {/* Hashtag chips */}
        {hashtagMatches.length > 0 ? (
          <View style={styles.hashtagRow}>
            {hashtagMatches.slice(0, 4).map((tag, i) => (
              <View key={i} style={styles.hashtagChip}>
                <Text style={styles.hashtagTxt}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Music row */}
        <View style={styles.musicRow}>
          <View style={styles.musicDisc}>
            <Ionicons name="musical-notes" size={10} color={Colors.white} />
          </View>
          <Text style={styles.musicLabel} numberOfLines={1}>{audioLabel}</Text>
        </View>

      </View>

      {/* ── RIGHT column — like · comment · bookmark · share ─────────── */}
      <View style={[styles.rightCol, { bottom: panelBottom }]}>
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

      {/* ── "Say something…" comment bar — pinned at bottom ─────────── */}
      <TouchableOpacity
        style={[styles.commentBar, { bottom: safeBottom }]}
        activeOpacity={0.8}
        onPress={openCommentsSheet}
      >
        <View style={styles.commentInputFake}>
          <Ionicons name="happy-outline" size={20} color={withOpacity(Colors.white, 0.55)} style={{ marginRight: 8 }} />
          <Text style={styles.commentPlaceholder}>Say something…</Text>
        </View>
        <TouchableOpacity style={styles.commentSend} activeOpacity={0.75} onPress={openCommentsSheet}>
          <Ionicons name="paper-plane-outline" size={18} color={Colors.white} />
        </TouchableOpacity>
      </TouchableOpacity>

    </View>
  );
});

const styles = StyleSheet.create({
  // Bottom overlay gradient
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
    zIndex: 1,
  },

  // Left column — avatar + info
  leftCol: {
    position: 'absolute',
    left: 14,
    right: 90,   // leave room for right action column (70px) + 6px gap
    zIndex: 3,
  },

  // Right column — engagement icons
  rightCol: {
    position: 'absolute',
    right: 10,
    width: 70,
    alignItems: 'center',
    zIndex: 3,
  },

  // Avatar
  avatarWrapper: {
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  avatarRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: Colors.white,
    overflow: 'hidden',
    backgroundColor: Colors.blueGreenDeep,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },

  // User row
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },
  username: {
    fontSize: 14,
    fontFamily: 'ReadexPro_600SemiBold',
    color: Colors.white,
    ...TEXT_SHADOW,
  },

  // Caption
  caption: {
    fontSize: 13,
    color: withOpacity(Colors.white, 0.92),
    fontFamily: 'WorkSans_500Medium',
    lineHeight: 19,
    marginBottom: 4,
    ...TEXT_SHADOW,
  },
  captionToggle: {
    color: withOpacity(Colors.white, 0.55),
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 4,
    ...TEXT_SHADOW,
  },

  // Hashtag chips
  hashtagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 8,
  },
  hashtagChip: {
    backgroundColor: withOpacity(Colors.white, 0.14),
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  hashtagTxt: {
    color: Colors.white,
    fontSize: 12,
    fontFamily: 'WorkSans_500Medium',
    ...TEXT_SHADOW,
  },

  // Music row
  musicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 2,
  },
  musicDisc: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.nearBlackSoft,
    borderWidth: 2.5,
    borderColor: Colors.neutral700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicLabel: {
    fontSize: 12,
    color: withOpacity(Colors.white, 0.85),
    fontFamily: 'WorkSans_500Medium',
    flex: 1,
    ...TEXT_SHADOW,
  },

  // "Say something…" bar
  commentBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: COMMENT_BAR_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 4,
  },
  commentInputFake: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: withOpacity(Colors.white, 0.35),
    backgroundColor: withOpacity(Colors.black, 0.28),
    paddingHorizontal: 14,
  },
  commentPlaceholder: {
    color: withOpacity(Colors.white, 0.55),
    fontSize: 13.5,
    fontFamily: 'WorkSans_400Regular',
  },
  commentSend: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: withOpacity(Colors.black, 0.30),
    borderWidth: 1,
    borderColor: withOpacity(Colors.white, 0.25),
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const shouldSkipRerender = (prev, next) => prev.reel.id === next.reel.id;

export default memo(ReelInteractionContainer, shouldSkipRerender);
