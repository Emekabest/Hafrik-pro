import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../AuthContext';
import { fetchComments, shareReel, toggleSave, toggleLike } from './reelsApi';
import { AddCommentController, AddReplyController } from '../../controllers/commentscontroller';
import useStore from '../../repository/store';
import { Colors } from '../../theme/colors';

const { height: SCREEN_H } = Dimensions.get('window');

const BRAND = Colors.primaryDark;
const ACCENT = Colors.primary;
const WHITE = Colors.white;
const DARK = '#071F23';
const SHEET_BG = '#F4F8F8';
const CARD = Colors.white;
const MUTED = Colors.secondaryText;
const BORDER = Colors.borderSoft ?? Colors.borderLight ?? '#E5EEEE';
const DEFAULT_AVATAR = 'https://hafrik.com/assets/images/default_avatar.png';
const BASE_URL = 'https://hafrik.com';

const alpha = (hex, opacity) => {
  const normalized = String(hex || '').replace('#', '');
  if (normalized.length !== 6) return hex || 'transparent';
  return `#${normalized}${Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0')}`;
};

const decodeHtml = (str) => {
  if (!str || typeof str !== 'string') return str ?? '';
  return str
    .replace(/&rsquo;|&#039;|&#x27;/g, "'")
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&amp;amp;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&ndash;/g, '\u2013')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&hellip;/g, '\u2026')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/<[^>]*>/g, '')
    .trim();
};

const fmtCount = (n) => {
  const v = Number(n ?? 0);
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
};

const getAvatar = (user) => {
  const avatar = user?.avatar;
  return typeof avatar === 'string' && avatar.startsWith('http') ? avatar : DEFAULT_AVATAR;
};

const ActionButton = ({ icon, activeIcon, active, label, count, activeColor = ACCENT, onPress }) => (
  <TouchableOpacity style={styles.actionItem} activeOpacity={0.78} onPress={onPress}>
    <View style={[styles.actionCircle, active && { borderColor: alpha(activeColor, 0.42) }]}>
      <Ionicons name={active ? activeIcon : icon} size={25} color={active ? activeColor : WHITE} />
    </View>
    <Text style={[styles.actionLabel, active && { color: WHITE }]} numberOfLines={1}>
      {count != null ? fmtCount(count) : label}
    </Text>
  </TouchableOpacity>
);

const CommentItem = ({ item, onReply }) => {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(Number(item.likes ?? 0));
  const scale = useRef(new Animated.Value(1)).current;

  const handleLike = useCallback(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.28, useNativeDriver: true, speed: 46, bounciness: 0 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 12 }),
    ]).start();
    setLiked((prev) => {
      setLikes((count) => (prev ? Math.max(0, count - 1) : count + 1));
      return !prev;
    });
  }, [scale]);

  const author = decodeHtml(item?.user?.full_name || item?.user?.name || item?.user?.username || 'Hafrik user');
  const username = decodeHtml(item?.user?.username || '');
  const text = decodeHtml(item?.text || item?.comment || item?.body || '');
  const avatar = getAvatar(item?.user);

  return (
    <View style={styles.commentRow}>
      <ExpoImage source={{ uri: avatar }} style={styles.commentAvatar} contentFit="cover" cachePolicy="memory-disk" />
      <View style={styles.commentMiddle}>
        <View style={styles.commentBubble}>
          <View style={styles.commentNameRow}>
            <Text style={styles.commentAuthor} numberOfLines={1}>{author}</Text>
            {!!username && <Text style={styles.commentUsername} numberOfLines={1}>@{username}</Text>}
          </View>
          <Text style={styles.commentText}>{text}</Text>
        </View>
        <View style={styles.commentMeta}>
          {!!item?.time && <Text style={styles.commentMetaText}>{item.time}</Text>}
          <TouchableOpacity activeOpacity={0.72} onPress={() => onReply?.(item)}>
            <Text style={styles.commentMetaText}>Reply</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={styles.commentLike} activeOpacity={0.75} onPress={handleLike}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={17} color={liked ? '#F43F5E' : MUTED} />
        </Animated.View>
        {likes > 0 && <Text style={[styles.commentLikeText, liked && { color: '#F43F5E' }]}>{fmtCount(likes)}</Text>}
      </TouchableOpacity>
    </View>
  );
};

