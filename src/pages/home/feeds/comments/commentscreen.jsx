import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  ActivityIndicator, FlatList, StatusBar, Animated, Share, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';

import CommentMainPostContent from './commentpost/commentmainpostcontent';
import { useAuth } from '../../../../AuthContext';
import getUserPostInteractionController from '../../../../controllers/getuserpostinteractioncontroller';
import { GetCommentsController } from '../../../../controllers/commentscontroller';
import { CommentItem } from './commentsbonds';
import AddComment from './addcomment';
import { Colors } from '../../../../theme/colors';
import { Spacing } from '../../../../theme/spacing';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || '').replace('#', '');
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0');
  return `#${normalized}${alpha}`;
};

const BASE   = 'https://hafrik.com';
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const CREAM  = Colors.background;
const DARK   = Colors.deepSlate;
const MUTED  = Colors.secondaryText;

// Fire-and-forget — track that user viewed this post
const trackView = async (postId, token) => {
  try {
    await axios.post(
      `${BASE}/api/v1/feed/add_view.php`,
      { post_id: postId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch { /* silent */ }
};

const PostMemo = React.memo(CommentMainPostContent);

// ── List header extracted as a proper memo component ──────────────────────────
// This prevents the FlatList from treating it as a volatile inline element,
// which was the root cause of the VirtualizedList slow-update warning.
const PostListHeader = React.memo(({
  post, isLeaving, loading, commentsLoading,
  viewCount, likeCount, commentCount, shareCount, textInputRef,
}) => {
  if (!post && loading) return null;
  return (
    <>
      <PostMemo post={post} isLeaving={isLeaving} textInputRef={textInputRef} />

      {!loading && post && (
        <View style={cs.statsStrip}>
          <View style={cs.statItem}>
            <Ionicons name="eye-outline" size={14} color={MUTED} />
            <Text style={cs.statTxt}>{viewCount.toLocaleString()} views</Text>
          </View>
          <View style={cs.statDot} />
          <View style={cs.statItem}>
            <Ionicons name="heart-outline" size={14} color={MUTED} />
            <Text style={cs.statTxt}>{likeCount.toLocaleString()} likes</Text>
          </View>
          <View style={cs.statDot} />
          <View style={cs.statItem}>
            <Ionicons name="chatbubble-outline" size={14} color={MUTED} />
            <Text style={cs.statTxt}>{commentCount.toLocaleString()} comments</Text>
          </View>
          <View style={cs.statDot} />
          <View style={cs.statItem}>
            <Ionicons name="share-social-outline" size={14} color={MUTED} />
            <Text style={cs.statTxt}>{shareCount.toLocaleString()} shares</Text>
          </View>
        </View>
      )}

      <View style={cs.sectionHead}>
        <Text style={cs.sectionTitle}>Comments</Text>
        {commentsLoading && (
          <ActivityIndicator size="small" color={ACCENT} style={{ marginLeft: Spacing.sm }} />
        )}
      </View>
    </>
  );
});

// ─────────────────────────────────────────────────────────────────────────────

const CommentScreen = ({ route }) => {
  const navigation  = useNavigation();
  const { top }     = useSafeAreaInsets();
  const { user, token } = useAuth();

  const { feedId, initialPost } = route.params;

  const [post,             setPost]             = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [isLeaving,        setIsLeaving]        = useState(false);
  const [replyingTo,       setReplyingTo]       = useState(null);
  const [comments,         setComments]         = useState([]);
  const [commentsLoading,  setCommentsLoading]  = useState(true);

  const addCommentRef     = useRef(null);
  const isNavBackRef      = useRef(false);
  const headerAnim        = useRef(new Animated.Value(0)).current;

  const normalizePostPayload = useCallback((payload) => {
    if (!payload) return null;
    if (payload?.data && typeof payload.data === 'object' && payload.data !== null) return payload.data;
    return payload;
  }, []);

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    if (initialPost) setPost(normalizePostPayload(initialPost));
    loadPost();
    loadComments();
    trackView(feedId, token);
  }, [feedId, initialPost, normalizePostPayload]);

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      e.preventDefault();
      setIsLeaving(true);
      setTimeout(() => navigation.dispatch(e.data.action), 100);
    });
    return unsub;
  }, [navigation]);

  const loadPost = async () => {
    setLoading(true);
    try {
      const res = await getUserPostInteractionController(feedId, token);
      if (res.status === 200) setPost(normalizePostPayload(res.data));
    } catch { /* silent */ }
    setLoading(false);
  };

  const loadComments = async () => {
    setCommentsLoading(true);
    try {
      const res = await GetCommentsController(feedId, token);
      setComments(Array.isArray(res?.data) ? res.data : []);
    } catch { setComments([]); }
    setCommentsLoading(false);
  };

  const handleBack = useCallback(() => {
    if (isNavBackRef.current) return;
    isNavBackRef.current = true;
    navigation.goBack();
  }, [navigation]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({ message: `Check this out on Hafrik: https://hafrik.com/post/${feedId}` });
    } catch { /* user cancelled */ }
  }, [feedId]);

  const handleReply = useCallback((commentId, username) => {
    setReplyingTo({ commentId, username });
    addCommentRef.current?.focus();
  }, []);

  const handleCancelReply = useCallback(() => setReplyingTo(null), []);

  const handleCommentPosted = useCallback(() => {
    loadComments();
    setReplyingTo(null);
    setPost((p) => p ? { ...p, comments_count: (Number(p.comments_count) || 0) + 1 } : p);
  }, [feedId, token]);

  const viewCount    = Number(post?.views_count   ?? post?.view_count   ?? post?.views ?? 0);
  const commentCount = Number(post?.comments_count ?? post?.comment_count ?? 0);
  const likeCount    = Number(post?.likes_count    ?? post?.like_count    ?? 0);
  const shareCount   = Number(post?.shares         ?? post?.share_count    ?? 0);

  // Stable element for ListHeaderComponent — only recreated when data changes
  const listHeader = useMemo(() => (
    <PostListHeader
      post={post}
      isLeaving={isLeaving}
      loading={loading}
      commentsLoading={commentsLoading}
      viewCount={viewCount}
      likeCount={likeCount}
      commentCount={commentCount}
      shareCount={shareCount}
      textInputRef={addCommentRef}
    />
  ), [post, isLeaving, loading, commentsLoading, viewCount, likeCount, commentCount, shareCount]);

  const renderCommentItem = useCallback(({ item }) => (
    <CommentItem comment={item} token={token} onReply={handleReply} />
  ), [token, handleReply]);

  const keyExtractor = useCallback((item, i) => String(item.id ?? i), []);

  return (
    // Root view with safe-area top padding — header background extends into notch area
    <View style={[cs.root, { paddingTop: top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* ── Fixed clean header ──────────────────────────────────────────────── */}
      <View style={cs.header}>
        <Animated.View style={{ opacity: headerAnim, transform: [{ scale: headerAnim }] }}>
          <TouchableOpacity style={cs.headerIconBtn} onPress={handleBack} activeOpacity={0.85}>
            <Ionicons name="arrow-back" size={20} color={BRAND} />
          </TouchableOpacity>
        </Animated.View>

        <Text style={cs.headerTitle} numberOfLines={1}>Post</Text>

        <TouchableOpacity style={cs.headerIconBtn} onPress={handleShare} activeOpacity={0.85}>
          <Ionicons name="share-social-outline" size={20} color={BRAND} />
        </TouchableOpacity>
      </View>

      {/* ── Content + Comment bar wrapped in KAV ────────────────────────────── */}
      {/* KAV sits BELOW the header so keyboardVerticalOffset stays 0           */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={cs.loaderWrap}>
            <ActivityIndicator size="large" color={ACCENT} />
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={keyExtractor}
            renderItem={renderCommentItem}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={
              !commentsLoading ? (
                <View style={cs.emptyWrap}>
                  <Ionicons name="chatbubbles-outline" size={40} color={Colors.borderCool} />
                  <Text style={cs.emptyTitle}>No comments yet</Text>
                  <Text style={cs.emptySub}>Be the first to share your thoughts!</Text>
                </View>
              ) : null
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={cs.listContent}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={7}
            removeClippedSubviews
          />
        )}

        {/* ── Comment input bar (in flow, not absolute) ────────────────────── */}
        <AddComment
          ref={addCommentRef}
          user={user}
          feedId={feedId}
          token={token}
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
          onPosted={handleCommentPosted}
        />
      </KeyboardAvoidingView>
    </View>
  );
};

const cs = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },

  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // ── Fixed header ──────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: withOpacity(Colors.primaryDark, 0.08),
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: BRAND,
    letterSpacing: 0.3,
  },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surfaceTint,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Stats strip ──────────────────────────────────────────────────────────
  statsStrip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    backgroundColor: CREAM,
    borderBottomWidth: 1,
    borderBottomColor: withOpacity(Colors.primaryDark, 0.08),
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statTxt:  { fontSize: 12, color: MUTED, fontWeight: '600' },
  statDot:  { width: 3, height: 3, borderRadius: 2, backgroundColor: MUTED, marginHorizontal: Spacing.sm },

  // ── Section header ────────────────────────────────────────────────────────
  sectionHead: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: DARK, letterSpacing: 0.3 },

  listContent: { paddingBottom: Spacing.md },

  emptyWrap:  { paddingVertical: 40, alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: Colors.mutedBlueGraySoft },
  emptySub:   { fontSize: 13, color: Colors.mutedBlueGraySofter },
});

export default CommentScreen;
