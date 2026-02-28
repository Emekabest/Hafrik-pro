import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  ActivityIndicator, FlatList, StatusBar, Animated, Share, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';

import CommentMainPostContent from './commentpost/commentmainpostcontent';
import { useAuth } from '../../../../AuthContext';
import getUserPostInteractionController from '../../../../controllers/getuserpostinteractioncontroller';
import CommentBonds from './commentsbonds';
import AddComment from './addcomment';

const BASE   = 'https://hafrik.com';
const BRAND  = '#0C3F44';
const ACCENT = '#13C296';
const CREAM  = '#F5F7F7';
const DARK   = '#0D1B1E';
const MUTED  = '#7A9198';

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

const CommentScreen = ({ route }) => {
  const navigation  = useNavigation();
  const { top }     = useSafeAreaInsets();
  const { user, token } = useAuth();

  const { feedId } = route.params;

  const [post,      setPost]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); // { commentId, username }
  const [commentsKey, setCommentsKey] = useState(0); // bump to refresh comments

  const addCommentRef     = useRef(null);
  const isNavBackRef      = useRef(false);
  const headerAnim        = useRef(new Animated.Value(0)).current;
  const scrollY           = useRef(new Animated.Value(0)).current;

  // Header background opacity as user scrolls past post
  const headerBg = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: ['rgba(12,63,68,0)', 'rgba(12,63,68,1)'],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    loadPost();
    trackView(feedId, token);
  }, [feedId]);

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
      if (res.status === 200) setPost(res.data);
    } catch { /* silent */ }
    setLoading(false);
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
    setCommentsKey((k) => k + 1); // refresh CommentBonds
    setReplyingTo(null);
    setPost((p) => p ? { ...p, comments_count: (Number(p.comments_count) || 0) + 1 } : p);
  }, []);

  const viewCount    = Number(post?.views_count   ?? post?.view_count   ?? 0);
  const commentCount = Number(post?.comments_count ?? post?.comment_count ?? 0);
  const likeCount    = Number(post?.likes_count    ?? post?.like_count    ?? 0);

  const PostHeader = useMemo(() => (
    <PostMemo post={post} isLeaving={isLeaving} textInputRef={addCommentRef} />
  ), [post, isLeaving]);

  const renderHeader = () => (
    <>
      {PostHeader}
      {/* Stats strip below post */}
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
        </View>
      )}
      {/* Comments section header */}
      {!loading && (
        <View style={cs.sectionHead}>
          <Text style={cs.sectionTitle}>Comments</Text>
        </View>
      )}
    </>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={cs.root}>
        <StatusBar barStyle="light-content" />

        {/* ── Floating header ── */}
        <Animated.View style={[cs.headerWrap, { paddingTop: top + 2 }]}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: headerBg }]} />
          <LinearGradient
            colors={[BRAND, 'transparent']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={cs.headerRow}>
            <Animated.View style={{ opacity: headerAnim, transform: [{ scale: headerAnim }] }}>
              <TouchableOpacity style={cs.headerIconBtn} onPress={handleBack} activeOpacity={0.85}>
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </TouchableOpacity>
            </Animated.View>

            <Text style={cs.headerTitle} numberOfLines={1}>Post</Text>

            <TouchableOpacity style={cs.headerIconBtn} onPress={handleShare} activeOpacity={0.85}>
              <Ionicons name="share-social-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Content ── */}
        {loading ? (
          <View style={cs.loaderWrap}>
            <ActivityIndicator size="large" color={ACCENT} />
          </View>
        ) : (
          <Animated.FlatList
            data={[{ key: 'comments' }]}
            keyExtractor={(item) => item.key}
            renderItem={() => (
              <CommentBonds
                key={commentsKey}
                postId={feedId}
                token={token}
                onReply={handleReply}
              />
            )}
            ListHeaderComponent={renderHeader}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={cs.listContent}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* ── Add Comment bar ── */}
        <AddComment
          ref={addCommentRef}
          user={user}
          feedId={feedId}
          token={token}
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
          onPosted={handleCommentPosted}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const cs = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Floating header
  headerWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, height: 48,
  },
  headerTitle: {
    flex: 1, textAlign: 'center', fontSize: 16,
    fontWeight: '800', color: '#fff', letterSpacing: 0.3,
  },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.32)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },

  // Stats strip
  statsStrip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: CREAM,
    borderBottomWidth: 1, borderBottomColor: 'rgba(12,63,68,0.08)',
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statTxt:  { fontSize: 12, color: MUTED, fontWeight: '600' },
  statDot:  { width: 3, height: 3, borderRadius: 2, backgroundColor: MUTED, marginHorizontal: 8 },

  // Section header
  sectionHead: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: DARK, letterSpacing: 0.3 },

  listContent: { paddingBottom: 100 },
});

export default CommentScreen;