const FriendShareRow = ({ item, sending, onPress }) => {
  const name = decodeHtml(item?.full_name || item?.name || item?.username || item?.user_name || 'Hafrik user');
  const username = decodeHtml(item?.username || item?.user_name || '');
  const avatar = getAvatar(item);

  return (
    <TouchableOpacity style={styles.friendRow} activeOpacity={0.82} onPress={onPress} disabled={!!sending}>
      <ExpoImage source={{ uri: avatar }} style={styles.friendAvatar} contentFit="cover" cachePolicy="memory-disk" />
      <View style={styles.friendTextWrap}>
        <Text style={styles.friendName} numberOfLines={1}>{name}</Text>
        {!!username && <Text style={styles.friendUsername} numberOfLines={1}>@{username}</Text>}
      </View>
      <View style={[styles.friendSendBtn, sending && styles.friendSendBtnLoading]}>
        {sending ? (
          <ActivityIndicator size="small" color={WHITE} />
        ) : (
          <>
            <Ionicons name="flame" size={13} color={WHITE} />
            <Text style={styles.friendSendTxt}>Send</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const ReelEngagementBar = forwardRef(({
  postId,
  token,
  liked,
  likesCount,
  onLikePress,
  myReaction: initialMyReaction = null,
  commentCount: initialCommentCount,
  isSavedInitial = false,
}, ref) => {
  const { user: authUser } = useAuth();
  const { bottom: safeBottom } = useSafeAreaInsets();

  const [saved, setSaved] = useState(isSavedInitial);
  const [commentCount, setCommentCount] = useState(initialCommentCount ?? 0);
  const [modalVisible, setModalVisible] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingCmts, setLoadingCmts] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myReaction, setMyReaction] = useState(initialMyReaction || (liked ? 'like' : null));
  const [localLikesCount, setLocalLikesCount] = useState(Number(likesCount ?? 0));
  const [replyingTo, setReplyingTo] = useState(null);
  const [shareVisible, setShareVisible] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [sendingTo, setSendingTo] = useState(null);
  const [timelineSharing, setTimelineSharing] = useState(false);

  const inputRef = useRef(null);
  const myId = authUser?.id ?? authUser?.user_id;
  const reelLink = `https://hafrik.com/reels/${postId}`;

  useEffect(() => {
    setMyReaction(initialMyReaction || (liked ? 'like' : null));
  }, [postId, initialMyReaction, liked]);

  useEffect(() => {
    setLocalLikesCount(Number(likesCount ?? 0));
  }, [postId, likesCount]);

  useEffect(() => {
    setSaved(isSavedInitial);
  }, [postId, isSavedInitial]);

  useEffect(() => {
    setCommentCount(initialCommentCount ?? 0);
  }, [postId, initialCommentCount]);

  useEffect(() => {
    if (!shareVisible || !token || !myId) return;
    let cancelled = false;
    setFriendsLoading(true);
    fetch(`${BASE_URL}/api/v1/users/user_following.php?user_id=${myId}&limit=60`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const list =
          Array.isArray(json?.data?.data) ? json.data.data :
          Array.isArray(json?.data) ? json.data : [];
        setFriends(list);
      })
      .catch(() => {
        if (!cancelled) setFriends([]);
      })
      .finally(() => {
        if (!cancelled) setFriendsLoading(false);
      });
    return () => { cancelled = true; };
  }, [myId, shareVisible, token]);

  const sendReaction = useCallback(async (reactionType) => {
    const isRemoving = myReaction === reactionType;
    const nextReaction = isRemoving ? null : reactionType;
    const previousLikes = localLikesCount;
    const optimisticLikes = isRemoving ? Math.max(0, previousLikes - 1) : previousLikes + (myReaction ? 0 : 1);
    setMyReaction(nextReaction);
    setLocalLikesCount(optimisticLikes);
    onLikePress?.(reactionType);

    const { feeds, updateFeedById } = useStore.getState();
    const currentFeed = feeds.feedsById[postId];
    if (currentFeed) {
      updateFeedById(postId, { ...currentFeed, is_liked: !isRemoving, my_reaction: nextReaction });
    }

    try {
      const res = await toggleLike(postId, token, reactionType);
      if (res) {
        const serverReaction = res.my_reaction || null;
        setMyReaction(serverReaction);
        const serverReactions = res.reactions;
        if (serverReactions && typeof serverReactions === 'object') {
          const total = Object.entries(serverReactions)
            .filter(([key]) => key !== 'total')
            .reduce((sum, [, value]) => sum + Number(value || 0), 0);
          setLocalLikesCount(Number(serverReactions.total ?? total ?? optimisticLikes));
        } else if (res.likes_count != null || res.likes != null) {
          setLocalLikesCount(Number(res.likes_count ?? res.likes ?? optimisticLikes));
        }
      }
    } catch {
      setMyReaction(myReaction);
      setLocalLikesCount(previousLikes);
    }
  }, [localLikesCount, myReaction, onLikePress, postId, token]);

  const handleSave = useCallback(async () => {
    const previous = saved;
    const next = !previous;
    setSaved(next);
    const { feeds, updateFeedById } = useStore.getState();
    const currentFeed = feeds.feedsById[postId];
    if (currentFeed) updateFeedById(postId, { ...currentFeed, is_saved: next });
    try {
      const res = await toggleSave(postId, token);
      if (res) setSaved(!!res.is_saved);
    } catch {
      setSaved(previous);
      if (currentFeed) updateFeedById(postId, currentFeed);
    }
  }, [postId, saved, token]);

  const openComments = useCallback(async () => {
    setModalVisible(true);
    setLoadingCmts(true);
    try {
      const data = await fetchComments(postId, token);
      setComments(Array.isArray(data) ? data : []);
    } catch {
      setComments([]);
    } finally {
      setLoadingCmts(false);
    }
  }, [postId, token]);

  useImperativeHandle(ref, () => ({ openComments }), [openComments]);

  const handleSubmitComment = useCallback(async () => {
    const text = commentText.trim();
    if (!text || submitting) return;
    Keyboard.dismiss();
    setSubmitting(true);
    try {
      if (replyingTo) {
        await AddReplyController(postId, replyingTo.commentId, text, token);
      } else {
        await AddCommentController(postId, text, token);
      }
      setCommentText('');
      setReplyingTo(null);
      setCommentCount((count) => count + 1);
      const { feeds, updateFeedById } = useStore.getState();
      const currentFeed = feeds.feedsById[postId];
      if (currentFeed) {
        updateFeedById(postId, {
          ...currentFeed,
          comments_count: (Number(currentFeed.comments_count) || 0) + 1,
        });
      }
      const data = await fetchComments(postId, token);
      setComments(Array.isArray(data) ? data : []);
    } catch {
    } finally {
      setSubmitting(false);
    }
  }, [commentText, postId, replyingTo, submitting, token]);

  const handleReply = useCallback((comment) => {
    const commentId = comment?.id ?? comment?.comment_id;
    if (!commentId) return;
    const username = decodeHtml(comment?.user?.username || comment?.user?.full_name || comment?.user?.name || 'user');
    setReplyingTo({ commentId, username });
    setTimeout(() => inputRef.current?.focus(), 120);
  }, []);

  const openShareSheet = useCallback(() => {
    setShareVisible(true);
  }, []);

  const handleExternalShare = useCallback(async () => {
    try {
      await Share.share({
        message: reelLink,
        url: reelLink,
      });
    } catch {}
  }, [reelLink]);

  const handleTimelineShare = useCallback(async () => {
    if (timelineSharing) return;
    setTimelineSharing(true);
    try {
      const res = await shareReel(postId, token);
      if (res !== null) {
        setShareVisible(false);
        useStore.getState().showToast?.('Shared to your timeline', '📤');
      } else {
        Alert.alert('Could not share', 'Please try again.');
      }
    } catch {
      Alert.alert('Could not share', 'Please try again.');
    } finally {
      setTimelineSharing(false);
    }
  }, [postId, timelineSharing, token]);

  const handleSendToFriend = useCallback(async (friend) => {
    const uid = friend?.id ?? friend?.user_id;
    if (!uid || sendingTo) return;
    setSendingTo(uid);
    try {
      const startRes = await fetch(`${BASE_URL}/api/v1/messages/start.php`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: uid }),
      });
      const startText = await startRes.text();
      let startJson = null;
      try { startJson = JSON.parse(startText); } catch {}
      const conversationId =
        startJson?.data?.conversation_id ??
        startJson?.data?.id ??
        startJson?.data?.conversation?.id ??
        startJson?.conversation_id ??
        startJson?.conversation?.id ??
        startJson?.id ??
        null;

      if (!conversationId) {
        Alert.alert('Could not send', startJson?.message || 'Unable to start conversation.');
        return;
      }

      const message = reelLink;
      const body = `conversation_id=${encodeURIComponent(conversationId)}&message=${encodeURIComponent(message)}`;
      const sendRes = await fetch(`${BASE_URL}/api/v1/messages/send.php`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });
      const sendText = await sendRes.text();
      let sendJson = null;
      try { sendJson = JSON.parse(sendText); } catch {}
      if (sendJson?.status === 'success' || sendRes.ok) {
        setShareVisible(false);
        useStore.getState().showToast?.('Reel sent', '🔥');
      } else {
        Alert.alert('Could not send', sendJson?.message || 'Please try again.');
      }
    } catch {
      Alert.alert('Could not send', 'Network error. Please try again.');
    } finally {
      setSendingTo(null);
    }
  }, [postId, reelLink, sendingTo, token]);

  const isLiked = !!myReaction;
  const myAvatar = getAvatar(authUser);

  return (
    <>
      <View style={styles.container}>
        <ActionButton
          icon="heart-outline"
          activeIcon="heart"
          active={isLiked}
          count={localLikesCount}
          activeColor="#F43F5E"
          onPress={() => sendReaction('like')}
        />
        <ActionButton
          icon="chatbubble-ellipses-outline"
          activeIcon="chatbubble-ellipses"
          count={commentCount}
          onPress={openComments}
        />
        <ActionButton
          icon="bookmark-outline"
          activeIcon="bookmark"
          active={saved}
          label={saved ? 'Saved' : 'Save'}
          activeColor={ACCENT}
          onPress={handleSave}
        />
        <ActionButton
          icon="paper-plane-outline"
          activeIcon="paper-plane"
          label="Share"
          onPress={openShareSheet}
        />
      </View>

      <Modal
        visible={shareVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShareVisible(false)}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShareVisible(false)} />
        <View style={[styles.shareSheet, { paddingBottom: Math.max(safeBottom + 14, 24) }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.shareHeader}>
            <View>
              <Text style={styles.shareTitle}>Share this reel</Text>
              <Text style={styles.shareSub}>Send it like a streak, post it, or share the link.</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShareVisible(false)} activeOpacity={0.78}>
              <Ionicons name="close" size={20} color={BRAND} />
            </TouchableOpacity>
          </View>

          <View style={styles.shareActions}>
            <TouchableOpacity style={styles.shareAction} activeOpacity={0.84} onPress={handleTimelineShare}>
              <LinearGradient colors={[alpha(ACCENT, 0.18), alpha(ACCENT, 0.08)]} style={styles.shareActionIcon}>
                {timelineSharing ? <ActivityIndicator size="small" color={ACCENT} /> : <Ionicons name="repeat" size={20} color={ACCENT} />}
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.shareActionTitle}>Share to timeline</Text>
                <Text style={styles.shareActionSub}>Repost this reel on your Hafrik feed.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={MUTED} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareAction} activeOpacity={0.84} onPress={handleExternalShare}>
              <LinearGradient colors={[alpha(BRAND, 0.16), alpha(BRAND, 0.06)]} style={styles.shareActionIcon}>
                <Ionicons name="link" size={20} color={BRAND} />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.shareActionTitle}>Share external link</Text>
                <Text style={styles.shareActionSub}>Send to WhatsApp, WeChat, Instagram, or anywhere.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={MUTED} />
            </TouchableOpacity>
          </View>

          <View style={styles.friendSectionHead}>
            <Text style={styles.friendSectionTitle}>Send as streak</Text>
            <Text style={styles.friendSectionSub}>{friends.length ? `${friends.length} friends` : 'Your Hafrik friends'}</Text>
          </View>

          {friendsLoading ? (
            <View style={styles.friendsLoader}>
              <ActivityIndicator color={ACCENT} />
              <Text style={styles.friendsLoaderText}>Loading friends...</Text>
            </View>
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(item, index) => `share-friend-${item?.id ?? item?.user_id ?? index}-${index}`}
              renderItem={({ item }) => (
                <FriendShareRow
                  item={item}
                  sending={String(sendingTo) === String(item?.id ?? item?.user_id)}
                  onPress={() => handleSendToFriend(item)}
                />
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.friendsList}
              ListEmptyComponent={
                <View style={styles.noFriendsBox}>
                  <Ionicons name="people-outline" size={24} color={BRAND} />
                  <Text style={styles.noFriendsTitle}>No friends to send yet</Text>
                  <Text style={styles.noFriendsSub}>Follow people first, then send reels directly to them.</Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onShow={() => setTimeout(() => inputRef.current?.focus(), 280)}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setModalVisible(false)} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.sheet, { paddingBottom: safeBottom }]}
        >
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Comments</Text>
              <Text style={styles.sheetSub}>{comments.length || commentCount || 0} responses</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)} activeOpacity={0.78}>
              <Ionicons name="close" size={20} color={BRAND} />
            </TouchableOpacity>
          </View>

          {loadingCmts ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator color={ACCENT} size="large" />
              <Text style={styles.loaderText}>Loading comments...</Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item, index) => `reel-comment-${item?.id ?? item?.comment_id ?? index}-${index}`}
              renderItem={({ item }) => <CommentItem item={item} onReply={handleReply} />}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <LinearGradient colors={[alpha(BRAND, 0.08), alpha(ACCENT, 0.13)]} style={styles.emptyIcon}>
                    <Ionicons name="chatbubbles-outline" size={38} color={BRAND} />
                  </LinearGradient>
                  <Text style={styles.emptyTitle}>Start the conversation</Text>
                  <Text style={styles.emptySub}>Your comment can be the first one here.</Text>
                </View>
              }
            />
          )}

          <View style={styles.inputBar}>
            {!!replyingTo && (
              <View style={styles.replyBanner}>
                <View style={styles.replyBar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.replyTitle}>Replying to @{replyingTo.username}</Text>
                  <Text style={styles.replySub}>Your reply will stay under this comment</Text>
                </View>
                <TouchableOpacity style={styles.replyClose} onPress={() => setReplyingTo(null)} activeOpacity={0.75}>
                  <Ionicons name="close" size={16} color={BRAND} />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.inputRow}>
              <ExpoImage source={{ uri: myAvatar }} style={styles.inputAvatar} contentFit="cover" cachePolicy="memory-disk" />
              <View style={styles.inputWrap}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  placeholder={replyingTo ? `Reply to @${replyingTo.username}...` : 'Add a comment...'}
                  placeholderTextColor={MUTED}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={500}
                  returnKeyType="send"
                  onSubmitEditing={handleSubmitComment}
                />
              </View>
              <TouchableOpacity
                activeOpacity={0.82}
                style={[styles.sendBtn, (!commentText.trim() || submitting) && styles.sendBtnOff]}
                onPress={handleSubmitComment}
                disabled={submitting || !commentText.trim()}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={WHITE} />
                ) : (
                  <Ionicons name="arrow-up" size={18} color={WHITE} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    width: 56,
    alignItems: 'center',
    gap: 14,
  },
  actionItem: {
    alignItems: 'center',
    width: 56,
  },
  actionCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha('#000000', 0.2),
    borderWidth: 1,
    borderColor: alpha(WHITE, 0.12),
  },
  actionLabel: {
    color: alpha(WHITE, 0.92),
    fontSize: 10.5,
    fontWeight: '900',
    marginTop: 2,
    textShadowColor: alpha('#000000', 0.7),
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  shareSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 18,
    paddingTop: 10,
    maxHeight: SCREEN_H * 0.74,
  },
  shareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 16,
  },
  shareTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: BRAND,
    fontFamily: 'ReadexPro-Bold',
  },
  shareSub: {
    color: MUTED,
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 3,
  },
  shareActions: {
    gap: 10,
    marginBottom: 18,
  },
  shareAction: {
    minHeight: 70,
    borderRadius: 22,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shareActionIcon: {
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareActionTitle: {
    color: DARK,
    fontSize: 14.5,
    fontWeight: '900',
  },
  shareActionSub: {
    color: MUTED,
    fontSize: 11.5,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 2,
  },
  friendSectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  friendSectionTitle: {
    color: BRAND,
    fontSize: 16,
    fontWeight: '900',
  },
  friendSectionSub: {
    color: MUTED,
    fontSize: 11.5,
    fontWeight: '800',
  },
  friendsList: {
    gap: 10,
    paddingRight: 18,
    paddingBottom: 2,
  },
  friendRow: {
    width: 112,
    borderRadius: 24,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 10,
    alignItems: 'center',
  },
  friendAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: alpha(BRAND, 0.08),
  },
  friendTextWrap: {
    alignItems: 'center',
    marginTop: 8,
    minHeight: 36,
  },
  friendName: {
    color: DARK,
    fontSize: 12.5,
    fontWeight: '900',
    textAlign: 'center',
  },
  friendUsername: {
    color: MUTED,
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 1,
    textAlign: 'center',
  },
  friendSendBtn: {
    marginTop: 9,
    height: 31,
    borderRadius: 16,
    paddingHorizontal: 10,
    backgroundColor: ACCENT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    alignSelf: 'stretch',
  },
  friendSendBtnLoading: {
    backgroundColor: alpha(ACCENT, 0.72),
  },
  friendSendTxt: {
    color: WHITE,
    fontSize: 11.5,
    fontWeight: '900',
  },
  friendsLoader: {
    height: 138,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  friendsLoaderText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '800',
  },
  noFriendsBox: {
    width: 260,
    minHeight: 126,
    borderRadius: 24,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    justifyContent: 'center',
    gap: 4,
  },
  noFriendsTitle: {
    color: DARK,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 4,
  },
  noFriendsSub: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  backdrop: {
    flex: 1,
    backgroundColor: alpha('#000000', 0.54),
  },
  sheet: {
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: SCREEN_H * 0.78,
    minHeight: SCREEN_H * 0.58,
    overflow: 'hidden',
  },
  sheetHandle: {
    width: 46,
    height: 5,
    borderRadius: 3,
    backgroundColor: alpha(BRAND, 0.18),
    alignSelf: 'center',
    marginTop: 11,
    marginBottom: 13,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  sheetTitle: {
    color: DARK,
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'ReadexPro-Bold',
  },
  sheetSub: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loaderText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 18,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  emptyTitle: {
    color: DARK,
    fontSize: 17,
    fontWeight: '900',
  },
  emptySub: {
    color: MUTED,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 6,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 15,
  },
  commentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: alpha(BRAND, 0.08),
  },
  commentMiddle: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: CARD,
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: BORDER,
  },
  commentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  commentAuthor: {
    maxWidth: '58%',
    color: DARK,
    fontSize: 13,
    fontWeight: '900',
  },
  commentUsername: {
    flex: 1,
    color: MUTED,
    fontSize: 11.5,
    fontWeight: '700',
  },
  commentText: {
    color: DARK,
    fontSize: 13.5,
    lineHeight: 20,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 6,
    paddingLeft: 7,
  },
  commentMetaText: {
    color: MUTED,
    fontSize: 11.5,
    fontWeight: '800',
  },
  commentLike: {
    alignItems: 'center',
    paddingTop: 12,
    width: 30,
  },
  commentLikeText: {
    color: MUTED,
    fontSize: 10.5,
    fontWeight: '800',
    marginTop: 2,
  },
  inputBar: {
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: Platform.OS === 'ios' ? 8 : 12,
    backgroundColor: CARD,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: alpha(ACCENT, 0.1),
    borderWidth: 1,
    borderColor: alpha(ACCENT, 0.18),
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  replyBar: {
    width: 3,
    height: 32,
    borderRadius: 2,
    backgroundColor: ACCENT,
  },
  replyTitle: {
    color: BRAND,
    fontSize: 12,
    fontWeight: '900',
  },
  replySub: {
    color: MUTED,
    fontSize: 11,
    marginTop: 1,
  },
  replyClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: alpha(BRAND, 0.08),
  },
  inputWrap: {
    flex: 1,
    minHeight: 40,
    maxHeight: 96,
    borderRadius: 22,
    backgroundColor: SHEET_BG,
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: 'center',
  },
  input: {
    color: DARK,
    fontSize: 13.5,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 7,
    maxHeight: 92,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: {
    backgroundColor: alpha(BRAND, 0.16),
  },
});

export default ReelEngagementBar;
