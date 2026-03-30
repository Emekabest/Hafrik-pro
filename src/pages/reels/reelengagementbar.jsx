import React, { useCallback, useState, useEffect } from 'react';
import {
  ActivityIndicator,
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
import { addComment, fetchComments, shareReel, toggleSave, toggleLike } from './reelsApi';
import useStore from '../../repository/store';
import { Colors } from '../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};

/** Decode common HTML entities + numeric/hex codes + strip tags */
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

const ACCENT = Colors.primary;
const SHEET_BG = Colors.deepSlate;

const CommentItem = ({ item }) => (
  <View style={styles.commentRow}>
    <View style={styles.avatarRing}>
      <ExpoImage
        source={{ uri: item.user?.avatar }}
        style={styles.commentAvatar}
        contentFit="cover"
      />
    </View>
    <View style={styles.commentBody}>
      <View style={styles.commentHeader}>
        <Text style={styles.commentUsername}>{item.user?.username ?? 'User'}</Text>
        {item.time ? <Text style={styles.commentTime}>{item.time}</Text> : null}
      </View>
      <Text style={styles.commentText}>{decodeHtml(item.text)}</Text>
    </View>
  </View>
);


const ReelEngagementBar = ({
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
}) => {
  const [saved, setSaved] = useState(isSavedInitial);
  const [commentCount, setCommentCount] = useState(initialCommentCount ?? 0);
  const [modalVisible, setModalVisible] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myReaction, setMyReaction] = useState(initialMyReaction || (liked ? 'like' : null));

  // Sync from props when post changes
  useEffect(() => {
    setMyReaction(initialMyReaction || (liked ? 'like' : null));
  }, [postId, initialMyReaction, liked]);

  useEffect(() => {
    setSaved(isSavedInitial);
  }, [postId, isSavedInitial]);

  /** Send a reaction via API — handles toggle */
  const sendReaction = useCallback(async (reactionType) => {
    const isRemoving = myReaction === reactionType;
    const newReaction = isRemoving ? null : reactionType;
    setMyReaction(newReaction);

    // Call parent for immediate heart/count update
    if (onLikePress) onLikePress(reactionType);

    // Sync to Zustand store
    const { feeds, updateFeedById } = useStore.getState();
    const currentFeed = feeds.feedsById[postId];
    if (currentFeed) {
      updateFeedById(postId, {
        ...currentFeed,
        is_liked: !isRemoving,
        my_reaction: newReaction,
      });
    }

    try {
      const res = await toggleLike(postId, token, reactionType);
      if (res) {
        const serverReaction = res.my_reaction || null;
        setMyReaction(serverReaction);
        // Sync server truth to store
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
    const prev = saved;
    const newSaved = !prev;
    setSaved(newSaved);

    // Sync to store
    const { feeds, updateFeedById } = useStore.getState();
    const currentFeed = feeds.feedsById[postId];
    if (currentFeed) {
      updateFeedById(postId, { ...currentFeed, is_saved: newSaved });
    }

    try {
      const res = await toggleSave(postId, token);
      if (res) {
        const serverSaved = !!res.is_saved;
        setSaved(serverSaved);
        const feed = useStore.getState().feeds.feedsById[postId];
        if (feed) {
          useStore.getState().updateFeedById(postId, { ...feed, is_saved: serverSaved });
        }
      }
    } catch {
      setSaved(prev);
      if (currentFeed) {
        useStore.getState().updateFeedById(postId, currentFeed);
      }
    }
  }, [saved, postId, token]);

  const openComments = useCallback(async () => {
    setModalVisible(true);
    setLoadingComments(true);
    try {
      const data = await fetchComments(postId, token);
      setComments(Array.isArray(data) ? data : []);
    } catch {
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, [postId, token]);

  const handleSubmitComment = useCallback(async () => {
    const text = commentText.trim();
    if (!text || submitting) return;
    Keyboard.dismiss();
    setSubmitting(true);
    try {
      await addComment(postId, text, token);
      setCommentText('');
      setCommentCount(c => c + 1);

      // Sync comment count to store
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
      // silent fail
    } finally {
      setSubmitting(false);
    }
  }, [commentText, postId, token, submitting]);

  const handleShare = useCallback(async () => {
    try {
      await shareReel(postId, token);

      // Sync share count to store
      const { feeds, updateFeedById } = useStore.getState();
      const currentFeed = feeds.feedsById[postId];
      if (currentFeed) {
        updateFeedById(postId, {
          ...currentFeed,
          shares_count: (Number(currentFeed.shares_count ?? currentFeed.shares ?? 0)) + 1,
        });
      }

      await Share.share({ message: 'Check out this reel on Hafrik!' });
    } catch {
      // silent
    }
  }, [postId, token]);

  const isLiked = !!myReaction;

  return (
    <>
      <View style={styles.container}>
        {/* Like */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.item}
          onPress={() => sendReaction('like')}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={30}
            color={isLiked ? Colors.warningPink : Colors.white}
            style={isLiked ? styles.likedGlow : undefined}
          />
          <Text style={styles.count}>{likesCount ?? 0}</Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity activeOpacity={0.7} style={styles.item} onPress={openComments}>
          <Ionicons name="chatbubble-ellipses" size={28} color={Colors.white} />
          <Text style={styles.count}>{commentCount}</Text>
        </TouchableOpacity>

        {/* Save */}
        <TouchableOpacity activeOpacity={0.7} style={styles.item} onPress={handleSave}>
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={28}
            color={saved ? ACCENT : Colors.white}
          />
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity activeOpacity={0.7} style={styles.item} onPress={handleShare}>
          <Ionicons name="paper-plane-outline" size={28} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* ── Comments Bottom Sheet ─────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheet}
        >
          {/* Handle + Title row */}
          <View style={styles.sheetTop}>
            <View style={styles.sheetHandle} />
            <View style={styles.titleRow}>
              <Text style={styles.sheetTitle}>Comments</Text>
              <Text style={styles.commentBadge}>
                {comments.length || commentCount}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {loadingComments ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator color={ACCENT} size="large" />
              <Text style={styles.loaderText}>Loading comments…</Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => <CommentItem item={item} />}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Ionicons name="chatbubble-outline" size={44} color={Colors.mutedBlueGray} />
                  <Text style={styles.emptyTitle}>No comments yet</Text>
                  <Text style={styles.emptySub}>Be the first to share your thoughts</Text>
                </View>
              }
            />
          )}

          {/* Input bar */}
          <View style={styles.inputBar}>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Write a comment…"
                placeholderTextColor={Colors.mutedBlueGray}
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
              style={[
                styles.sendBtn,
                (!commentText.trim() || submitting) && styles.sendBtnDisabled,
              ]}
              onPress={handleSubmitComment}
              disabled={submitting || !commentText.trim()}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons name="arrow-up" size={18} color={Colors.white} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    paddingBottom: 8,
  },
  item: {
    alignItems: 'center',
    marginVertical: 8,
  },
  count: {
    color: Colors.white,
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 12,
    marginTop: 4,
    textShadowColor: withOpacity(Colors.black, 0.75),
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  likedGlow: {
    shadowColor: Colors.warningPink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },

  /* ── Modal / Sheet ─────────────────────────────────────────────── */
  backdrop: {
    flex: 1,
    backgroundColor: withOpacity(Colors.black, 0.55),
  },
  sheet: {
    backgroundColor: Colors.deepSlateAlt,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '65%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    overflow: 'hidden',
  },
  sheetTop: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 2,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: withOpacity(Colors.mutedBlueGray, 0.4),
    alignSelf: 'center',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sheetTitle: {
    color: Colors.white,
    fontFamily: 'WorkSans_700Bold',
    fontSize: 17,
    letterSpacing: 0.2,
  },
  commentBadge: {
    backgroundColor: withOpacity(ACCENT, 0.2),
    color: ACCENT,
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: withOpacity(Colors.mutedBlueGray, 0.15),
    marginHorizontal: 0,
  },

  /* ── Loading / Empty states ────────────────────────────────────── */
  loaderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loaderText: {
    color: Colors.mutedBlueGray,
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    color: Colors.mist,
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 16,
    marginTop: 4,
  },
  emptySub: {
    color: Colors.mutedBlueGray,
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
  },

  /* ── Comment list ──────────────────────────────────────────────── */
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  commentRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  avatarRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: withOpacity(ACCENT, 0.35),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.blueGreenDeep,
  },
  commentBody: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  commentUsername: {
    color: Colors.white,
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 13,
  },
  commentText: {
    color: withOpacity(Colors.mist, 0.9),
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13.5,
    lineHeight: 19,
  },
  commentTime: {
    color: Colors.mutedBlueGray,
    fontFamily: 'WorkSans_400Regular',
    fontSize: 11,
  },

  /* ── Input bar ─────────────────────────────────────────────────── */
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: withOpacity(Colors.mutedBlueGray, 0.12),
  },
  inputWrap: {
    flex: 1,
    backgroundColor: withOpacity(Colors.blueGreenDark, 0.6),
    borderRadius: 22,
    borderWidth: 1,
    borderColor: withOpacity(Colors.mutedBlueGray, 0.15),
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: Colors.white,
    fontFamily: 'WorkSans_400Regular',
    fontSize: 14,
    maxHeight: 80,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  sendBtnDisabled: {
    backgroundColor: withOpacity(Colors.mutedBlueGray, 0.3),
    shadowOpacity: 0,
    elevation: 0,
  },

});

export default ReelEngagementBar;
