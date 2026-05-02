// src/pages/blogs/ArticleDetailsScreen.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Share,
  Animated,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { fetchArticleDetail, normalizeTags } from './articlesApi';
import { GetCommentsController, AddCommentController, AddReplyController } from '../../controllers/commentscontroller';
import ToggleFeedController from '../../controllers/tooglefeedcontroller';

import { useAuth } from '../../AuthContext';
import { Colors } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import ShareModal from '../home/feeds/share';
import ToggleSaveController from '../../controllers/tooglesavecontroller';

const { width, height } = Dimensions.get('window');

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const MUTED  = Colors.secondaryText;
const DARK   = Colors.black;
const CREAM  = Colors.background;
const BORDER = BRAND + '17';
const WHITE  = Colors.white;

const BOOKMARKS_KEY = 'hafrik_article_bookmarks_v1';

// Trending logic (adjust to taste)
const TRENDING_VIEWS_THRESHOLD = 7000;

// HTML template wrapping article.content_html
const buildHtml = (body) => `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0">
<style>
*{box-sizing:border-box}
html,body{background:transparent;margin:0;padding:0}
body{
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  font-size:15px; line-height:1.8; color:${DARK};
  padding:0 6px;
}
img{max-width:100%!important;height:auto;border-radius:12px;margin:14px 0;display:block}
p{margin:0 0 14px}
h1,h2,h3,h4{color:${DARK};font-weight:900;margin:18px 0 10px;line-height:1.25}
h2{font-size:18px} h3{font-size:16px}
a{color:${ACCENT};text-decoration:none}
blockquote{
  border-left:3px solid ${BRAND};
  padding:10px 12px;
  color:${MUTED};
  margin:14px 0;
  background:${Colors.surfaceTint};
  border-radius:0 12px 12px 0;
}
pre,code{background:${Colors.surfaceTint};padding:3px 7px;border-radius:8px;font-size:13px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
ul,ol{margin:0 0 14px 22px}
li{margin-bottom:6px}
hr{border:none;border-top:1px solid ${Colors.border};margin:16px 0}
table{width:100%;border-collapse:collapse;margin:12px 0 14px}
th,td{padding:8px;border:1px solid ${Colors.border};font-size:13px}
th{background:${Colors.surfaceTint};font-weight:800}
</style>
</head><body>
${body}
<div style="height:18px"></div>
<script>
setTimeout(function(){
  window.ReactNativeWebView.postMessage(String(document.body.scrollHeight));
},300);
</script>
</body></html>`;

const formatNumber = (n) => {
  const num = Number(n || 0);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return String(num);
};

const safeText = (t) => String(t ?? '').trim();

async function loadBookmarksSet() {
  try {
    const raw = await AsyncStorage.getItem(BOOKMARKS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.map(String));
  } catch {
    return new Set();
  }
}

async function saveBookmarksSet(set) {
  try {
    const arr = Array.from(set);
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(arr));
  } catch {}
}


function CommentRow({ item }) {
  const name = item.user?.full_name || item.user?.name || item.user?.username || item.username || 'User';
  const avatar = item.user?.avatar || item.avatar || null;
  const text = item.comment || item.body || item.text || '';
  return (
    <View style={styles.commentItem}>
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.commentAvatar} />
      ) : (
        <View style={[styles.commentAvatar, styles.avatarFallback]}>
          <Text style={{ fontSize: 11 }}>👤</Text>
        </View>
      )}
      <View style={styles.commentBody}>
        <Text style={styles.commentAuthorName}>{name}</Text>
        <Text style={styles.commentText}>{text}</Text>
      </View>
    </View>
  );
}

