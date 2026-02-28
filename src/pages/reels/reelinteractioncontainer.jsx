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
import { useAuth } from '../../AuthContext';
import AppDetails from '../../helpers/appdetails';
import CalculateElapsedTime from '../../helpers/calculateelapsedtime';
import { followUser, toggleLike } from './reelsApi';
import ReelEngagementBar from './reelengagementbar';

const ACCENT = '#13C296';

const ReelInteractionContainer = forwardRef(({ reel }, ref) => {
  const { token } = useAuth();
  const { bottom: safeBottom } = useSafeAreaInsets();
  // paddingBottom = tab bar height + device safe area + breathing room
  const interactionBottom = AppDetails.mainTabNavigatorHeight + safeBottom + 10;

  const {
    id: postId,
    user,
    created,
    text: caption,
    likes_count,
    comments_count,
    is_liked,
    is_saved,
  } = reel;

  // API returns user.id (not user.user_id)
  const userId = user?.id;

  const [liked, setLiked] = useState(!!is_liked);
  const [likesCount, setLikesCount] = useState(likes_count ?? 0);
  const [following, setFollowing] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);

  const handleLike = useCallback(async () => {
    const prevLiked = liked;
    const prevCount = likesCount;
    setLiked(l => !l);
    setLikesCount(c => prevLiked ? c - 1 : c + 1);
    try {
      const res = await toggleLike(postId, token);
      if (res?.likes_count !== undefined) setLikesCount(res.likes_count);
      if (res?.liked !== undefined) setLiked(!!res.liked);
    } catch {
      setLiked(prevLiked);
      setLikesCount(prevCount);
    }
  }, [liked, likesCount, postId, token]);

  // Expose triggerLike so ReelCard can call it on double-tap
  useImperativeHandle(ref, () => ({
    triggerLike: handleLike,
  }), [handleLike]);

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

  const isCaptionLong = caption && caption.length > 80;

  return (
    <View style={styles.container}>
      <View style={[styles.interactionContainer, { paddingBottom: interactionBottom }]}>

        {/* ── Left: username + caption ── */}
        <View style={styles.leftSide}>
          <View style={styles.userInfo}>
            {user?.verified ? (
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={ACCENT}
                style={{ marginRight: 4 }}
              />
            ) : null}
            <Text style={styles.username} numberOfLines={1}>
              @{user?.username}
            </Text>
            <Text style={styles.time}> · {CalculateElapsedTime(created)}</Text>
          </View>

          {caption ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setCaptionExpanded(e => !e)}
            >
              <Text
                style={styles.caption}
                numberOfLines={captionExpanded ? undefined : 2}
              >
                {caption}
              </Text>
              {isCaptionLong && (
                <Text style={styles.captionToggle}>
                  {captionExpanded ? 'less' : 'more'}
                </Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ── Right: avatar + engagement bar ── */}
        <View style={styles.rightSide}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarRing}>
              <ExpoImage
                source={{ uri: user?.avatar }}
                style={styles.avatar}
                cachePolicy="memory-disk"
                contentFit="cover"
              />
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.followBtn, following && styles.followBtnActive]}
              onPress={handleFollow}
            >
              <Ionicons
                name={following ? 'checkmark' : 'add'}
                size={14}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          <ReelEngagementBar
            postId={postId}
            userId={userId}
            token={token}
            liked={liked}
            likesCount={likesCount}
            onLikePress={handleLike}
            commentCount={comments_count}
            isSavedInitial={!!is_saved}
          />
        </View>

      </View>
    </View>
  );
});

const TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.75)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  interactionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
  },
  leftSide: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingRight: 10,
    paddingBottom: 4,
  },
  rightSide: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  avatarWrapper: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2.5,
    borderColor: '#fff',
    overflow: 'hidden',
    backgroundColor: '#1E3A40',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  followBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0C3F44',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: -9,
    borderWidth: 2,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  followBtnActive: {
    backgroundColor: ACCENT,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    flexWrap: 'wrap',
  },
  username: {
    fontSize: 15,
    fontFamily: 'ReadexPro_600SemiBold',
    color: '#fff',
    ...TEXT_SHADOW,
  },
  time: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    fontFamily: 'WorkSans_500Medium',
    ...TEXT_SHADOW,
  },
  caption: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
    fontFamily: 'WorkSans_500Medium',
    lineHeight: 20,
    ...TEXT_SHADOW,
  },
  captionToggle: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 12,
    marginTop: 3,
    ...TEXT_SHADOW,
  },
});

const shouldSkipRerender = (prev, next) => prev.reel.id === next.reel.id;

export default memo(ReelInteractionContainer, shouldSkipRerender);
