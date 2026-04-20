import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator,
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
import RepostModal from '../home/feeds/feedcardproperties/RepostModal';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../AuthContext';
import { addComment, fetchComments, shareReel, toggleSave, toggleLike } from './reelsApi';
import useStore from '../../repository/store';
import { Colors } from '../../theme/colors';

const { height: SCREEN_H } = Dimensions.get('window');

const withOpacity = (hex, opacity) => {
  const normalized = (hex || '').replace('#', '');
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${normalized}${alpha}`;
};

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

const ACCENT  = Colors.primary;
const DEFAULT_AVATAR = 'https://hafrik.com/assets/images/default_avatar.png';

// ─── Comment row ───────────────────────────────────────────────────────────────
const CommentItem = ({ item }) => {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(Number(item.likes ?? 0));
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleLike = useCallback(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.4, useNativeDriver: true, speed: 50, bounciness: 0 }),
      Animated.spring(scaleAnim, { toValue: 1,   useNativeDriver: true, speed: 14, bounciness: 14 }),
    ]).start();
    setLiked(l => {
      setLikes(n => l ? Math.max(0, n - 1) : n + 1);
      return !l;
    });
  }, [scaleAnim]);

  const avatar = item.user?.avatar?.startsWith('http') ? item.user.avatar : DEFAULT_AVATAR;

  return (
    <View style={styles.commentRow}>
      <ExpoImage
        source={{ uri: avatar }}
        style={styles.commentAvatar}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <View style={styles.commentContent}>
        <View style={styles.commentBubble}>
          <Text style={styles.commentAuthor}>{item.user?.username ?? 'User'}</Text>
          <Text style={styles.commentText}>{decodeHtml(item.text)}</Text>
        </View>
        <View style={styles.commentMeta}>
          {item.time ? <Text style={styles.commentTime}>{item.time}</Text> : null}
          <TouchableOpacity onPress={() => {}} activeOpacity={0.7}>
            <Text style={styles.replyBtn}>Reply</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={styles.commentLike} onPress={handleLike} activeOpacity={0.7}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={15}
            color={liked ? Colors.warningPink : withOpacity(Colors.white, 0.45)}
          />
        </Animated.View>
        {likes > 0 ? <Text style={[styles.commentLikeCount, liked && { color: Colors.warningPink }]}>{likes}</Text> : null}
      </TouchableOpacity>
    </View>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────
const ReelEngagementBar = forwardRef(({
  postId,
  userId,
  token,
  liked,
  likesCount,
  onLikePress,
  myReaction: initialMyReaction = null,
  reactions: initialReactions = null,
  commentCount: initialCommentCount,
  isSavedInitial = false,
}, ref) => {
  const { user: authUser } = useAuth();
  const { bottom: safeBottom } = useSafeAreaInsets();

  const [saved,         setSaved]         = useState(isSavedInitial);
  const [commentCount,  setCommentCount]  = useState(initialCommentCount ?? 0);
  const [modalVisible,  setModalVisible]  = useState(false);
  const [repostVisible, setRepostVisible] = useState(false);
  const [comments,      setComments]      = useState([]);
  const [loadingCmts,   setLoadingCmts]   = useState(false);
  const [commentText,   setCommentText]   = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const [myReaction,    setMyReaction]    = useState(initialMyReaction || (liked ? 'like' : null));

  const inputRef = useRef(null);

  useEffect(() => {
    setMyReaction(initialMyReaction || (liked ? 'like' : null));
  }, [postId, initialMyReaction, liked]);

  useEffect(() => {
    setSaved(isSavedInitial);
  }, [postId, isSavedInitial]);

  const sendReaction = useCallback(async (reactionType) => {
    const isRemoving  = myReaction === reactionType;
    const newReaction = isRemoving ? null : reactionType;
    setMyReaction(newReaction);
    if (onLikePress) onLikePress(reactionType);

    const { feeds, updateFeedById } = useStore.getState();
    const currentFeed = feeds.feedsById[postId];
    if (currentFeed) {
      updateFeedById(postId, { ...currentFeed, is_liked: !isRemoving, my_reaction: newReaction });
    }

    try {
      const res = await toggleLike(postId, token, reactionType);
      if (res) {
        const serverReaction = res.my_reaction || null;
        setMyReaction(serverReaction);
        const feed = useStore.getState().feeds.feedsById[postId];
        if (feed) {
          const serverReactions = res.reactions || null;
          let serverTotal = likesCount;
          if (serverReactions && typeof serverReactions === 'object') {
            serverTotal = Object.values(serverReactions).reduce((a, b) => a + Number(b || 0), 0);
          }
          useStore.getState().updateFeedById(postId, {
            ...useStore.getState().feeds.feedsById[postId],
            is_liked: !!res.is_reacted,
            my_reaction: serverReaction,
            likes_count: serverTotal,
            reactions: serverReactions || feed.reactions,
          });
        }
      }
    } catch {}
  }, [myReaction, postId, token, onLikePress, likesCount]);

  const handleSave = useCallback(async () => {
    const prev    = saved;
    const newSaved = !prev;
    setSaved(newSaved);
    const { feeds, updateFeedById } = useStore.getState();
    const currentFeed = feeds.feedsById[postId];
    if (currentFeed) updateFeedById(postId, { ...currentFeed, is_saved: newSaved });
    try {
      const res = await toggleSave(postId, token);
      if (res) {
        const serverSaved = !!res.is_saved;
        setSaved(serverSaved);
        const feed = useStore.getState().feeds.feedsById[postId];
        if (feed) useStore.getState().updateFeedById(postId, { ...feed, is_saved: serverSaved });
      }
    } catch {
      setSaved(prev);
      if (currentFeed) useStore.getState().updateFeedById(postId, currentFeed);
    }
  }, [saved, postId, token]);

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
    // Auto-focus input after sheet opens
    setTimeout(() => inputRef.current?.focus(), 400);
  }, [postId, token]);

  useImperativeHandle(ref, () => ({ openComments }), [openComments]);

  const handleSubmitComment = useCallback(async () => {
    const text = commentText.trim();
    if (!text || submitting) return;
    Keyboard.dismiss();
    setSubmitting(true);
    try {
      await addComment(postId, text, token);
      setCommentText('');
      setCommentCount(c => c + 1);
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
    } catch {} finally {
      setSubmitting(false);
    }
  }, [commentText, postId, token, submitting]);

  const handleShare = useCallback(async () => {
    try {
      await shareReel(postId, token);
      const { feeds, updateFeedById } = useStore.getState();
      const currentFeed = feeds.feedsById[postId];
      if (currentFeed) {
        updateFeedById(postId, {
          ...currentFeed,
          shares_count: (Number(currentFeed.shares_count ?? currentFeed.shares ?? 0)) + 1,
        });
      }
      const link = `https://hafrik.com/post/${postId}`;
      await Share.share({
        message: `Check out this reel on Hafrik! ${link}`,
        url: link,
      });
    } catch {}
  }, [postId, token]);

  const isLiked = !!myReaction;
  const myAvatar = authUser?.avatar?.startsWith('http') ? authUser.avatar : DEFAULT_AVATAR;

  return (
    <>
      {/* ── Engagement icons ─────────────────────────────────────────── */}
      <View style={styles.container}>
        {/* Like */}
        <TouchableOpacity activeOpacity={0.7} style={styles.item} onPress={() => sendReaction('like')}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={26}
            color={isLiked ? Colors.warningPink : Colors.white}
            style={isLiked ? styles.likedGlow : undefined}
          />
          <Text style={styles.count}>{likesCount ?? 0}</Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity activeOpacity={0.7} style={styles.item} onPress={openComments}>
          <Ionicons name="chatbubble-ellipses" size={24} color={Colors.white} />
          <Text style={styles.count}>{commentCount}</Text>
        </TouchableOpacity>

        {/* Save */}
        <TouchableOpacity activeOpacity={0.7} style={styles.item} onPress={handleSave}>
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={24}
            color={saved ? ACCENT : Colors.white}
          />
          {saved ? <Text style={[styles.count, { color: ACCENT }]}>Saved</Text> : <Text style={styles.count}>Save</Text>}
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity activeOpacity={0.7} style={styles.item} onPress={handleShare}>
          <Ionicons name="paper-plane-outline" size={24} color={Colors.white} />
          <Text style={styles.count}>Share</Text>
        </TouchableOpacity>

        {/* Repost */}
        <TouchableOpacity activeOpacity={0.7} style={styles.item} onPress={() => setRepostVisible(true)}>
          <Ionicons name="repeat-outline" size={24} color={Colors.white} />
          <Text style={styles.count}>Repost</Text>
        </TouchableOpacity>
      </View>

      {/* ── Repost Modal ─────────────────────────────────────────────── */}
      <RepostModal
        visible={repostVisible}
        postId={postId}
        onClose={() => setRepostVisible(false)}
        onRepostWithComment={() => setRepostVisible(false)}
      />

      {/* ── Comments Sheet ────────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setModalVisible(false)}
      >
        {/* Tap backdrop to close */}
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setModalVisible(false)} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.sheet, { paddingBottom: safeBottom }]}
        >
          {/* ── Sheet header ─── */}
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Comments</Text>
            <View style={styles.sheetBadge}>
              <Text style={styles.sheetBadgeTxt}>{comments.length || commentCount}</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={withOpacity(Colors.white, 0.6)} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* ── Comment list ─── */}
          {loadingCmts ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator color={ACCENT} size="large" />
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item, i) => String(item?.id ?? `comment-${postId}-${i}`)}
              renderItem={({ item }) => <CommentItem item={item} />}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="chatbubbles-outline" size={38} color={withOpacity(Colors.white, 0.25)} />
                  </View>
                  <Text style={styles.emptyTitle}>No comments yet</Text>
                  <Text style={styles.emptySub}>Be the first to leave one</Text>
                </View>
              }
            />
          )}

          {/* ── Input bar ─── */}
          <View style={styles.inputBar}>
            <ExpoImage
              source={{ uri: myAvatar }}
              style={styles.inputAvatar}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            <View style={styles.inputWrap}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Add a comment…"
                placeholderTextColor={withOpacity(Colors.white, 0.35)}
                value={commentText}
                onChangeText={setCommentText}
                returnKeyType="send"
                onSubmitEditing={handleSubmitComment}
                multiline
                maxLength={500}
              />
            </View>
            <TouchableOpacity
              activeOpacity={0.75}
              style={[styles.sendBtn, (!commentText.trim() || submitting) && styles.sendBtnOff]}
              onPress={handleSubmitComment}
              disabled={submitting || !commentText.trim()}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons name="arrow-up" size={17} color={Colors.white} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  // ── Engagement icons ──────────────────────────────────────────────────
  container: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    paddingBottom: 6,
  },
  item: {
    alignItems: 'center',
    marginVertical: 7,
  },
  count: {
    color: Colors.white,
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 12,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  likedGlow: {
    shadowColor: Colors.warningPink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },

  // ── Sheet ─────────────────────────────────────────────────────────────
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#1a1f2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_H * 0.75,
    overflow: 'hidden',
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: withOpacity(Colors.white, 0.2),
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  sheetTitle: {
    color: Colors.white,
    fontFamily: 'WorkSans_700Bold',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  sheetBadge: {
    marginLeft: 8,
    backgroundColor: withOpacity(ACCENT, 0.18),
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sheetBadgeTxt: {
    color: ACCENT,
    fontSize: 12,
    fontFamily: 'WorkSans_600SemiBold',
  },
  closeBtn: {
    marginLeft: 'auto',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: withOpacity(Colors.white, 0.08),
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: withOpacity(Colors.white, 0.07),
    marginHorizontal: 0,
  },

  // ── Loader / Empty ────────────────────────────────────────────────────
  loaderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: withOpacity(Colors.white, 0.05),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    color: withOpacity(Colors.white, 0.7),
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 15,
  },
  emptySub: {
    color: withOpacity(Colors.white, 0.35),
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
  },

  // ── Comment rows ──────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: withOpacity(Colors.white, 0.08),
    marginRight: 10,
    flexShrink: 0,
  },
  commentContent: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: withOpacity(Colors.white, 0.06),
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  commentAuthor: {
    color: Colors.white,
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 12.5,
    marginBottom: 3,
  },
  commentText: {
    color: withOpacity(Colors.white, 0.88),
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13.5,
    lineHeight: 19,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 5,
    paddingHorizontal: 4,
  },
  commentTime: {
    color: withOpacity(Colors.white, 0.35),
    fontFamily: 'WorkSans_400Regular',
    fontSize: 11,
  },
  replyBtn: {
    color: withOpacity(Colors.white, 0.45),
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 12,
  },
  commentLike: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 10,
    paddingLeft: 10,
    gap: 2,
  },
  commentLikeCount: {
    color: withOpacity(Colors.white, 0.45),
    fontFamily: 'WorkSans_500Medium',
    fontSize: 10,
  },

  // ── Input bar ─────────────────────────────────────────────────────────
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 6 : 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: withOpacity(Colors.white, 0.07),
    backgroundColor: '#1a1f2e',
  },
  inputAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: withOpacity(Colors.white, 0.08),
    flexShrink: 0,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: withOpacity(Colors.white, 0.07),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: withOpacity(Colors.white, 0.1),
    minHeight: 38,
    justifyContent: 'center',
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 9 : 7,
    color: Colors.white,
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13.5,
    maxHeight: 80,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendBtnOff: {
    backgroundColor: withOpacity(Colors.white, 0.1),
  },
});

export default ReelEngagementBar;