export default function ArticleDetailsScreen({ navigation, route }) {
  const { postId, title: navTitle } = route.params || {};
  const { top, bottom } = useSafeAreaInsets();
  const { token, user } = useAuth();
  const { colors: tc } = useTheme();

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  const [webHeight, setWebHeight] = useState(450);
  const [webReady, setWebReady] = useState(false);

  // Bookmark
  const [bookmarked, setBookmarked] = useState(false);

  // Likes
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  // Comments
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); // comment id

  // Share to Timeline modal
  const [shareToTimelineVisible, setShareToTimelineVisible] = useState(false);

  // Sticky author bar visibility
  const stickyAnim = useRef(new Animated.Value(0)).current;

  // Reading progress
  const scrollY = useRef(new Animated.Value(0)).current;
  const contentHeightRef = useRef(1);
  const viewHeightRef = useRef(1);

  const progress = scrollY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0], // placeholder, updated via setNativeProps-like calc below
  });

  // We’ll compute progress width manually using onScroll event and state
  const [progressPct, setProgressPct] = useState(0);

  const isTrending = useMemo(() => {
    const views = Number(article?.views || 0);
    return views >= TRENDING_VIEWS_THRESHOLD;
  }, [article?.views]);

  // Fetch
  useEffect(() => {
    if (!postId) {
      setLoading(false);
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const data = await fetchArticleDetail(postId);
        if (!mounted) return;

        setArticle(data);

        // Likes
        setLikesCount(Number(data?.likes_count || data?.likes || 0));
        setIsLiked(!!data?.user_liked);
      } catch {
        if (!mounted) return;
        setArticle(null);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [postId]);

  // Load bookmark state
  useEffect(() => {
    if (!postId) return;
    (async () => {
      const set = await loadBookmarksSet();
      setBookmarked(set.has(String(postId)));
    })();
  }, [postId]);

  const loadComments = useCallback(async () => {
    if (!postId || !token) return;
    setCommentsLoading(true);
    try {
      const res = await GetCommentsController(postId, token, 1, 10);
      setComments(Array.isArray(res?.data) ? res.data : []);
    } catch {}
    finally { setCommentsLoading(false); }
  }, [postId, token]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const submitComment = useCallback(async () => {
    const text = newComment.trim();
    if (!text || !postId || !token || submittingComment) return;
    setSubmittingComment(true);
    const optimistic = {
      id: `opt_${Date.now()}`,
      comment: text,
      user: { name: user?.username || user?.name || 'You', avatar: user?.avatar },
    };
    setComments((c) => [optimistic, ...c]);
    setNewComment('');
    try {
      if (replyingTo) {
        await AddReplyController(postId, replyingTo, text, token);
        setReplyingTo(null);
      } else {
        await AddCommentController(postId, text, token);
      }
      loadComments();
    } catch {
      setComments((c) => c.filter((x) => x.id !== optimistic.id));
      setNewComment(text);
    } finally {
      setSubmittingComment(false);
    }
  }, [newComment, postId, token, submittingComment, user, loadComments, replyingTo]);

  const handleLike = useCallback(async () => {
    if (!postId || !token) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const prevLiked = isLiked;
    const prevCount = likesCount;
    setIsLiked(!prevLiked);
    setLikesCount((c) => prevLiked ? Math.max(0, c - 1) : c + 1);
    try {
      const res = await ToggleFeedController(postId, token, 'like');
      if (res.status !== 200) throw new Error('failed');

      const raw = res.data;
      const d = raw?.data && raw.data.is_reacted !== undefined ? raw.data : raw;
      const serverLiked = !!(d?.is_reacted || d?.my_reaction || d?.user_reaction);
      let serverCount = prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1;

      if (typeof d?.likes_count === 'number') {
        serverCount = d.likes_count;
      } else if (d?.reactions && typeof d.reactions === 'object') {
        const total = Object.entries(d.reactions)
          .filter(([key]) => key !== 'total')
          .reduce((sum, [, value]) => sum + Number(value || 0), 0);
        if (total > 0) serverCount = total;
        else if (typeof d.reactions.total === 'number') serverCount = d.reactions.total;
      }

      setIsLiked(serverLiked);
      setLikesCount(serverCount);
    } catch {
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
    }
  }, [postId, token, isLiked, likesCount]);

  const toggleBookmark = useCallback(async () => {
    if (!postId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const set = await loadBookmarksSet();
    const id = String(postId);
    const wasSaved = set.has(id);

    // Optimistic update
    if (wasSaved) {
      set.delete(id);
      setBookmarked(false);
    } else {
      set.add(id);
      setBookmarked(true);
    }
    await saveBookmarksSet(set);

    // Sync to server (toggle — server handles saved/unsaved state)
    ToggleSaveController(postId, token);
  }, [postId, token]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `${article?.title ?? navTitle}\n${article?.link ?? ''}`,
        url: article?.link,
      });
    } catch {}
  }, [article, navTitle]);

  const openRelated = useCallback((rel) => {
    if (!rel?.post_id) return;
    navigation.push('ArticleDetails', { postId: rel.post_id, title: rel.title });
  }, [navigation]);

  const displayTitle = safeText(article?.title) || safeText(navTitle) || 'Article';
  const tags = normalizeTags(article?.tags);

  const authorName = article?.author?.full_name || article?.author?.name || article?.author?.username || 'Hafrik';
  const authorAvatar = article?.author?.avatar;
  const authorVerified = !!article?.author?.verified;

  const viewsText = formatNumber(article?.views || 0);
  const readTime = Number(article?.reading_time_minutes || 0) || 1;
  const dateText = safeText(article?.date);

  // Progress + sticky bar: driven by onScroll
  const onScroll = useCallback((e) => {
    const y = e?.nativeEvent?.contentOffset?.y ?? 0;
    const viewH = e?.nativeEvent?.layoutMeasurement?.height ?? viewHeightRef.current;
    const contentH = e?.nativeEvent?.contentSize?.height ?? contentHeightRef.current;

    viewHeightRef.current = viewH || 1;
    contentHeightRef.current = contentH || 1;

    const maxScroll = Math.max(1, contentH - viewH);
    const pct = Math.max(0, Math.min(1, y / maxScroll));
    setProgressPct(pct);

    // Sticky author bar appears after you move down a bit
    const showAt = height * 0.18;
    const target = y > showAt ? 1 : 0;

    Animated.timing(stickyAnim, {
      toValue: target,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [stickyAnim]);

  // States
  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={BRAND} />
      </SafeAreaView>
    );
  }

  if (!article) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={46} color={MUTED} />
        <Text style={styles.errorTxt}>Could not load this article.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryBtnTxt}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Sticky author bar animation values
  const stickyTranslateY = stickyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-18, 0],
  });
  const stickyOpacity = stickyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: tc.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle={tc.statusBar} />

      {/* Reading progress bar */}
      <View style={[styles.progressWrap, { paddingTop: top }]}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progressPct * 100)}%` }]} />
        </View>
      </View>

      {/* Sticky author bar */}
      <Animated.View
        style={[
          styles.stickyBar,
          {
            paddingTop: top + 8,
            opacity: stickyOpacity,
            transform: [{ translateY: stickyTranslateY }],
          },
        ]}
        pointerEvents={progressPct > 0.08 ? 'auto' : 'none'}
      >
        <TouchableOpacity style={styles.stickyIconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={BRAND} />
        </TouchableOpacity>

        <View style={styles.stickyAuthor}>
          {!!authorAvatar ? (
            <Image source={{ uri: authorAvatar }} style={styles.stickyAvatar} />
          ) : (
            <View style={[styles.stickyAvatar, styles.avatarFallback]}>
              <Text style={{ fontSize: 14 }}>✍️</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.stickyTitle} numberOfLines={1}>{displayTitle}</Text>
            <Text style={styles.stickyMeta} numberOfLines={1}>
              {authorName}{authorVerified ? ' ✓' : ''} • {readTime} min • {viewsText} views
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.stickyIconBtn} onPress={toggleBookmark}>
            <Ionicons
              name={bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={bookmarked ? WARM : BRAND}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.stickyIconBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={18} color={BRAND} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: false,
            listener: onScroll,
          }
        )}
      >
        {/* Cover */}
        {!!article.image ? (
          <View style={styles.coverWrap}>
            <Image source={{ uri: article.image }} style={styles.cover} resizeMode="cover" />

            <View style={[styles.coverBtns, { paddingTop: top + 10 }]}>
              <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={20} color={BRAND} />
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={styles.circleBtn} onPress={toggleBookmark}>
                  <Ionicons
                    name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                    size={20}
                    color={bookmarked ? WARM : BRAND}
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.circleBtn} onPress={handleShare}>
                  <Ionicons name="share-outline" size={20} color={BRAND} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Trending badge */}
            {isTrending && (
              <View style={styles.trendingBadge}>
                <Ionicons name="flame" size={14} color={WHITE} />
                <Text style={styles.trendingTxt}>Trending</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.plainTop, { paddingTop: top + 10 }]}>
            <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color={BRAND} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.circleBtn} onPress={toggleBookmark}>
                <Ionicons
                  name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  color={bookmarked ? WARM : BRAND}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.circleBtn} onPress={handleShare}>
                <Ionicons name="share-outline" size={20} color={BRAND} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Content Card */}
        <View style={[styles.contentCard, !article.image && { marginTop: 10 }]}>

          {/* Category + tags */}
          <View style={styles.metaRow}>
            {!!article.category_name && (
              <View style={styles.catPill}>
                <Text style={styles.catPillTxt}>{article.category_name}</Text>
              </View>
            )}

            {tags.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagPillTxt}>#{tag}</Text>
              </View>
            ))}
          </View>

          {/* Title */}
          <Text style={styles.title}>{displayTitle}</Text>

          {/* Author row */}
          <View style={styles.authorRow}>
            {!!authorAvatar ? (
              <Image source={{ uri: authorAvatar }} style={styles.authorAvatar} />
            ) : (
              <View style={[styles.authorAvatar, styles.avatarFallback]}>
                <Text style={{ fontSize: 16 }}>✍️</Text>
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text style={styles.authorName}>
                {authorName}{authorVerified ? ' ✓' : ''}
              </Text>
              <Text style={styles.authorMeta}>
                {dateText ? dateText : ' '} • {readTime} min read • {viewsText} views
              </Text>
            </View>
          </View>

          {/* Social row (bookmark + clap) */}
          <View style={styles.socialRow}>
            <Pressable style={[styles.actionBtn, bookmarked && styles.actionBtnActive]} onPress={toggleBookmark}>
              <Ionicons
                name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={bookmarked ? WHITE : BRAND}
              />
              <Text style={[styles.actionTxt, bookmarked && styles.actionTxtActive]}>
                {bookmarked ? 'Saved' : 'Save'}
              </Text>
            </Pressable>

            <Pressable style={[styles.actionBtn, isLiked && styles.actionBtnActive]} onPress={handleLike}>
              <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={18} color={isLiked ? WHITE : BRAND} />
              <Text style={[styles.actionTxt, isLiked && styles.actionTxtActive]}>
                {likesCount > 0 ? formatNumber(likesCount) : 'Like'}
              </Text>
            </Pressable>

            <Pressable style={styles.actionBtn} onPress={handleShare}>
              <Ionicons name="share-outline" size={18} color={BRAND} />
              <Text style={styles.actionTxt}>Share</Text>
            </Pressable>
          </View>

          {/* Snippet (full) */}
          {!!safeText(article.snippet) && (
            <View style={styles.snippetBox}>
              <Text style={styles.snippetTxt}>{safeText(article.snippet)}</Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* Body */}
          {article.content_html ? (
            <View style={[styles.webviewWrap, { height: webHeight }]}>
              {!webReady && (
                <View style={styles.webLoading}>
                  <ActivityIndicator size="small" color={BRAND} />
                </View>
              )}

              <WebView
                originWhitelist={['*']}
                source={{ html: buildHtml(article.content_html) }}
                style={styles.webview}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                javaScriptEnabled
                onLoadEnd={() => setWebReady(true)}
                onMessage={(e) => {
                  const h = Number(e.nativeEvent.data);
                  if (h > 0) setWebHeight(h + 34);
                }}
              />
            </View>
          ) : !!safeText(article.content_plain) ? (
            <Text style={styles.plainContent}>{safeText(article.content_plain)}</Text>
          ) : null}

          {/* Related */}
          {!!article.related_articles?.length && (
            <View style={styles.relatedWrap}>
              <View style={styles.relatedHeader}>
                <Text style={styles.relatedTitle}>Related Articles</Text>
                <Text style={styles.relatedSub}>Continue reading</Text>
              </View>

              {article.related_articles.map((rel) => (
                <TouchableOpacity
                  key={`${rel.post_id}-${rel.id}`}
                  style={styles.relatedCard}
                  activeOpacity={0.86}
                  onPress={() => openRelated(rel)}
                >
                  {!!rel.image ? (
                    <Image source={{ uri: rel.image }} style={styles.relatedImage} />
                  ) : (
                    <View style={[styles.relatedImage, styles.relatedFallback]}>
                      <Text style={{ fontSize: 16 }}>📰</Text>
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <Text style={styles.relatedCardTitle} numberOfLines={2}>
                      {safeText(rel.title)}
                    </Text>
                    <Text style={styles.relatedSnippet} numberOfLines={2}>
                      {safeText(rel.snippet)}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color={ACCENT} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Comments Section */}
          <View style={styles.commentsWrap}>
            <View style={styles.commentsHeader}>
              <Text style={styles.commentsSectionTitle}>Comments</Text>
              {comments.length > 0 && (
                <View style={styles.commentsBadge}>
                  <Text style={styles.commentsBadgeTxt}>{comments.length}</Text>
                </View>
              )}
            </View>

            {/* Input */}
            <View style={styles.commentInputRow}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.commentInputAvatar} />
              ) : (
                <View style={[styles.commentInputAvatar, styles.avatarFallback]}>
                  <Text style={{ fontSize: 13 }}>👤</Text>
                </View>
              )}
              <TextInput
                style={styles.commentInput}
                placeholder="Write a comment…"
                placeholderTextColor={MUTED}
                value={newComment}
                onChangeText={setNewComment}
                multiline
                returnKeyType="send"
                blurOnSubmit
                onSubmitEditing={submitComment}
              />
              <TouchableOpacity
                style={[styles.commentSendBtn, (!newComment.trim() || submittingComment) && { opacity: 0.4 }]}
                onPress={submitComment}
                disabled={!newComment.trim() || submittingComment}
              >
                {submittingComment ? (
                  <ActivityIndicator size="small" color={WHITE} />
                ) : (
                  <Ionicons name="send" size={16} color={WHITE} />
                )}
              </TouchableOpacity>
            </View>

            {commentsLoading ? (
              <ActivityIndicator size="small" color={BRAND} style={{ marginVertical: 16 }} />
            ) : comments.length === 0 ? (
              <Text style={styles.noCommentsTxt}>No comments yet. Be the first!</Text>
            ) : (
              comments.map((item) => (
                <CommentRow key={String(item.id || item.comment_id || item.created_at)} item={item} />
              ))
            )}
          </View>

          <View style={{ height: 110 }} />
        </View>
      </Animated.ScrollView>

      {/* Floating action row: Like + Save + Share */}
      <View style={[styles.fabRow, { paddingBottom: Math.max(18, bottom + 10) }]}>
        <TouchableOpacity
          style={[styles.fab, isLiked && styles.fabSaved]}
          onPress={handleLike}
          activeOpacity={0.9}
        >
          <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={20} color={WHITE} />
          <Text style={styles.fabTxt}>{likesCount > 0 ? formatNumber(likesCount) : 'Like'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.fab, bookmarked && styles.fabSaved]}
          onPress={toggleBookmark}
          activeOpacity={0.9}
        >
          <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={20} color={WHITE} />
          <Text style={styles.fabTxt}>{bookmarked ? 'Saved' : 'Save'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShareToTimelineVisible(true)}
          activeOpacity={0.9}
        >
          <Ionicons name={'share-social-outline'} size={20} color={WHITE} />
          <Text style={styles.fabTxt}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Share to Timeline modal */}
      <ShareModal
        visible={shareToTimelineVisible}
        onClose={() => setShareToTimelineVisible(false)}
        feed={{ id: postId }}
      />
    </KeyboardAvoidingView>
  );
}

const WARM = Colors.warning;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CREAM,
    gap: 12,
    padding: 24,
  },
  errorTxt: { fontSize: 14, color: MUTED, textAlign: 'center' },
  primaryBtn: { backgroundColor: BRAND, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  primaryBtnTxt: { color: WHITE, fontWeight: '700', fontSize: 14 },

  // Progress
  progressWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: CREAM + 'EB',
  },
  progressTrack: {
    height: 3,
    backgroundColor: BRAND + '1F',
  },
  progressFill: {
    height: 3,
    backgroundColor: ACCENT,
    borderRadius: 10,
  },

  // Sticky bar
  stickyBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 60,
    paddingHorizontal: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    shadowColor: DARK,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },
  stickyIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickyAuthor: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  stickyAvatar: { width: 34, height: 34, borderRadius: 17 },
  stickyTitle: { fontSize: 12.5, fontWeight: '800', color: DARK },
  stickyMeta: { fontSize: 10.5, color: MUTED, marginTop: 1 },

  // Cover
  coverWrap: { position: 'relative' },
  cover: { width, height: height * 0.38 },
  coverBtns: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  circleBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: WHITE + 'F0',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: DARK, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 6,
  },
  trendingBadge: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    backgroundColor: Colors.destructive + 'F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trendingTxt: { color: WHITE, fontWeight: '900', fontSize: 11, letterSpacing: 0.3 },

  plainTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },

  // Content
  contentCard: {
    marginTop: -18,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 18,
    backgroundColor: CREAM,
  },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  catPill: { backgroundColor: BRAND + '1A', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  catPillTxt: { fontSize: 10.5, fontWeight: '900', color: BRAND },
  tagPill: { backgroundColor: ACCENT + '24', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  tagPillTxt: { fontSize: 10.5, fontWeight: '800', color: ACCENT },

  title: {
    fontSize: 24,
    fontWeight: '900',
    color: DARK,
    lineHeight: 32,
    marginBottom: 12,
  },

  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  authorAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: WHITE },
  avatarFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER },
  authorName: { fontSize: 13.5, fontWeight: '900', color: DARK },
  authorMeta: { fontSize: 11.5, color: MUTED, marginTop: 2 },

  // Social row
  socialRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  actionBtn: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'relative',
  },
  actionBtnActive: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  actionTxt: { fontSize: 12.5, fontWeight: '900', color: BRAND },
  actionTxtActive: { color: WHITE },

  snippetBox: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
  },
  snippetTxt: { fontSize: 13.5, color: DARK, lineHeight: 21 },

  divider: { height: 1, backgroundColor: BORDER, marginVertical: 16 },

  // WebView
  webviewWrap: { width: '100%', overflow: 'hidden' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  webLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CREAM,
    zIndex: 1,
  },

  plainContent: { fontSize: 15, color: DARK, lineHeight: 26 },

  // Related
  relatedWrap: { marginTop: 10 },
  relatedHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  relatedTitle: { fontSize: 16, fontWeight: '900', color: DARK },
  relatedSub: { fontSize: 12, color: MUTED },

  relatedCard: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  relatedImage: { width: 64, height: 64, borderRadius: 12, backgroundColor: Colors.surfaceTint },
  relatedFallback: { justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDER, backgroundColor: WHITE },
  relatedCardTitle: { fontSize: 13.5, fontWeight: '900', color: DARK, lineHeight: 18, marginBottom: 4 },
  relatedSnippet: { fontSize: 11.5, color: MUTED, lineHeight: 16 },

  // FAB row
  fabRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    flexDirection: 'row',
    gap: 12,
  },
  fab: {
    flex: 1,
    backgroundColor: BRAND,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 10,
  },
  fabSaved: { backgroundColor: Colors.primary },
  fabTxt: { color: WHITE, fontWeight: '900', fontSize: 13 },

  // Comments
  commentsWrap: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 16,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  commentsSectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: DARK,
  },
  commentsBadge: {
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  commentsBadgeTxt: { color: WHITE, fontWeight: '900', fontSize: 11 },

  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginBottom: 16,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 10,
  },
  commentInputAvatar: { width: 32, height: 32, borderRadius: 16 },
  commentInput: {
    flex: 1,
    fontSize: 13.5,
    color: DARK,
    maxHeight: 90,
    paddingTop: 0,
    paddingBottom: 0,
  },
  commentSendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BRAND,
    justifyContent: 'center',
    alignItems: 'center',
  },

  noCommentsTxt: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    paddingVertical: 18,
  },

  commentItem: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  commentAvatar: { width: 34, height: 34, borderRadius: 17 },
  commentBody: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  commentAuthorName: { fontSize: 12, fontWeight: '900', color: DARK, marginBottom: 3 },
  commentText: { fontSize: 13, color: DARK, lineHeight: 19 },
});
