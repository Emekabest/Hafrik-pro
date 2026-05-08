import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  ActivityIndicator, FlatList, StatusBar, Animated, Share, Alert,
  KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../../../../api/apiClient';

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
    await apiClient.post('/feed/add_view.php', { post_id: postId });
  } catch { /* silent */ }
};

const PostMemo = React.memo(CommentMainPostContent);

// ── List header extracted as a proper memo component ──────────────────────────
const PostListHeader = React.memo(({
  post, isLeaving, loading, commentsLoading, commentCount, textInputRef,
}) => {
  if (!post && loading) return null;
  return (
    <>
      <PostMemo post={post} isLeaving={isLeaving} textInputRef={textInputRef} />

      {/* ── Comments section divider ── */}
      <View style={cs.sectionHead}>
        <View style={cs.sectionLine} />
        <Text style={cs.sectionTitle}>
          {commentCount > 0 ? `${commentCount} Comments` : 'Comments'}
        </Text>
        <View style={cs.sectionLine} />
        {commentsLoading && (
          <ActivityIndicator size="small" color={ACCENT} style={{ marginLeft: 8 }} />
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

  const { feedId, initialPost, commentId, highlightCommentId } = route.params;
  const targetCommentId = highlightCommentId ?? commentId ?? null;

  const [post,             setPost]             = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [isLeaving,        setIsLeaving]        = useState(false);
  const [replyingTo,       setReplyingTo]       = useState(null);
  const [comments,         setComments]         = useState([]);
  const [commentsLoading,  setCommentsLoading]  = useState(true);
  const [commentsPage,     setCommentsPage]     = useState(1);
  const [hasMoreComments,  setHasMoreComments]  = useState(true);

  const addCommentRef     = useRef(null);
  const listRef           = useRef(null);
  const isNavBackRef      = useRef(false);
  const headerAnim        = useRef(new Animated.Value(0)).current;
  const didScrollToTargetRef = useRef(false);

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

  const loadComments = async (pg = 1) => {
    setCommentsLoading(true);
    try {
      const res = await GetCommentsController(feedId, token, pg, 10);
      const items = Array.isArray(res?.data) ? res.data : [];
      if (pg === 1) {
        setComments(items);
      } else {
        setComments(prev => [...prev, ...items]);
      }
      setHasMoreComments(items.length >= 10);
      setCommentsPage(pg);
    } catch { if (pg === 1) setComments([]); }
    setCommentsLoading(false);
  };

  const handleBack = useCallback(() => {
    if (isNavBackRef.current) return;
    isNavBackRef.current = true;
    navigation.goBack();
  }, [navigation]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({ message: `Check this out on Hafrik: https://hafrik.com/posts/${feedId}` });
    } catch { /* user cancelled */ }
  }, [feedId]);

  const handleReply = useCallback((commentId, username) => {
    setReplyingTo({ commentId, username });
    addCommentRef.current?.focus();
  }, []);

  const handleCancelReply = useCallback(() => setReplyingTo(null), []);

  const handleCommentPosted = useCallback(() => {
    loadComments(1);
    setReplyingTo(null);
    setPost((p) => p ? { ...p, comments_count: (Number(p.comments_count) || 0) + 1 } : p);

    // Increment comment count in store
    const { feeds, updateFeedById } = require('../../../../repository/store').default.getState();
    const currentFeed = feeds.feedsById[feedId];
    if (currentFeed) {
      updateFeedById(feedId, {
        ...currentFeed,
        comments_count: (Number(currentFeed.comments_count) || 0) + 1,
      });
    }
  }, [feedId, token]);

  const handleLoadMoreComments = useCallback(() => {
    if (commentsLoading || !hasMoreComments) return;
    loadComments(commentsPage + 1);
  }, [commentsLoading, hasMoreComments, commentsPage]);

  useEffect(() => {
    if (!targetCommentId || didScrollToTargetRef.current || commentsLoading || comments.length === 0) return;
    const idx = comments.findIndex((c) => String(c?.id ?? c?.comment_id) === String(targetCommentId));
    if (idx < 0) return;
    didScrollToTargetRef.current = true;
    setTimeout(() => {
      listRef.current?.scrollToIndex?.({ index: idx, viewPosition: 0.38, animated: true });
    }, 450);
  }, [targetCommentId, comments, commentsLoading]);

  const viewCount    = Number(post?.views_count   ?? post?.view_count   ?? post?.views ?? 0);
  const commentCount = Number(post?.comments_count ?? post?.comment_count ?? 0);
  const likeCount    = Number(post?.likes_count    ?? post?.like_count    ?? 0);
  const shareCount   = Number(post?.shares         ?? post?.share_count    ?? 0);

  // Header height (52) + safe-area top so KAV clears the fixed header
  const HEADER_HEIGHT = 52;
  const kavOffset = top + HEADER_HEIGHT;

  // Stable element for ListHeaderComponent
  const listHeader = useMemo(() => (
    <PostListHeader
      post={post}
      isLeaving={isLeaving}
      loading={loading}
      commentsLoading={commentsLoading}
      commentCount={commentCount}
      textInputRef={addCommentRef}
    />
  ), [post, isLeaving, loading, commentsLoading, commentCount]);

  const renderCommentItem = useCallback(({ item }) => (
    <CommentItem
      comment={item}
      token={token}
      onReply={handleReply}
      highlighted={!!targetCommentId && String(item?.id ?? item?.comment_id) === String(targetCommentId)}
    />
  ), [token, handleReply, targetCommentId]);

  const keyExtractor = useCallback((item, i) => String(item.id ?? item.comment_id ?? i), []);

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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={kavOffset}
      >
        {loading ? (
          <View style={cs.loaderWrap}>
            <ActivityIndicator size="large" color={ACCENT} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
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
            ListFooterComponent={
              commentsLoading && comments.length > 0
                ? <ActivityIndicator size="small" color={ACCENT} style={{ paddingVertical: 12 }} />
                : null
            }
            onEndReached={handleLoadMoreComments}
            onEndReachedThreshold={0.3}
            onScrollToIndexFailed={({ index }) => {
              setTimeout(() => {
                listRef.current?.scrollToIndex?.({ index, viewPosition: 0.38, animated: true });
              }, 500);
            }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={cs.listContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
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
  root: { flex: 1, backgroundColor: '#F6F7F9' },

  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // ── Fixed header ──────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: Spacing.md,
    backgroundColor: '#F6F7F9',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: withOpacity(Colors.primaryDark, 0.10),
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

  // ── Section header ────────────────────────────────────────────────────────
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  sectionLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: withOpacity(Colors.primaryDark, 0.12),
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: DARK,
    paddingHorizontal: 12,
  },

  listContent: { paddingBottom: 24, backgroundColor: '#F6F7F9' },

  emptyWrap:  { paddingVertical: 40, alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: Colors.mutedBlueGraySoft },
  emptySub:   { fontSize: 13, color: Colors.mutedBlueGraySofter },
});

export default CommentScreen;
